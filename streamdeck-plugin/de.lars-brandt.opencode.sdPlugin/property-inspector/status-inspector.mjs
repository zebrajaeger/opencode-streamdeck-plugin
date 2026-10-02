import { normalizeProjectPresentation } from "./project-presentation.mjs";
import { setupFontDialog } from "./font-dialog.mjs";

export function connectElgatoStreamDeckSocket(port, uuid, registerEvent, _info, actionInfo) {
	const trigger = document.querySelector("#status-font");
	const display = document.querySelector("#section-display");
	const socket = new WebSocket(`ws://127.0.0.1:${port}`);
	let settings = JSON.parse(actionInfo || "{}").payload?.settings ?? {};
	let restoring = false;
	function render() {
		const presentation = normalizeProjectPresentation(settings);
		trigger.textContent = `${presentation.statusFontFamily} · ${presentation.statusFontSize} px · ${presentation.statusFontStyle}`;
		restoring = true;
		display.open = typeof settings.sections?.display === "boolean" ? settings.sections.display : true;
		setTimeout(() => { restoring = false; }, 0);
	}
	function save(changes) {
		settings = { ...settings, ...changes };
		socket.send(JSON.stringify({ event: "setSettings", context: uuid, payload: settings }));
		render();
	}
	setupFontDialog({ status: trigger }, () => settings, save);
	display.addEventListener("toggle", () => {
		if (!restoring && display.open !== (typeof settings.sections?.display === "boolean" ? settings.sections.display : true)) {
			save({ sections: { ...settings.sections, display: display.open } });
		}
	});
	socket.addEventListener("open", () => {
		socket.send(JSON.stringify({ event: registerEvent, uuid }));
		socket.send(JSON.stringify({ event: "getSettings", context: uuid }));
	});
	socket.addEventListener("message", ({ data }) => {
		const message = JSON.parse(data);
		if (message.event === "didReceiveSettings") {
			settings = message.payload.settings ?? {};
			render();
		}
	});
	render();
}

if (typeof window !== "undefined") window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocket;
