import type { GlobalStatusValue } from "../status-types";
import { normalizeProjectPresentation, type ProjectPresentation } from "../../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";
import { projectStatusImage, statusFontImage } from "./project-status-image.mjs";
import { BackgroundAnimation, backgroundImage, type BackgroundAnimationOptions } from "./background-animation.ts";
import { ParticleWaitAnimation } from "./particle-wait-animation.ts";
import { AttentionHaloAnimation, ATTENTION_HALO_ANIMATION } from "./attention-halo-animation.ts";
import { ReadyPlasmaAnimation, READY_PLASMA_ANIMATION } from "./ready-plasma-animation.ts";

export interface StatusKey {
	readonly id: string;
	setImage(image?: string): Promise<void>;
	setTitle(title?: string): Promise<void>;
}

interface KeyPresentation {
	version: number;
	status?: GlobalStatusValue;
	completed?: GlobalStatusValue;
	title?: GlobalStatusValue;
	pending?: Promise<void>;
}

interface ActiveAnimation {
	status: GlobalStatusValue;
	controller: BackgroundAnimation;
}

export interface StatusActionRendererOptions extends BackgroundAnimationOptions {
	readonly now?: () => number;
	readonly random?: () => number;
}

/** Status presentation and per-key effect selection; all writes share an action-ID queue. */
export class StatusActionRenderer {
	private readonly animations = new Map<StatusKey, ActiveAnimation>();
	private readonly presentations = new Map<StatusKey, KeyPresentation>();
	private readonly writes = new Map<string, Promise<void>>();
	private readonly projectPresentations = new Map<string, ProjectPresentation>();
	private readonly globalPresentations = new Map<string, ProjectPresentation>();
	private status: GlobalStatusValue = "OFFLINE";
	private readonly options: StatusActionRendererOptions;

	constructor(options: StatusActionRendererOptions = {}) { this.options = options; }

	configureProject(actionID: string, settings: Partial<ProjectPresentation>): void {
		this.projectPresentations.set(actionID, normalizeProjectPresentation(settings));
	}

	configureGlobal(actionID: string, settings: Partial<ProjectPresentation>): void {
		this.globalPresentations.set(actionID, normalizeProjectPresentation(settings));
	}

	setStatus(status: GlobalStatusValue, actions: Iterable<StatusKey>): void {
		this.status = status;
		for (const action of actions) void this.render(action, status, false).catch(() => {});
	}

	async renderCurrentStatus(action: StatusKey): Promise<void> { await this.render(action, this.status); }
	async renderStatus(action: StatusKey, status: GlobalStatusValue): Promise<void> { await this.render(action, status); }

	async dispose(actionID: string): Promise<void> {
		this.projectPresentations.delete(actionID);
		this.globalPresentations.delete(actionID);
		const pending = [...this.presentations.keys()].filter((key) => key.id === actionID).map((action) => {
			this.presentations.delete(action);
			const animation = this.animations.get(action);
			this.animations.delete(action);
			return animation?.controller.dispose();
		});
		await Promise.all(pending);
	}

	get animationCount(): number { return this.animations.size; }

	private compose(action: StatusKey, status: GlobalStatusValue, background: string): string {
		const image = backgroundImage(background + (status === "ATTENTION" ? statusGlyph(ATTENTION_HALO_ANIMATION.color) : status === "READY" ? statusGlyph(READY_PLASMA_ANIMATION.color) : ""));
		const project = this.projectPresentations.get(action.id);
		if (project) return projectStatusImage(image, status, project);
		const global = this.globalPresentations.get(action.id);
		return global ? statusFontImage(image, status, global) : image;
	}

	private render(action: StatusKey, status: GlobalStatusValue, refresh = true): Promise<void> {
		let presentation = this.presentations.get(action);
		if (!presentation) {
			presentation = { version: 0 };
			this.presentations.set(action, presentation);
		}
		if (!refresh && presentation.status === status) {
			if (presentation.pending) return presentation.pending;
			if (presentation.completed === status) return Promise.resolve();
		}
		const state = presentation;
		const version = ++state.version;
		state.status = status;
		state.completed = undefined;
		const current = () => this.presentations.get(action) === state && state.version === version;
		let animation = this.animations.get(action);
		const stopped = animation && animation.status !== status ? animation.controller.dispose() : Promise.resolve();
		if (animation && animation.status !== status) {
			this.animations.delete(action);
			animation = undefined;
		}
		const pending = (async () => {
			if (!this.projectPresentations.has(action.id) && !this.globalPresentations.has(action.id) && state.title !== status) {
				await this.write(action, current, async () => { await action.setTitle(status); state.title = status; });
			}
			await stopped;
			if (!current()) return;
			if (status === "BUSY" || status === "ATTENTION" || status === "READY") {
				if (!animation) {
					const effect = status === "BUSY" ? new ParticleWaitAnimation(this.options.random) : status === "ATTENTION" ? new AttentionHaloAnimation(this.options.now) : new ReadyPlasmaAnimation(this.options.now);
					const active: ActiveAnimation = { status, controller: new BackgroundAnimation(effect, (background) => {
						const frameVersion = state.version;
						return this.write(action,
							() => this.presentations.get(action) === state && state.status === status && state.version === frameVersion && this.animations.get(action) === active,
							() => action.setImage(this.compose(action, status, background)));
					}, this.options) };
					this.animations.set(action, active);
					active.controller.start();
				} else if (refresh) {
					await animation.controller.refresh();
				}
			} else {
				await this.write(action, current, () => action.setImage(this.compose(action, status, statusBackground(status))));
			}
			if (current()) state.completed = status;
		})();
		state.pending = pending;
		void pending.finally(() => { if (state.pending === pending) state.pending = undefined; }).catch(() => {});
		return pending;
	}

	private write(action: StatusKey, current: () => boolean, write: () => Promise<void>): Promise<void> {
		const pending = (this.writes.get(action.id) ?? Promise.resolve()).catch(() => {}).then(async () => { if (current()) await write(); });
		this.writes.set(action.id, pending);
		void pending.finally(() => { if (this.writes.get(action.id) === pending) this.writes.delete(action.id); }).catch(() => {});
		return pending;
	}
}

function statusBackground(status: GlobalStatusValue): string {
	const colors: Record<GlobalStatusValue, string> = { OFFLINE: "#5D6470", READY: "#2E9E5B", BUSY: "#2878C8", ATTENTION: "#E69500", ERROR: "#CF3D3D" };
	const color = colors[status];
	return `<rect width="144" height="144" rx="18" fill="#101216"/>${statusGlyph(color)}`;
}

function statusGlyph(color: string): string {
	return `<circle cx="72" cy="46" r="22" fill="${color}"/><path d="M43 91h58" stroke="${color}" stroke-width="12" stroke-linecap="round"/>`;
}
