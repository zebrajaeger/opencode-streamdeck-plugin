import { action, SingletonAction, type DidReceiveSettingsEvent, type KeyAction, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import type { GlobalStatusValue } from "../status-types";
import { StatusActionRenderer } from "./particle-wait-animation";
import { ProjectStatusSubscriptions } from "./project-status-subscriptions";

export interface ProjectStatusSettings extends JsonObject {
	projectID?: string;
}

/** A display-only status view scoped to the OpenCode project chosen for each key. */
@action({ UUID: "de.lars-brandt.opencode.project-status" })
export class OpenCodeProjectStatus extends SingletonAction<ProjectStatusSettings> {
	private readonly renderer = new StatusActionRenderer();
	private readonly statuses = new Map<string, GlobalStatusValue>();
	private readonly projectSubscriptions = new ProjectStatusSubscriptions((actionID, status) => this.setStatus(actionID, status));

	setProjectSubscriber(subscribeProject: (projectID: string, listener: (status: GlobalStatusValue) => void) => () => boolean): void {
		this.projectSubscriptions.setSubscriber(subscribeProject);
	}

	setStatus(actionID: string, status: GlobalStatusValue): void {
		this.statuses.set(actionID, status);
		const action = [...this.actions].find((candidate): candidate is KeyAction<ProjectStatusSettings> => candidate.id === actionID && candidate.isKey());
		if (action) this.renderer.setStatus(status, [action]);
	}

	override async onWillAppear(event: WillAppearEvent<ProjectStatusSettings>): Promise<void> {
		if (!event.action.isKey()) return;
		this.projectSubscriptions.update(event.action.id, event.payload.settings.projectID);
		await this.renderer.renderStatus(event.action, this.statuses.get(event.action.id) ?? "OFFLINE");
	}

	override async onDidReceiveSettings(event: DidReceiveSettingsEvent<ProjectStatusSettings>): Promise<void> {
		this.projectSubscriptions.update(event.action.id, event.payload.settings.projectID);
		if (event.action.isKey()) await this.renderer.renderStatus(event.action, this.statuses.get(event.action.id) ?? "OFFLINE");
	}

	override async onWillDisappear(event: WillDisappearEvent<ProjectStatusSettings>): Promise<void> {
		this.projectSubscriptions.dispose(event.action.id);
		this.statuses.delete(event.action.id);
		await this.renderer.dispose(event.action.id);
	}
}
