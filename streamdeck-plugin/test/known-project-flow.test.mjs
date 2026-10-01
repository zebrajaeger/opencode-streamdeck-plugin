import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import WebSocket from "ws";

import { ProjectSelector } from "../src/actions/project-selector.ts";
import { KNOWN_PROJECTS_SETTINGS_KEY, KNOWN_PROJECTS_SETTINGS_VERSION, KnownProjectPersistence, KnownProjectStore } from "../src/known-projects.ts";
import { StatusBridgeServer } from "../src/status-bridge-server.mjs";

function hello(instanceID, projectID, directory) {
	return JSON.stringify({ version: 1, type: "hello", instanceID, projectID, directory });
}

function waitFor(condition) {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error("Timed out waiting for known project metadata")), 1_000);
		const interval = setInterval(() => {
			if (!condition()) return;
			clearTimeout(timeout);
			clearInterval(interval);
			resolve();
		}, 1);
	});
}

test("flows connected, offline persisted, and reconnected projects into the selected project ID", async (t) => {
	const bridge = new StatusBridgeServer({ port: 0 });
	await once(bridge.server, "listening");
	t.after(() => bridge.close());

	const messages = [];
	const selector = new ProjectSelector({ sendToPropertyInspector: async (payload) => messages.push(payload) });
	await selector.appear("key", undefined);
	const writes = [];
	const firstPersistence = new KnownProjectPersistence(
		new KnownProjectStore(),
		{ getGlobalSettings: async () => ({}), setGlobalSettings: async (settings) => writes.push(settings) },
		(projects) => selector.setKnownProjects(projects),
	);
	const unsubscribeFirst = bridge.subscribeKnownProject(({ projectID, directory }) => firstPersistence.observe(projectID, directory));
	await firstPersistence.load();

	const address = bridge.server.address();
	assert.equal(typeof address, "object");
	const firstConnection = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(firstConnection, "open");
	firstConnection.send(hello("first", "project-a", "C:\\work\\one\\app"));
	await waitFor(() => writes.length === 1);
	assert.deepEqual(messages.at(-1), {
		type: "known-projects",
		projects: [{ projectID: "project-a", directory: "C:\\work\\one\\app" }],
		selectedProjectID: undefined,
	});

	const persistedSettings = writes.at(-1);
	const restoredProjects = [];
	const restartedPersistence = new KnownProjectPersistence(
		new KnownProjectStore(),
		{ getGlobalSettings: async () => persistedSettings, setGlobalSettings: async () => undefined },
		(projects) => restoredProjects.push(projects),
	);
	await restartedPersistence.load();
	assert.deepEqual(restoredProjects.at(-1), [{ projectID: "project-a", directory: "C:\\work\\one\\app" }]);

	selector.setKnownProjects(restoredProjects.at(-1));
	await selector.updateSettings("key", "project-a");
	assert.deepEqual(messages.at(-1), {
		type: "known-projects",
		projects: [{ projectID: "project-a", directory: "C:\\work\\one\\app" }],
		selectedProjectID: "project-a",
	});

	const updatedWrites = [];
	const reconnectPersistence = new KnownProjectPersistence(
		new KnownProjectStore(),
		{ getGlobalSettings: async () => persistedSettings, setGlobalSettings: async (settings) => updatedWrites.push(settings) },
		() => undefined,
	);
	await reconnectPersistence.load();
	const reconnect = new WebSocket(`ws://127.0.0.1:${address.port}`);
	await once(reconnect, "open");
	const unsubscribeReconnect = bridge.subscribeKnownProject(({ projectID, directory }) => reconnectPersistence.observe(projectID, directory));
	reconnect.send(hello("reconnected", "project-a", "D:\\work\\two\\app"));
	await waitFor(() => updatedWrites.length === 1);
	assert.deepEqual(updatedWrites.at(-1)[KNOWN_PROJECTS_SETTINGS_KEY], {
		version: KNOWN_PROJECTS_SETTINGS_VERSION,
		projects: [{ projectID: "project-a", directory: "D:\\work\\two\\app" }],
	});

	const firstClosed = once(firstConnection, "close");
	firstConnection.close();
	await firstClosed;
	const reconnectClosed = once(reconnect, "close");
	reconnect.close();
	await reconnectClosed;
	assert.equal(unsubscribeFirst(), true);
	assert.equal(unsubscribeReconnect(), true);
});
