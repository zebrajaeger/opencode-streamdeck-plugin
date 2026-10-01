import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import WebSocket from "ws";

import { StatusBridgeServer } from "../src/status-bridge-server.mjs";

function frame(type, properties = {}) {
	return JSON.stringify({ version: 1, type, instanceID: "bridge-instance", ...properties });
}

function waitForStatus(server, expected) {
	return new Promise((resolve) => {
		const unsubscribe = server.subscribe((status) => {
			if (status === expected) {
				unsubscribe();
				resolve();
			}
		});
	});
}

test("accepts a local WebSocket client on loopback and drops its state at disconnect", async (t) => {
	const bridge = new StatusBridgeServer({ port: 0 });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	assert.equal(address.address, "127.0.0.1");

	const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(client, "open");
	client.send(frame("hello"));
	await waitForStatus(bridge, "READY");

	client.send(frame("session.status", { sessionID: "session", status: "busy" }));
	await waitForStatus(bridge, "BUSY");

	client.send(frame("permission.asked", { permissionID: "permission", sessionID: "session" }));
	await waitForStatus(bridge, "ATTENTION");

	client.send("not valid json");
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(bridge.registry.status, "ATTENTION");

	const closed = once(client, "close");
	client.close();
	await closed;
	await waitForStatus(bridge, "OFFLINE");
});

test("a replacement connection retains an instance state until the active socket disconnects", async (t) => {
	const bridge = new StatusBridgeServer({ port: 0 });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	const firstClient = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(firstClient, "open");
	firstClient.send(frame("hello"));
	await waitForStatus(bridge, "READY");

	const firstClosed = once(firstClient, "close");
	const secondClient = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(secondClient, "open");
	secondClient.send(frame("hello"));
	await firstClosed;
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(bridge.registry.status, "READY");

	const secondClosed = once(secondClient, "close");
	secondClient.close();
	await secondClosed;
	await waitForStatus(bridge, "OFFLINE");
});

test("a newer source for one directory replaces its state and survives the older socket close", async (t) => {
	const bridge = new StatusBridgeServer({ port: 0 });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	const firstClient = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(firstClient, "open");
	firstClient.send(frame("hello", { instanceID: "first", directory: "C:\\work\\project" }));
	await waitForStatus(bridge, "READY");
	firstClient.send(frame("permission.asked", { instanceID: "first", permissionID: "old", sessionID: "session" }));
	await waitForStatus(bridge, "ATTENTION");

	const firstClosed = once(firstClient, "close");
	const secondClient = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(secondClient, "open");
	secondClient.send(frame("hello", { instanceID: "second", directory: "C:\\work\\project" }));
	await firstClosed;
	secondClient.send(frame("snapshot", {
		instanceID: "second",
		sessions: [{ sessionID: "replacement", status: "busy" }],
		permissions: [],
	}));
	await waitForStatus(bridge, "BUSY");
	assert.equal(bridge.registry.status, "BUSY");

	const secondClosed = once(secondClient, "close");
	secondClient.close();
	await secondClosed;
	await waitForStatus(bridge, "OFFLINE");
});

test("sources for different directories aggregate according to status priority", async (t) => {
	const bridge = new StatusBridgeServer({ port: 0 });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	const firstClient = new WebSocket(`ws://127.0.0.1:${address.port}`);
	const secondClient = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await Promise.all([once(firstClient, "open"), once(secondClient, "open")]);
	firstClient.send(frame("hello", { instanceID: "first", directory: "C:\\work\\one" }));
	secondClient.send(frame("hello", { instanceID: "second", directory: "C:\\work\\two" }));
	await waitForStatus(bridge, "READY");

	firstClient.send(frame("session.status", { instanceID: "first", sessionID: "busy", status: "busy" }));
	await waitForStatus(bridge, "BUSY");
	secondClient.send(frame("permission.asked", { instanceID: "second", permissionID: "asked", sessionID: "waiting" }));
	await waitForStatus(bridge, "ATTENTION");
	secondClient.send(frame("permission.replied", { instanceID: "second", permissionID: "asked" }));
	await waitForStatus(bridge, "BUSY");
});
