export type TextPosition = "top" | "middle" | "bottom";
export interface ProjectPresentation {
	projectName: string;
	namePosition: TextPosition;
	statusPosition: TextPosition;
	nameFontSize: number;
	statusFontSize: number;
}
export const TEXT_POSITIONS: TextPosition[];
export const FONT_SIZES: number[];
export const DEFAULT_FONT_SIZE: number;
export function normalizeProjectPresentation(settings?: { projectName?: unknown; namePosition?: unknown; statusPosition?: unknown; nameFontSize?: unknown; statusFontSize?: unknown }): ProjectPresentation;
