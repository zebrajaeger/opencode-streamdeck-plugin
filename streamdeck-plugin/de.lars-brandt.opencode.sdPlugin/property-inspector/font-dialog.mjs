import { FONT_FAMILIES, FONT_STYLES, normalizeProjectPresentation } from "./project-presentation.mjs";

/** Bind the shared font modal; drafts are never persisted until Apply. */
export function setupFontDialog(triggers, getSettings, save) {
	const dialog = document.querySelector("#font-dialog");
	const form = document.querySelector("#font-form");
	const title = document.querySelector("#font-dialog-title");
	const family = document.querySelector("#font-family");
	const size = document.querySelector("#font-size");
	const sizeValue = document.querySelector("#font-size-value");
	const style = document.querySelector("#font-style");
	const underline = document.querySelector("#font-underline");
	const color = document.querySelector("#font-color");
	let editingFont = null;
	let returnFocus = null;
	for (const [select, choices] of [[family, FONT_FAMILIES], [style, FONT_STYLES]]) {
		for (const choice of choices) {
			const option = document.createElement("option");
			option.value = String(choice);
			option.textContent = String(choice);
			select.append(option);
		}
	}
	size.addEventListener("input", () => { sizeValue.textContent = `${size.value} px`; });
	for (const [prefix, trigger] of Object.entries(triggers)) trigger.addEventListener("click", () => {
		const presentation = normalizeProjectPresentation(getSettings());
		editingFont = prefix;
		returnFocus = trigger;
		title.textContent = prefix === "name" ? "Name font" : "Status font";
		family.value = presentation[`${prefix}FontFamily`];
		size.value = String(presentation[`${prefix}FontSize`]);
		sizeValue.textContent = `${size.value} px`;
		style.value = presentation[`${prefix}FontStyle`];
		underline.checked = presentation[`${prefix}FontUnderline`];
		color.value = presentation[`${prefix}FontColor`];
		dialog.showModal();
		family.focus();
	});
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		if (!editingFont) return;
		const prefix = editingFont;
		const changes = {
			[`${prefix}FontFamily`]: family.value,
			[`${prefix}FontSize`]: Number(size.value),
			[`${prefix}FontStyle`]: style.value,
			[`${prefix}FontUnderline`]: underline.checked,
			[`${prefix}FontColor`]: color.value.toUpperCase(),
		};
		dialog.close();
		save(changes);
	});
	document.querySelector("#font-cancel").addEventListener("click", () => dialog.close());
	dialog.addEventListener("close", () => {
		editingFont = null;
		returnFocus?.focus();
		returnFocus = null;
	});
}
