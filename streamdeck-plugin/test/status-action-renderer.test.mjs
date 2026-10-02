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

test("global status font renders static and animated labels using the shared project font geometry", async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("global-font");
	t.after(() => renderer.dispose(action.id));
	renderer.configureGlobal(action.id, {});
	await renderer.renderStatus(action, "OFFLINE");
	assert.match(decode(action.images.at(-1)), /data-label="status" data-position="middle"/);
	assert.match(decode(action.images.at(-1)), /font-family="Arial, sans-serif" font-size="20"/);
	assert.deepEqual(action.titles, []);
	renderer.configureGlobal(action.id, { statusFontSize: 23, statusFontFamily: "Georgia", statusFontStyle: "Bold Italic", statusFontUnderline: true, statusFontColor: "#FF00AA" });
	for (const status of ["ERROR", "READY", "BUSY", "ATTENTION"]) {
		await renderer.renderStatus(action, status); await flush();
		const svg = decode(action.images.at(-1));
		assert.match(svg, new RegExp(`>${status === "ATTENTION" ? "ATT" : status === "ERROR" ? "ERR" : status.slice(0, 2)}`));
		assert.match(svg, /font-family="Georgia, sans-serif" font-size="23" font-weight="bold" font-style="italic" text-decoration="underline" fill="#FF00AA"/);
		assert.match(svg, /stroke="#FF00AA"/);
		if (["READY", "BUSY", "ATTENTION"].includes(status)) {
			await time.tick();
			assert.match(decode(action.images.at(-1)), new RegExp(`>${status === "ATTENTION" ? "ATT" : status.slice(0, 2)}`));
		}
	}
	assert.deepEqual(action.titles, []);
});

test("global keys retain independent font settings without affecting project labels or status", async (t) => {
	const renderer = new StatusActionRenderer(clock().options), a = key("global-a"), b = key("global-b"), project = key("project");
	t.after(async () => { for (const action of [a, b, project]) await renderer.dispose(action.id); });
	renderer.configureGlobal(a.id, { statusFontColor: "#FF0000" });
	renderer.configureGlobal(b.id, { statusFontColor: "#00FF00" });
	renderer.configureProject(project.id, { projectName: "Alpha" });
	renderer.setStatus("OFFLINE", [a, b]);
	await renderer.renderStatus(project, "OFFLINE"); await flush();
	assert.match(decode(a.images.at(-1)), /fill="#FF0000">OFFLINE/);
	assert.match(decode(b.images.at(-1)), /fill="#00FF00">OFFLINE/);
	assert.match(decode(project.images.at(-1)), /data-label="name"/);
	const otherImages = [b.images.length, project.images.length];
	renderer.configureGlobal(a.id, { statusFontColor: "#0000FF" });
	await renderer.renderCurrentStatus(a);
	assert.match(decode(a.images.at(-1)), /fill="#0000FF">OFFLINE/);
	assert.deepEqual([b.images.length, project.images.length], otherImages);
});

for (const status of ["READY", "BUSY", "ATTENTION"]) test(`global ${status} font refresh retains phase and rejects stale queued frames`, async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key(`global-${status}`), gate = deferred();
	t.after(() => renderer.dispose(action.id));
	renderer.configureGlobal(action.id, { statusFontColor: "#FF0000" });
	renderer.setStatus(status, [action]); await flush(); await time.tick(150);
	const cancelsBefore = time.cancels;
	const initial = decode(action.images.at(-1));
	const original = action.setImage.bind(action);
	let blocked = false;
	action.setImage = async (image) => { if (!blocked) { blocked = true; await gate.promise; } await original(image); };
	await time.tick(150);
	assert.equal(blocked, true);
	renderer.configureGlobal(action.id, { statusFontColor: "#00FF00" });
	const refreshed = renderer.renderCurrentStatus(action);
	gate.resolve(); await refreshed; await flush();
	const latest = decode(action.images.at(-1));
	assert.match(latest, /fill="#00FF00"/);
	assert.equal(time.starts, 1); assert.equal(time.cancels, cancelsBefore);
	if (status === "ATTENTION") assert.match(latest, /attention-halo/);
	if (status === "READY") assert.match(latest, /ready-plasma/);
	if (status === "BUSY") assert.match(latest, /<line /);
	assert.notEqual(latest, initial);
	await time.tick(150);
	assert.match(decode(action.images.at(-1)), /fill="#00FF00"/);
});

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

test("READY composes periodic plasma under stable global and project labels without report restarts", async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), global = key("global"), project = key("project");
	t.after(async () => { await renderer.dispose(global.id); await renderer.dispose(project.id); });
	renderer.configureProject(project.id, { projectName: "Alpha", namePosition: "top", statusPosition: "bottom" });
	await renderer.renderStatus(global, "READY"); await renderer.renderStatus(project, "READY"); await flush();
	const initial = [global.images.at(-1), project.images.at(-1)];
	for (const frame of initial) {
		const svg = decode(frame);
		assert.match(svg, /width="144" height="144" viewBox="0 0 144 144"/);
		assert.match(svg, /#101216/); assert.match(svg, /#2E9E5B/);
		assert.match(svg, /id="ready-plasma"/);
	}
	for (let i = 0; i < 3; i++) {
		renderer.setStatus("READY", [global, project]);
		const counts = [global.images.length, project.images.length];
		await flush(); assert.deepEqual([global.images.length, project.images.length], counts);
		await time.tick(150);
		assert.notEqual(global.images.at(-1), initial[0]);
		assert.notEqual(project.images.at(-1), initial[1]);
		assert.match(decode(global.images.at(-1)), /fill="#2E9E5B"/);
		assert.match(decode(project.images.at(-1)), />READY</);
		assert.match(decode(project.images.at(-1)), />Alpha</);
		assert.match(decode(project.images.at(-1)), /data-label="name" data-position="top"/);
		assert.match(decode(project.images.at(-1)), /data-label="status" data-position="bottom"/);
	}
	assert.deepEqual(global.titles, ["READY"]); assert.deepEqual(project.titles, []);
	assert.equal(time.starts, 2); assert.equal(renderer.animationCount, 2);
});

