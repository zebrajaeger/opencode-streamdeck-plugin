import assert from "node:assert/strict";
import test from "node:test";

import { BridgeStatus } from "../../shared/protocol.mjs";
import { ERROR_INDICATION_DURATION_MS, StatusRegistry } from "../../shared/status-registry.mjs";

const INSTANCE = "instance-a";

function frame(type, properties = {}) {
	return { version: 1, type, instanceID: INSTANCE, ...properties };
}

function createClock() {
	let now = 0;
	let nextTimerID = 1;
	const timers = new Map();
	return {
		now: () => now,
		setTimeout(callback, delay) {
			const timerID = nextTimerID++;
			timers.set(timerID, { callback, at: now + delay });
			return timerID;
		},
		clearTimeout(timerID) {
			timers.delete(timerID);
		},
		advance(duration) {
			now += duration;
			for (const [timerID, timer] of [...timers]) {
				if (timer.at > now) continue;
				timers.delete(timerID);
				timer.callback();
			}
		},
		get timerCount() {
			return timers.size;
		},
	};
}

function createRegistry() {
	const clock = createClock();
	return { clock, registry: new StatusRegistry(clock) };
}

test("returns OFFLINE without a bridge connection", () => {
	assert.equal(new StatusRegistry().status, "OFFLINE");
});

test("aggregates status within a project without changing global aggregation", () => {
	const { registry } = createRegistry();
	registry.connect(INSTANCE, "project-a");
	registry.connect("instance-b", "project-b");
	registry.connect("legacy-instance");
	registry.apply(frame("session.status", { sessionID: "working", status: BridgeStatus.BUSY }));
	registry.apply({ ...frame("permission.asked", { permissionID: "other-project", sessionID: "waiting" }), instanceID: "instance-b" });
	registry.apply({ ...frame("session.error", { sessionID: "legacy-error" }), instanceID: "legacy-instance" });

	assert.equal(registry.status, "ATTENTION");
	assert.equal(registry.projectStatus("project-a"), "BUSY");
	assert.equal(registry.projectStatus("project-b"), "ATTENTION");
	assert.equal(registry.projectStatus("missing"), "OFFLINE");
});

test("notifies project subscribers only with their scoped aggregate status", () => {
	const { registry } = createRegistry();
	const projectAStatuses = [];
	registry.subscribeProject("project-a", (status) => projectAStatuses.push(status));
	registry.connect(INSTANCE, "project-a");
	registry.connect("instance-b", "project-b");
	registry.apply({ ...frame("permission.asked", { permissionID: "other-project", sessionID: "waiting" }), instanceID: "instance-b" });
	registry.apply(frame("session.status", { sessionID: "working", status: BridgeStatus.BUSY }));
	registry.disconnect(INSTANCE);

	assert.deepEqual(projectAStatuses, ["OFFLINE", "READY", "BUSY", "OFFLINE"]);
});

test("displays an error immediately, then expires it after fifteen seconds", () => {
	const { clock, registry } = createRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.error", { sessionID: "failed" }));
	assert.equal(registry.status, "ERROR");
	assert.equal(clock.timerCount, 1);

	clock.advance(ERROR_INDICATION_DURATION_MS - 1);
	assert.equal(registry.status, "ERROR");
	clock.advance(1);
	assert.equal(registry.status, "READY");
	assert.equal(clock.timerCount, 0);
});

test("a failed session stops contributing BUSY once its error indication expires", () => {
	const { clock, registry } = createRegistry();
	const statuses = [];
	registry.subscribe((status) => statuses.push(status));
	registry.connect(INSTANCE);
	registry.apply(frame("session.status", { sessionID: "failing", status: BridgeStatus.BUSY }));
	registry.apply(frame("session.error", { sessionID: "failing" }));

	clock.advance(ERROR_INDICATION_DURATION_MS - 1);
	assert.equal(registry.status, "ERROR");
	clock.advance(1);
	assert.equal(registry.status, "READY");
	assert.deepEqual(statuses, ["OFFLINE", "READY", "BUSY", "ERROR", "READY"]);
	assert.equal(clock.timerCount, 0);
});

