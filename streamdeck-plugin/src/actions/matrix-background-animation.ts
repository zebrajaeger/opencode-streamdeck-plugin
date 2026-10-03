import type { BackgroundEffect } from "./background-animation.ts";

// Five-bit rows, drawn as 4×4 SVG units (two physical pixels per cell).
const alphabet = [
	[0b111, 0b101, 0b101, 0b101, 0b111], // 0
	[0b010, 0b110, 0b010, 0b010, 0b111], // 1
	[0b111, 0b001, 0b111, 0b100, 0b111], // 2
	[0b111, 0b001, 0b111, 0b001, 0b111], // 3
	[0b101, 0b101, 0b111, 0b001, 0b001], // 4
	[0b111, 0b100, 0b111, 0b001, 0b111], // 5
	[0b111, 0b100, 0b111, 0b101, 0b111], // 6
	[0b111, 0b001, 0b010, 0b010, 0b010], // 7
	[0b111, 0b101, 0b111, 0b101, 0b111], // 8
	[0b111, 0b101, 0b111, 0b001, 0b111], // 9
	[0b010, 0b101, 0b111, 0b101, 0b101], // A
	[0b110, 0b101, 0b110, 0b101, 0b110], // B
	[0b011, 0b100, 0b100, 0b100, 0b011], // C
	[0b110, 0b101, 0b101, 0b101, 0b110], // D
];

const width = 144;
const height = 144;
const rowPitch = 24;
const cycle = 272; // Tail clears the bottom before a head returns from above.
const columns = [
	{ x: 16, offset: 0, speed: 8.2 },
	{ x: 36, offset: 88, speed: 9.1 },
	{ x: 56, offset: 173, speed: 8.6 },
	{ x: 76, offset: 38, speed: 9.7 },
	{ x: 96, offset: 135, speed: 8.9 },
	{ x: 116, offset: 218, speed: 9.4 },
];

/** Sparse, font-independent character rain driven solely by elapsed time. */
export class MatrixBackgroundAnimation implements BackgroundEffect {
	readonly frameIntervalMs = 150;
	private readonly startedAt: number;
	private readonly now: () => number;

	constructor(now: () => number = () => performance.now()) {
		this.now = now;
		this.startedAt = now();
	}

	advance(): void {} // Time, rather than delivered frames, controls position.

	background(): string {
		const seconds = Math.max(0, this.now() - this.startedAt) / 1000;
		const glyphs: string[] = [];
		for (let column = 0; column < columns.length; column++) {
			const { x, offset, speed } = columns[column];
			const distance = offset + seconds * speed;
			const lap = Math.floor(distance / cycle);
			const head = (distance % cycle) - 48;
			for (let trail = 0; trail < 4; trail++) {
				const y = Math.floor(head - trail * rowPitch);
				if (y + 20 <= 0 || y >= height) continue;
				const bits = alphabet[(column * 7 + lap * 3 + Math.floor(distance / rowPitch) - trail * 5 + alphabet.length * 100) % alphabet.length];
				const cells: string[] = [];
				for (let row = 0; row < 5; row++) for (let bit = 0; bit < 3; bit++) {
					const cy = y + row * 4;
					if ((bits[row] & (4 >> bit)) && cy >= 0 && cy + 4 <= height) cells.push(`M${x + bit * 4} ${cy}h4v4h-4z`);
				}
				if (!cells.length) continue;
				// Reduce contrast across every supported label band, irrespective of its configured position.
				const center = y + 10;
				const labelBand = (center >= 18 && center < 44) || (center >= 66 && center < 92) || (center >= 114 && center < 140);
				const opacity = ([0.96, 0.65, 0.42, 0.25][trail] * (labelBand ? 0.55 : 1)).toFixed(2);
				glyphs.push(`<path data-matrix="${column}" data-trail="${trail}" d="${cells.join("")}" fill="${trail ? "#3BBA66" : "#9CEFAA"}" opacity="${opacity}"/>`);
			}
		}
		return `<rect width="${width}" height="${height}" rx="18" fill="#101216"/>${glyphs.join("")}`;
	}
}
