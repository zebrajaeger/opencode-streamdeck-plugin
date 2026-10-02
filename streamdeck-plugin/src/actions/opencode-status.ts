import { action, SingletonAction, type DidReceiveSettingsEvent, type KeyAction, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import type { GlobalStatusValue } from "../status-types";
import { StatusActionRenderer } from "./status-action-renderer";
import type { ProjectPresentation } from "../../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";
import type { ReadyBackground } from "../../de.lars-brandt.opencode.sdPlugin/property-inspector/ready-background.mjs";

interface GlobalStatusSettings extends JsonObject {
	readyBackground?: ReadyBackground;
	statusFontSize?: number;
	statusFontFamily?: string;
	statusFontStyle?: ProjectPresentation["statusFontStyle"];
	statusFontUnderline?: boolean;
	statusFontColor?: string;
}

/** A display-only, global summary of every locally connected OpenCode bridge. */
@action({ UUID: "de.lars-brandt.opencode.status" })
export class OpenCodeStatus extends SingletonAction<GlobalStatusSettings> {
	private readonly renderer = new StatusActionRenderer();

	setStatus(status: GlobalStatusValue): void {
		this.renderer.setStatus(status, [...this.actions].filter((action): action is KeyAction<GlobalStatusSettings> => action.isKey()));
	}

	override async onWillAppear(event: WillAppearEvent<GlobalStatusSettings>): Promise<void> {
		if (!event.action.isKey()) return;
		this.renderer.configureGlobal(event.action.id, event.payload.settings);
		await this.renderer.renderCurrentStatus(event.action);
	}

	override async onDidReceiveSettings(event: DidReceiveSettingsEvent<GlobalStatusSettings>): Promise<void> {
		this.renderer.configureGlobal(event.action.id, event.payload.settings);
		if (event.action.isKey()) await this.renderer.renderCurrentStatus(event.action);
	}

	override async onWillDisappear(event: WillDisappearEvent<GlobalStatusSettings>): Promise<void> {
		await this.renderer.dispose(event.action.id);
	}
}
