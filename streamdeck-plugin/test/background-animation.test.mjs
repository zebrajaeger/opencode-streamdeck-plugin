import assert from "node:assert/strict";
import test from "node:test";
import { BackgroundAnimation } from "../src/actions/background-animation.ts";

const flush = () => new Promise(setImmediate);

test("controller starts immediately and idempotently, refreshes without advancing, and disposes permanently", async () => {
	let tick, schedules = 0, cancelled = 0, frame = 0;
	const images = [];
	const animation = new BackgroundAnimation({ frameIntervalMs: 180, advance() { frame++; }, background: () => `${frame}` }, async (image) => images.push(image), {
		schedule(callback, delay) { assert.equal(delay, 180); tick = callback; schedules++; return 1; },
		cancel() { cancelled++; },
	});
	animation.start(); animation.start();
	await flush();
	assert.deepEqual(images, ["0"]);
	tick(); await flush(); await animation.refresh();
	assert.deepEqual(images, ["0", "1", "1"]);
	await animation.dispose(); tick(); animation.start(); await flush();
	assert.equal(schedules, 1); assert.equal(cancelled, 1);
	assert.equal(images.length, 3);
});

test("controller cancels queued frames, drains in-flight writes even on repeated stop, and recovers from rejection", async () => {
	let tick, release, finished = false, calls = 0;
	const gate = new Promise((resolve) => { release = resolve; });
	const animation = new BackgroundAnimation({ frameIntervalMs: 100, advance() {}, background: () => "frame" }, async () => { calls++; await gate; }, { schedule(callback) { tick = callback; return 1; }, cancel() {} });
	animation.start(); await flush(); tick(); tick();
	const stopped = animation.stop().then(() => { finished = true; });
	const stoppedAgain = animation.stop();
	await flush(); assert.equal(finished, false);
	release(); await Promise.all([stopped, stoppedAgain]);
	assert.equal(calls, 1);
	let writes = 0;
	const retry = new BackgroundAnimation(animation.effect, async () => { if (++writes === 1) throw new Error("failed"); }, { schedule(callback) { tick = callback; return 1; }, cancel() {} });
	retry.start(); await flush(); tick(); await flush();
	assert.equal(writes, 2); await retry.dispose();
});
