import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { OpenCodeBridge } from "../../opencode-plugin/index.mjs";
import { StatusBridgeServer } from "../src/status-bridge-server.mjs";

test("two producers consume one mixed stream without mislabeling activity, attention, errors or recovery", async (t) => {
	const server = new StatusBridgeServer({ port: 0 });
	await once(server.server, "listening");
	t.after(() => server.close());
	const original = globalThis.WebSocket;
	globalThis.WebSocket = class {
		readyState = 0;
		listeners = new Map();
		messages = [];
		constructor() { this.peer = { close: (code) => this.close(code) }; }
		addEventListener(type, listener) { this.listeners.set(type, listener); }
		open() { this.readyState = 1; this.listeners.get("open")(); }
		send(payload) { this.messages.push(JSON.parse(payload)); server.handleMessage(this.peer, payload); }
		close(code = 1000) { this.readyState = 3; server.handleClose(this.peer); this.listeners.get("close")({ code }); }
	};
	t.after(() => { globalThis.WebSocket = original; });
	const owners = new Map([["a", "A"], ["b", "B"]]);
	const requests = [{ id: "pa", sessionID: "a" }, { id: "pb", sessionID: "b" }];
	const bridges = [];
	for (const projectID of ["A", "B"]) {
		const bridge = new OpenCodeBridge({
			location: { directory: `C:\\work\\${projectID}`, project: { id: projectID } },
			session: { get: async ({ sessionID }) => ({ id: sessionID, projectID: owners.get(sessionID) }) },
			permission: { request: { list: async () => ({ data: requests }) } },
		});
		bridges.push(bridge);
		t.after(() => bridge.dispose());
		await bridge.initialize(); bridge.socket.open(); await bridge.work;
	}
	const [a, b] = bridges;
	const statuses = (expected) => assert.deepEqual([server.registry.projectStatus("A"), server.registry.projectStatus("B"), server.registry.status], expected);
	const feed = async (type, data) => {
		const input = { type, data, location: { directory: "C:\\work\\B" } };
		await Promise.all(bridges.map((bridge) => bridge.handleEvent(input)));
	};
	assert.deepEqual(a.socket.messages[1].permissions, [{ permissionID: "pa", sessionID: "a" }]);
	assert.deepEqual(b.socket.messages[1].permissions, [{ permissionID: "pb", sessionID: "b" }]);
	await feed("permission.replied", { requestID: "pa", sessionID: "a" });
	await feed("permission.replied", { requestID: "pb", sessionID: "b" });
	requests.length = 0;
	statuses(["READY", "READY", "READY"]);
	await feed("session.execution.started", { sessionID: "a" });
	statuses(["BUSY", "READY", "BUSY"]);
	await feed("session.idle", { sessionID: "a" });
	await feed("session.execution.started", { sessionID: "b" });
	statuses(["READY", "BUSY", "BUSY"]);
	await feed("session.idle", { sessionID: "b" });
	await feed("session.execution.failed", { sessionID: "b" });
	statuses(["READY", "ERROR", "ERROR"]);
	await feed("session.idle", { sessionID: "a" });
	statuses(["READY", "ERROR", "ERROR"]);
	await feed("question.asked", { id: "qa", sessionID: "a" });
	statuses(["ATTENTION", "ERROR", "ATTENTION"]);
	await feed("form.created", { form: { id: "qb", sessionID: "b" } });
	statuses(["ATTENTION", "ATTENTION", "ATTENTION"]);
	await feed("question.replied", { requestID: "qa" });
	await feed("form.cancelled", { id: "qb" });
	await feed("session.execution.started", { sessionID: "a" });
	await feed("permission.asked", { id: "moving", sessionID: "a" });
	owners.set("a", "B");
	await feed("session.moved", { sessionID: "a", projectID: "B" });
	// Authoritative removal snapshots retain existing error-clearing semantics.
	statuses(["READY", "READY", "READY"]);
	await feed("session.execution.started", { sessionID: "a" });
	statuses(["READY", "BUSY", "BUSY"]);
	for (const bridge of bridges) {
		bridge.socket.close();
		clearTimeout(bridge.reconnectTimer); bridge.reconnectTimer = undefined;
		bridge.connect(); bridge.socket.open(); await bridge.work;
		assert.equal(bridge.socket.messages[0].type, "hello");
		const snapshot = bridge.socket.messages[1];
		for (const entry of [...snapshot.sessions, ...snapshot.permissions, ...snapshot.questions]) {
			assert.equal(owners.get(entry.sessionID), bridge.context.location.project.id);
		}
	}
	statuses(["READY", "BUSY", "BUSY"]);
	// Also prove ownership changes discovered without a move notification.
	owners.set("a", "A");
	await feed("session.idle", { sessionID: "a" });
	statuses(["READY", "READY", "READY"]);
});
