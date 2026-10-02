import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import WebSocket from "ws";
import { SOURCE_SUPERSEDED_CLOSE_CODE } from "../../shared/protocol.mjs";

import { ERROR_INDICATION_DURATION_MS, StatusRegistry } from "../../shared/status-registry.mjs";
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

function waitForProjectStatus(server, projectID, expected) {
	return new Promise((resolve) => {
		const unsubscribe = server.subscribeProject(projectID, (status) => {
			if (status === expected) {
				unsubscribe();
				resolve();
			}
		});
	});
}

function createClock() {
	let now = 0;
	const timers = new Map();
	let nextTimerID = 1;
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
	};
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

test("question frames transition a busy client through ATTENTION and restore its session status", async (t) => {
	const bridge = new StatusBridgeServer({ port: 0 });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(client, "open");
	client.send(frame("hello"));
	await waitForStatus(bridge, "READY");
	client.send(frame("session.status", { sessionID: "session", status: "busy" }));
	await waitForStatus(bridge, "BUSY");

	client.send(frame("question.asked", { questionID: "reply", sessionID: "session" }));
	await waitForStatus(bridge, "ATTENTION");
	client.send(frame("question.resolved", { questionID: "reply" }));
	await waitForStatus(bridge, "BUSY");

	client.send(frame("question.asked", { questionID: "reject", sessionID: "session" }));
	await waitForStatus(bridge, "ATTENTION");
	client.send(frame("question.resolved", { questionID: "reject" }));
	await waitForStatus(bridge, "BUSY");

	const closed = once(client, "close");
	client.close();
	await closed;
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
	assert.equal((await firstClosed)[0], SOURCE_SUPERSEDED_CLOSE_CODE);
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
	assert.equal((await firstClosed)[0], SOURCE_SUPERSEDED_CLOSE_CODE);
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

test("isolates project status while retaining global aggregation and disconnect behavior", async (t) => {
	const bridge = new StatusBridgeServer({ port: 0 });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	const projectA = new WebSocket(`ws://127.0.0.1:${address.port}`);
	const projectASecond = new WebSocket(`ws://127.0.0.1:${address.port}`);
	const projectB = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await Promise.all([once(projectA, "open"), once(projectASecond, "open"), once(projectB, "open")]);
	projectA.send(frame("hello", { instanceID: "project-a-one", projectID: "project-a" }));
	projectASecond.send(frame("hello", { instanceID: "project-a-two", projectID: "project-a" }));
	projectB.send(frame("hello", { instanceID: "project-b", projectID: "project-b" }));
	await waitForProjectStatus(bridge, "project-a", "READY");

	projectB.send(frame("permission.asked", { instanceID: "project-b", permissionID: "asked", sessionID: "waiting" }));
	await waitForStatus(bridge, "ATTENTION");
	assert.equal(bridge.registry.projectStatus("project-a"), "READY");

	projectASecond.send(frame("session.status", { instanceID: "project-a-two", sessionID: "working", status: "busy" }));
	await waitForProjectStatus(bridge, "project-a", "BUSY");

	const firstClosed = once(projectA, "close");
	projectA.close();
	await firstClosed;
	assert.equal(bridge.registry.projectStatus("project-a"), "BUSY");

	const secondClosed = once(projectASecond, "close");
	projectASecond.close();
	await secondClosed;
	await waitForProjectStatus(bridge, "project-a", "OFFLINE");

	const projectBClosed = once(projectB, "close");
	projectB.close();
	await projectBClosed;
});

test("publishes known project metadata only for complete handshakes and refreshes directories", async (t) => {
	const bridge = new StatusBridgeServer({ port: 0 });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const projects = [];
	bridge.subscribeKnownProject((project) => projects.push(project));
	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(client, "open");
	client.send(frame("hello", { instanceID: "missing-directory", projectID: "project-a" }));
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(projects, []);

	client.send(frame("hello", { instanceID: "first", projectID: "project-a", directory: "C:\\work\\first" }));
	await new Promise((resolve) => setImmediate(resolve));
	client.send(frame("hello", { instanceID: "second", projectID: "project-a", directory: "C:\\work\\second" }));
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(projects, [
		{ projectID: "project-a", directory: "C:\\work\\first" },
		{ projectID: "project-a", directory: "C:\\work\\second" },
	]);
});

test("session errors are transient and reconnect snapshots do not restore them", async (t) => {
	const clock = createClock();
	const registry = new StatusRegistry(clock);
	const bridge = new StatusBridgeServer({ port: 0, registry });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(client, "open");
	client.send(frame("hello"));
	await waitForStatus(bridge, "READY");

	client.send(frame("session.error", { sessionID: "failed" }));
	await waitForStatus(bridge, "ERROR");
	client.send(frame("session.status", { sessionID: "recovered", status: "busy" }));
	await waitForStatus(bridge, "BUSY");

	client.send(frame("session.error", { sessionID: "failed-again" }));
	await waitForStatus(bridge, "ERROR");
	const busyAfterExpiry = waitForStatus(bridge, "BUSY");
	clock.advance(ERROR_INDICATION_DURATION_MS);
	await busyAfterExpiry;

	const firstClosed = once(client, "close");
	client.close();
	await firstClosed;
	const reconnect = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(reconnect, "open");
	reconnect.send(frame("hello"));
	await waitForStatus(bridge, "READY");
	reconnect.send(frame("snapshot", { sessions: [], permissions: [], questions: [] }));
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(bridge.registry.status, "READY");

	const reconnectClosed = once(reconnect, "close");
	reconnect.close();
	await reconnectClosed;
});
