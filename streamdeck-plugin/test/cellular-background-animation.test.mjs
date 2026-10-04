import assert from "node:assert/strict";
import test from "node:test";
import { CellularBackgroundAnimation } from "../src/actions/cellular-background-animation.ts";
import { backgroundImage } from "../src/actions/background-animation.ts";

const modes = ["brians-brain", "day-night", "generations-trails"];
test("each mode advances exactly one generation; snapshots are repeatable and consume no randomness", () => {
	for (const mode of modes) {
		let draws = 0;
		const random = () => { draws++; return (draws * 0.61803398875) % 1; };
		const first = new CellularBackgroundAnimation(mode, random);
		assert.equal(first.frameIntervalMs, mode === "day-night" ? 250 : 150);
		const initial = first.background();
		const calls = draws;
		assert.equal(first.background(), initial);
		assert.equal(draws, calls);
		let replay = 0;
		const twin = new CellularBackgroundAnimation(mode, () => { const n = ++replay; return (n * 0.61803398875) % 1; });
		assert.equal(twin.background(), initial);
		first.advance();
		assert.notEqual(first.background(), initial);
		assert.equal(first.background(), first.background());
		twin.advance();
		assert.equal(twin.background(), first.background());
	}
});

test("cell paths stay within a compact, dark 144-square field with fading trails", () => {
	for (const mode of modes) {
		const effect = new CellularBackgroundAnimation(mode, () => 0);
		for (let i = 0; i < 15; i++) {
			const svg = effect.background();
			assert.ok(svg.length < 40000);
			assert.match(svg, /rx="18" fill="#101216"/);
			assert.doesNotMatch(svg, /NaN|Infinity|<filter|<animate|<image|href=|url\(/);
			assert.match(decodeURIComponent(backgroundImage(svg)), /<\/svg>$/);
			for (const [, x, y] of svg.matchAll(/M(\d+) (\d+)h6v6h-6z/g)) {
				assert.ok(+x % 6 === 0 && +y % 6 === 0 && +x >= 0 && +y >= 0 && +x <= 138 && +y <= 138);
			}
			effect.advance();
		}
	}
	const trails = new CellularBackgroundAnimation("generations-trails", () => 0.5);
	const svg = trails.background();
	for (const [state, opacity] of [[1, "0.03"], [2, "0.08"], [3, "0.17"], [4, "0.28"]]) {
		if (state === 4) assert.match(svg, new RegExp(`data-cell-state="${state}"[^>]*opacity="${opacity}"`));
	}
});

test("10,000 generations per mode retain fixed-size valid states and bounded fragments", () => {
	for (const mode of modes) {
		let seed = 1234567;
		const effect = new CellularBackgroundAnimation(mode, () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32));
		for (let i = 0; i < 10000; i++) {
			effect.advance();
			if (i % 101 === 0) {
				const board = effect.automaton.snapshot();
				assert.equal(board.length, 576);
				assert.ok([...board].every((state) => state <= (mode === "generations-trails" ? 4 : mode === "brians-brain" ? 2 : 1)));
				assert.ok(effect.background().length < 40000);
			}
		}
	}
});
