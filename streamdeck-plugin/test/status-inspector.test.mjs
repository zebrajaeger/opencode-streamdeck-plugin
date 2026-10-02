import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { connectElgatoStreamDeckSocket } from "../de.lars-brandt.opencode.sdPlugin/property-inspector/status-inspector.mjs";

function inspector(settings = {}) {
	const elements = new Map();
	const element = () => ({ value: "", listeners: {}, options: [], addEventListener(name, fn) { this.listeners[name] = fn; }, append(option) { this.options.push(option); }, click() { this.listeners.click?.(); }, focus() { this.focused = true; } });
	for (const id of ["status-font", "section-display", "font-dialog", "font-form", "font-dialog-title", "font-family", "font-size", "font-size-value", "font-style", "font-underline", "font-color", "font-cancel"]) elements.set(`#${id}`, element());
	const dialog = elements.get("#font-dialog");
	dialog.showModal = () => { dialog.open = true; };
	dialog.close = () => { dialog.open = false; dialog.listeners.close(); };
	globalThis.document = { querySelector: (selector) => elements.get(selector), createElement: element };
	let socket;
	globalThis.WebSocket = class {
		listeners = {}; sent = [];
		constructor() { socket = this; }
		addEventListener(name, callback) { this.listeners[name] = callback; }
		send(data) { this.sent.push(JSON.parse(data)); }
		message(value) { this.listeners.message({ data: JSON.stringify(value) }); }
	};
	connectElgatoStreamDeckSocket("1234", "global-key", "registerPropertyInspector", "{}", JSON.stringify({ payload: { settings } }));
	return { elements, socket, saved: () => socket.sent.filter(({ event }) => event === "setSettings").at(-1)?.payload };
}

test("global status action uses a status-only inspector with the project font controls", async () => {
	const base = new URL("../de.lars-brandt.opencode.sdPlugin/", import.meta.url);
	const manifest = JSON.parse(await readFile(new URL("manifest.json", base), "utf8"));
	const global = manifest.Actions.find((action) => action.UUID === "de.lars-brandt.opencode.status");
	assert.equal(global.PropertyInspectorPath, "property-inspector/status.html");
	const html = await readFile(new URL(global.PropertyInspectorPath, base), "utf8");
	assert.match(html, /id="section-display"/);
	assert.match(html, /id="status-font"/);
	assert.match(html, /id="font-dialog"/);
	assert.match(html, /<input type="range" id="font-size" min="10" max="28" step="1"/);
	for (const id of ["font-family", "font-size", "font-style", "font-underline", "font-color"]) assert.ok(html.includes(`id="${id}"`));
	assert.doesNotMatch(html, /project-select|project-name|project-id/);
});

test("global font dialog edits a draft, cancels, applies every attribute, and restores after reopening", () => {
	let { elements, socket, saved } = inspector({ other: { keep: true } });
	socket.listeners.open();
	assert.deepEqual(socket.sent.slice(0, 2).map(({ event }) => event), ["registerPropertyInspector", "getSettings"]);
	elements.get("#status-font").click();
	assert.equal(elements.get("#font-size").value, "20");
	elements.get("#font-size").value = "23";
	elements.get("#font-size").listeners.input();
	assert.equal(elements.get("#font-size-value").textContent, "23 px");
	assert.equal(saved(), undefined);
	elements.get("#font-cancel").click();
	assert.equal(saved(), undefined);
	elements.get("#status-font").click();
	assert.equal(elements.get("#font-size").value, "20");
	elements.get("#font-family").value = "Georgia";
	elements.get("#font-size").value = "23";
	elements.get("#font-style").value = "Bold Italic";
	elements.get("#font-underline").checked = true;
	elements.get("#font-color").value = "#ff00aa";
	elements.get("#font-form").listeners.submit({ preventDefault() {} });
	assert.deepEqual(saved(), { other: { keep: true }, statusFontFamily: "Georgia", statusFontSize: 23, statusFontStyle: "Bold Italic", statusFontUnderline: true, statusFontColor: "#FF00AA" });
	assert.equal(elements.get("#status-font").focused, true);
	({ elements, socket } = inspector(saved()));
	elements.get("#status-font").click();
	assert.equal(elements.get("#font-size").value, "23");
	assert.equal(elements.get("#font-family").value, "Georgia");
	assert.equal(elements.get("#font-style").value, "Bold Italic");
	assert.equal(elements.get("#font-underline").checked, true);
	assert.equal(elements.get("#font-color").value, "#FF00AA");
	socket.message({ event: "didReceiveSettings", payload: { settings: { statusFontSize: 99, statusFontFamily: "invalid", statusFontStyle: "unsupported", statusFontUnderline: 1, statusFontColor: "red" } } });
	elements.get("#font-dialog").close();
	elements.get("#status-font").click();
	assert.equal(elements.get("#font-family").value, "Arial");
	assert.equal(elements.get("#font-size").value, "20");
	assert.equal(elements.get("#font-style").value, "Regular");
	assert.equal(elements.get("#font-underline").checked, false);
	assert.equal(elements.get("#font-color").value, "#FFFFFF");
});

test("global status font accepts the new 10 px minimum and restores it", () => {
	let { elements, saved } = inspector();
	elements.get("#status-font").click();
	elements.get("#font-size").value = "10";
	elements.get("#font-form").listeners.submit({ preventDefault() {} });
	assert.equal(saved().statusFontSize, 10);
	({ elements } = inspector(saved()));
	elements.get("#status-font").click();
	assert.equal(elements.get("#font-size").value, "10");
});
