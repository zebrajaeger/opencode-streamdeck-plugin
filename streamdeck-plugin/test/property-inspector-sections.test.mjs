import assert from "node:assert/strict";
import test from "node:test";
import { sectionSettings, sectionStates } from "../tmp/property-inspector/project-status-inspector.mjs";

test("section state round-trips, preserving unrelated settings and falling back for missing or invalid ids", () => {
	const original = { projectID: "abc", projectName: "Name", namePosition: "bottom", statusPosition: "middle", nameFontSize: 24, statusFontSize: 18, extra: "keep" };
	const saved = sectionSettings(original, "project", false);
	assert.deepEqual(sectionStates(saved), { project: false, advanced: false, display: true });
	assert.deepEqual(sectionStates(sectionSettings(saved, "advanced", true)), { project: false, advanced: true, display: true });
	assert.deepEqual(sectionStates({ sections: { project: "no", display: null, unknown: true } }), { project: true, advanced: false, display: true });
	assert.deepEqual(sectionStates({}), { project: true, advanced: false, display: true });
	for (const [key, value] of Object.entries(original)) {
		assert.deepEqual(saved[key], value);
		assert.equal(typeof saved[key], typeof value);
	}
});
