import type { BackgroundEffect } from "./background-animation.ts";
import { CELLULAR_WIDTH, CellularAutomaton, type CellularMode } from "./cellular-automaton.ts";

const palette: Record<CellularMode, ReadonlyArray<{ color: string; opacity: string } | undefined>> = {
	"brians-brain": [undefined, { color: "#74CFE5", opacity: "0.28" }, { color: "#74CFE5", opacity: "0.10" }],
	"day-night": [undefined, { color: "#70C6A4", opacity: "0.28" }],
	"generations-trails": [undefined, { color: "#9490C9", opacity: "0.03" }, { color: "#899FDA", opacity: "0.08" }, { color: "#79B5DF", opacity: "0.17" }, { color: "#78D0E6", opacity: "0.28" }],
};

/** Stateless SVG presentation of one key's cellular engine. */
export class CellularBackgroundAnimation implements BackgroundEffect {
	readonly frameIntervalMs: number;
	readonly automaton: CellularAutomaton;
	private readonly mode: CellularMode;

	constructor(mode: CellularMode, random: () => number = Math.random) {
		this.mode = mode;
		this.frameIntervalMs = mode === "day-night" ? 250 : 150;
		this.automaton = new CellularAutomaton(mode, random);
	}

	advance(): void { this.automaton.advance(); }

	background(): string {
		const paths = palette[this.mode].map(() => "");
		const board = this.automaton.snapshot();
		for (let i = 0; i < board.length; i++) {
			const state = board[i];
			if (state) paths[state] += `M${(i % CELLULAR_WIDTH) * 6} ${Math.floor(i / CELLULAR_WIDTH) * 6}h6v6h-6z`;
		}
		return `<rect width="144" height="144" rx="18" fill="#101216"/>${paths.map((path, state) => {
			const style = palette[this.mode][state];
			return path && style ? `<path data-cell-state="${state}" d="${path}" fill="${style.color}" opacity="${style.opacity}"/>` : "";
		}).join("")}`;
	}
}
