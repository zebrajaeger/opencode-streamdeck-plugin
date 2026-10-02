/** Effects own geometry only; the controller owns delivery and lifecycle. */
export interface BackgroundEffect {
	readonly frameIntervalMs: number;
	advance(): void;
	background(): string;
}

export interface BackgroundAnimationOptions {
	readonly schedule?: (callback: () => void, delay: number) => ReturnType<typeof setInterval>;
	readonly cancel?: (timer: ReturnType<typeof setInterval>) => void;
}

export function backgroundImage(background: string): string {
	return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">${background}</svg>`)}`;
}

/** One serialized, cancellable frame stream for one visible key. */
export class BackgroundAnimation {
	private active = false;
	private disposed = false;
	private generation = 0;
	private revision = 0;
	private renderChain: Promise<void> = Promise.resolve();
	private timer: ReturnType<typeof setInterval> | undefined;
	private readonly schedule: NonNullable<BackgroundAnimationOptions["schedule"]>;
	private readonly cancel: NonNullable<BackgroundAnimationOptions["cancel"]>;
	readonly effect: BackgroundEffect;
	private readonly deliver: (background: string) => Promise<void>;

	constructor(
		effect: BackgroundEffect,
		deliver: (background: string) => Promise<void>,
		options: BackgroundAnimationOptions = {},
	) {
		this.effect = effect;
		this.deliver = deliver;
		this.schedule = options.schedule ?? setInterval;
		this.cancel = options.cancel ?? clearInterval;
	}

	start(): void {
		if (this.active || this.disposed) return;
		this.active = true;
		const generation = ++this.generation;
		void this.render(generation);
		this.timer = this.schedule(() => {
			if (!this.active || generation !== this.generation) return;
			this.effect.advance();
			void this.render(generation);
		}, this.effect.frameIntervalMs);
	}

	/** Capture the current effect without advancing or restarting it. */
	refresh(): Promise<void> {
		this.revision++;
		return this.render(this.generation);
	}

	async stop(): Promise<void> {
		this.active = false;
		this.generation++;
		if (this.timer !== undefined) {
			this.cancel(this.timer);
			this.timer = undefined;
		}
		await this.renderChain;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		await this.stop();
	}

	private render(generation: number): Promise<void> {
		const revision = this.revision;
		const background = this.effect.background();
		this.renderChain = this.renderChain.catch(() => {}).then(async () => {
			if (!this.active || generation !== this.generation || revision !== this.revision) return;
			await this.deliver(background);
		}).catch(() => {});
		return this.renderChain;
	}
}
