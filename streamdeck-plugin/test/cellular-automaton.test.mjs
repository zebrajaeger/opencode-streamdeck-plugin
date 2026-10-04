import assert from "node:assert/strict";
import test from "node:test";
import { CELLULAR_CELLS, CellularAutomaton, nextCell, stepCells } from "../src/actions/cellular-automaton.ts";

test("all neighbor counts obey each mode's birth, survival and decay rule", () => {
	for (let count = 0; count <= 8; count++) {
		assert.equal(nextCell("brians-brain", 0, count), count === 2 ? 1 : 0);
		assert.equal(nextCell("brians-brain", 1, count), 2);
		assert.equal(nextCell("brians-brain", 2, count), 0);
		assert.equal(nextCell("day-night", 0, count), +[3, 6, 7, 8].includes(count));
		assert.equal(nextCell("day-night", 1, count), +[3, 4, 6, 7, 8].includes(count));
		assert.equal(nextCell("generations-trails", 0, count), count === 2 ? 4 : 0);
		for (let state = 1; state <= 4; state++) assert.equal(nextCell("generations-trails", state, count), state - 1);
	}
});

test("toroidal edges and corners count only active neighbors and evolve simultaneously", () => {
	for (const [mode, active] of [["brians-brain", 1], ["generations-trails", 4]]) {
		const old = new Uint8Array(CELLULAR_CELLS);
		const next = new Uint8Array(CELLULAR_CELLS);
		old[23] = active;
		old[23 * 24] = active;
		stepCells(mode, old, next);
		assert.equal(next[0], active);
		assert.equal(next[23], mode === "brians-brain" ? 2 : 3);
		assert.deepEqual([old[23], old[23 * 24]], [active, active]);
		old[23 * 24] = mode === "brians-brain" ? 2 : 3;
		stepCells(mode, old, next);
		assert.equal(next[0], 0);
	}
	const old = new Uint8Array(CELLULAR_CELLS);
	old[23] = old[23 * 24] = old[23 * 24 + 23] = 1;
	const next = new Uint8Array(CELLULAR_CELLS);
	stepCells("day-night", old, next);
	assert.equal(next[0], 1);
});

test("extreme initialization and repeated recovery remain bounded even with constant randomness", () => {
	for (const mode of ["brians-brain", "day-night", "generations-trails"]) {
		for (const random of [() => 0, () => 1]) {
			const engine = new CellularAutomaton(mode, random);
			for (let i = 0; i < 300; i++) {
				const before = engine.snapshot();
				assert.equal(before.length, CELLULAR_CELLS);
				assert.ok([...before].every((state) => state <= (mode === "generations-trails" ? 4 : mode === "brians-brain" ? 2 : 1)));
				engine.advance();
			}
		}
	}
});

test("extinction and full Day & Night recover locally without touching cells outside patches", () => {
	for (const mode of ["brians-brain", "day-night", "generations-trails"]) {
		const empty = new CellularAutomaton(mode, () => 0, new Uint8Array(CELLULAR_CELLS));
		empty.advance();
		assert.ok(empty.snapshot().some(Boolean));
		assert.ok(empty.snapshot().filter(Boolean).length <= 27);
	}
	const full = new CellularAutomaton("day-night", () => 0, new Uint8Array(CELLULAR_CELLS).fill(1));
	full.advance();
	const board = full.snapshot();
	assert.ok(board.some((value) => value === 0));
	assert.ok(board.filter((value) => value === 0).length <= 27);
	assert.equal(board[12 * 24 + 12], 1);
});

test("recovery occurs at exactly 100 quiet generations and >5 changes reset the counter", () => {
	const stable = new Uint8Array(CELLULAR_CELLS);
	stable[0] = stable[12 * 24 + 12] = 1; // isolated active cells die on the first step
	const engine = new CellularAutomaton("day-night", () => 0, stable);
	// Fixed points without extinction: two well-separated 2x2 blocks.
	const blocks = new Uint8Array(CELLULAR_CELLS);
	for (const [x, y] of [[5, 5], [16, 16]]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) blocks[(y + dy) * 24 + x + dx] = 1;
	const quiet = new CellularAutomaton("day-night", () => 0, blocks);
	for (let i = 0; i < 99; i++) quiet.advance();
	assert.deepEqual(quiet.snapshot(), blocks);
	quiet.advance();
	assert.notDeepEqual(quiet.snapshot(), blocks);
	engine.advance();
	assert.ok(engine.snapshot().some(Boolean));
	const lively = new Uint8Array(CELLULAR_CELLS);
	for (let i = 0; i < 30; i++) lively[i * 7] = 1;
	const active = new CellularAutomaton("day-night", () => 0, lively);
	active.advance();
	assert.notDeepEqual(active.snapshot(), lively);
});

