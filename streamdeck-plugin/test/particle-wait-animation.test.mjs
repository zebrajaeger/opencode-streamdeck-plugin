import assert from "node:assert/strict";
import test from "node:test";

import { PARTICLE_WAIT_ANIMATION, ParticleWaitAnimation, StatusActionRenderer } from "../src/actions/particle-wait-animation.ts";

function action(id) {
	return {
		id,
		images: [],
		titles: [],
		isKey: () => true,
		setImage(image) {
			this.images.push(image);
			return Promise.resolve();
		},
		setTitle(title) {
			this.titles.push(title);
			return Promise.resolve();
		},
	};
}

function decodeImage(image) {
	assert.match(image, /^data:image\/svg\+xml,/);
	return decodeURIComponent(image.slice(image.indexOf(",") + 1));
}

async function flush() {
	await new Promise((resolve) => setImmediate(resolve));
	await new Promise((resolve) => setImmediate(resolve));
}

test("renders advancing particle-network SVG frames with centrally defined parameters", () => {
	const key = action("one");
	const animation = new ParticleWaitAnimation(key, { random: () => 0 });
	const firstFrame = decodeImage(animation.frame());
	animation.advanceParticles();
	const secondFrame = decodeImage(animation.frame());

	assert.match(firstFrame, /<circle /);
	assert.match(firstFrame, /<line /);
	assert.match(firstFrame, new RegExp(`width="${PARTICLE_WAIT_ANIMATION.width}"`));
	assert.notEqual(secondFrame, firstFrame);
});

test("starts, stops, and suppresses a queued frame after disposal", async () => {
	const key = action("one");
	let scheduled;
	let cancelled;
	const animation = new ParticleWaitAnimation(key, {
		random: () => 0,
		schedule: (callback) => {
			scheduled = callback;
			return "timer";
		},
		cancel: (timer) => {
			cancelled = timer;
		},
	});

	animation.start();
	await flush();
	assert.equal(key.images.length, 1);

	scheduled();
	await flush();
	assert.equal(key.images.length, 2);

	await animation.dispose();
	assert.equal(cancelled, "timer");
	scheduled();
	await flush();
	assert.equal(key.images.length, 2);
});

