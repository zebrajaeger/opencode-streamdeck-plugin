import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { BridgeStatus, SOURCE_SUPERSEDED_CLOSE_CODE } from "../../shared/protocol.mjs";
import { OpenCodeBridge } from "../index.mjs";

class FakeWebSocket {
	static instances = [];

	constructor() {
		this.readyState = 0;
		this.listeners = new Map();
		this.messages = [];
		FakeWebSocket.instances.push(this);
	}

	addEventListener(type, listener) {
		const listeners = this.listeners.get(type) ?? [];
		listeners.push(listener);
		this.listeners.set(type, listeners);
	}

	emit(type, event = {}) {
		for (const listener of this.listeners.get(type) ?? []) listener(event);
	}

	open() {
		this.readyState = 1;
		this.emit("open");
	}

	close(code = 1000) {
		this.readyState = 3;
		this.emit("close", { code });
	}

	send(message) {
		this.messages.push(JSON.parse(message));
	}
}

function createContext() {
	return {
		location: { directory: "C:\\work\\project", project: { id: "project" } },
		permission: {
			request: {
				async list() {
					return { data: [{ id: "permission", sessionID: "session" }] };
				},
			},
		},
		session: {
			async get({ sessionID }) {
				return { id: sessionID, projectID: "project", directory: "C:\\work\\project" };
			},
			get list() { throw new Error("Unsupported session enumeration"); },
			get status() { throw new Error("Unsupported session status snapshot"); },
		},
	};
}