test("moving sparse patterns reseed locally on generation 100 despite changing more than five cells", () => {
	for (const mode of ["brians-brain", "generations-trails"]) {
		let seed = 1;
		const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
		const warmup = new CellularAutomaton(mode, random);
		let state;
		for (let i = 0; i < 2000; i++) {
			warmup.advance();
			const candidate = warmup.snapshot();
			let board = candidate, valid = true;
			for (let j = 0; j < 100; j++) {
				const next = new Uint8Array(CELLULAR_CELLS);
				const changes = stepCells(mode, board, next);
				const active = next.filter((cell) => cell === (mode === "brians-brain" ? 1 : 4)).length;
				if (changes <= 5 || active < 1 || active > 8) { valid = false; break; }
				board = next;
			}
			if (valid) { state = candidate; break; }
		}
		assert.ok(state, `${mode} should have a sparse moving fixture`);
		let draws = 0;
		const simulation = new CellularAutomaton(mode, () => { draws++; return 0.5; }, state);
		for (let i = 0; i < 99; i++) {
			const before = simulation.snapshot();
			const expected = new Uint8Array(CELLULAR_CELLS);
			assert.ok(stepCells(mode, before, expected) > 5);
			assert.ok(expected.filter((cell) => cell === (mode === "brians-brain" ? 1 : 4)).length <= 8);
			simulation.advance();
			assert.deepEqual(simulation.snapshot(), expected);
			assert.equal(draws, 0);
		}
		const expected = new Uint8Array(CELLULAR_CELLS);
		stepCells(mode, simulation.snapshot(), expected);
		simulation.advance();
		assert.ok(draws > 0, `${mode} should seed on generation 100`);
		const after = simulation.snapshot();
		assert.ok(after.reduce((sum, cell, index) => sum + (cell !== expected[index]), 0) <= 27);
		assert.notDeepEqual(after, expected);
	}
});

test("sparse streak resets above eight active cells while snapshots leave both counters untouched", () => {
	for (const mode of ["brians-brain", "generations-trails"]) {
		const crowded = new Uint8Array(CELLULAR_CELLS);
		for (let y = 0; y < 20; y += 4) for (let x = 0; x < 20; x += 4) {
			crowded[y * 24 + x] = mode === "brians-brain" ? 1 : 4;
			crowded[y * 24 + x + 1] = mode === "brians-brain" ? 1 : 4;
		}
		const ordinary = new Uint8Array(CELLULAR_CELLS);
		assert.ok(stepCells(mode, crowded, ordinary) > 5);
		assert.ok(ordinary.filter((state) => state === (mode === "brians-brain" ? 1 : 4)).length > 8);
		let draws = 0;
		const dense = new CellularAutomaton(mode, () => { draws++; return 0.5; }, crowded);
		dense.sparseActivity = 99;
		dense.lowActivity = 17;
		dense.snapshot();
		assert.equal(dense.sparseActivity, 99);
		assert.equal(dense.lowActivity, 17);
		dense.advance();
		assert.equal(dense.sparseActivity, 0);
		assert.equal(dense.lowActivity, 0);
		assert.equal(draws, 0);
		assert.deepEqual(dense.snapshot(), ordinary);
		const justEight = new Uint8Array(CELLULAR_CELLS);
		for (let i = 0; i < 8; i++) justEight[i * 24] = mode === "brians-brain" ? 1 : 4;
		const borderline = new CellularAutomaton(mode, () => 0.5, justEight);
		borderline.advance();
		assert.equal(borderline.sparseActivity, 1);
	}
});

test("sparse and low-change counters reset independently and recovery resets both", () => {
	const sparse = new Uint8Array(CELLULAR_CELLS);
	sparse[0] = sparse[1] = 1;
	const moving = new CellularAutomaton("brians-brain", () => 0.5, sparse);
	moving.lowActivity = 12;
	moving.advance();
	assert.equal(moving.lowActivity, 0);
	assert.equal(moving.sparseActivity, 1);
	const stationary = new Uint8Array(CELLULAR_CELLS);
	stationary[0] = 2;
	const quiet = new CellularAutomaton("brians-brain", () => 0.5, stationary);
	quiet.lowActivity = 99;
	quiet.advance();
	assert.equal(quiet.sparseActivity, 0);
	assert.equal(quiet.lowActivity, 0);
	const crowded = new Uint8Array(CELLULAR_CELLS);
	for (let y = 0; y < 20; y += 4) for (let x = 0; x < 20; x += 4) {
		crowded[y * 24 + x] = crowded[y * 24 + x + 1] = 1;
	}
	const dense = new CellularAutomaton("brians-brain", () => 0.5, crowded);
	dense.sparseActivity = 99;
	dense.lowActivity = 99;
	dense.advance();
	assert.equal(dense.sparseActivity, 0);
	assert.equal(dense.lowActivity, 0);
});
