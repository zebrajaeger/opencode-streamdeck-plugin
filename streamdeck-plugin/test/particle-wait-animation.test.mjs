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
	return Buffer.from(image.split(",")[1], "base64").toString("utf8");
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