test("READY refresh and selection retain phase while current project settings compose every later frame", async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("project");
	t.after(() => renderer.dispose(action.id));
	renderer.configureProject(action.id, { projectName: "Old" });
	await renderer.renderStatus(action, "READY"); await time.tick(2250);
	const sample = decode(action.images.at(-1)).match(/<circle cx="6.00" cy="6.00"[^>]+>/)[0];
	renderer.configureProject(action.id, { projectName: "New", namePosition: "top", statusPosition: "bottom" });
	await renderer.renderStatus(action, "READY");
	assert.match(decode(action.images.at(-1)), />New</);
	assert.ok(decode(action.images.at(-1)).includes(sample));
	assert.equal(time.starts, 1); assert.equal(time.cancels, 0);
	await time.tick(150);
	assert.match(decode(action.images.at(-1)), />New</);
	assert.doesNotMatch(decode(action.images.at(-1)), />Old</);
	assert.match(decode(action.images.at(-1)), /data-label="status" data-position="bottom"/);
	assert.deepEqual(action.titles, []);
});

test("independent READY keys release resources on repeated hide/show without stopping neighbors", async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), a = key("a"), b = key("b");
	t.after(async () => { await renderer.dispose(a.id); await renderer.dispose(b.id); });
	await renderer.renderStatus(a, "READY"); await renderer.renderStatus(b, "READY");
	for (let cycle = 0; cycle < 4; cycle++) {
		await time.tick(150); const prior = b.images.length;
		await renderer.dispose(a.id); const hidden = a.images.length;
		assert.equal(time.size, 1); assert.equal(renderer.animationCount, 1);
		await time.tick(150); assert.equal(a.images.length, hidden); assert.equal(b.images.length, prior + 1);
		await renderer.renderStatus(a, "READY"); await flush(); assert.equal(a.images.length, hidden + 1);
		assert.equal(time.size, 2);
	}
	await renderer.dispose(a.id); await renderer.dispose(b.id);
	assert.equal(renderer.animationCount, 0); assert.equal(time.size, 0);
});

for (const rejected of [false, true]) test(`READY disappearance drains issued write and suppresses queued frames across reused IDs (${rejected ? "rejected" : "resolved"})`, async (t) => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), old = key("same"), fresh = key("same"), gate = deferred();
	t.after(() => renderer.dispose(fresh.id));
	old.setImage = async (image) => { await gate.promise; old.images.push(image); };
	renderer.setStatus("READY", [old]); await flush(); await time.tick(150); await time.tick(150);
	const disposed = renderer.dispose(old.id);
	const appeared = renderer.renderStatus(fresh, "ATTENTION"); await flush(); assert.deepEqual(fresh.images, []);
	if (rejected) gate.reject(new Error("failed")); else gate.resolve();
	await disposed; await appeared; await flush();
	assert.equal(old.images.length, rejected ? 0 : 1);
	assert.match(decode(fresh.images.at(-1)), /attention-halo/);
	await time.tick(); assert.equal(old.images.length, rejected ? 0 : 1);
});

test("rejected READY frames recover and still allow static transitions and cleanup", async () => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("a");
	const original = action.setImage.bind(action); let calls = 0;
	action.setImage = (image) => ++calls <= 2 ? Promise.reject(new Error("failed")) : original(image);
	renderer.setStatus("READY", [action]); await flush(); await time.tick(150); await time.tick(150);
	assert.equal(action.images.length, 1);
	await renderer.renderStatus(action, "OFFLINE"); assert.match(decode(action.images.at(-1)), /#5D6470/);
	await renderer.dispose(action.id); assert.equal(time.size, 0);
});

test("direct effect switches and static exits release controllers without intermediate images", async () => {
	const time = clock(), renderer = new StatusActionRenderer(time.options), action = key("a");
	for (const status of ["READY", "BUSY", "READY", "ATTENTION", "READY", "ERROR", "READY", "OFFLINE", "READY", "ATTENTION", "BUSY", "ATTENTION", "ERROR", "ATTENTION", "OFFLINE"]) {
		const before = action.images.length;
		await renderer.renderStatus(action, status); await flush();
		assert.equal(action.images.length, before + 1);
		const animated = status === "BUSY" || status === "ATTENTION" || status === "READY";
		assert.equal(renderer.animationCount, animated ? 1 : 0);
		assert.equal(time.size, animated ? 1 : 0);
		assert.equal(decode(action.images.at(-1)).includes("attention-halo"), status === "ATTENTION");
		assert.equal(decode(action.images.at(-1)).includes("ready-plasma"), status === "READY");
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
		assert.equal(action.images.length, count + 2); assert.match(decode(action.images.at(-1)), /id="ready-plasma"/);
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
