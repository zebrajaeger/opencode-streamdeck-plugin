export type ReadyBackground = "plasma" | "attention" | "particle";
export const READY_BACKGROUNDS: ReadonlyArray<Readonly<{ value: ReadyBackground; label: string }>>;
export function normalizeReadyBackground(value: unknown): ReadyBackground;
