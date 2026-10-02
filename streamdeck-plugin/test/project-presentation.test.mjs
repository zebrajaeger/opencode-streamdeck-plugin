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
		assert.doesNotMatch(label[1], /<rect|<image/);
	}
});

test("normalizes blank names, defaults, unsupported values, and every collision deterministically", () => {
	const defaults = normalizeProjectPresentation();
	assert.equal(defaults.projectName, "");
	assert.equal(defaults.namePosition, "bottom");
	assert.equal(defaults.statusPosition, "middle");
	assert.equal(defaults.nameFontSize, 20);
	assert.equal(defaults.statusFontSize, 20);
	assert.deepEqual(normalizeProjectPresentation({ projectName: null, namePosition: "invalid", statusPosition: false }), normalizeProjectPresentation());
	assert.equal(normalizeProjectPresentation({ projectName: "" }).projectName, "");
	for (const position of TEXT_POSITIONS) {
		assert.deepEqual(normalizeProjectPresentation({ namePosition: position, statusPosition: position }), {
			...defaults, statusPosition: position, namePosition: position === "bottom" ? "middle" : "bottom",
		});
	}
});

for (const namePosition of TEXT_POSITIONS) for (const statusPosition of TEXT_POSITIONS) {
	if (namePosition === statusPosition) continue;
	test(`preserves and composes layout ${namePosition}/${statusPosition} in separate bounded regions`, () => {
		const settings = { projectName: "My project", namePosition, statusPosition };
		assert.deepEqual(normalizeProjectPresentation(settings), { ...normalizeProjectPresentation(), ...settings });
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

test("independent font attributes normalize safely and preserve legacy appearance", () => {
	const old = normalizeProjectPresentation({ nameFontSize: 28, statusFontSize: 16 });
	assert.equal(old.nameFontFamily, "Arial");
	assert.equal(old.nameFontStyle, "Regular");
	assert.equal(old.nameFontUnderline, false);
	assert.equal(old.nameFontColor, "#FFFFFF");
	const selected = normalizeProjectPresentation({ projectName: "Long project name", nameFontFamily: "Georgia", nameFontStyle: "Bold Italic", nameFontUnderline: true, nameFontColor: "#ff00aa", statusFontFamily: "Courier New", statusFontColor: "#00ffaa", statusFontSize: 24 });
	assert.equal(selected.nameFontColor, "#FF00AA");
	assert.equal(selected.statusFontColor, "#00FFAA");
	const svg = decode(projectStatusImage(image, "READY", selected));
	assert.match(svg, /data-label="name"[^]*?font-family="Georgia, sans-serif"[^]*?font-weight="bold" font-style="italic" text-decoration="underline" fill="#FF00AA"/);
	assert.match(svg, /data-label="name"[^]*?<path d="M[^\"]+" stroke="#FF00AA" stroke-width="[^\"]+"\/>/);
	assert.match(svg, /data-label="status"[^]*?font-family="Courier New, sans-serif"[^]*?fill="#00FFAA"/);
	assert.doesNotMatch(svg.split('data-label="status"')[1], /<path /);
	assert.match(svg, /…<\/text>/);
	const invalid = normalizeProjectPresentation({ nameFontFamily: '\" onload="bad', nameFontStyle: "nonsense", nameFontUnderline: "true", nameFontColor: "#FFFFFF\"/>" });
	assert.equal(invalid.nameFontFamily, "Arial");
	assert.equal(invalid.nameFontStyle, "Regular");
	assert.equal(invalid.nameFontUnderline, false);
	assert.equal(invalid.nameFontColor, "#FFFFFF");
	assert.doesNotMatch(decode(projectStatusImage(image, "READY", invalid)), /onload=/);
});

test("font-size normalization is numeric, deterministic and independent", () => {
	assert.deepEqual(FONT_SIZES, Array.from({ length: 19 }, (_, index) => index + 10));
	assert.equal(normalizeProjectPresentation({ nameFontSize: 23, statusFontSize: 27 }).nameFontSize, 23);
	for (const value of [undefined, null, "24", NaN, Infinity, 0, -1, 9, 28.5, 100]) {
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
