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
