import assert from "node:assert/strict";
import test from "node:test";

import { BridgeStatus } from "../../shared/protocol.mjs";
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

	emit(type) {
		for (const listener of this.listeners.get(type) ?? []) listener();
	}

	open() {
		this.readyState = 1;
		this.emit("open");
	}

	close() {
		this.readyState = 3;
		this.emit("close");
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
