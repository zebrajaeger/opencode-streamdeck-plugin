import assert from "node:assert/strict";
import test from "node:test";

import { ProjectSelector } from "../src/actions/project-selector.ts";
import { StatusActionRenderer } from "../src/actions/status-action-renderer.ts";
import { ProjectStatusSubscriptions } from "../src/actions/project-status-subscriptions.ts";
import { StatusRegistry } from "../../shared/status-registry.mjs";

test("equal-attention project selection refresh and reappearance retain current presentation without restarting other keys", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const registry = new StatusRegistry();
	registry.connect("a", "A"); registry.connect("b", "B");
	registry.apply({ instanceID: "a", type: "question.asked", questionID: "qa", sessionID: "a" });
	registry.apply({ instanceID: "b", type: "question.asked", questionID: "qb", sessionID: "b" });
	const key = { id: "project", images: [], titles: [], async setImage(image) { this.images.push(image); }, async setTitle(title) { this.titles.push(title); } };
	let now = 0;
	const renderer = new StatusActionRenderer({ now: () => now });
	let status;
	const subscriptions = new ProjectStatusSubscriptions((id, value) => { status = value; renderer.setStatus(value, [key]); });
	subscriptions.setSubscriber((projectID, listener) => registry.subscribeProject(projectID, listener));
	t.after(async () => { subscriptions.dispose(key.id); await renderer.dispose(key.id); });
	subscriptions.update(key.id, "A"); await new Promise(setImmediate);
	now = 700; t.mock.timers.tick(100); await new Promise(setImmediate);
	const current = key.images.at(-1);
	subscriptions.update(key.id, "B"); await renderer.renderStatus(key, status);
	assert.equal(key.images.at(-1), current); assert.deepEqual(key.titles, ["ATTENTION"]);
	await renderer.dispose(key.id); const hidden = key.images.length;
	now = 1000; t.mock.timers.tick(400); await new Promise(setImmediate); assert.equal(key.images.length, hidden);
	await renderer.renderStatus(key, status); await new Promise(setImmediate);
	assert.equal(key.images.length, hidden + 1); assert.equal(renderer.animationCount, 1);
});

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
