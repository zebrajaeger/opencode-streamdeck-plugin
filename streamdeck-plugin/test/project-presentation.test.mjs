import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_FONT_SIZE, FONT_SIZES, normalizeProjectPresentation, TEXT_POSITIONS } from "../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";
import { projectStatusImage, PROJECT_TEXT_BANDS } from "../src/actions/project-status-image.mjs";

const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"></svg>')}`;
const decode = (image) => decodeURIComponent(image.split(",")[1]);

test("labels overlay the original image without adding opaque backgrounds", () => {
	const background = '<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"><rect width="144" height="144" fill="#2878C8"/><circle cx="72" cy="72" r="3" fill="#B9DEFF"/></svg>';
	const svg = decode(projectStatusImage(`data:image/svg+xml,${encodeURIComponent(background)}`, "BUSY", normalizeProjectPresentation({ projectName: "Alpha" })));
	assert.ok(svg.startsWith(background.slice(0, -6)));
	assert.equal((svg.match(/<rect\b/g) ?? []).length, 1);
	for (const label of svg.matchAll(/<g[^>]+data-label="[^"]+"[^>]*>(.*?)<\/g>/g)) {
		assert.match(label[1], /^<text\b/);
		assert.doesNotMatch(label[1], /<rect|<path|<image/);
	}
});

test("normalizes blank names, defaults, unsupported values, and every collision deterministically", () => {
	assert.deepEqual(normalizeProjectPresentation(), { projectName: "", namePosition: "bottom", statusPosition: "middle", nameFontSize: 20, statusFontSize: 20 });
	assert.deepEqual(normalizeProjectPresentation({ projectName: null, namePosition: "invalid", statusPosition: false }), normalizeProjectPresentation());
	assert.equal(normalizeProjectPresentation({ projectName: "" }).projectName, "");
	for (const position of TEXT_POSITIONS) {
		assert.deepEqual(normalizeProjectPresentation({ namePosition: position, statusPosition: position }), {
			projectName: "", statusPosition: position, namePosition: position === "bottom" ? "middle" : "bottom", nameFontSize: 20, statusFontSize: 20,
		});
	}
});

for (const namePosition of TEXT_POSITIONS) for (const statusPosition of TEXT_POSITIONS) {
	if (namePosition === statusPosition) continue;
	test(`preserves and composes layout ${namePosition}/${statusPosition} in separate bounded regions`, () => {
		const settings = { projectName: "My project", namePosition, statusPosition };
		assert.deepEqual(normalizeProjectPresentation(settings), { ...settings, nameFontSize: 20, statusFontSize: 20 });
		const svg = decode(projectStatusImage(image, "ATTENTION", settings));
		assert.match(svg, new RegExp(`transform="translate\\(8 ${PROJECT_TEXT_BANDS[namePosition]}\\)" data-label="name" data-position="${namePosition}"`));
		assert.match(svg, new RegExp(`transform="translate\\(8 ${PROJECT_TEXT_BANDS[statusPosition]}\\)" data-label="status" data-position="${statusPosition}"`));
		assert.equal((svg.match(/<svg\b/g) ?? []).length, 1, "Qt does not render nested SVG text regions");
		assert.match(svg, />My proje…<\/text>/);
		assert.match(svg, />ATTENTION<\/text>/);
		assert.ok(Math.abs(PROJECT_TEXT_BANDS[namePosition] - PROJECT_TEXT_BANDS[statusPosition]) > 32);
	});
}

test("escapes literal XML, preserves non-ASCII, and confines multiline or long names", () => {
	const compose = (projectName) => decode(projectStatusImage(image, "READY", normalizeProjectPresentation({ projectName })));
	for (const [literal, escaped] of [["&", "&amp;"], ["<", "&lt;"], [">", "&gt;"], ['"', "&quot;"], ["'", "&apos;"], ["ü日本", "ü日本"]]) assert.ok(compose(literal).includes(escaped));
	assert.match(compose("one\ntwo"), />one two<\/text>/);
	assert.match(compose("😀".repeat(100)), />😀+…<\/text>/u);
	assert.match(compose("W".repeat(100)), />W+…<\/text>/);
	assert.doesNotMatch(compose(" \n "), /data-label="name"/);
	assert.match(compose(""), />READY<\/text>/);
});

test("font-size normalization is numeric, deterministic and independent", () => {
	for (const value of [undefined, null, "24", NaN, Infinity, 0, -1, 18, 100]) {
		const normalized = normalizeProjectPresentation({ nameFontSize: value, statusFontSize: 24 });
		assert.equal(normalized.nameFontSize, DEFAULT_FONT_SIZE);
		assert.equal(normalized.statusFontSize, 24);
	}
	for (const nameFontSize of FONT_SIZES) for (const statusFontSize of FONT_SIZES) {
		const normalized = normalizeProjectPresentation({ nameFontSize, statusFontSize });
		assert.equal(normalized.nameFontSize, nameFontSize);
		assert.equal(normalized.statusFontSize, statusFontSize);
		const svg = decode(projectStatusImage(image, "READY", { ...normalized, projectName: "W".repeat(100) }));
		assert.match(svg, new RegExp(`data-label="name"[^]*?font-size="${nameFontSize}"`));
		assert.match(svg, new RegExp(`data-label="status"[^]*?font-size="${statusFontSize}"`));
		assert.match(svg, />W+…<\/text>/);
		assert.doesNotMatch(svg, /textLength|lengthAdjust/);
	}
});
