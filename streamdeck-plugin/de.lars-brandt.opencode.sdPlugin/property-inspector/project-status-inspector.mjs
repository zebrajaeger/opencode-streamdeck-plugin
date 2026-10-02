import { normalizeProjectPresentation } from "./project-presentation.mjs";
import { setupFontDialog } from "./font-dialog.mjs";
import { READY_BACKGROUNDS, normalizeReadyBackground } from "./ready-background.mjs";

export function projectBasename(directory) {
	return directory.replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean).at(-1) || directory;
}

export function projectOptions(projects) {
	const names = projects.map((project) => projectBasename(project.directory));
	const duplicateNames = new Set(names.filter((name, index) => names.indexOf(name) !== index));
	return projects.map((project) => ({
		projectID: project.projectID,
		directory: project.directory,
		label: duplicateNames.has(projectBasename(project.directory)) ? `${projectBasename(project.directory)} — ${project.directory}` : projectBasename(project.directory),
	}));
}

export function projectSettings(projectID, settings = {}) {
	return { ...settings, projectID };
}

export function knownProjectsFromGlobalSettings(settings) {
	const persisted = settings?.knownProjects;
	if (persisted?.version !== 1 || !Array.isArray(persisted.projects)) return [];
	return persisted.projects.filter((project) => typeof project?.projectID === "string" && project.projectID.trim() && typeof project.directory === "string" && project.directory.trim());
}

export function mergeKnownProjects(persistedProjects, liveProjects) {
	return [...new Map([...persistedProjects, ...liveProjects].map((project) => [project.projectID, project])).values()];
}

export function inspectorRegistration(port, uuid, registerEvent, actionInfo) {
	return {
		context: uuid,
		registration: { event: registerEvent, uuid },
		url: `ws://127.0.0.1:${port}`,
	};
}

export function sectionStates(settings, defaults = { project: true, advanced: false, display: true }) {
	const stored = settings?.sections;
	return Object.fromEntries(Object.entries(defaults).map(([id, defaultOpen]) => [
		id, typeof stored?.[id] === "boolean" ? stored[id] : defaultOpen,
	]));
}

export function sectionSettings(settings, id, open) {
	return { ...settings, sections: { ...settings?.sections, [id]: open } };
}