test("failure recovery leaves other sessions, permissions and questions untouched", () => {
	const { clock, registry } = createRegistry();
	const { clock: attentionClock, registry: attention } = createRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.status", { sessionID: "failing", status: BridgeStatus.BUSY }));
	registry.apply(frame("session.status", { sessionID: "working", status: BridgeStatus.BUSY }));
	registry.apply(frame("session.error", { sessionID: "failing" }));
	clock.advance(ERROR_INDICATION_DURATION_MS);
	assert.equal(registry.status, "BUSY");
	registry.apply(frame("session.idle", { sessionID: "working" }));
	assert.equal(registry.status, "READY");

	attention.connect(INSTANCE);
	attention.apply(frame("session.status", { sessionID: "failing", status: BridgeStatus.BUSY }));
	attention.apply(frame("permission.asked", { permissionID: "permission", sessionID: "failing" }));
	attention.apply(frame("question.asked", { questionID: "question", sessionID: "failing" }));
	attention.apply(frame("session.error", { sessionID: "failing" }));
	assert.equal(attention.status, "ATTENTION");
	attention.apply(frame("permission.replied", { permissionID: "permission" }));
	assert.equal(attention.status, "ATTENTION");
	attention.apply(frame("question.resolved", { questionID: "question" }));
	// Resolving a request does not clear the transient indication; it expires.
	assert.equal(attention.status, "ERROR");
	attentionClock.advance(ERROR_INDICATION_DURATION_MS);
	assert.equal(attention.status, "READY");
});

test("repeated failures restart the indication and later work restores BUSY", () => {
	const { clock, registry } = createRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.status", { sessionID: "failing", status: BridgeStatus.BUSY }));
	registry.apply(frame("session.error", { sessionID: "failing" }));
	clock.advance(ERROR_INDICATION_DURATION_MS - 1);
	registry.apply(frame("session.error", { sessionID: "failing" }));
	clock.advance(ERROR_INDICATION_DURATION_MS - 1);
	assert.equal(registry.status, "ERROR");
	clock.advance(1);
	assert.equal(registry.status, "READY");

	registry.apply(frame("session.status", { sessionID: "failing", status: BridgeStatus.BUSY }));
	assert.equal(registry.status, "BUSY");
	registry.apply(frame("session.error", { sessionID: "failing" }));
	registry.disconnect(INSTANCE);
	assert.equal(registry.status, "OFFLINE");
	assert.equal(clock.timerCount, 0);
});

test("new local BUSY and READY session events replace an error indication", () => {
	for (const [type, properties, expected] of [
		["session.status", { sessionID: "working", status: BridgeStatus.BUSY }, "BUSY"],
		["session.idle", { sessionID: "finished" }, "READY"],
	]) {
		const { clock, registry } = createRegistry();
		registry.connect(INSTANCE);
		registry.apply(frame("session.error", { sessionID: "failed" }));
		registry.apply(frame(type, properties));
		assert.equal(registry.status, expected);
		assert.equal(clock.timerCount, 0);
	}
});

test("a new attention event replaces an error indication", () => {
	const { clock, registry } = createRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.error", { sessionID: "failed" }));
	registry.apply(frame("permission.asked", { permissionID: "pending", sessionID: "waiting" }));
	assert.equal(registry.status, "ATTENTION");
	assert.equal(clock.timerCount, 0);
});

test("ATTENTION takes precedence over errors and busy live state", () => {
	const { registry } = createRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.status", { sessionID: "working", status: BridgeStatus.BUSY }));
	registry.apply(frame("session.error", { sessionID: "failed" }));
	assert.equal(registry.status, "ERROR");
	registry.apply(frame("question.asked", { questionID: "question", sessionID: "working" }));
	assert.equal(registry.status, "ATTENTION");
});

test("errors are isolated per instance and durable live state aggregates as BUSY then READY", () => {
	const { registry } = createRegistry();
	registry.connect(INSTANCE);
	registry.connect("instance-b");
	registry.apply(frame("session.status", { sessionID: "working", status: BridgeStatus.BUSY }));
	registry.apply({ ...frame("session.error", { sessionID: "failed" }), instanceID: "instance-b" });
	assert.equal(registry.status, "ERROR");
	registry.apply({ ...frame("session.idle", { sessionID: "recovered" }), instanceID: "instance-b" });
	assert.equal(registry.status, "BUSY");
	registry.apply(frame("session.idle", { sessionID: "working" }));
	assert.equal(registry.status, "READY");
});

test("a snapshot replaces state and clears its earlier error indication", () => {
	const { clock, registry } = createRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.error", { sessionID: "failed" }));
	registry.apply(frame("snapshot", {
		sessions: [{ sessionID: "working", status: BridgeStatus.BUSY }],
		permissions: [],
		questions: [],
	}));
	assert.equal(registry.status, "BUSY");
	assert.equal(clock.timerCount, 0);
});

