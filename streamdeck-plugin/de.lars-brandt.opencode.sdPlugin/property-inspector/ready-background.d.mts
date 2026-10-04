export type ReadyBackground = "plasma" | "attention" | "particle" | "matrix" | "brians-brain" | "day-night" | "generations-trails";
export const READY_BACKGROUNDS: ReadonlyArray<Readonly<{ value: ReadyBackground; label: string }>>;
export function normalizeReadyBackground(value: unknown): ReadyBackground;