function event(type, data) {
	return { type, data };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
	let resolve, reject;
	const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

async function connected(t, context = createContext()) {
	const original = globalThis.WebSocket;
	globalThis.WebSocket = FakeWebSocket;
	t.after(() => { globalThis.WebSocket = original; });
	const bridge = new OpenCodeBridge(context);
	t.after(() => bridge.dispose());
	await bridge.initialize();
	bridge.socket.open();
	await bridge.work;
	return bridge;
}

test("direct session info and both permission snapshot capability shapes need no enumeration", async (t) => {
	for (const available of [true, false]) {
		const context = createContext();
		if (!available) context.permission = { list() { throw new Error("Requires sessionID"); } };
		const bridge = await connected(t, context);
		await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
		assert.equal(bridge.sessions.get("own"), "busy");
		assert.equal(bridge.permissions.size, available ? 1 : 0);
	}
});

const creationEvents = [
	["session.execution.started", {}], ["session.execution.succeeded", {}],
	["session.execution.interrupted", {}], ["session.status", { status: { type: "busy" } }],
	["session.idle", {}], ["session.execution.failed", {}], ["session.created", {}],
	["session.compaction.failed", { reason: "auto" }], ["session.retry.scheduled", {}],
	["permission.asked", { id: "request" }], ["question.asked", { id: "request" }],
	["form.created", { form: { id: "request", sessionID: "target" } }],
];
for (const [type, extra] of creationEvents) {
	test(`${type} admits own metadata only, independent of location`, async (t) => {
		const context = createContext();
		context.permission = {};
		let owner = "foreign", calls = 0;
		context.session.get = async ({ sessionID }) => {
			calls++;
			if (owner === "unresolved") throw new Error("SECRET-CONTENT");
			return { id: sessionID, projectID: owner, directory: context.location.directory };
		};
		const bridge = await connected(t, context);
		for (const projectID of ["foreign", "unresolved", "project"]) {
			owner = projectID;
			const input = event(type, { sessionID: "target", ...extra });
			if (type === "session.created" && projectID !== "unresolved") input.data.projectID = projectID;
			if (projectID === "foreign") input.location = { directory: context.location.directory };
			const count = bridge.socket.messages.length;
			await bridge.handleEvent(input);
			assert.equal(bridge.socket.messages.length - count, projectID === "project" ? 1 : 0);
			if (projectID !== "project") {
				assert.equal(bridge.sessions.size + bridge.permissions.size + bridge.questions.size, 0);
			}
		}
		assert.equal(calls, type === "session.created" ? 1 : 3);
	});
}

test("metadata must have matching id and nonempty projectID; later checks retry", async (t) => {
	const context = createContext(); context.permission = {};
	const bridge = await connected(t, context);
	for (const info of [{ id: "wrong", projectID: "project" }, { id: "own" }, { id: "own", projectID: "" }, { data: { id: "own", projectID: "project" } }]) {
		context.session.get = async () => info;
		await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
		assert.equal(bridge.sessions.size, 0);
	}
	context.session.get = async () => ({ id: "own", projectID: "project", directory: "elsewhere" });
	await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	assert.equal(bridge.sessions.get("own"), "busy");
});

const terminalFailures = [
	["session.execution.failed", { error: { name: "ContextWindowExceeded" } }],
	["session.compaction.failed", { reason: "auto", error: { name: "ContextWindowExceeded" } }],
	["session.compaction.failed", { reason: "manual", error: { name: "ContextWindowExceeded" } }],
];
for (const [type, extra] of terminalFailures) {
	test(`${type} (${extra.reason ?? "execution"}) ends the failed session's busy state without an idle frame`, async (t) => {
		const context = createContext(); context.permission = {};
		const bridge = await connected(t, context);
		await bridge.handleEvent(event("session.execution.started", { sessionID: "failing" }));
		await bridge.handleEvent(event("session.execution.started", { sessionID: "other" }));
		await bridge.handleEvent(event("permission.asked", { id: "request", sessionID: "other" }));
		const count = bridge.socket.messages.length;
		await bridge.handleEvent(event(type, { sessionID: "failing", ...extra }));

		assert.deepEqual(bridge.socket.messages.slice(count).map(({ type: sent }) => sent), ["session.error"]);
		assert.deepEqual(bridge.socket.messages.at(-1), { version: 1, instanceID: bridge.instanceID, type: "session.error", sessionID: "failing" });
		assert.equal(bridge.sessions.get("failing"), BridgeStatus.READY);
		assert.equal(bridge.sessions.get("other"), BridgeStatus.BUSY);
		assert.equal(bridge.permissions.has("request"), true);

		await bridge.sendSnapshot();
		const snapshot = bridge.socket.messages.at(-1);
		assert.deepEqual(snapshot.sessions, [{ sessionID: "failing", status: BridgeStatus.READY }, { sessionID: "other", status: BridgeStatus.BUSY }]);
		assert.deepEqual(snapshot.permissions, [{ permissionID: "request", sessionID: "other" }]);
	});
}

test("scheduled retries stay busy and restore work after a failure without reporting an error", async (t) => {
	const context = createContext(); context.permission = {};
	const bridge = await connected(t, context);
	await bridge.handleEvent(event("session.retry.scheduled", { sessionID: "own", attempt: 2 }));
	assert.equal(bridge.sessions.get("own"), BridgeStatus.BUSY);
	assert.deepEqual(bridge.socket.messages.at(-1), { version: 1, instanceID: bridge.instanceID, type: "session.status", sessionID: "own", status: BridgeStatus.BUSY });

	await bridge.handleEvent(event("session.execution.failed", { sessionID: "own" }));
	assert.equal(bridge.sessions.get("own"), BridgeStatus.READY);
	for (const [type, data] of [["session.retry.scheduled", { sessionID: "own" }], ["session.execution.started", { sessionID: "own" }], ["session.status", { sessionID: "own", status: { type: "busy" } }]]) {
		await bridge.handleEvent(event("session.execution.failed", { sessionID: "own" }));
		await bridge.handleEvent(event(type, data));
		assert.equal(bridge.sessions.get("own"), BridgeStatus.BUSY);
	}
	for (const [type, data] of [["session.idle", { sessionID: "own" }], ["session.execution.succeeded", { sessionID: "own" }], ["session.execution.interrupted", { sessionID: "own", reason: "user" }], ["session.status", { sessionID: "own", status: { type: "idle" } }]]) {
		await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
		await bridge.handleEvent(event(type, data));
		assert.equal(bridge.sessions.get("own"), BridgeStatus.READY);
	}
});

test("failures preserve order under pending lookups, survive outage and reconnect, and stop at disposal", async (t) => {
	const context = createContext(); context.permission = {};
	const bridge = await connected(t, context);
	await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));

	// A late-resolving busy lookup must not overwrite the newer failure outcome.
	const pending = deferred(); let calls = 0;
	context.session.get = ({ sessionID }) => ++calls === 1 ? pending.promise : Promise.resolve({ id: sessionID, projectID: "project" });
	const busy = bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	const failed = bridge.handleEvent(event("session.compaction.failed", { sessionID: "own", reason: "auto" }));
	await flush();
	pending.resolve({ id: "own", projectID: "project" });
	await Promise.all([busy, failed]);
	assert.deepEqual(bridge.socket.messages.slice(-2).map(({ type }) => type), ["session.status", "session.error"]);
	assert.equal(bridge.sessions.get("own"), BridgeStatus.READY);

	// A failure observed while disconnected still corrects the reconnect snapshot.
	await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	const old = bridge.socket;
	old.close();
	clearTimeout(bridge.reconnectTimer); bridge.reconnectTimer = undefined;
	await bridge.handleEvent(event("session.execution.failed", { sessionID: "own" }));
	bridge.connect(); bridge.socket.open(); await bridge.work;
	assert.deepEqual(bridge.socket.messages[1].sessions, [{ sessionID: "own", status: BridgeStatus.READY }]);

	// Unloading during the ownership lookup must publish nothing further.
	await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	const stalled = deferred();
	context.session.get = () => stalled.promise;
	const work = bridge.handleEvent(event("session.execution.failed", { sessionID: "own" }));
	await flush();
	const socket = bridge.socket, count = socket.messages.length;
	bridge.dispose(); await work;
	stalled.resolve({ id: "own", projectID: "project" }); await flush();
	assert.equal(socket.messages.length, count);
	assert.equal(bridge.sessions.get("own"), BridgeStatus.BUSY);
});

