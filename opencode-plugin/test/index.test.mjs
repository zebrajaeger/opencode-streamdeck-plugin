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
		get session() {
			throw new Error("The bridge must not access unsupported session snapshot APIs");
		},
	};
}

function event(type, data) {
	return { type, data };
}

test("initialization uses the supported permission snapshot without accessing session APIs", async (t) => {
	const originalWebSocket = globalThis.WebSocket;
	globalThis.WebSocket = FakeWebSocket;
	t.after(() => { globalThis.WebSocket = originalWebSocket; });
	FakeWebSocket.instances = [];

	const bridge = new OpenCodeBridge(createContext());
	t.after(() => bridge.dispose());
	await bridge.initialize();
	const socket = FakeWebSocket.instances[0];
	socket.open();

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
	bridge.handleEvent(event("session.execution.failed", { sessionID: "failed" }));
	assert.equal(firstSocket.messages.at(-1).type, "session.error");

	bridge.socket = undefined;
	bridge.connect();
	const secondSocket = FakeWebSocket.instances[1];
	secondSocket.open();
	const reconnectSnapshot = secondSocket.messages.find((message) => message.type === "snapshot");
	assert.deepEqual(reconnectSnapshot.sessions, []);

	bridge.handleEvent(event("session.execution.started", { sessionID: "recovered" }));
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

test("supersession is terminal, cancels pending retries, and allows a fresh setup", (t) => {
	const bridge = fakeRuntime(t);
	bridge.connect();
	const socket = FakeWebSocket.instances[0];
	socket.open();
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

test("obsolete open, error, and supersession close callbacks cannot mutate the active socket", (t) => {
	const bridge = fakeRuntime(t);
	bridge.connect();
	const old = FakeWebSocket.instances[0];
	old.open();
	old.close(1006);
	t.mock.timers.tick(500);
	const current = FakeWebSocket.instances[1];
	current.open();
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
		bridge.handleEvent(event("session.status", { sessionID: "working", status: { type: "retry" } }));
		bridge.handleEvent(event("question.asked", { id: "question", sessionID: "working" }));
		first.close(code);
		t.mock.timers.tick(499);
		assert.equal(FakeWebSocket.instances.length, 1);
		t.mock.timers.tick(1);
		const recovered = FakeWebSocket.instances[1];
		recovered.open();
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
