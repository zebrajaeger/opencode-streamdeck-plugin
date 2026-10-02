import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProjectPresentation, TEXT_POSITIONS } from "../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";
import { projectStatusImage, PROJECT_TEXT_BANDS } from "../src/actions/project-status-image.mjs";

const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144"></svg>')}`;
const decode = (image) => decodeURIComponent(image.split(",")[1]);

test("normalizes blank names, defaults, unsupported values, and every collision deterministically", () => {
	assert.deepEqual(normalizeProjectPresentation(), { projectName: "", namePosition: "bottom", statusPosition: "middle" });
	assert.deepEqual(normalizeProjectPresentation({ projectName: null, namePosition: "invalid", statusPosition: false }), normalizeProjectPresentation());
	assert.equal(normalizeProjectPresentation({ projectName: "" }).projectName, "");
	for (const position of TEXT_POSITIONS) {
		assert.deepEqual(normalizeProjectPresentation({ namePosition: position, statusPosition: position }), {
			projectName: "", statusPosition: position, namePosition: position === "bottom" ? "middle" : "bottom",
		});
	}
});

for (const namePosition of TEXT_POSITIONS) for (const statusPosition of TEXT_POSITIONS) {
	if (namePosition === statusPosition) continue;
	test(`preserves and composes layout ${namePosition}/${statusPosition} in separate bounded regions`, () => {
		const settings = { projectName: "My project", namePosition, statusPosition };
		assert.deepEqual(normalizeProjectPresentation(settings), settings);
		const svg = decode(projectStatusImage(image, "ATTENTION", settings));
		assert.match(svg, new RegExp(`transform="translate\\(8 ${PROJECT_TEXT_BANDS[namePosition]}\\)" data-label="name" data-position="${namePosition}"`));
		assert.match(svg, new RegExp(`transform="translate\\(8 ${PROJECT_TEXT_BANDS[statusPosition]}\\)" data-label="status" data-position="${statusPosition}"`));
		assert.equal((svg.match(/<svg\b/g) ?? []).length, 1, "Qt does not render nested SVG text regions");
		assert.match(svg, />My project<\/text>/);
		assert.match(svg, />ATTENTION<\/text>/);
		assert.ok(Math.abs(PROJECT_TEXT_BANDS[namePosition] - PROJECT_TEXT_BANDS[statusPosition]) > 32);
	});
}

test("escapes literal XML, preserves non-ASCII, and confines multiline or long names", () => {
	const compose = (projectName) => decode(projectStatusImage(image, "READY", normalizeProjectPresentation({ projectName })));
	assert.match(compose(`&<>"'ü日本`), /&amp;&lt;&gt;&quot;&apos;ü日本/);
	assert.match(compose("one\ntwo"), />one two<\/text>/);
	assert.match(compose("😀".repeat(100)), />😀{11}…<\/text>/u);
	assert.match(compose("W".repeat(100)), />W{11}…<\/text>/);
	assert.doesNotMatch(compose(" \n "), /data-label="name"/);
	assert.match(compose(""), />READY<\/text>/);
});