test("queued direct events and subscription preserve busy then idle, even after a failed lookup", async (t) => {
	const context = createContext(); context.permission = {};
	const bridge = await connected(t, context);
	const pending = deferred(); let calls = 0;
	context.session.get = ({ sessionID }) => ++calls === 1 ? pending.promise : Promise.resolve({ id: sessionID, projectID: "project" });
	const busy = bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	const idle = bridge.handleEvent(event("session.idle", { sessionID: "own" }));
	await flush(); assert.equal(calls, 1);
	pending.resolve({ id: "own", projectID: "project" });
	await Promise.all([busy, idle]);
	assert.deepEqual(bridge.socket.messages.slice(-2).map(({ type }) => type), ["session.status", "session.idle"]);
	assert.equal(bridge.sessions.get("own"), "ready");
	context.session.get = async () => { throw new Error("failure"); };
	await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	context.session.get = async ({ sessionID }) => ({ id: sessionID, projectID: "project" });
	async function* stream() { yield event("session.execution.started", { sessionID: "own" }); yield event("session.idle", { sessionID: "own" }); }
	await bridge.consumeEvents(stream());
	assert.equal(bridge.sessions.get("own"), "ready");
});

test("timeout cancels metadata work, late results are ignored, and unload aborts unfinished work", async (t) => {
	const context = createContext(); context.permission = {};
	const bridge = await connected(t, context);
	t.mock.timers.enable({ apis: ["setTimeout"] });
	let pending = deferred(), signal;
	context.session.get = (_, options) => { signal = options.signal; return pending.promise; };
	let work = bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	await flush(); t.mock.timers.tick(2000); await work;
	assert.equal(signal.aborted, true);
	pending.resolve({ id: "own", projectID: "project" }); await flush();
	assert.equal(bridge.sessions.size, 0);
	pending = deferred();
	work = bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	await flush(); const count = bridge.socket.messages.length, socket = bridge.socket;
	bridge.dispose(); await work;
	pending.resolve({ id: "own", projectID: "project" }); await flush();
	assert.equal(signal.aborted, true);
	assert.equal(bridge.membership.size, 0);
	assert.equal(socket.messages.length, count);
});

