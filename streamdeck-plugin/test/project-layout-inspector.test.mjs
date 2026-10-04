import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { connectElgatoStreamDeckSocket } from "../de.lars-brandt.opencode.sdPlugin/property-inspector/project-status-inspector.mjs";
import { normalizeProjectPresentation, TEXT_POSITIONS } from "../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";

function inspector(settings = {}) {
	const elements = new Map();
	const element = () => ({ value: "", options: [], listeners: {}, addEventListener(name, listener) { this.listeners[name] = listener; }, querySelectorAll(selector) { return selector === "option" ? this.options : []; }, replaceChildren() { this.options = []; }, append(option) { this.options.push(option); }, change(value) { this.value = value; this.listeners.valuechange(); }, input(value) { this.value = value; this.listeners.input(); }, click() { this.listeners.click?.(); }, focus() { this.focused = true; } });
	for (const id of ["project-select", "project-id", "project-detail", "project-name", "name-position", "status-position", "ready-background", "name-font", "status-font", "font-dialog", "font-form", "font-dialog-title", "font-family", "font-size", "font-size-value", "font-style", "font-underline", "font-color", "font-cancel", "font-apply"]) elements.set(`#${id}`, element());
	const dialog = elements.get("#font-dialog");
	dialog.showModal = () => { dialog.open = true; };
	dialog.close = () => { dialog.open = false; dialog.listeners.close(); };
	for (const id of ["name-position", "status-position"]) elements.get(`#${id}`).options = TEXT_POSITIONS.map((value) => ({ value }));
	const sections = ["project", "advanced", "display"].map((id) => ({ id: `section-${id}`, open: id !== "advanced", listeners: {}, addEventListener(name, listener) { this.listeners[name] = listener; } }));
	globalThis.document = { querySelector: (selector) => elements.get(selector), querySelectorAll: (selector) => selector === ".sdpi-section" ? sections : [], createElement: element };
	let socket;
	globalThis.WebSocket = class {
		listeners = {}; sent = [];
		constructor() { socket = this; }
		addEventListener(name, listener) { this.listeners[name] = listener; }
		send(data) { this.sent.push(JSON.parse(data)); }
		message(message) { this.listeners.message({ data: JSON.stringify(message) }); }
	};
	connectElgatoStreamDeckSocket("1234", "inspector", "registerPropertyInspector", "{}", JSON.stringify({ payload: { settings } }));
	return { elements, sections, socket, saved: () => socket.sent.filter(({ event }) => event === "setSettings").at(-1)?.payload };
}

test("section collapse persists once, does not change existing settings, and restores on reopening", async () => {
	const original = { projectID: "before", projectName: "Existing", extra: 42 };
	const { sections, socket, saved } = inspector(original);
	const advanced = sections.find(({ id }) => id === "section-advanced");
	const project = sections.find(({ id }) => id === "section-project");
	assert.equal(advanced.open, false);
	await new Promise((resolve) => setTimeout(resolve, 0));
	project.open = false;
	project.listeners.toggle();
	assert.equal(socket.sent.filter(({ event }) => event === "setSettings").length, 1);
	assert.equal(saved().projectID, original.projectID);
	assert.equal(saved().projectName, original.projectName);
	assert.equal(saved().extra, original.extra);
	assert.deepEqual(saved().sections, { project: false });
	const restored = inspector(saved());
	assert.deepEqual(restored.sections.map(({ open }) => open), [false, false, true]);
});

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
	const settings = { projectID: "original", projectName: "Alpha", namePosition: "top", statusPosition: "middle", nameFontSize: 20, statusFontSize: 24, unrelated: { nested: true } };
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
	const visible = html.split('id="section-advanced"')[0] + html.split('id="section-display"')[1];
	for (const id of ["project-name", "name-position", "status-position", "name-font", "status-font"]) assert.ok(visible.includes(`id="${id}"`));
	assert.match(visible, /Use Project name instead of the native Stream Deck title/);
	assert.match(html, /<dialog id="font-dialog" aria-labelledby="font-dialog-title">/);
	for (const id of ["font-family", "font-size", "font-style", "font-underline", "font-color"]) assert.ok(html.includes(`for="${id}"`));
	assert.match(html, /<input type="range" id="font-size" min="10" max="28" step="1"/);
	assert.match(html, /<output id="font-size-value" for="font-size">20 px<\/output>/);
});

