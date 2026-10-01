import assert from "node:assert/strict";
import test from "node:test";

import { KNOWN_PROJECTS_SETTINGS_KEY, KNOWN_PROJECTS_SETTINGS_VERSION, KnownProjectPersistence, KnownProjectStore } from "../src/known-projects.ts";

test("loads validated versioned known projects and writes a normalized snapshot", () => {
	const store = new KnownProjectStore();
	store.load({
		[KNOWN_PROJECTS_SETTINGS_KEY]: {
			version: KNOWN_PROJECTS_SETTINGS_VERSION,
			projects: [
				{ projectID: "project-b", directory: "C:\\work\\b" },
				{ projectID: "", directory: "C:\\work\\invalid" },
				{ projectID: "project-a", directory: "C:\\work\\a" },
			],
		},
	});
	assert.deepEqual(store.list(), [
		{ projectID: "project-a", directory: "C:\\work\\a" },
		{ projectID: "project-b", directory: "C:\\work\\b" },
	]);
	assert.deepEqual(store.withPersistedProjects({ unrelated: "retained" }), {
		unrelated: "retained",
		[KNOWN_PROJECTS_SETTINGS_KEY]: {
			version: KNOWN_PROJECTS_SETTINGS_VERSION,
			projects: [
				{ projectID: "project-a", directory: "C:\\work\\a" },
				{ projectID: "project-b", directory: "C:\\work\\b" },
			],
		},
	});
});

test("ignores malformed persisted settings and preserves a handshake observed before loading", () => {
	const store = new KnownProjectStore();
	assert.equal(store.observe("project-live", "C:\\work\\live"), true);
	store.load({ [KNOWN_PROJECTS_SETTINGS_KEY]: { version: 2, projects: [{ projectID: "project-old", directory: "C:\\work\\old" }] } });
	assert.deepEqual(store.list(), [{ projectID: "project-live", directory: "C:\\work\\live" }]);
	assert.equal(store.observe("project-live", "C:\\work\\live"), false);
	assert.equal(store.observe("project-live", "C:\\work\\replacement"), true);
	assert.deepEqual(store.list(), [{ projectID: "project-live", directory: "C:\\work\\replacement" }]);
});

test("round trips known project metadata through global settings", () => {
	const first = new KnownProjectStore();
	first.observe("project-a", "/work/a");
	const second = new KnownProjectStore();
	second.load(first.withPersistedProjects({}));
	assert.deepEqual(second.list(), [{ projectID: "project-a", directory: "/work/a" }]);
});

test("publishes offline persisted projects after startup and persists reconnect metadata in order", async () => {
	const writes = [];
	const published = [];
	const persistence = new KnownProjectPersistence(
		new KnownProjectStore(),
		{
			getGlobalSettings: async () => ({
				[KNOWN_PROJECTS_SETTINGS_KEY]: { version: KNOWN_PROJECTS_SETTINGS_VERSION, projects: [{ projectID: "project-a", directory: "C:\\old\\app" }] },
			}),
			setGlobalSettings: async (settings) => writes.push(settings),
		},
		(projects) => published.push(projects),
	);
	await persistence.load();
	assert.deepEqual(published.at(-1), [{ projectID: "project-a", directory: "C:\\old\\app" }]);
	persistence.observe("project-a", "D:\\new\\app");
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(writes.at(-1)[KNOWN_PROJECTS_SETTINGS_KEY].projects, [{ projectID: "project-a", directory: "D:\\new\\app" }]);
});

test("retains changed metadata for a later serialized write when a write is already in progress", async () => {
	const writes = [];
	let finishFirstWrite;
	const firstWrite = new Promise((resolve) => { finishFirstWrite = resolve; });
	const persistence = new KnownProjectPersistence(
		new KnownProjectStore(),
		{
			getGlobalSettings: async () => ({}),
			setGlobalSettings: async (settings) => {
				writes.push(settings);
				if (writes.length === 1) await firstWrite;
			},
		},
		() => undefined,
	);
	await persistence.load();
	persistence.observe("project-a", "C:\\first\\app");
	await new Promise((resolve) => setImmediate(resolve));
	persistence.observe("project-a", "D:\\second\\app");
	finishFirstWrite();
	await new Promise((resolve) => setImmediate(resolve));
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(writes.map((settings) => settings[KNOWN_PROJECTS_SETTINGS_KEY].projects), [
		[{ projectID: "project-a", directory: "C:\\first\\app" }],
		[{ projectID: "project-a", directory: "D:\\second\\app" }],
	]);
});
