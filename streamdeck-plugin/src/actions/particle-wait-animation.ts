import { backgroundImage, type BackgroundEffect } from "./background-animation.ts";

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

interface Particle { x: number; y: number; vx: number; vy: number; }

/** Particle state and geometry, independent of key APIs and scheduling. */
export class ParticleWaitAnimation implements BackgroundEffect {
	readonly frameIntervalMs = PARTICLE_WAIT_ANIMATION.frameIntervalMs;
	private readonly particles: Particle[];
	private readonly random: () => number;

	constructor(random: () => number = Math.random) {
		this.random = random;
		this.particles = Array.from({ length: PARTICLE_WAIT_ANIMATION.particleCount }, () => this.createParticle());
	}

	advance(): void {
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

	background(): string {
		const { backgroundColor, connectionColor, connectionDistance, height, particleColor, particleRadius, width } = PARTICLE_WAIT_ANIMATION;
		const lines = this.particles.flatMap((particle, index) => this.particles.slice(index + 1)
			.filter((other) => distance(particle, other) <= connectionDistance)
			.map((other) => `<line x1="${particle.x.toFixed(2)}" y1="${particle.y.toFixed(2)}" x2="${other.x.toFixed(2)}" y2="${other.y.toFixed(2)}" stroke="${connectionColor}" stroke-opacity="0.45" stroke-width="1"/>`));
		const particles = this.particles.map((particle) => `<circle cx="${particle.x.toFixed(2)}" cy="${particle.y.toFixed(2)}" r="${particleRadius}" fill="${particleColor}"/>`);
		return `<rect width="${width}" height="${height}" rx="18" fill="${backgroundColor}"/>${lines.join("")}${particles.join("")}`;
	}

	frame(): string { return backgroundImage(this.background()); }

	private createParticle(): Particle {
		const direction = this.random() * Math.PI * 2;
		const speed = PARTICLE_WAIT_ANIMATION.speed * (0.6 + this.random() * 0.4);
		return { x: this.random() * PARTICLE_WAIT_ANIMATION.width, y: this.random() * PARTICLE_WAIT_ANIMATION.height, vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed };
	}
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}

function distance(first: Particle, second: Particle): number {
	return Math.hypot(first.x - second.x, first.y - second.y);
}