const resolutions = [
	["permission.asked", "permission.replied", "permissions", "requestID"],
	["question.asked", "question.replied", "questions", "requestID"],
	["question.asked", "question.rejected", "questions", "requestID"],
	["form.created", "form.replied", "questions", "id"],
	["form.created", "form.cancelled", "questions", "id"],
];
for (const [creation, resolution, map, field] of resolutions) {
	test(`${resolution} correlates admitted requests and checks current session ownership`, async (t) => {
		const context = createContext(); context.permission = {};
		const bridge = await connected(t, context);
		for (const id of ["request", "unrelated"]) await bridge.handleEvent(event(creation, creation === "form.created" ? { form: { id, sessionID: "own" } } : { id, sessionID: "own" }));
		const count = bridge.socket.messages.length;
		for (const data of [{ [field]: "foreign" }, { [field]: "request", sessionID: "wrong" }]) await bridge.handleEvent(event(resolution, data));
		assert.equal(bridge.socket.messages.length, count);
		assert.equal(bridge[map].size, 2);
		await bridge.handleEvent(event(resolution, { [field]: "request", sessionID: "own" }));
		assert.equal(bridge[map].has("request"), false);
		await bridge.handleEvent(event(resolution, { [field]: "unrelated" }));
		assert.equal(bridge[map].size, 0);
		await bridge.handleEvent(event(creation, creation === "form.created" ? { form: { id: "moved", sessionID: "own" } } : { id: "moved", sessionID: "own" }));
		context.session.get = async ({ sessionID }) => ({ id: sessionID, projectID: "foreign" });
		await bridge.handleEvent(event(resolution, { [field]: "moved" }));
		assert.equal(bridge[map].size, 0);
		assert.equal(bridge.socket.messages.at(-1).type, "snapshot");
	});
}

test("explicit moves, missed moves and deletion remove all former contributions without post-delete lookup", async (t) => {
	const context = createContext(); context.permission = {};
	const bridge = await connected(t, context);
	for (const mode of ["explicit", "lookup", "deleted"]) {
		context.session.get = async ({ sessionID }) => ({ id: sessionID, projectID: "project" });
		await bridge.handleEvent(event("session.execution.started", { sessionID: mode }));
		await bridge.handleEvent(event("permission.asked", { id: "p", sessionID: mode }));
		await bridge.handleEvent(event("question.asked", { id: "q", sessionID: mode }));
		await bridge.handleEvent(event("session.moved", { sessionID: mode, projectID: "project", directory: "different" }));
		assert.equal(bridge.sessions.get(mode), "busy");
		context.session.get = async ({ sessionID }) => { if (mode === "deleted") throw new Error("Deleted"); return { id: sessionID, projectID: "foreign" }; };
		await bridge.handleEvent(event(mode === "explicit" ? "session.moved" : mode === "lookup" ? "session.idle" : "session.deleted", { sessionID: mode, projectID: "foreign" }));
		assert.equal(bridge.membership.has(mode), false);
		assert.equal(bridge.sessions.size + bridge.permissions.size + bridge.questions.size, 0);
		assert.deepEqual(bridge.socket.messages.at(-1).sessions, []);
	}
	const count = bridge.socket.messages.length;
	await bridge.handleEvent(event("session.deleted", { sessionID: "never-owned" }));
	assert.equal(bridge.socket.messages.length, count);
	await bridge.sendSnapshot();
	assert.equal(bridge.membership.size, 0);
});

test("mixed permission snapshots omit foreign and unresolved entries; failed listing preserves verified state", async (t) => {
	const context = createContext();
	context.permission.request.list = async () => ({ data: ["own", "foreign", "unknown"].map((sessionID) => ({ id: sessionID, sessionID, prompt: "SECRET-CONTENT" })) });
	context.session.get = async ({ sessionID }) => { if (sessionID === "unknown") throw new Error("SECRET-CONTENT"); return { id: sessionID, projectID: sessionID === "own" ? "project" : "foreign" }; };
	const bridge = await connected(t, context);
	assert.deepEqual(bridge.socket.messages.at(-1).permissions, [{ permissionID: "own", sessionID: "own" }]);
	context.permission.request.list = async () => { throw new Error("SECRET-CONTENT"); };
	await bridge.sendSnapshot(bridge.socket, true);
	assert.deepEqual(bridge.socket.messages.at(-1).permissions, [{ permissionID: "own", sessionID: "own" }]);
});

test("transient permission ownership failure retains observed state for later recovery", async (t) => {
	const context = createContext();
	const bridge = await connected(t, context);
	context.session.get = async () => { throw new Error("temporary"); };
	await bridge.sendSnapshot(bridge.socket, true);
	assert.equal(bridge.permissions.has("permission"), true);
	assert.deepEqual(bridge.socket.messages.at(-1).permissions, []);
	context.session.get = async ({ sessionID }) => ({ id: sessionID, projectID: "project" });
	await bridge.sendSnapshot(bridge.socket, true);
	assert.deepEqual(bridge.socket.messages.at(-1).permissions, [{ permissionID: "permission", sessionID: "session" }]);
});

