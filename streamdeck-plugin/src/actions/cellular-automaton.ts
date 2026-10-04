export type CellularMode = "brians-brain" | "day-night" | "generations-trails";
export const CELLULAR_WIDTH = 24;
export const CELLULAR_CELLS = CELLULAR_WIDTH * CELLULAR_WIDTH;

/** A pure rule seam: neighbors always count only the active state. */
export function nextCell(mode: CellularMode, state: number, activeNeighbors: number): number {
	if (mode === "day-night") return state === 0
		? (+([3, 6, 7, 8].includes(activeNeighbors)))
		: (+([3, 4, 6, 7, 8].includes(activeNeighbors)));
	if (state !== 0) return mode === "brians-brain" ? (state === 1 ? 2 : 0) : state - 1;
	return activeNeighbors === 2 ? (mode === "brians-brain" ? 1 : 4) : 0;
}

const offsets = [-1, 0, 1];
const neighbors = Array.from({ length: CELLULAR_CELLS }, (_, index) => {
	const x = index % CELLULAR_WIDTH;
	const y = Math.floor(index / CELLULAR_WIDTH);
	return offsets.flatMap((dy) => offsets.filter((dx) => dx !== 0 || dy !== 0).map((dx) =>
		((y + dy + CELLULAR_WIDTH) % CELLULAR_WIDTH) * CELLULAR_WIDTH + (x + dx + CELLULAR_WIDTH) % CELLULAR_WIDTH));
});

/** Evolves an explicit board without modifying it; useful for rule and wrapping fixtures. */
export function stepCells(mode: CellularMode, previous: Uint8Array, next: Uint8Array): number {
	const active = mode === "generations-trails" ? 4 : 1;
	let changes = 0;
	for (let index = 0; index < CELLULAR_CELLS; index++) {
		let count = 0;
		for (const adjacent of neighbors[index]) if (previous[adjacent] === active) count++;
		const value = nextCell(mode, previous[index], count);
		next[index] = value;
		if (value !== previous[index]) changes++;
	}
	return changes;
}

/** One isolated, fixed-size simulation per visible key. */
export class CellularAutomaton {
	private current = new Uint8Array(CELLULAR_CELLS);
	private next = new Uint8Array(CELLULAR_CELLS);
	private lowActivity = 0;
	private sparseActivity = 0;
	readonly mode: CellularMode;
	private readonly random: () => number;

	constructor(mode: CellularMode, random: () => number = Math.random, initial?: Uint8Array) {
		this.mode = mode;
		this.random = random;
		if (initial) {
			if (initial.length !== CELLULAR_CELLS) throw new RangeError("Cellular board must have 576 cells");
			this.current.set(initial);
			return;
		}
		const active = mode === "generations-trails" ? 4 : 1;
		for (let i = 0; i < CELLULAR_CELLS; i++) if (random() < (mode === "day-night" ? 0.45 : 0.15)) this.current[i] = active;
		if (this.extreme()) this.recover();
	}

	/** Returns a detached snapshot, never the mutable simulation buffer. */
	snapshot(): Uint8Array { return this.current.slice(); }

	advance(): void {
		const changes = stepCells(this.mode, this.current, this.next);
		[this.current, this.next] = [this.next, this.current];
		this.lowActivity = changes <= 5 ? this.lowActivity + 1 : 0;
		if (this.mode !== "day-night") {
			const activeState = this.mode === "brians-brain" ? 1 : 4;
			let activeCount = 0;
			for (const state of this.current) if (state === activeState) activeCount++;
			this.sparseActivity = activeCount <= 8 ? this.sparseActivity + 1 : 0;
		}
		if (this.extreme() || this.lowActivity >= 100 || this.sparseActivity >= 100) {
			this.recover();
			this.lowActivity = 0;
			this.sparseActivity = 0;
		}
	}

	private extreme(): boolean {
		let active = 0;
		for (const state of this.current) if (state !== 0) active++;
		return active === 0 || (this.mode === "day-night" && active === CELLULAR_CELLS);
	}

	private recover(): void {
		const count = 1 + Math.floor(this.unitRandom() * 3);
		const active = this.mode === "generations-trails" ? 4 : 1;
		for (let patch = 0; patch < count; patch++) {
			const center = Math.floor(this.unitRandom() * CELLULAR_CELLS);
			const x = center % CELLULAR_WIDTH;
			const y = Math.floor(center / CELLULAR_WIDTH);
			for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
				const index = ((y + dy + CELLULAR_WIDTH) % CELLULAR_WIDTH) * CELLULAR_WIDTH + (x + dx + CELLULAR_WIDTH) % CELLULAR_WIDTH;
				// Both empty and full Day & Night receive a local boundary; sparks get adjacent live cells.
				this.current[index] = this.mode === "day-night" && (dx === 1 || dy === 1) ? 0 : active;
			}
		}
	}

	private unitRandom(): number {
		const value = this.random();
		return Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0;
	}
}
