import type { GlobalStatusValue } from "../status-types";

/** Manages a project's per-key status subscriptions independently of Stream Deck UI events. */
export class ProjectStatusSubscriptions {
	private readonly projectIDs = new Map<string, string | undefined>();
	private readonly subscriptions = new Map<string, () => boolean>();
	private subscribeProject: ((projectID: string, listener: (status: GlobalStatusValue) => void) => () => boolean) | undefined;
	private readonly setStatus: (actionID: string, status: GlobalStatusValue) => void;

	constructor(setStatus: (actionID: string, status: GlobalStatusValue) => void) {
		this.setStatus = setStatus;
	}

	setSubscriber(subscribeProject: (projectID: string, listener: (status: GlobalStatusValue) => void) => () => boolean): void {
		this.subscribeProject = subscribeProject;
		for (const [actionID, projectID] of this.projectIDs) this.subscribe(actionID, projectID);
	}

	update(actionID: string, value: string | undefined): void {
		const projectID = value?.trim() || undefined;
		this.projectIDs.set(actionID, projectID);
		this.subscribe(actionID, projectID);
	}

	dispose(actionID: string): void {
		this.subscriptions.get(actionID)?.();
		this.subscriptions.delete(actionID);
		this.projectIDs.delete(actionID);
	}

	private subscribe(actionID: string, projectID: string | undefined): void {
		this.subscriptions.get(actionID)?.();
		this.subscriptions.delete(actionID);
		if (!projectID || !this.subscribeProject) {
			this.setStatus(actionID, "OFFLINE");
			return;
		}
		this.subscriptions.set(actionID, this.subscribeProject(projectID, (status) => this.setStatus(actionID, status)));
	}
}