test("ownership diagnostics use bounded identifiers and reason codes, never metadata or error content", () => {
	const instanceID = execFileSync(process.execPath, ["--input-type=module", "-e", `
		import { OpenCodeBridge } from ${JSON.stringify(new URL("../index.mjs", import.meta.url).href)};
		const bridge = new OpenCodeBridge({
			location: { directory: "diagnostic-project", project: { id: "project" } },
			permission: { request: { list: async () => { throw new Error("SECRET-PAYLOAD"); } } },
			session: { get: async () => { throw new Error("SECRET-PAYLOAD"); } },
		});
		await bridge.captureSnapshot();
		await bridge.handleEvent({ type: "permission.asked", data: { id: "request", sessionID: "s".repeat(300), prompt: "SECRET-PAYLOAD" } });
		bridge.context.permission = {};
		await bridge.captureSnapshot();
		console.log(bridge.instanceID);
		bridge.dispose();
	`], { encoding: "utf8" }).trim();
	const records = readFileSync(join(homedir(), ".local", "share", "opencode", "log", "streamdeck-status-bridge.log"), "utf8")
		.trim().split(/\r?\n/).map((line) => JSON.parse(line)).filter((record) => record.instanceID === instanceID);
	assert.deepEqual(records.filter(({ reason }) => reason).map(({ reason }) => reason), ["permission-snapshot-failed", "session-unresolved", "permission-snapshot-unavailable"]);
	assert.equal(records.find(({ sessionID }) => sessionID)?.sessionID.length, 128);
	assert.equal(JSON.stringify(records).includes("SECRET-PAYLOAD"), false);
});

test("reconnect excludes unresolved retained state without destroying it, then retries and orders new events", async (t) => {
	const context = createContext(); context.permission = {};
	const bridge = await connected(t, context);
	await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	await bridge.handleEvent(event("question.asked", { id: "q", sessionID: "own" }));
	context.session.get = async () => { throw new Error("temporary"); };
	await bridge.sendSnapshot();
	assert.deepEqual(bridge.socket.messages.at(-1).sessions, []);
	assert.deepEqual(bridge.socket.messages.at(-1).questions, []);
	assert.equal(bridge.sessions.get("own"), "busy");
	const pending = deferred(); let calls = 0;
	context.session.get = ({ sessionID }) => ++calls === 1 ? pending.promise : Promise.resolve({ id: sessionID, projectID: "project" });
	bridge.socket = undefined; bridge.connect(); bridge.socket.open();
	const recovery = bridge.work;
	const idle = bridge.handleEvent(event("session.idle", { sessionID: "own" }));
	await flush(); pending.resolve({ id: "own", projectID: "project" });
	await Promise.all([recovery, idle]);
	assert.deepEqual(bridge.socket.messages.map(({ type }) => type), ["hello", "snapshot", "session.idle"]);
	assert.equal(bridge.socket.messages[1].sessions[0].status, "busy");
	assert.equal(bridge.sessions.get("own"), "ready");
});

test("obsolete recovery cannot publish on a replacement socket or mutate ownership", async (t) => {
	const context = createContext(); context.permission = {};
	const bridge = await connected(t, context);
	await bridge.handleEvent(event("session.execution.started", { sessionID: "own" }));
	const pending = deferred(); context.session.get = () => pending.promise;
	const old = bridge.socket;
	const recovery = bridge.sendSnapshot(old);
	await flush(); bridge.socket = undefined; bridge.connect();
	const current = bridge.socket; current.open();
	pending.resolve({ id: "own", projectID: "foreign" }); await recovery;
	assert.equal(old.messages.at(-1).type, "session.status");
	assert.equal(bridge.sessions.get("own"), "busy");
	await bridge.work;
	assert.deepEqual(current.messages.map(({ type }) => type), ["hello", "snapshot"]);
	assert.deepEqual(current.messages[1].sessions, []);
});

