import assert from "node:assert/strict";
import test from "node:test";
import { MatrixBackgroundAnimation } from "../src/actions/matrix-background-animation.ts";
import { backgroundImage } from "../src/actions/background-animation.ts";

const glyphs = (svg) => [...svg.matchAll(/<path data-matrix="(\d+)" data-trail="(\d+)" d="([^"]+)" fill="([^"]+)" opacity="([^"]+)"\/>/g)];

test("Matrix frames contain only bounded visible bitmap paths and no external dependencies", () => {
	let now = 0;
	const effect = new MatrixBackgroundAnimation(() => now);
	assert.equal(effect.frameIntervalMs, 150);
	for (const time of [0, 150, 1000, 15000, 41000, 123000]) {
		now = time;
		const svg = effect.background();
		assert.equal(svg, effect.background());
		assert.ok(svg.length < 25000);
		assert.match(svg, /fill="#101216"/);
		assert.doesNotMatch(svg, /NaN|Infinity|<text|font-|href=|url\(|<filter|<animate|<image|<svg/);
		assert.match(decodeURIComponent(backgroundImage(svg)), /<\/svg>$/);
		assert.ok(glyphs(svg).length <= 30);
		assert.ok(glyphs(svg).length > 0);
		for (const [, , , path] of glyphs(svg)) {
			for (const [, x, y] of path.matchAll(/M(\d+) (\d+)h4v4h-4z/g)) {
				assert.ok(+x >= 0 && +x + 4 <= 144 && +y >= 0 && +y + 4 <= 144);
			}
		}
	}
});

test("independent trails descend, fade and keep moving through multiple wraps", () => {
	let now = 0;
	const effect = new MatrixBackgroundAnimation(() => now);
	const first = effect.background();
	now = 2000;
	const second = effect.background();
	assert.notEqual(first, second);
	const head = (svg, column) => glyphs(svg).find((match) => match[1] === column && match[2] === "0");
	assert.ok(+head(second, "1")[3].match(/M\d+ (\d+)/)[1] > +head(first, "1")[3].match(/M\d+ (\d+)/)[1]);
	for (const svg of [first, second]) {
		const trails = glyphs(svg).filter((match) => match[1] === "1");
		assert.ok(trails.length >= 2);
		assert.ok(+trails[0][5] > +trails.at(-1)[5]);
	}
	let previous = second;
	for (let step = 1; step <= 180; step++) {
		now += 1500;
		const current = effect.background();
		assert.notEqual(current, previous);
		assert.ok(glyphs(current).length > 0);
		previous = current;
	}
});
