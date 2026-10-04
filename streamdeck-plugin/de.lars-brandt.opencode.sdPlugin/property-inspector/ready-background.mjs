export const READY_BACKGROUNDS = Object.freeze([
	{ value: "plasma", label: "Plasma" },
	{ value: "attention", label: "Attention halo" },
	{ value: "particle", label: "Particles" },
	{ value: "matrix", label: "Matrix" },
	{ value: "brians-brain", label: "Brian's Brain" },
	{ value: "day-night", label: "Day & Night" },
	{ value: "generations-trails", label: "Generations + Trails" },
]);

export function normalizeReadyBackground(value) {
	return typeof value === "string" && READY_BACKGROUNDS.some((choice) => choice.value === value) ? value : "plasma";
}