test("initialization uses the available permission snapshot and direct session metadata", async (t) => {
	const originalWebSocket = globalThis.WebSocket;
	globalThis.WebSocket = FakeWebSocket;
	t.after(() => { globalThis.WebSocket = originalWebSocket; });
	FakeWebSocket.instances = [];

	const bridge = new OpenCodeBridge(createContext());
	t.after(() => bridge.dispose());
	await bridge.initialize();
	const socket = FakeWebSocket.instances[0];
	socket.open();
	await bridge.work;

	const snapshot = socket.messages.find((message) => message.type === "snapshot");
	assert.deepEqual(snapshot.permissions, [{ permissionID: "permission", sessionID: "session" }]);
	assert.deepEqual(snapshot.sessions, []);
});

test("reconnect snapshots omit failed executions while later live events transmit immediately", async (t) => {
	const originalWebSocket = globalThis.WebSocket;
	globalThis.WebSocket = FakeWebSocket;
	t.after(() => { globalThis.WebSocket = originalWebSocket; });
	FakeWebSocket.instances = [];

	const bridge = new OpenCodeBridge(createContext());
	t.after(() => bridge.dispose());
	await bridge.initialize();
	const firstSocket = FakeWebSocket.instances[0];
	firstSocket.open();
	await bridge.handleEvent(event("session.execution.failed", { sessionID: "failed" }));
	assert.equal(firstSocket.messages.at(-1).type, "session.error");

	bridge.socket = undefined;
	bridge.connect();
	const secondSocket = FakeWebSocket.instances[1];
	secondSocket.open();
	await bridge.work;
	const reconnectSnapshot = secondSocket.messages.find((message) => message.type === "snapshot");
	// The failed session is reported as finished work, never as retained BUSY,
	// and the historical failure itself is not replayed.
	assert.deepEqual(reconnectSnapshot.sessions, [{ sessionID: "failed", status: BridgeStatus.READY }]);
	assert.equal(secondSocket.messages.some(({ type }) => type === "session.error"), false);

	await bridge.handleEvent(event("session.execution.started", { sessionID: "recovered" }));
	assert.deepEqual(secondSocket.messages.at(-1), {
		version: 1,
		instanceID: bridge.instanceID,
		type: "session.status",
		sessionID: "recovered",
		status: BridgeStatus.BUSY,
	});
});

function fakeRuntime(t) {
	const originalWebSocket = globalThis.WebSocket;
	globalThis.WebSocket = FakeWebSocket;
	FakeWebSocket.instances = [];
	t.mock.timers.enable({ apis: ["setTimeout"] });
	t.after(() => { globalThis.WebSocket = originalWebSocket; });
	const bridge = new OpenCodeBridge(createContext());
	t.after(() => bridge.dispose());
	return bridge;
}

test("supersession is terminal, cancels pending retries, and allows a fresh setup", async (t) => {
	const bridge = fakeRuntime(t);
	bridge.connect();
	const socket = FakeWebSocket.instances[0];
	socket.open();
	await bridge.work;
	bridge.scheduleReconnect();
	socket.close(SOURCE_SUPERSEDED_CLOSE_CODE);
	assert.equal(bridge.superseded, true);
	assert.equal(bridge.socket, undefined);
	assert.equal(bridge.reconnectTimer, undefined);
	bridge.connect();
	bridge.scheduleReconnect();
	t.mock.timers.tick(30_000);
	assert.equal(FakeWebSocket.instances.length, 1);
	socket.open();
	socket.emit("error");
	socket.close(1006);
	assert.equal(socket.messages.length, 2);
	bridge.dispose();
	const fresh = new OpenCodeBridge(createContext());
	t.after(() => fresh.dispose());
	fresh.connect();
	FakeWebSocket.instances[1].open();
	assert.equal(fresh.superseded, false);
	assert.equal(FakeWebSocket.instances[1].messages[0].type, "hello");
});

test("obsolete open, error, and supersession close callbacks cannot mutate the active socket", async (t) => {
	const bridge = fakeRuntime(t);
	bridge.connect();
	const old = FakeWebSocket.instances[0];
	old.open();
	old.close(1006);
	t.mock.timers.tick(500);
	const current = FakeWebSocket.instances[1];
	current.open();
	await bridge.work;
	old.open();
	old.emit("error");
	old.close(SOURCE_SUPERSEDED_CLOSE_CODE);
	assert.equal(bridge.socket, current);
	assert.equal(bridge.superseded, false);
	assert.equal(bridge.reconnectTimer, undefined);
	assert.equal(current.messages.length, 2);
	t.mock.timers.tick(30_000);
	assert.equal(FakeWebSocket.instances.length, 2);
});

