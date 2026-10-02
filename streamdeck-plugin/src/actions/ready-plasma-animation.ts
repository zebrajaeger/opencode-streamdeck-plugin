import type { BackgroundEffect } from "./background-animation.ts";

export const READY_PLASMA_ANIMATION = {
	backgroundColor: "#101216",
	color: "#2E9E5B",
	highlightColor: "#68CA86",
	frameIntervalMs: 150,
	periodMs: 12000,
	gridSize: 12,
	cellOpacity: 0.34,
	width: 144,
	height: 144,
} as const;

/** A periodic spatial field, driven by elapsed time rather than delivered frames. */
export class ReadyPlasmaAnimation implements BackgroundEffect {
	readonly frameIntervalMs = READY_PLASMA_ANIMATION.frameIntervalMs;
	private readonly startedAt: number;
	private readonly now: () => number;

	constructor(now: () => number = () => performance.now()) {
		this.now = now;
		this.startedAt = now();
	}

	advance(): void {} // The elapsed monotonic clock advances the field.

	background(): string {
		const { backgroundColor, color, highlightColor, gridSize, cellOpacity, width, height, periodMs } = READY_PLASMA_ANIMATION;
		const phase = ((Math.max(0, this.now() - this.startedAt) % periodMs) / periodMs) * Math.PI * 2;
		const step = width / gridSize;
		const cells: string[] = [];
		for (let row = 0; row < gridSize; row++) {
			for (let column = 0; column < gridSize; column++) {
				const x = (column + 0.5) / gridSize;
				const y = (row + 0.5) / gridSize;
				const wave = (Math.sin(Math.PI * 2 * x + phase) + Math.sin(Math.PI * 2 * y - phase) + Math.sin(Math.PI * 2 * (x + y) + phase)) / 3;
				const opacity = cellOpacity * (0.5 + 0.5 * wave);
				cells.push(`<circle cx="${((column + 0.5) * step).toFixed(2)}" cy="${((row + 0.5) * step).toFixed(2)}" r="${(step * 1.35).toFixed(2)}" fill="url(#ready-plasma)" opacity="${opacity.toFixed(4)}"/>`);
			}
		}
		return `<rect width="${width}" height="${height}" rx="18" fill="${backgroundColor}"/><defs><radialGradient id="ready-plasma"><stop offset="0" stop-color="${highlightColor}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>${cells.join("")}`;
	}
}