test("keeps visible BUSY keys independent and restores static images after transitions or disappearance", async () => {
	const first = action("first");
	const second = action("second");
	const status = new StatusActionRenderer();

	status.setStatus("BUSY", [first, second]);
	await flush();
	assert.equal(first.titles.at(-1), "BUSY");
	assert.equal(second.titles.at(-1), "BUSY");
	assert.match(decodeImage(first.images.at(-1)), /<circle /);
	assert.match(decodeImage(second.images.at(-1)), /<circle /);
	assert.equal(status.animationCount, 2);

	status.setStatus("READY", [first, second]);
	await flush();
	assert.equal(first.titles.at(-1), "READY");
	assert.match(decodeImage(first.images.at(-1)), /#2E9E5B/);
	assert.match(decodeImage(second.images.at(-1)), /#2E9E5B/);

	status.setStatus("ATTENTION", [first, second]);
	await flush();
	assert.equal(first.titles.at(-1), "ATTENTION");
	assert.match(decodeImage(first.images.at(-1)), /#E69500/);

	await status.dispose(first.id);
	assert.equal(status.animationCount, 1);
	await status.dispose(second.id);
});

function deferred() {
	let resolve, reject;
	const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

test("coalesces static and in-flight requests independently per key, but permits explicit refresh", async () => {
	const renderer = new StatusActionRenderer();
	const first = action("one"), second = action("two");
	const title = deferred();
	first.setTitle = (value) => { first.titles.push(value); return title.promise; };
	renderer.setStatus("READY", [first]);
	await flush();
	for (let i = 0; i < 4; i++) renderer.setStatus("READY", [first, second]);
	await flush();
	assert.deepEqual(first.titles, ["READY"]);
	assert.equal(first.images.length, 0);
	assert.deepEqual(second.titles, ["READY"]);
	assert.equal(second.images.length, 1);
	title.resolve();
	await flush();
	renderer.setStatus("READY", [first, second]);
	await flush();
	assert.equal(first.images.length, 1);
	assert.equal(second.images.length, 1);
	await renderer.renderStatus(first, "READY");
	await renderer.renderCurrentStatus(second);
	assert.equal(first.images.length, 2);
	assert.equal(second.images.length, 2);
});

test("duplicate BUSY requests retain particles and the animation timer while frames advance", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const renderer = new StatusActionRenderer();
	const key = action("busy");
	t.after(() => renderer.dispose(key.id));
	renderer.setStatus("BUSY", [key]);
	await flush();
	const initial = key.images.at(-1);
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs - 1);
	for (let i = 0; i < 4; i++) renderer.setStatus("BUSY", [key]);
	await flush();
	assert.deepEqual(key.titles, ["BUSY"]);
	assert.deepEqual(key.images, [initial]);
	t.mock.timers.tick(1);
	await flush();
	assert.equal(key.images.length, 2);
	assert.notEqual(key.images.at(-1), initial);
	assert.equal(renderer.animationCount, 1);
});

test("static and BUSY reappearance invalidate caches for the same object and reused IDs", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const renderer = new StatusActionRenderer();
	const first = action("reused"), another = action("reused"), independent = action("other");
	await renderer.renderStatus(first, "READY");
	await renderer.dispose(first.id);
	renderer.setStatus("READY", [first]);
	await flush();
	assert.equal(first.images.length, 2);
	await renderer.dispose(first.id);
	await renderer.renderStatus(another, "READY");
	assert.equal(another.images.length, 1);
	renderer.setStatus("BUSY", [another, independent]);
	await flush();
	assert.equal(renderer.animationCount, 2);
	await renderer.dispose(another.id);
	assert.equal(renderer.animationCount, 1);
	const independentTitleCount = independent.titles.length;
	await renderer.renderStatus(another, "BUSY");
	await flush();
	assert.equal(renderer.animationCount, 2);
	assert.equal(independent.titles.length, independentTitleCount);
	await renderer.dispose(another.id);
	await renderer.dispose(independent.id);
});

for (const stage of ["setTitle", "setImage"]) {
	for (const rejected of [false, true]) {
		test(`deferred ${stage} (${rejected ? "rejected" : "resolved"}) cannot overwrite a newer transition`, async () => {
			const renderer = new StatusActionRenderer();
			const key = action("key");
			const gate = deferred();
			const original = key[stage].bind(key);
			let first = true;
			key[stage] = async (value) => {
				if (first) { first = false; await gate.promise; }
				await original(value);
			};
			renderer.setStatus("READY", [key]);
			await flush();
			renderer.setStatus("ATTENTION", [key]);
			await flush();
			if (rejected) gate.reject(new Error("write failed")); else gate.resolve();
			await flush();
			assert.equal(key.titles.at(-1), "ATTENTION");
			assert.match(decodeImage(key.images.at(-1)), /#E69500/);
			renderer.setStatus("ATTENTION", [key]);
			await flush();
			assert.equal(key.images.filter((image) => decodeImage(image).includes("#E69500")).length, 1);
		});
	}
	test(`failed ${stage} allows retry of the same status`, async () => {
		const renderer = new StatusActionRenderer();
		const key = action("retry");
		const original = key[stage].bind(key);
		let first = true;
		key[stage] = (value) => {
			if (first) { first = false; return Promise.reject(new Error("write failed")); }
			return original(value);
		};
		renderer.setStatus("READY", [key]);
		await flush();
		renderer.setStatus("READY", [key]);
		await flush();
		assert.equal(key.titles.at(-1), "READY");
		assert.equal(key.images.length, 1);
	});
}

test("disappearance invalidates queued work and serializes reuse behind an already issued write", async () => {
	const renderer = new StatusActionRenderer();
	const old = action("reused"), fresh = action("reused");
	const gate = deferred();
	old.setImage = async (image) => { await gate.promise; old.images.push(image); };
	renderer.setStatus("READY", [old]);
	await flush();
	await renderer.dispose(old.id);
	renderer.setStatus("ERROR", [old]);
	await renderer.dispose(old.id);
	const appeared = renderer.renderStatus(fresh, "ATTENTION");
	await flush();
	assert.deepEqual(fresh.images, []);
	gate.resolve();
	await appeared;
	assert.deepEqual(old.titles, ["READY"]);
	assert.equal(fresh.titles.at(-1), "ATTENTION");
	assert.match(decodeImage(fresh.images.at(-1)), /#E69500/);
});

test("queued BUSY frames cannot write after disappearance", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const renderer = new StatusActionRenderer();
	const key = action("busy");
	const gate = deferred();
	key.setImage = async (image) => { key.images.push(image); await gate.promise; };
	renderer.setStatus("BUSY", [key]);
	await flush();
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs * 3);
	const disappeared = renderer.dispose(key.id);
	gate.resolve();
	await disappeared;
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs * 3);
	await flush();
	assert.equal(key.images.length, 1);
	assert.equal(renderer.animationCount, 0);
});

test("animation image failures do not poison later frames or static transitions", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const renderer = new StatusActionRenderer();
	const key = action("busy");
	const original = key.setImage.bind(key);
	let first = true;
	key.setImage = (image) => {
		if (first) { first = false; return Promise.reject(new Error("frame failed")); }
		return original(image);
	};
	renderer.setStatus("BUSY", [key]);
	await flush();
	t.mock.timers.tick(PARTICLE_WAIT_ANIMATION.frameIntervalMs);
	await flush();
	assert.equal(key.images.length, 1);
	renderer.setStatus("READY", [key]);
	await flush();
	assert.match(decodeImage(key.images.at(-1)), /#2E9E5B/);
	await renderer.dispose(key.id);
});

test("a failed first animation frame still permits immediate stop and static rendering", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const renderer = new StatusActionRenderer();
	const key = action("busy");
	key.setImage = () => Promise.reject(new Error("frame failed"));
	renderer.setStatus("BUSY", [key]);
	await flush();
	key.setImage = async (image) => { key.images.push(image); };
	await renderer.renderStatus(key, "READY");
	assert.match(decodeImage(key.images.at(-1)), /#2E9E5B/);
	await renderer.dispose(key.id);
});