test("disposal cancels recovery and ignores late callbacks from a connecting socket", (t) => {
	const bridge = fakeRuntime(t);
	bridge.connect();
	const socket = FakeWebSocket.instances[0];
	bridge.scheduleReconnect();
	bridge.dispose();
	socket.open();
	socket.emit("error");
	socket.close(1006);
	t.mock.timers.tick(30_000);
	assert.equal(bridge.socket, undefined);
	assert.equal(bridge.reconnectTimer, undefined);
	assert.deepEqual(socket.messages, []);
	assert.equal(FakeWebSocket.instances.length, 1);
});

for (const code of [1000, 1006, 1012, 4002]) {
	test(`ordinary close ${code} retries and recovers the current supported snapshot`, async (t) => {
		const bridge = fakeRuntime(t);
		await bridge.initialize();
		const first = FakeWebSocket.instances[0];
		first.open();
		await bridge.handleEvent(event("session.status", { sessionID: "working", status: { type: "retry" } }));
		await bridge.handleEvent(event("question.asked", { id: "question", sessionID: "working" }));
		first.close(code);
		t.mock.timers.tick(499);
		assert.equal(FakeWebSocket.instances.length, 1);
		t.mock.timers.tick(1);
		const recovered = FakeWebSocket.instances[1];
		recovered.open();
		await bridge.work;
		assert.equal(recovered.messages[0].type, "hello");
		assert.deepEqual(recovered.messages[1], {
			version: 1, instanceID: bridge.instanceID, type: "snapshot",
			sessions: [{ sessionID: "working", status: "busy" }],
			permissions: [{ permissionID: "permission", sessionID: "session" }],
			questions: [{ questionID: "question", sessionID: "working" }],
		});
		assert.equal(bridge.reconnectDelay, 500);
	});
}

test("unopened outage attempts retain exponential backoff capped at ten seconds", (t) => {
	const bridge = fakeRuntime(t);
	bridge.connect();
	for (const delay of [500, 1000, 2000, 4000, 8000, 10_000, 10_000]) {
		const count = FakeWebSocket.instances.length;
		FakeWebSocket.instances.at(-1).close(1006);
		t.mock.timers.tick(delay - 1);
		assert.equal(FakeWebSocket.instances.length, count);
		t.mock.timers.tick(1);
		assert.equal(FakeWebSocket.instances.length, count + 1);
	}
});

test("retirement diagnostics are emitted once with identity and outcome, never close payloads", () => {
	const instanceID = execFileSync(process.execPath, ["--input-type=module", "-e", `
		import { OpenCodeBridge } from ${JSON.stringify(new URL("../index.mjs", import.meta.url).href)};
		globalThis.WebSocket = class {
			listeners = new Map();
			addEventListener(type, listener) { this.listeners.set(type, listener); }
			close() {}
		};
		const bridge = new OpenCodeBridge({ location: { directory: "diagnostic-project", project: { id: "project" } } });
		bridge.connect();
		const socket = bridge.socket;
		socket.listeners.get("close")({ code: 4001, reason: "SECRET-PAYLOAD" });
		socket.listeners.get("close")({ code: 4001, reason: "SECRET-PAYLOAD" });
		console.log(bridge.instanceID);
		bridge.dispose();
	`], { encoding: "utf8" }).trim();
	const records = readFileSync(join(homedir(), ".local", "share", "opencode", "log", "streamdeck-status-bridge.log"), "utf8")
		.trim().split(/\r?\n/).map((line) => JSON.parse(line)).filter((record) => record.instanceID === instanceID);
	const retirement = records.filter((record) => record.outcome === "superseded");
	assert.equal(retirement.length, 1);
	assert.equal(retirement[0].directory, "diagnostic-project");
	assert.equal(retirement[0].closeCode, SOURCE_SUPERSEDED_CLOSE_CODE);
	assert.equal(JSON.stringify(records).includes("SECRET-PAYLOAD"), false);
});
