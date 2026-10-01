import type { JsonObject } from "@elgato/utils";

export interface KnownProject extends JsonObject {
	projectID: string;
	directory: string;
}

export const KNOWN_PROJECTS_SETTINGS_KEY = "knownProjects";
export const KNOWN_PROJECTS_SETTINGS_VERSION = 1;

export interface KnownProjectSettings {
	getGlobalSettings(): Promise<JsonObject>;
	setGlobalSettings(settings: JsonObject): Promise<void>;
}

/** Validates and owns the local display metadata for projects observed by the bridge. */
export class KnownProjectStore {
	private readonly projects = new Map<string, KnownProject>();

	load(settings: JsonObject): void {
		const observedBeforeLoad = this.list();
		this.projects.clear();
		const persisted = parsePersistedProjects(settings[KNOWN_PROJECTS_SETTINGS_KEY]);
		for (const project of persisted) this.projects.set(project.projectID, project);
		for (const project of observedBeforeLoad) this.projects.set(project.projectID, project);
	}

	observe(projectID: unknown, directory: unknown): boolean {
		const project = validProject(projectID, directory);
		if (!project) return false;
		const previous = this.projects.get(project.projectID);
		if (previous?.directory === project.directory) return false;
		this.projects.set(project.projectID, project);
		return true;
	}

	list(): KnownProject[] {
		return [...this.projects.values()].sort((left, right) => left.directory.localeCompare(right.directory) || left.projectID.localeCompare(right.projectID));
	}

	withPersistedProjects(settings: JsonObject): JsonObject {
		return {
			...settings,
			[KNOWN_PROJECTS_SETTINGS_KEY]: {
				version: KNOWN_PROJECTS_SETTINGS_VERSION,
				projects: this.list(),
			},
		};
	}
}

/** Coordinates startup loading and serialized persistence of known-project metadata. */
export class KnownProjectPersistence {
	private globalSettings: JsonObject = {};
	private loaded = false;
	private dirty = false;
	private pendingWrite = Promise.resolve();
	private readonly store: KnownProjectStore;
	private readonly settings: KnownProjectSettings;
	private readonly publish: (projects: KnownProject[]) => void;

	constructor(store: KnownProjectStore, settings: KnownProjectSettings, publish: (projects: KnownProject[]) => void) {
		this.store = store;
		this.settings = settings;
		this.publish = publish;
	}

	async load(): Promise<void> {
		try {
			this.globalSettings = await this.settings.getGlobalSettings();
			this.store.load(this.globalSettings);
			this.publish(this.store.list());
		} catch (error: unknown) {
			console.error("Could not load known OpenCode projects:", error);
		} finally {
			this.loaded = true;
			this.persist();
		}
	}

	observe(projectID: unknown, directory: unknown): void {
		if (!this.store.observe(projectID, directory)) return;
		this.publish(this.store.list());
		this.dirty = true;
		this.persist();
	}

	private persist(): void {
		this.pendingWrite = this.pendingWrite.then(async () => {
			if (!this.loaded || !this.dirty) return;
			this.dirty = false;
			this.globalSettings = this.store.withPersistedProjects(this.globalSettings);
			try {
				await this.settings.setGlobalSettings(this.globalSettings);
			} catch (error: unknown) {
				this.dirty = true;
				console.error("Could not persist known OpenCode projects:", error);
			}
		}).catch((error: unknown) => console.error("Could not schedule known OpenCode project persistence:", error));
	}
}

function parsePersistedProjects(value: unknown): KnownProject[] {
	if (!isRecord(value) || value.version !== KNOWN_PROJECTS_SETTINGS_VERSION || !Array.isArray(value.projects)) return [];
	const projects = new Map<string, KnownProject>();
	for (const entry of value.projects) {
		const project = isRecord(entry) ? validProject(entry.projectID, entry.directory) : undefined;
		if (project) projects.set(project.projectID, project);
	}
	return [...projects.values()];
}

function validProject(projectID: unknown, directory: unknown): KnownProject | undefined {
	if (!isNonBlankString(projectID) || !isNonBlankString(directory)) return undefined;
	return { projectID, directory };
}

function isNonBlankString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
