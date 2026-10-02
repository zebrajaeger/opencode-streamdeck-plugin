import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Node's type stripping cannot execute decorators; compile only the action under test.
const sourceURL = new URL("../src/actions/opencode-project-status.ts", import.meta.url);
const source = await readFile(sourceURL, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
	.replace(/from "([^"]+)"/g, (_, specifier) => `from "${specifier.startsWith(".") ? new URL(`${specifier}.ts`, sourceURL).href : import.meta.resolve(specifier)}"`);
const { OpenCodeProjectStatus } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
const decode = (image) => decodeURIComponent(image.split(",")[1]);

test("action lifecycle restores per-key presentation and updates project subscriptions independently", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const action = new OpenCodeProjectStatus();
	const keys = ["a", "b"].map((id) => ({ id, images: [], titles: [], isKey: () => true, async setImage(image) { this.images.push(image); }, async setTitle(title) { this.titles.push(title); } }));
	Object.defineProperty(action, "actions", { value: keys });
	const listeners = new Map();
	action.setProjectSubscriber((projectID, listener) => {
		listeners.set(projectID, listener);
		listener(projectID === "project-a" ? "BUSY" : "READY");
		return () => listeners.delete(projectID);
	});
	const event = (key, settings) => ({ action: key, payload: { settings } });
	const settings = { projectID: "project-a", projectName: "Alpha", namePosition: "top", statusPosition: "middle" };
	await action.onWillAppear(event(keys[0], settings));
	await action.onWillAppear(event(keys[1], { projectID: "project-b", projectName: "Beta", namePosition: "middle", statusPosition: "bottom" }));
	await flush();
	assert.match(decode(keys[0].images.at(-1)), />BUSY</);
	assert.match(decode(keys[1].images.at(-1)), />READY</);
	await action.onDidReceiveSettings(event(keys[0], { ...settings, projectName: "Renamed", namePosition: "bottom", statusPosition: "top" }));
	await flush();
	assert.match(decode(keys[0].images.at(-1)), />Renamed</);
	assert.match(decode(keys[0].images.at(-1)), /data-label="status" data-position="top"/);
	assert.doesNotMatch(decode(keys[1].images.at(-1)), />Renamed</);
	await action.onDidReceiveSettings(event(keys[0], { ...settings, projectID: "project-c" }));
	assert.equal(listeners.has("project-a"), false);
	assert.match(decode(keys[0].images.at(-1)), />READY</);
	listeners.get("project-c")("ERROR");
	await flush();
	assert.match(decode(keys[0].images.at(-1)), />ERROR</);
	for (const key of keys) assert.deepEqual(key.titles, []);
	await action.onWillDisappear(event(keys[0], settings));
	await action.onWillAppear(event(keys[0], settings));
	await flush();
	assert.match(decode(keys[0].images.at(-1)), />Alpha</);
	assert.match(decode(keys[0].images.at(-1)), />BUSY</);
	for (const key of keys) await action.onWillDisappear(event(key, settings));
	const counts = keys.map((key) => key.images.length);
	t.mock.timers.tick(1000);
	await flush();
	assert.deepEqual(keys.map((key) => key.images.length), counts);
});
