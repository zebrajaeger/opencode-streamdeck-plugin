export type TextPosition = "top" | "middle" | "bottom";
export interface ProjectPresentation {
	projectName: string;
	namePosition: TextPosition;
	statusPosition: TextPosition;
}
export const TEXT_POSITIONS: TextPosition[];
export function normalizeProjectPresentation(settings?: { projectName?: unknown; namePosition?: unknown; statusPosition?: unknown }): ProjectPresentation;
