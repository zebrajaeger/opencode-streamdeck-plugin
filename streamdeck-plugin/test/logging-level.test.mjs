import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("plugin does not enable SDK connection TRACE logging for animated images", () => {
	const plugin = readFileSync(new URL("../src/plugin.ts", import.meta.url), "utf8");
	// Every BUSY frame is a base64 image. The SDK logs the entire outgoing
	// message at TRACE; filling its rotating log can terminate the plugin.
	assert.doesNotMatch(plugin, /logger\.setLevel\(\s*["']trace["']\s*\)/);
});
