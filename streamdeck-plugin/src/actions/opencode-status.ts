import { action, SingletonAction, type KeyAction, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import type { GlobalStatusValue } from "../status-types";
import { StatusActionRenderer } from "./particle-wait-animation";

/** A display-only, global summary of every locally connected OpenCode bridge. */
@action({ UUID: "de.lars-brandt.opencode.status" })
export class OpenCodeStatus extends SingletonAction {
	private readonly renderer = new StatusActionRenderer();

	setStatus(status: GlobalStatusValue): void {
		this.renderer.setStatus(status, [...this.actions].filter((action): action is KeyAction<JsonObject> => action.isKey()));
	}

	override async onWillAppear(event: WillAppearEvent): Promise<void> {
		if (event.action.isKey()) await this.renderer.renderCurrentStatus(event.action);
	}

	override async onWillDisappear(event: WillDisappearEvent): Promise<void> {
		await this.renderer.dispose(event.action.id);
	}
}
