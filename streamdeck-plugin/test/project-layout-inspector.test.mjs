import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { connectElgatoStreamDeckSocket } from "../de.lars-brandt.opencode.sdPlugin/property-inspector/project-status-inspector.mjs";
import { normalizeProjectPresentation, TEXT_POSITIONS } from "../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";

function inspector(settings = {}) {
	const elements = new Map();
	const element = () => ({ value: "", options: [], listeners: {}, addEventListener(name, listener) { this.listeners[name] = listener; }, replaceChildren() { this.options = []; }, append(option) { this.options.push(option); }, change(value) { this.value = value; this.listeners.change(); } });
	for (const id of ["project-select", "project-id", "project-detail", "project-name", "name-position", "status-position"]) elements.set(`#${id}`, element());
	for (const id of ["name-position", "status-position"]) elements.get(`#${id}`).options = TEXT_POSITIONS.map((value) => ({ value }));
	globalThis.document = { querySelector: (selector) => elements.get(selector), createElement: element };
	let socket;
	globalThis.WebSocket = class {
		listeners = {}; sent = [];
		constructor() { socket = this; }
		addEventListener(name, listener) { this.listeners[name] = listener; }
		send(data) { this.sent.push(JSON.parse(data)); }
		message(message) { this.listeners.message({ data: JSON.stringify(message) }); }
	};
	connectElgatoStreamDeckSocket("1234", "inspector", "registerPropertyInspector", "{}", JSON.stringify({ payload: { settings } }));
	return { elements, socket, saved: () => socket.sent.filter(({ event }) => event === "setSettings").at(-1)?.payload };
}

test("inspector defaults and occupied choices match runtime for blank names and all valid pairs", () => {
	const initial = inspector();
	assert.equal(initial.elements.get("#name-position").value, "bottom");
	assert.equal(initial.elements.get("#status-position").value, "middle");
	for (const namePosition of TEXT_POSITIONS) for (const statusPosition of TEXT_POSITIONS) {
		const settings = { namePosition, statusPosition, projectName: "" };
		const { elements } = inspector(settings);
		const effective = normalizeProjectPresentation(settings);
		assert.equal(elements.get("#name-position").value, effective.namePosition);
		assert.equal(elements.get("#status-position").value, effective.statusPosition);
		assert.deepEqual(elements.get("#name-position").options.filter((option) => option.disabled).map((option) => option.value), [effective.statusPosition]);
		assert.deepEqual(elements.get("#status-position").options.filter((option) => option.disabled).map((option) => option.value), [effective.namePosition]);
	}
});

test("known/manual project selection and presentation edits preserve all settings across inspector reopening", () => {
	const settings = { projectID: "original", projectName: "Alpha", namePosition: "top", statusPosition: "middle", unrelated: { nested: true } };
	let { elements, socket, saved } = inspector(settings);
	socket.message({ event: "didReceiveSettings", payload: { settings } });
	socket.message({ event: "sendToPropertyInspector", payload: { type: "known-projects", projects: [{ projectID: "known", directory: "C:/work/app" }], selectedProjectID: "original" } });
	elements.get("#project-select").change("known");
	assert.deepEqual(saved(), { ...settings, projectID: "known" });
	elements.get("#project-id").change("manual");
	assert.deepEqual(saved(), { ...settings, projectID: "manual" });
	elements.get("#project-name").change("Beta");
	elements.get("#status-position").change("bottom");
	assert.equal(elements.get("#name-position").options.find((option) => option.value === "middle").disabled, false);
	assert.equal(elements.get("#name-position").options.find((option) => option.value === "bottom").disabled, true);
	elements.get("#name-position").change("middle");
	const persisted = saved();
	assert.deepEqual(persisted, { ...settings, projectID: "manual", projectName: "Beta", namePosition: "middle", statusPosition: "bottom" });
	({ elements, socket, saved } = inspector(persisted));
	assert.equal(elements.get("#project-name").value, "Beta");
	assert.equal(elements.get("#project-id").value, "manual");
	assert.equal(elements.get("#name-position").value, "middle");
	assert.equal(elements.get("#status-position").value, "bottom");
	elements.get("#project-name").change("");
	assert.deepEqual(saved(), { ...persisted, projectName: "" });
});

test("dedicated name instructions and controls are visible outside the advanced section", async () => {
	const html = await readFile(new URL("../de.lars-brandt.opencode.sdPlugin/property-inspector/project-status.html", import.meta.url), "utf8");
	const visible = html.split("<details>")[0];
	for (const id of ["project-name", "name-position", "status-position"]) assert.ok(visible.includes(`id="${id}"`));
	assert.match(visible, /Use Project name instead of the native Stream Deck title/);
});
