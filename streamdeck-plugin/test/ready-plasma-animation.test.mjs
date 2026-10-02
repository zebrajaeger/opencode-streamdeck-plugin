import assert from "node:assert/strict";
import test from "node:test";
import { ReadyPlasmaAnimation, READY_PLASMA_ANIMATION as parameters } from "../src/actions/ready-plasma-animation.ts";

test("plasma is deterministic, spatial, bounded and seamlessly periodic", () => {
	let now = 500;
	const effect = new ReadyPlasmaAnimation(() => now);
	const first = effect.background();
	assert.equal(first, effect.background());
	assert.equal(effect.frameIntervalMs, 150);
	assert.equal(parameters.width, 144); assert.equal(parameters.height, 144);
	assert.match(first, /#101216/); assert.match(first, /#2E9E5B/);
	assert.equal((first.match(/<circle /g) ?? []).length, parameters.gridSize ** 2);
	assert.ok(first.length < 25000);
	assert.doesNotMatch(first, /NaN|Infinity|<animate|<filter|href=/);
	now += 1500; const second = effect.background();
	now += 2800; const third = effect.background();
	assert.notEqual(first, second); assert.notEqual(second, third);
	const opacities = (svg) => [...svg.matchAll(/ opacity="([\d.]+)"/g)].map((match) => Number(match[1]));
	assert.notDeepEqual(opacities(first), opacities(second));
	assert.notDeepEqual(opacities(second), opacities(third));
	now = 500 + parameters.periodMs;
	assert.deepEqual(opacities(effect.background()), opacities(first));
	now = 500 + parameters.periodMs - 0.001;
	const beforeWrap = opacities(effect.background());
	assert.ok(beforeWrap.every((value, index) => Math.abs(value - opacities(first)[index]) <= 0.0001));
	assert.doesNotMatch(effect.background(), /NaN|Infinity/);
});
