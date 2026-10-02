import assert from "node:assert/strict";
import test from "node:test";
import { READY_BACKGROUNDS, normalizeReadyBackground } from "../de.lars-brandt.opencode.sdPlugin/property-inspector/ready-background.mjs";

test("READY backgrounds have stable choices and normalize invalid settings to plasma", () => {
	assert.deepEqual(READY_BACKGROUNDS.map(({ value }) => value), ["plasma", "attention", "particle"]);
	for (const value of ["plasma", "attention", "particle"]) assert.equal(normalizeReadyBackground(value), value);
	for (const value of [undefined, null, 5, {}, [], "", "busy", "PLASMA", " particle "]) assert.equal(normalizeReadyBackground(value), "plasma");
});
