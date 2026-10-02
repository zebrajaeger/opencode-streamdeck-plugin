import { FONT_SIZES, normalizeProjectPresentation } from "./project-presentation.mjs";

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

function setupInspector(port, uuid, registerEvent, actionInfo) {
	const projectSelect = document.querySelector("#project-select");
	const projectID = document.querySelector("#project-id");
	const projectDetail = document.querySelector("#project-detail");
	const projectName = document.querySelector("#project-name");
	const namePosition = document.querySelector("#name-position");
	const statusPosition = document.querySelector("#status-position");
	const nameFontSize = document.querySelector("#name-font-size");
	const statusFontSize = document.querySelector("#status-font-size");
	for (const select of [nameFontSize, statusFontSize]) {
		for (const size of FONT_SIZES) {
			const option = document.createElement("option");
			option.value = String(size);
			option.textContent = `${size} px`;
			select.append(option);
		}
	}
	const connection = inspectorRegistration(port, uuid, registerEvent, actionInfo);
	const websocket = new WebSocket(connection.url);
	const context = connection.context;
	let knownProjects = [];
	let selectedProjectID = "";
	let settings = JSON.parse(actionInfo || "{}").payload?.settings ?? {};
	selectedProjectID = settings.projectID ?? "";

	function save(changes) {
		settings = { ...settings, ...normalizeProjectPresentation({ ...settings, ...changes }), ...changes };
		selectedProjectID = settings.projectID ?? "";
		websocket.send(JSON.stringify({ event: "setSettings", context, payload: settings }));
		renderProjects();
		renderPresentation();
	}

	function renderPresentation() {
		const presentation = normalizeProjectPresentation(settings);
		projectName.value = presentation.projectName;
		namePosition.value = presentation.namePosition;
		statusPosition.value = presentation.statusPosition;
		nameFontSize.value = String(presentation.nameFontSize);
		statusFontSize.value = String(presentation.statusFontSize);
		for (const option of namePosition.options) option.disabled = option.value === presentation.statusPosition;
		for (const option of statusPosition.options) option.disabled = option.value === presentation.namePosition;
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
		projectSelect.value = options.some((project) => project.projectID === selectedProjectID) ? selectedProjectID : "";
		projectID.value = selectedProjectID;
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
	projectSelect.addEventListener("change", () => save(projectSettings(projectSelect.value, settings)));
	projectID.addEventListener("change", () => save(projectSettings(projectID.value, settings)));
	projectName.addEventListener("change", () => save({ projectName: projectName.value }));
	namePosition.addEventListener("change", () => save({ namePosition: namePosition.value }));
	statusPosition.addEventListener("change", () => save({ statusPosition: statusPosition.value }));
	nameFontSize.addEventListener("change", () => save({ nameFontSize: Number(nameFontSize.value) }));
	statusFontSize.addEventListener("change", () => save({ statusFontSize: Number(statusFontSize.value) }));
	renderProjects();
	renderPresentation();
}

export function connectElgatoStreamDeckSocket(port, uuid, registerEvent, _info, actionInfo) {
	setupInspector(port, uuid, registerEvent, actionInfo);
}

if (typeof window !== "undefined") window.connectElgatoStreamDeckSocket = connectElgatoStreamDeckSocket;
