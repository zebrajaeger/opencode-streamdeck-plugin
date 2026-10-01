import assert from "node:assert/strict";
import test from "node:test";

import { BridgeStatus } from "../../shared/protocol.mjs";
import { StatusRegistry } from "../../shared/status-registry.mjs";

const INSTANCE = "instance-a";

function frame(type, properties = {}) {
	return { version: 1, type, instanceID: INSTANCE, ...properties };
}

test("returns OFFLINE without a bridge connection", () => {
	assert.equal(new StatusRegistry().status, "OFFLINE");
});

test("aggregates READY, BUSY, ERROR, and ATTENTION by precedence", () => {
	const registry = new StatusRegistry();
	registry.connect(INSTANCE);
	assert.equal(registry.status, "READY");

	registry.apply(frame("session.status", { sessionID: "one", status: BridgeStatus.BUSY }));
	assert.equal(registry.status, "BUSY");

	registry.apply(frame("session.error", { sessionID: "two" }));
	assert.equal(registry.status, "ERROR");

	registry.apply(frame("permission.asked", { permissionID: "permission", sessionID: "one" }));
	assert.equal(registry.status, "ATTENTION");

	registry.apply(frame("permission.replied", { permissionID: "permission" }));
	assert.equal(registry.status, "ERROR");
});

test("keeps ATTENTION while permissions and questions coexist, then restores session status", () => {
	const registry = new StatusRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.status", { sessionID: "working", status: BridgeStatus.BUSY }));
	registry.apply(frame("question.asked", { questionID: "question", sessionID: "working" }));
	assert.equal(registry.status, "ATTENTION");

	registry.apply(frame("permission.asked", { permissionID: "permission", sessionID: "working" }));
	registry.apply(frame("question.resolved", { questionID: "question" }));
	assert.equal(registry.status, "ATTENTION");

	registry.apply(frame("permission.replied", { permissionID: "permission" }));
	assert.equal(registry.status, "BUSY");
});

test("a resolved question restores ERROR or READY", () => {
	const registry = new StatusRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("session.error", { sessionID: "errored" }));
	registry.apply(frame("question.asked", { questionID: "question", sessionID: "errored" }));
	assert.equal(registry.status, "ATTENTION");
	registry.apply(frame("question.resolved", { questionID: "question" }));
	assert.equal(registry.status, "ERROR");

	registry.apply(frame("snapshot", { sessions: [], permissions: [], questions: [{ questionID: "question", sessionID: "waiting" }] }));
	assert.equal(registry.status, "ATTENTION");
	registry.apply(frame("question.resolved", { questionID: "question" }));
	assert.equal(registry.status, "READY");
});

test("replaces state with a reconnect snapshot and removes it on disconnect", () => {
	const registry = new StatusRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("snapshot", {
		sessions: [{ sessionID: "working", status: BridgeStatus.BUSY }],
		permissions: [{ permissionID: "pending", sessionID: "working" }],
		questions: [{ questionID: "question", sessionID: "working" }],
	}));
	assert.equal(registry.status, "ATTENTION");

	registry.apply(frame("snapshot", { sessions: [], permissions: [], questions: [] }));
	assert.equal(registry.status, "READY");

	registry.disconnect(INSTANCE);
	assert.equal(registry.status, "OFFLINE");
});
