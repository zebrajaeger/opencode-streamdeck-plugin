export type TextPosition = "top" | "middle" | "bottom";
export type FontStyle = "Regular" | "Bold" | "Italic" | "Bold Italic";
export interface ProjectPresentation {
	projectName: string;
	namePosition: TextPosition;
	statusPosition: TextPosition;
	nameFontSize: number;
	statusFontSize: number;
	nameFontFamily: string;
	statusFontFamily: string;
	nameFontStyle: FontStyle;
	statusFontStyle: FontStyle;
	nameFontUnderline: boolean;
	statusFontUnderline: boolean;
	nameFontColor: string;
	statusFontColor: string;
}
export const TEXT_POSITIONS: TextPosition[];
export const FONT_SIZES: number[];
export const DEFAULT_FONT_SIZE: number;
export const FONT_FAMILIES: string[];
export const FONT_STYLES: FontStyle[];
export function normalizeProjectPresentation(settings?: Partial<Record<keyof ProjectPresentation, unknown>>): ProjectPresentation;
