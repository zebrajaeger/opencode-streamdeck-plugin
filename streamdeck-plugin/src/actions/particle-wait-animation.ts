import type { GlobalStatusValue } from "../status-types";

export const PARTICLE_WAIT_ANIMATION = {
	backgroundColor: "#101216",
	connectionColor: "#5AA8F7",
	connectionDistance: 48,
	frameIntervalMs: 180,
	height: 144,
	particleColor: "#B9DEFF",
	particleCount: 14,
	particleRadius: 2.5,
	speed: 0.65,
	width: 144,
} as const;

export interface ParticleWaitAnimationOptions {
	readonly random?: () => number;
	readonly schedule?: (callback: () => void, delay: number) => ReturnType<typeof setInterval>;
	readonly cancel?: (timer: ReturnType<typeof setInterval>) => void;
}

export interface ParticleWaitAnimationKey {
	setImage(image?: string): Promise<void>;
}

export interface StatusKey extends ParticleWaitAnimationKey {
	readonly id: string;
	setTitle(title?: string): Promise<void>;
}

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

/** Renders and owns the BUSY wait animation for one visible Stream Deck key. */
export class ParticleWaitAnimation {
	private readonly action: ParticleWaitAnimationKey;
	private readonly cancel: (timer: ReturnType<typeof setInterval>) => void;
	private readonly particles: Particle[];
	private readonly random: () => number;
	private readonly schedule: (callback: () => void, delay: number) => ReturnType<typeof setInterval>;
	private active = false;
	private generation = 0;
	private renderChain: Promise<void> = Promise.resolve();
	private timer: ReturnType<typeof setInterval> | undefined;

	constructor(
		action: ParticleWaitAnimationKey,
		options: ParticleWaitAnimationOptions = {},
	) {
		this.action = action;
		this.random = options.random ?? Math.random;
		this.schedule = options.schedule ?? setInterval;
		this.cancel = options.cancel ?? clearInterval;
		this.particles = Array.from({ length: PARTICLE_WAIT_ANIMATION.particleCount }, () => this.createParticle());
	}

	start(): void {
		if (this.active) return;

		this.active = true;
		const generation = ++this.generation;
		void this.render(generation);
		this.timer = this.schedule(() => {
			this.advanceParticles();
			void this.render(generation);
		}, PARTICLE_WAIT_ANIMATION.frameIntervalMs);
	}

	async stop(): Promise<void> {
		if (!this.active) return;

		this.active = false;
		this.generation++;
		if (this.timer !== undefined) {
			this.cancel(this.timer);
			this.timer = undefined;
		}
		await this.renderChain;
	}

	async dispose(): Promise<void> {
		await this.stop();
	}

	advanceParticles(): void {
		for (const particle of this.particles) {
			particle.x += particle.vx;
			particle.y += particle.vy;

			if (particle.x <= 0 || particle.x >= PARTICLE_WAIT_ANIMATION.width) {
				particle.vx *= -1;
				particle.x = clamp(particle.x, 0, PARTICLE_WAIT_ANIMATION.width);
			}
			if (particle.y <= 0 || particle.y >= PARTICLE_WAIT_ANIMATION.height) {
				particle.vy *= -1;
				particle.y = clamp(particle.y, 0, PARTICLE_WAIT_ANIMATION.height);
			}
		}
	}

	frame(): string {
		const { backgroundColor, connectionColor, connectionDistance, height, particleColor, particleRadius, width } = PARTICLE_WAIT_ANIMATION;
		const lines = this.particles.flatMap((particle, index) => this.particles.slice(index + 1)
			.filter((other) => distance(particle, other) <= connectionDistance)
			.map((other) => `<line x1="${particle.x.toFixed(2)}" y1="${particle.y.toFixed(2)}" x2="${other.x.toFixed(2)}" y2="${other.y.toFixed(2)}" stroke="${connectionColor}" stroke-opacity="0.45" stroke-width="1"/>`));
		const particles = this.particles.map((particle) => `<circle cx="${particle.x.toFixed(2)}" cy="${particle.y.toFixed(2)}" r="${particleRadius}" fill="${particleColor}"/>`);
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="18" fill="${backgroundColor}"/>${lines.join("")}${particles.join("")}</svg>`;
		return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
	}

	private createParticle(): Particle {
		const direction = this.random() * Math.PI * 2;
		const speed = PARTICLE_WAIT_ANIMATION.speed * (0.6 + this.random() * 0.4);
		return {
			x: this.random() * PARTICLE_WAIT_ANIMATION.width,
			y: this.random() * PARTICLE_WAIT_ANIMATION.height,
			vx: Math.cos(direction) * speed,
			vy: Math.sin(direction) * speed,
		};
	}

	private async render(generation: number): Promise<void> {
		const image = this.frame();
		this.renderChain = this.renderChain.then(async () => {
			if (!this.active || generation !== this.generation) return;
			await this.action.setImage(image);
		});
		await this.renderChain;
	}
}

/** Coordinates static status images and the BUSY animation for visible keys. */
export class StatusActionRenderer {
	private readonly animations = new Map<StatusKey, ParticleWaitAnimation>();
	private readonly renderVersions = new Map<StatusKey, number>();
	private status: GlobalStatusValue = "OFFLINE";

	setStatus(status: GlobalStatusValue, actions: Iterable<StatusKey>): void {
		this.status = status;
		for (const action of actions) void this.render(action, status);
	}

	async renderCurrentStatus(action: StatusKey): Promise<void> {
		await this.render(action, this.status);
	}

	async renderStatus(action: StatusKey, status: GlobalStatusValue): Promise<void> {
		await this.render(action, status);
	}

	async dispose(actionID: string): Promise<void> {
		const action = [...this.animations.keys()].find((key) => key.id === actionID);
		if (!action) return;

		this.renderVersions.set(action, (this.renderVersions.get(action) ?? 0) + 1);
		await this.animations.get(action)?.dispose();
		this.animations.delete(action);
		this.renderVersions.delete(action);
	}

	get animationCount(): number {
		return this.animations.size;
	}

	private async render(action: StatusKey, status: GlobalStatusValue): Promise<void> {
		const version = (this.renderVersions.get(action) ?? 0) + 1;
		this.renderVersions.set(action, version);
		await action.setTitle(status);
		if (this.renderVersions.get(action) !== version) return;

		if (status === "BUSY") {
			let animation = this.animations.get(action);
			if (!animation) {
				animation = new ParticleWaitAnimation(action);
				this.animations.set(action, animation);
			}
			animation.start();
			return;
		}

		await this.animations.get(action)?.stop();
		if (this.renderVersions.get(action) !== version) return;
		await action.setImage(statusImage(status));
	}
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}

function distance(first: Particle, second: Particle): number {
	return Math.hypot(first.x - second.x, first.y - second.y);
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
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#101216"/><circle cx="72" cy="46" r="22" fill="${color}"/><path d="M43 91h58" stroke="${color}" stroke-width="12" stroke-linecap="round"/></svg>`;
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
