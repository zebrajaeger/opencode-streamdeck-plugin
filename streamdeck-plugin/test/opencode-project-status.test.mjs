import assert from "node:assert/strict";
import test from "node:test";

import { ProjectSelector } from "../src/actions/project-selector.ts";

test("sends initial and refreshed known-project selector payloads while the inspector is open", async () => {
	const messages = [];
	const selector = new ProjectSelector({ sendToPropertyInspector: async (payload) => messages.push(payload) });

	selector.setKnownProjects([{ projectID: "project-a", directory: "C:\\work\\alpha" }]);
	await selector.appear("key", "project-a");
	assert.deepEqual(messages.at(-1), {
		type: "known-projects",
		projects: [{ projectID: "project-a", directory: "C:\\work\\alpha" }],
		selectedProjectID: "project-a",
	});

	selector.setKnownProjects([{ projectID: "project-b", directory: "C:\\work\\beta" }]);
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(messages.at(-1), {
		type: "known-projects",
		projects: [{ projectID: "project-b", directory: "C:\\work\\beta" }],
		selectedProjectID: "project-a",
	});
});

test("does not send updates after the property inspector closes", async () => {
	const messages = [];
	const selector = new ProjectSelector({ sendToPropertyInspector: async (payload) => messages.push(payload) });
	await selector.appear("key", "project-a");
	selector.disappear("key");
	selector.setKnownProjects([{ projectID: "project-a", directory: "C:\\work\\alpha" }]);
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(messages.length, 1);
});