test("font dialog restores defaults, cancels drafts, saves independently and survives project changes and reopening", () => {
	let { elements, saved } = inspector({ projectID: "a", unrelated: true });
	elements.get("#name-font").click();
	assert.equal(elements.get("#font-size").value, "20");
	assert.equal(elements.get("#font-size-value").textContent, "20 px");
	assert.equal(elements.get("#font-family").focused, true);
	elements.get("#font-size").input("23");
	assert.equal(elements.get("#font-size-value").textContent, "23 px");
	elements.get("#font-cancel").click();
	assert.equal(saved(), undefined);
	elements.get("#name-font").click();
	assert.equal(elements.get("#font-size").value, "20");
	elements.get("#font-size").input("23");
	elements.get("#font-family").value = "Georgia";
	elements.get("#font-style").value = "Bold Italic";
	elements.get("#font-underline").checked = true;
	elements.get("#font-color").value = "#ff00aa";
	elements.get("#font-form").listeners.submit({ preventDefault() {} });
	assert.equal(saved().nameFontSize, 23);
	assert.equal(saved().statusFontSize, 20);
	assert.equal(saved().nameFontColor, "#FF00AA");
	assert.equal(elements.get("#name-font").focused, true);
	elements.get("#status-font").click();
	assert.equal(elements.get("#font-size").value, "20");
	elements.get("#font-size").value = "16";
	elements.get("#font-form").listeners.submit({ preventDefault() {} });
	elements.get("#project-select").change("known");
	elements.get("#project-id").change("manual");
	const persisted = saved();
	assert.equal(persisted.unrelated, true);
	assert.equal(persisted.projectID, "manual");
	assert.equal(persisted.nameFontSize, 23);
	assert.equal(persisted.statusFontSize, 16);
	({ elements } = inspector(persisted));
	elements.get("#name-font").click();
	assert.equal(elements.get("#font-size").value, "23");
	assert.equal(elements.get("#font-size-value").textContent, "23 px");
	assert.equal(elements.get("#font-family").value, "Georgia");
	assert.equal(elements.get("#font-style").value, "Bold Italic");
	assert.equal(elements.get("#font-underline").checked, true);
	assert.equal(elements.get("#font-color").value, "#FF00AA");
	elements.get("#font-dialog").close();
	elements.get("#status-font").click();
	assert.equal(elements.get("#font-size").value, "16");
	({ elements } = inspector({ nameFontSize: -1, statusFontSize: "28", nameFontFamily: "<unsafe>" }));
	elements.get("#name-font").click();
	assert.equal(elements.get("#font-size").value, "20");
	assert.equal(elements.get("#font-family").value, "Arial");
});

test("project READY selector restores all choices without feedback and preserves layout, fonts and sections", () => {
	const settings = { projectID: "a", projectName: "Alpha", nameFontSize: 23, statusFontSize: 20, namePosition: "top", statusPosition: "bottom", sections: { display: false }, extra: 42 };
	let { elements, socket, saved } = inspector(settings);
	const select = elements.get("#ready-background");
	assert.deepEqual(select.options.map(({ value }) => value), ["plasma", "attention", "particle", "matrix", "brians-brain", "day-night", "generations-trails"]);
	assert.equal(select.value, "plasma"); assert.equal(saved(), undefined);
	for (const value of ["attention", "particle", "plasma", "matrix", "brians-brain", "day-night", "generations-trails"]) {
		select.change(value);
		assert.equal(saved().readyBackground, value);
		for (const field of Object.keys(settings)) assert.deepEqual(saved()[field], settings[field]);
	}
	select.change("generations-trails");
	({ elements, socket, saved } = inspector(saved()));
	assert.equal(elements.get("#ready-background").value, "generations-trails"); assert.equal(saved(), undefined);
	socket.message({ event: "didReceiveSettings", payload: { settings: { ...settings, readyBackground: [] } } });
	assert.equal(elements.get("#ready-background").value, "plasma"); assert.equal(saved(), undefined);
	elements.get("#ready-background").change("particle");
	elements.get("#name-font").click(); elements.get("#font-cancel").click();
	assert.equal(saved().readyBackground, "particle");
	elements.get("#name-font").click(); elements.get("#font-size").value = "24";
	elements.get("#font-form").listeners.submit({ preventDefault() {} });
	assert.equal(saved().readyBackground, "particle");
	elements.get("#project-id").change("b");
	assert.equal(saved().readyBackground, "particle");
});
