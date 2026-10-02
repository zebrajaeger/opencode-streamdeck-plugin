import type { BackgroundEffect } from "./background-animation.ts";

export const ATTENTION_HALO_ANIMATION = {
	backgroundColor: "#101216",
	color: "#E69500",
	frameIntervalMs: 100,
	periodMs: 2400,
	minimumOpacity: 0.20,
	maximumOpacity: 0.65,
	radius: 58,
	width: 144,
	height: 144,
} as const;

/** Elapsed-time pulse: delivery delays never accumulate phase drift. */
export class AttentionHaloAnimation implements BackgroundEffect {
	readonly frameIntervalMs = ATTENTION_HALO_ANIMATION.frameIntervalMs;
	private readonly now: () => number;
	private readonly startedAt: number;

	constructor(now: () => number = () => performance.now()) {
		this.now = now;
		this.startedAt = now();
	}

	advance(): void {} // The monotonic clock, not delivered-frame count, drives intensity.

	background(): string {
		const { backgroundColor, color, periodMs, minimumOpacity, maximumOpacity, radius, width, height } = ATTENTION_HALO_ANIMATION;
		const elapsed = Math.max(0, this.now() - this.startedAt);
		const intensity = (1 + Math.cos((elapsed % periodMs) / periodMs * Math.PI * 2)) / 2;
		const opacity = minimumOpacity + (maximumOpacity - minimumOpacity) * intensity;
		return `<rect width="${width}" height="${height}" rx="18" fill="${backgroundColor}"/><defs><radialGradient id="attention-halo"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="72" cy="64" r="${radius}" fill="url(#attention-halo)" opacity="${opacity.toFixed(4)}"/>`;
	}
}