function setupInspector(port, uuid, registerEvent, actionInfo) {
	const projectSelect = document.querySelector("#project-select");
	const projectID = document.querySelector("#project-id");
	const projectDetail = document.querySelector("#project-detail");
	const projectName = document.querySelector("#project-name");
	const namePosition = document.querySelector("#name-position");
	const statusPosition = document.querySelector("#status-position");
	const readyBackground = document.querySelector("#ready-background");
	for (const choice of READY_BACKGROUNDS) {
		const option = document.createElement("option");
		option.value = choice.value;
		option.textContent = choice.label;
		readyBackground.append(option);
	}
	const triggers = { name: document.querySelector("#name-font"), status: document.querySelector("#status-font") };
	let rendering = false;
	const update = (callback) => {
		rendering = true;
		try { callback(); } finally { rendering = false; }
	};
	const onChange = (control, callback) => control.addEventListener("valuechange", () => {
		if (!rendering) callback();
	});
	const connection = inspectorRegistration(port, uuid, registerEvent, actionInfo);
	const websocket = new WebSocket(connection.url);
	const context = connection.context;
	let knownProjects = [];
	let selectedProjectID = "";
	let settings = JSON.parse(actionInfo || "{}").payload?.settings ?? {};
	selectedProjectID = settings.projectID ?? "";
	const sections = Object.fromEntries([...document.querySelectorAll(".sdpi-section")].map((section) => [
		section.id.slice("section-".length), section,
	]));
	const defaults = Object.fromEntries(Object.entries(sections).map(([id, section]) => [id, section.open]));
	let restoringSections = false;
	function renderSections() {
		restoringSections = true;
		try {
			const states = sectionStates(settings, defaults);
			for (const [id, section] of Object.entries(sections)) section.open = states[id];
		} finally {
			// <details> toggle is queued asynchronously after changing `open`.
			setTimeout(() => { restoringSections = false; }, 0);
		}
	}

	function save(changes) {
		const normalized = normalizeProjectPresentation({ ...settings, ...changes });
		settings = { ...settings, namePosition: normalized.namePosition, statusPosition: normalized.statusPosition, nameFontSize: normalized.nameFontSize, statusFontSize: normalized.statusFontSize, ...changes };
		selectedProjectID = settings.projectID ?? "";
		websocket.send(JSON.stringify({ event: "setSettings", context, payload: settings }));
		renderProjects();
		renderPresentation();
	}

	function renderPresentation() {
		const presentation = normalizeProjectPresentation(settings);
		update(() => {
			readyBackground.value = normalizeReadyBackground(settings.readyBackground);
			projectName.value = presentation.projectName;
			namePosition.value = presentation.namePosition;
			statusPosition.value = presentation.statusPosition;
			for (const prefix of ["name", "status"]) {
				triggers[prefix].textContent = `${presentation[`${prefix}FontFamily`]} · ${presentation[`${prefix}FontSize`]} px · ${presentation[`${prefix}FontStyle`]}`;
			}
			for (const option of namePosition.querySelectorAll("option")) option.disabled = option.value === presentation.statusPosition;
			for (const option of statusPosition.querySelectorAll("option")) option.disabled = option.value === presentation.namePosition;
		});
	}

	function renderProjects() {
		const options = projectOptions(knownProjects);
		projectSelect.replaceChildren();
		const placeholder = document.createElement("option");
		placeholder.value = "";
		placeholder.textContent = options.length ? "Select a project" : "No known projects yet";
		projectSelect.append(placeholder);
		for (const project of options) {
			const option = document.createElement("option");
			option.value = project.projectID;
			option.textContent = project.label;
			option.title = project.directory;
			projectSelect.append(option);
		}
		projectSelect.disabled = options.length === 0;
		update(() => {
			projectSelect.value = options.some((project) => project.projectID === selectedProjectID) ? selectedProjectID : "";
			projectID.value = selectedProjectID;
		});
		const selected = options.find((project) => project.projectID === selectedProjectID);
		projectDetail.textContent = selected ? selected.directory : "Connect OpenCode to a project to select it here. The key stays OFFLINE until its configured project connects.";
	}

	websocket.addEventListener("message", ({ data }) => {
		const message = JSON.parse(data);
		if (message.event === "didReceiveSettings") {
			settings = message.payload.settings;
			selectedProjectID = settings.projectID ?? "";
			renderProjects();
			renderPresentation();
			renderSections();
		}
		if (message.event === "didReceiveGlobalSettings") {
			knownProjects = mergeKnownProjects(knownProjectsFromGlobalSettings(message.payload?.settings), knownProjects);
			renderProjects();
		}
		if (message.event === "sendToPropertyInspector" && message.payload?.type === "known-projects") {
			knownProjects = mergeKnownProjects(knownProjects, Array.isArray(message.payload.projects) ? message.payload.projects : []);
			selectedProjectID = message.payload.selectedProjectID ?? selectedProjectID;
			renderProjects();
		}
	});
	websocket.addEventListener("open", () => {
		websocket.send(JSON.stringify(connection.registration));
		websocket.send(JSON.stringify({ event: "getSettings", context }));
		websocket.send(JSON.stringify({ event: "getGlobalSettings", context: uuid }));
	});
	onChange(projectSelect, () => save(projectSettings(projectSelect.value, settings)));
	onChange(projectID, () => save(projectSettings(projectID.value, settings)));
	onChange(projectName, () => save({ projectName: projectName.value }));
	onChange(namePosition, () => save({ namePosition: namePosition.value }));
	onChange(statusPosition, () => save({ statusPosition: statusPosition.value }));
	onChange(readyBackground, () => save({ readyBackground: normalizeReadyBackground(readyBackground.value) }));
	setupFontDialog(triggers, () => settings, save);
	for (const [id, section] of Object.entries(sections)) {
		section.addEventListener("toggle", () => {
			if (!restoringSections && section.open !== sectionStates(settings, defaults)[id]) {
				save(sectionSettings(settings, id, section.open));
			}
		});
	}
	renderProjects();
	renderPresentation();
	renderSections();
}

export function connectElgatoStreamDeckSocket(port, uuid, registerEvent, _info, actionInfo) {
	setupInspector(port, uuid, registerEvent, actionInfo);
}

if (typeof window !== "undefined") window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocket;
