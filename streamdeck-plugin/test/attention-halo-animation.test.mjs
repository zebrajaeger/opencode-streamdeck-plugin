import assert from "node:assert/strict";
import test from "node:test";
import { AttentionHaloAnimation, ATTENTION_HALO_ANIMATION as HALO } from "../src/actions/attention-halo-animation.ts";
import { backgroundImage } from "../src/actions/background-animation.ts";

test("halo uses a bounded, smooth nonzero elapsed-time cycle and invariant dimensions", () => {
	let now = 500;
	const effect = new AttentionHaloAnimation(() => now);
	const first = effect.background();
	let previous;
	for (let elapsed = 0; elapsed <= HALO.periodMs * 3; elapsed += HALO.frameIntervalMs) {
		now = 500 + elapsed;
		const background = effect.background();
		const opacity = Number(background.match(/ opacity="([\d.]+)"/)[1]);
		assert.ok(opacity >= HALO.minimumOpacity && opacity <= HALO.maximumOpacity);
		if (previous !== undefined) assert.ok(Math.abs(opacity - previous) < .06);
		previous = opacity;
		assert.match(decodeURIComponent(backgroundImage(background).split(",")[1]), /width="144" height="144" viewBox="0 0 144 144"/);
		assert.match(background, /radialGradient/);
		if (elapsed % HALO.periodMs === 0) assert.equal(background, first);
	}
	now = 500 + HALO.periodMs / 2;
	assert.notEqual(effect.background(), first);
	assert.match(effect.background(), /opacity="0.2000"/);
	assert.equal(effect.frameIntervalMs, 100);
});
