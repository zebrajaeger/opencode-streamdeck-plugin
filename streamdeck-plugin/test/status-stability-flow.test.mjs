import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { OpenCodeBridge } from "../../opencode-plugin/index.mjs";
import { StatusActionRenderer } from "../src/actions/particle-wait-animation.ts";
import { ProjectStatusSubscriptions } from "../src/actions/project-status-subscriptions.ts";
import { StatusBridgeServer } from "../src/status-bridge-server.mjs";

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("accidental duplicate setups retire once and replacement owns project/global reports beyond retry intervals", async (t) => {
	const server = new StatusBridgeServer({ port: 0 });
	await once(server.server, "listening");
	t.after(() => server.close());
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const sockets = [];
	const original = globalThis.WebSocket;
	globalThis.WebSocket = class {
		readyState = 0;
		listeners = new Map();
		constructor() {
			this.peer = { close: (code = 1000) => this.close(code) };
			sockets.push(this);
		}
		addEventListener(type, listener) { this.listeners.set(type, listener); }
		open() { this.readyState = 1; this.listeners.get("open")(); }
		send(payload) { server.handleMessage(this.peer, payload); }
		close(code = 1000) {
			this.readyState = 3;
			server.handleClose(this.peer);
			this.listeners.get("close")({ code });
		}
	};
	t.after(() => { globalThis.WebSocket = original; });
	const context = { location: { directory: "C:\\work\\project", project: { id: "project" } }, permission: { request: { list: async () => ({ data: [] }) } } };
	const old = new OpenCodeBridge(context), replacement = new OpenCodeBridge(context);
	t.after(() => { old.dispose(); replacement.dispose(); });
	const project = [], global = [];
	server.subscribeProject("project", (status) => project.push(status));
	server.subscribe((status) => global.push(status));
	await old.initialize();
	sockets[0].open();
	old.handleEvent({ type: "session.execution.started", data: { sessionID: "old" } });
	await replacement.initialize();
	sockets[1].open();
	assert.equal(old.superseded, true);
	assert.equal(server.registry.projectStatus("project"), "READY");
	const stableProject = project.length, stableGlobal = global.length;
	for (let i = 0; i < 20; i++) {
		t.mock.timers.tick(500);
		old.handleEvent({ type: "session.execution.started", data: { sessionID: "old" } });
		replacement.handleEvent({ type: "session.idle", data: { sessionID: "current" } });
	}
	assert.equal(sockets.length, 2);
	assert.equal(project.length, stableProject);
	assert.equal(global.length, stableGlobal);
	for (let i = 0; i < 5; i++) replacement.handleEvent({ type: "session.status", data: { sessionID: "current", status: { type: "retry" } } });
	assert.equal(project.at(-1), "BUSY");
	assert.equal(global.at(-1), "BUSY");
	assert.equal(project.length, stableProject + 1);
	replacement.handleEvent({ type: "session.execution.succeeded", data: { sessionID: "current" } });
	assert.equal(project.at(-1), "READY");
	assert.equal(global.at(-1), "READY");
	assert.equal(server.instanceSockets.get(replacement.instanceID), sockets[1].peer);
	assert.equal(server.registry.instances.size, 1);
	// An ordinary bridge restart still recovers this lifecycle, never the retired one.
	sockets[1].close(1000);
	assert.equal(project.at(-1), "OFFLINE");
	t.mock.timers.tick(500);
	sockets[2].open();
	assert.equal(project.at(-1), "READY");
	assert.equal(sockets.length, 3);
	assert.equal(old.reconnectTimer, undefined);
});

test("project subscription lifecycle permits equal-status selection refresh and READY/BUSY reappearance", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const server = new StatusBridgeServer({ port: 0 });
	await once(server.server, "listening");
	t.after(() => server.close());
	server.registry.connect("a", "project-a");
	server.registry.connect("b", "project-b");
	const key = { id: "key", titles: [], images: [], async setTitle(title) { this.titles.push(title); }, async setImage(image) { this.images.push(image); } };
	const renderer = new StatusActionRenderer();
	let status;
	const subscriptions = new ProjectStatusSubscriptions((id, value) => { status = value; renderer.setStatus(value, [key]); });
	subscriptions.setSubscriber((projectID, listener) => server.subscribeProject(projectID, listener));
	subscriptions.update(key.id, "project-a");
	await renderer.renderStatus(key, status);
	await flush();
	const first = key.images.length;
	subscriptions.update(key.id, "project-b");
	await renderer.renderStatus(key, status);
	assert.equal(key.images.length, first + 1);
	subscriptions.dispose(key.id);
	await renderer.dispose(key.id);
	subscriptions.update(key.id, "project-b");
	await renderer.renderStatus(key, status);
	assert.equal(key.images.length, first + 2);
	server.registry.apply({ instanceID: "b", type: "session.status", sessionID: "session", status: "busy" });
	await flush();
	assert.equal(renderer.animationCount, 1);
	subscriptions.dispose(key.id);
	await renderer.dispose(key.id);
	subscriptions.update(key.id, "project-b");
	await renderer.renderStatus(key, status);
	await flush();
	assert.equal(key.titles.at(-1), "BUSY");
	assert.equal(renderer.animationCount, 1);
	subscriptions.dispose(key.id);
	await renderer.dispose(key.id);
});
