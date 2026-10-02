import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Decorators cannot be executed by Node type stripping; compile only this action.
const sourceURL = new URL("../src/actions/opencode-status.ts", import.meta.url);
const source = await readFile(sourceURL, "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
	.replace(/from "([^"]+)"/g, (_, specifier) => `from "${specifier.startsWith(".") ? new URL(`${specifier}.ts`, sourceURL).href : import.meta.resolve(specifier)}"`);
const { OpenCodeStatus } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const decode = (image) => decodeURIComponent(image.split(",")[1]);
const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };

test("global key reacts to font settings delivered by Stream Deck while status stays unchanged", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const action = new OpenCodeStatus();
	const key = { id: "global", images: [], titles: [], isKey: () => true, async setImage(image) { this.images.push(image); }, async setTitle(title) { this.titles.push(title); } };
	Object.defineProperty(action, "actions", { value: [key] });
	const event = (settings) => ({ action: key, payload: { settings } });
	action.setStatus("BUSY");
	await action.onWillAppear(event({})); await flush();
	const before = decode(key.images.at(-1));
	assert.match(before, /fill="#FFFFFF"/);
	await action.onDidReceiveSettings(event({ statusFontSize: 28, statusFontFamily: "Georgia", statusFontColor: "#FF00AA", statusFontUnderline: true }));
	const after = decode(key.images.at(-1));
	assert.match(after, /data-label="status"/);
	assert.match(after, /font-family="Georgia, sans-serif" font-size="28"/);
	assert.match(after, /fill="#FF00AA"/);
	assert.notEqual(after, before);
	t.mock.timers.tick(150); await flush();
	assert.match(decode(key.images.at(-1)), /fill="#FF00AA"/);
	await action.onWillDisappear(event({}));
});
