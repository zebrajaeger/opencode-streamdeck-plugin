import assert from "node:assert/strict";
import test from "node:test";
import { StatusActionRenderer } from "../src/actions/status-action-renderer.ts";

const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
const decode = (image) => decodeURIComponent(image.split(",")[1]);
const key = (id) => ({ id, images: [], titles: [], async setImage(image) { this.images.push(image); }, async setTitle(title) { this.titles.push(title); } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function clock() {
	let now = 0, starts = 0, cancels = 0;
	const timers = new Map();
	return {
		options: { now: () => now, random: () => 0, schedule(callback, delay) { const id = ++starts; timers.set(id, { callback, delay }); return id; }, cancel(id) { cancels++; timers.delete(id); } },
		async tick(ms = 100) { now += ms; for (const timer of [...timers.values()]) timer.callback(); await flush(); },
		get starts() { return starts; }, get cancels() { return cancels; }, get size() { return timers.size; },
	};
}

test("attention continues for multiple cycles; duplicate reports and explicit refresh retain phase, glyph and title", async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("a");
	t.after(() => renderer.dispose(action.id));
	renderer.setStatus("ATTENTION", [action]); await flush();
	const initial = action.images.at(-1);
	for (let i = 1; i <= 72; i++) {
		renderer.setStatus("ATTENTION", [action]);
		await time.tick();
		const svg = decode(action.images.at(-1));
		assert.match(svg, /<circle cx="72" cy="46" r="22" fill="#E69500"\/>/);
		assert.match(svg, /<path d="M43 91h58" stroke="#E69500" stroke-width="12" stroke-linecap="round"\/>/);
		if (i % 24 === 0) assert.equal(action.images.at(-1), initial);
		else assert.notEqual(action.images.at(-1), initial);
		if (i === 7) { const image = action.images.at(-1); await renderer.renderCurrentStatus(action); assert.equal(action.images.at(-1), image); }
	}
	assert.deepEqual(action.titles, ["ATTENTION"]);
	assert.equal(time.starts, 1); assert.equal(time.size, 1);
});

test("direct effect switches and static exits release controllers without intermediate images", async () => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("a");
	for (const status of ["BUSY", "ATTENTION", "BUSY", "ATTENTION", "READY", "ATTENTION", "ERROR", "ATTENTION", "OFFLINE"]) {
		const before = action.images.length;
		await renderer.renderStatus(action, status); await flush();
		assert.equal(action.images.length, before + 1);
		const animated = status === "BUSY" || status === "ATTENTION";
		assert.equal(renderer.animationCount, animated ? 1 : 0);
		assert.equal(time.size, animated ? 1 : 0);
		assert.equal(decode(action.images.at(-1)).includes("radialGradient"), status === "ATTENTION");
		assert.equal(decode(action.images.at(-1)).includes("<line "), status === "BUSY");
	}
	assert.equal(time.starts, time.cancels); await renderer.dispose(action.id);
});

test("mixed keys advance independently; attention disappearance stops writes and reappearance starts only that key", async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), a = key("a"), b = key("b"), busy = key("busy");
	t.after(async () => { for (const action of [a, b, busy]) await renderer.dispose(action.id); });
	renderer.setStatus("ATTENTION", [a, b]); renderer.setStatus("BUSY", [busy]); await flush();
	await time.tick(); const others = [b.images.at(-1), busy.images.at(-1)];
	await renderer.dispose(a.id); const hidden = a.images.length;
	for (let i = 0; i < 4; i++) await time.tick();
	assert.equal(a.images.length, hidden); assert.notEqual(b.images.at(-1), others[0]); assert.notEqual(busy.images.at(-1), others[1]);
	assert.equal(renderer.animationCount, 2);
	await renderer.renderStatus(a, "ATTENTION"); await flush();
	assert.equal(renderer.animationCount, 3); assert.equal(a.images.length, hidden + 1);
	assert.equal(time.starts, 4);
});

test("project attention refresh preserves pulse while all following frames use the refreshed labels", async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("project");
	t.after(() => renderer.dispose(action.id));
	renderer.configureProject(action.id, { projectName: "Old" });
	await renderer.renderStatus(action, "ATTENTION"); await flush(); await time.tick(700);
	const opacity = decode(action.images.at(-1)).match(/ opacity="([\d.]+)"/)[1];
	renderer.configureProject(action.id, { projectName: "New", statusPosition: "bottom", namePosition: "top" });
	await renderer.renderStatus(action, "ATTENTION");
	assert.match(decode(action.images.at(-1)), new RegExp(`opacity="${opacity}"`));
	await time.tick(); assert.match(decode(action.images.at(-1)), />New</); assert.match(decode(action.images.at(-1)), />ATTENTION</);
	assert.deepEqual(action.titles, []); assert.equal(time.starts, 1);
});

for (const stage of ["setTitle", "setImage"]) for (const rejected of [false, true]) {
	test(`rapid BUSY/ATTENTION transitions survive delayed ${stage} (${rejected ? "rejected" : "resolved"})`, async (t) => {
		const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("a"), gate = deferred();
		t.after(() => renderer.dispose(action.id));
		const original = action[stage].bind(action); let first = true;
		action[stage] = async (value) => { if (first) { first = false; await gate.promise; } await original(value); };
		renderer.setStatus("ATTENTION", [action]); await flush();
		await time.tick(); renderer.setStatus("BUSY", [action]); renderer.setStatus("ATTENTION", [action]); await flush();
		if (rejected) gate.reject(new Error("failed")); else gate.resolve();
		await flush(); assert.equal(action.titles.at(-1), "ATTENTION"); assert.match(decode(action.images.at(-1)), /radialGradient/);
		await time.tick(); const count = action.images.length; assert.ok(count >= 2);
		renderer.setStatus("READY", [action]); await flush(); await time.tick();
		assert.equal(action.images.length, count + 1); assert.match(decode(action.images.at(-1)), /#2E9E5B/);
	});
}

for (const rejected of [false, true]) test(`attention disappearance drains an issued write and suppresses queued writes across reused IDs (${rejected ? "rejected" : "resolved"})`, async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), old = key("same"), fresh = key("same"), gate = deferred();
	t.after(() => renderer.dispose(fresh.id));
	old.setImage = async (image) => { await gate.promise; old.images.push(image); };
	renderer.setStatus("ATTENTION", [old]); await flush(); await time.tick(); await time.tick();
	const disposed = renderer.dispose(old.id);
	const appeared = renderer.renderStatus(fresh, "BUSY"); await flush(); assert.deepEqual(fresh.images, []);
	if (rejected) gate.reject(new Error("failed")); else gate.resolve();
	await disposed; await appeared; await flush();
	assert.equal(old.images.length, rejected ? 0 : 1); assert.match(decode(fresh.images.at(-1)), /<line /);
	await time.tick(); assert.equal(old.images.length, rejected ? 0 : 1); assert.equal(fresh.images.length, 2);
});

test("rejected halo frames recover and still allow transitions and disposal", async () => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("a");
	const original = action.setImage.bind(action); let calls = 0;
	action.setImage = (image) => ++calls <= 2 ? Promise.reject(new Error("failed")) : original(image);
	renderer.setStatus("ATTENTION", [action]); await flush(); await time.tick(); await time.tick();
	assert.equal(action.images.length, 1);
	await renderer.renderStatus(action, "ERROR"); assert.match(decode(action.images.at(-1)), /#CF3D3D/);
	await renderer.dispose(action.id); assert.equal(time.size, 0);
});
