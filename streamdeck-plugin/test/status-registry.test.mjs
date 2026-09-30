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

test("replaces state with a reconnect snapshot and removes it on disconnect", () => {
	const registry = new StatusRegistry();
	registry.connect(INSTANCE);
	registry.apply(frame("snapshot", {
		sessions: [{ sessionID: "working", status: BridgeStatus.BUSY }],
		permissions: [{ permissionID: "pending", sessionID: "working" }],
	}));
	assert.equal(registry.status, "ATTENTION");

	registry.apply(frame("snapshot", { sessions: [], permissions: [] }));
	assert.equal(registry.status, "READY");

	registry.disconnect(INSTANCE);
	assert.equal(registry.status, "OFFLINE");
});
