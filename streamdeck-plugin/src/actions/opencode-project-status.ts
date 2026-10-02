import streamDeck, { action, SingletonAction, type DidReceiveSettingsEvent, type KeyAction, type PropertyInspectorDidAppearEvent, type PropertyInspectorDidDisappearEvent, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import type { GlobalStatusValue } from "../status-types";
import type { KnownProject } from "../known-projects";
import { StatusActionRenderer } from "./particle-wait-animation";
import { ProjectSelector } from "./project-selector";
import { ProjectStatusSubscriptions } from "./project-status-subscriptions";
import type { TextPosition } from "../../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";

export interface ProjectStatusSettings extends JsonObject {
	projectID?: string;
	projectName?: string;
	nameFontSize?: number;
	statusFontSize?: number;
	namePosition?: TextPosition;
	statusPosition?: TextPosition;
}

/** A display-only status view scoped to the OpenCode project chosen for each key. */
@action({ UUID: "de.lars-brandt.opencode.project-status" })
export class OpenCodeProjectStatus extends SingletonAction<ProjectStatusSettings> {
	private readonly renderer = new StatusActionRenderer();
	private readonly statuses = new Map<string, GlobalStatusValue>();
	private readonly projectSubscriptions = new ProjectStatusSubscriptions((actionID, status) => this.setStatus(actionID, status));
	private readonly projectSelector: ProjectSelector;

	constructor() {
		super();
		this.projectSelector = new ProjectSelector(streamDeck.ui);
	}

	setProjectSubscriber(subscribeProject: (projectID: string, listener: (status: GlobalStatusValue) => void) => () => boolean): void {
		this.projectSubscriptions.setSubscriber(subscribeProject);
	}

	setKnownProjects(projects: KnownProject[]): void {
		this.projectSelector.setKnownProjects(projects);
	}

	setStatus(actionID: string, status: GlobalStatusValue): void {
		this.statuses.set(actionID, status);
		const action = [...this.actions].find((candidate): candidate is KeyAction<ProjectStatusSettings> => candidate.id === actionID && candidate.isKey());
		if (action) this.renderer.setStatus(status, [action]);
	}

	override async onWillAppear(event: WillAppearEvent<ProjectStatusSettings>): Promise<void> {
		if (!event.action.isKey()) return;
		this.renderer.configureProject(event.action.id, event.payload.settings);
		this.projectSubscriptions.update(event.action.id, event.payload.settings.projectID);
		await this.renderer.renderStatus(event.action, this.statuses.get(event.action.id) ?? "OFFLINE");
	}

	override async onDidReceiveSettings(event: DidReceiveSettingsEvent<ProjectStatusSettings>): Promise<void> {
		this.renderer.configureProject(event.action.id, event.payload.settings);
		this.projectSubscriptions.update(event.action.id, event.payload.settings.projectID);
		if (event.action.isKey()) await this.renderer.renderStatus(event.action, this.statuses.get(event.action.id) ?? "OFFLINE");
		await this.projectSelector.updateSettings(event.action.id, event.payload.settings.projectID);
	}

	override async onPropertyInspectorDidAppear(event: PropertyInspectorDidAppearEvent<ProjectStatusSettings>): Promise<void> {
		if (!event.action.isKey()) return;
		const settings = await event.action.getSettings();
		await this.projectSelector.appear(event.action.id, settings.projectID);
	}

	override onPropertyInspectorDidDisappear(event: PropertyInspectorDidDisappearEvent<ProjectStatusSettings>): void {
		if (!event.action.isKey()) return;
		this.projectSelector.disappear(event.action.id);
	}

	override async onWillDisappear(event: WillDisappearEvent<ProjectStatusSettings>): Promise<void> {
		this.projectSubscriptions.dispose(event.action.id);
		this.statuses.delete(event.action.id);
		await this.renderer.dispose(event.action.id);
	}

}
