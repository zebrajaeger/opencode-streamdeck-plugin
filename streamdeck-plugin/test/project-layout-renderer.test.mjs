import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { StatusActionRenderer, PARTICLE_WAIT_ANIMATION } from "../src/actions/particle-wait-animation.ts";

const decode = (image) => decodeURIComponent(image.split(",")[1]);
const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
const key = (id) => ({ id, images: [], titles: [], async setImage(image) { this.images.push(image); }, async setTitle(title) { this.titles.push(title); } });

test("only the project manifest disables native titles", async () => {
	const manifest = JSON.parse(await readFile(new URL("../de.lars-brandt.opencode.sdPlugin/manifest.json", import.meta.url)));
	const [global, project] = manifest.Actions;
	assert.equal(project.UserTitleEnabled, false);
	assert.equal(project.States[0].ShowTitle, false);
	assert.equal(global.UserTitleEnabled, undefined);
	assert.deepEqual(global.States, [{ Image: "imgs/plugin/category-icon", TitleAlignment: "middle" }]);
});

for (const status of ["OFFLINE", "READY", "ATTENTION", "ERROR"]) {
	test(`project ${status} includes name/status and redraws without a transition or native title`, async () => {
		const renderer = new StatusActionRenderer(), action = key("project");
		renderer.configureProject(action.id, { projectName: "Alpha" });
		await renderer.renderStatus(action, status);
		assert.match(decode(action.images.at(-1)), new RegExp(`>${status}<`));
		assert.match(decode(action.images.at(-1)), />Alpha</);
		renderer.configureProject(action.id, { projectName: "Beta", namePosition: "top", statusPosition: "bottom", nameFontSize: 28, statusFontSize: 16 });
		await renderer.renderStatus(action, status);
		assert.match(decode(action.images.at(-1)), /data-label="name" data-position="top"/);
		assert.match(decode(action.images.at(-1)), /data-label="status" data-position="bottom"/);
		assert.match(decode(action.images.at(-1)), />Beta</);
		assert.match(decode(action.images.at(-1)), /data-label="name"[^]*?font-size="28"/);
		assert.match(decode(action.images.at(-1)), /data-label="status"[^]*?font-size="16"/);
		assert.deepEqual(action.titles, []);
	});
}

test("each BUSY frame uses live presentation; queued stale frames cannot overwrite a refresh or static transition", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const renderer = new StatusActionRenderer(), action = key("busy");
	t.after(() => renderer.dispose(action.id));
	let release;
	const gate = new Promise((resolve) => { release = resolve; });
	action.setImage = async (image) => { action.images.push(image); if (action.images.length === 1) await gate; };
	renderer.configureProject(action.id, { projectName: "Old" });
	await renderer.renderStatus(action, "BUSY");
	await flush();
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs * 3);
	renderer.configureProject(action.id, { projectName: "New", namePosition: "top", statusPosition: "bottom", nameFontSize: 28, statusFontSize: 24 });
	const changed = renderer.renderStatus(action, "BUSY");
	release();
	await changed;
	await flush();
	assert.equal(action.images.length, 2);
	for (let index = 0; index < 3; index++) {
		t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs);
		await flush();
		const svg = decode(action.images.at(-1));
		assert.match(svg, />New</);
		assert.match(svg, />BUSY</);
		assert.match(svg, /data-label="status" data-position="bottom"/);
		assert.doesNotMatch(svg, />Old</);
		assert.match(svg, /data-label="name"[^]*?font-size="28"/);
		assert.match(svg, /data-label="status"[^]*?font-size="24"/);
	}
	await renderer.renderStatus(action, "READY");
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs * 3);
	await flush();
	assert.match(decode(action.images.at(-1)), />New</);
	assert.match(decode(action.images.at(-1)), />READY</);
	assert.match(decode(action.images.at(-1)), /data-label="name"[^]*?font-size="28"/);
	assert.doesNotMatch(decode(action.images.at(-1)), />BUSY</);
	assert.deepEqual(action.titles, []);
});

test("disappearance cancels queued project frames and configuration is restored on reappearance", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const renderer = new StatusActionRenderer(), action = key("reused");
	let release;
	const gate = new Promise((resolve) => { release = resolve; });
	action.setImage = async (image) => { action.images.push(image); await gate; };
	renderer.configureProject(action.id, { projectName: "Alpha" });
	await renderer.renderStatus(action, "BUSY");
	await flush();
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs * 4);
	const disposed = renderer.dispose(action.id);
	release();
	await disposed;
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs * 4);
	await flush();
	assert.equal(action.images.length, 1);
	assert.equal(renderer.animationCount, 0);
	renderer.configureProject(action.id, { projectName: "Alpha" });
	await renderer.renderStatus(action, "ERROR");
	assert.match(decode(action.images.at(-1)), />Alpha</);
	assert.match(decode(action.images.at(-1)), />ERROR</);
});

test("two independent project layouts coexist with the unchanged global presentation", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const renderer = new StatusActionRenderer(), first = key("a"), second = key("b"), global = key("global");
	t.after(async () => { for (const action of [first, second, global]) await renderer.dispose(action.id); });
	renderer.configureProject(first.id, { projectName: "Alpha", namePosition: "top", statusPosition: "middle", nameFontSize: 28, statusFontSize: 16 });
	renderer.configureProject(second.id, { projectName: "Beta", namePosition: "middle", statusPosition: "bottom", nameFontSize: 16, statusFontSize: 28 });
	renderer.setStatus("BUSY", [first, second, global]);
	await flush();
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs);
	await flush();
	assert.match(decode(first.images.at(-1)), /data-label="name" data-position="top"/);
	assert.match(decode(second.images.at(-1)), /data-label="name" data-position="middle"/);
	assert.match(decode(first.images.at(-1)), /data-label="name"[^]*?font-size="28"/);
	assert.match(decode(second.images.at(-1)), /data-label="name"[^]*?font-size="16"/);
	assert.doesNotMatch(decode(global.images.at(-1)), /<text/);
	assert.deepEqual(global.titles, ["BUSY"]);
	assert.deepEqual(first.titles, []);
	assert.deepEqual(second.titles, []);
	await renderer.renderStatus(global, "ATTENTION");
	assert.doesNotMatch(decode(global.images.at(-1)), /<text/);
	assert.equal(global.titles.at(-1), "ATTENTION");
});
