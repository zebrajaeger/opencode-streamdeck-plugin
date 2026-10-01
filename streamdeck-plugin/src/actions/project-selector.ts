import type { JsonValue } from "@elgato/utils";

import type { KnownProject } from "../known-projects";

export interface ProjectSelectorInspector {
	sendToPropertyInspector(payload: JsonValue): Promise<void>;
}

/** Tracks selector state for the one property inspector that Stream Deck exposes at a time. */
export class ProjectSelector {
	private knownProjects: KnownProject[] = [];
	private actionID: string | undefined;
	private selectedProjectID: string | undefined;
	private readonly inspector: ProjectSelectorInspector;

	constructor(inspector: ProjectSelectorInspector) {
		this.inspector = inspector;
	}

	setKnownProjects(projects: KnownProject[]): void {
		this.knownProjects = projects;
		void this.send();
	}

	async appear(actionID: string, selectedProjectID: string | undefined): Promise<void> {
		this.actionID = actionID;
		this.selectedProjectID = selectedProjectID;
		await this.send();
	}

	async updateSettings(actionID: string, selectedProjectID: string | undefined): Promise<void> {
		if (actionID !== this.actionID) return;
		this.selectedProjectID = selectedProjectID;
		await this.send();
	}

	disappear(actionID: string): void {
		if (actionID !== this.actionID) return;
		this.actionID = undefined;
		this.selectedProjectID = undefined;
	}

	private async send(): Promise<void> {
		if (!this.actionID) return;
		await this.inspector.sendToPropertyInspector({
			type: "known-projects",
			projects: this.knownProjects,
			selectedProjectID: this.selectedProjectID,
		});
	}
}
