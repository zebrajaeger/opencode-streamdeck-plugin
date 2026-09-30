import { action, SingletonAction, type KeyAction, type WillAppearEvent } from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";

import type { GlobalStatusValue } from "../status-types";

/** A display-only, global summary of every locally connected OpenCode bridge. */
@action({ UUID: "de.lars-brandt.opencode.status" })
export class OpenCodeStatus extends SingletonAction {
	private status: GlobalStatusValue = "OFFLINE";

	setStatus(status: GlobalStatusValue): void {
		this.status = status;
		for (const action of this.actions) {
			if (action.isKey()) void this.render(action, status);
		}
	}

	override async onWillAppear(event: WillAppearEvent): Promise<void> {
		if (event.action.isKey()) await this.render(event.action, this.status);
	}

	private async render(action: KeyAction<JsonObject>, status: GlobalStatusValue): Promise<void> {
		await Promise.all([
			action.setTitle(status),
			action.setImage(statusImage(status)),
		]);
	}
}

function statusImage(status: GlobalStatusValue): string {
	const colors: Record<GlobalStatusValue, string> = {
		OFFLINE: "#5D6470",
		READY: "#2E9E5B",
		BUSY: "#2878C8",
		ATTENTION: "#E69500",
		ERROR: "#CF3D3D",
	};
	const color = colors[status];
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#101216"/><circle cx="72" cy="46" r="22" fill="${color}"/><path d="M43 91h58" stroke="${color}" stroke-width="12" stroke-linecap="round"/></svg>`;
}