test("disconnect clears a pending error timer and removes all instance state", () => {
	const { clock, registry } = createRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.error", { sessionID: "failed" }));
	registry.disconnect(INSTANCE);
	assert.equal(registry.status, "OFFLINE");
	assert.equal(clock.timerCount, 0);

	clock.advance(ERROR_INDICATION_DURATION_MS);
	assert.equal(registry.status, "OFFLINE");
});

test("notifies subscribers when an error expires", () => {
	const { clock, registry } = createRegistry();
	const statuses = [];
	registry.subscribe((status) => statuses.push(status));
	registry.connect(INSTANCE);
	registry.apply(frame("session.error", { sessionID: "failed" }));
	clock.advance(ERROR_INDICATION_DURATION_MS);
	assert.deepEqual(statuses, ["OFFLINE", "READY", "ERROR", "READY"]);
});

test("each subscriber gets initial delivery and only effective changes, including reentrant notifications", () => {
	const { registry } = createRegistry();
	const global = [], project = [], other = [];
	registry.subscribe((status) => { global.push(status); registry.notify(); });
	const unsubscribe = registry.subscribeProject("project", (status) => project.push(status));
	registry.subscribeProject("other", (status) => other.push(status));
	registry.connect(INSTANCE, "project");
	for (let i = 0; i < 3; i++) {
		registry.apply(frame("snapshot", { sessions: [], permissions: [], questions: [] }));
		registry.apply(frame("session.idle", { sessionID: "session" }));
	}
	registry.connect("other", "other");
	for (let i = 0; i < 3; i++) registry.apply(frame("session.status", { sessionID: "session", status: "busy" }));
	registry.apply(frame("permission.asked", { instanceID: "other", sessionID: "other", permissionID: "permission" }));
	assert.deepEqual(project, ["OFFLINE", "READY", "BUSY"]);
	assert.deepEqual(global, ["OFFLINE", "READY", "BUSY", "ATTENTION"]);
	assert.deepEqual(other, ["OFFLINE", "READY", "ATTENTION"]);
	const fresh = [];
	registry.subscribeProject("project", (status) => fresh.push(status));
	assert.deepEqual(fresh, ["BUSY"]);
	unsubscribe();
	registry.disconnect(INSTANCE);
	assert.deepEqual(project, ["OFFLINE", "READY", "BUSY"]);
	assert.deepEqual(fresh, ["BUSY", "OFFLINE"]);
});

test("single-instance multi-session transitions and precedence are immediate without debounce", () => {
	const { registry, clock } = createRegistry();
	const statuses = [];
	registry.subscribeProject("project", (status) => statuses.push(status));
	registry.connect(INSTANCE, "project");
	const apply = (type, properties) => registry.apply(frame(type, properties));
	apply("session.status", { sessionID: "one", status: "busy" });
	apply("session.status", { sessionID: "two", status: "busy" });
	apply("session.idle", { sessionID: "one" });
	assert.equal(statuses.at(-1), "BUSY");
	apply("permission.asked", { permissionID: "permission", sessionID: "two" });
	apply("question.asked", { questionID: "question", sessionID: "two" });
	apply("permission.replied", { permissionID: "permission" });
	assert.equal(statuses.at(-1), "ATTENTION");
	apply("question.resolved", { questionID: "question" });
	assert.equal(statuses.at(-1), "BUSY");
	apply("session.error", { sessionID: "two" });
	assert.equal(statuses.at(-1), "ERROR");
	apply("session.status", { sessionID: "two", status: "busy" });
	assert.equal(statuses.at(-1), "BUSY");
	assert.equal(clock.timerCount, 0);
	apply("session.error", { sessionID: "two" });
	clock.advance(ERROR_INDICATION_DURATION_MS);
	// The failed session no longer contributes BUSY, so no idle event is needed.
	assert.equal(statuses.at(-1), "READY");
	apply("session.idle", { sessionID: "two" });
	assert.equal(statuses.at(-1), "READY");
	registry.disconnect(INSTANCE);
	assert.equal(statuses.at(-1), "OFFLINE");
	assert.equal(clock.timerCount, 0);
	assert.deepEqual(statuses, ["OFFLINE", "READY", "BUSY", "ATTENTION", "BUSY", "ERROR", "BUSY", "ERROR", "READY", "OFFLINE"]);
});
