export const TEXT_POSITIONS = ["top", "middle", "bottom"];
export const FONT_SIZES = [16, 20, 24, 28];
export const DEFAULT_FONT_SIZE = 20;

/** Shared by the inspector and runtime; only normalizes presentation fields. */
export function normalizeProjectPresentation(settings = {}) {
	const statusPosition = TEXT_POSITIONS.includes(settings.statusPosition) ? settings.statusPosition : "middle";
	let namePosition = TEXT_POSITIONS.includes(settings.namePosition) ? settings.namePosition : "bottom";
	if (namePosition === statusPosition) namePosition = statusPosition === "bottom" ? "middle" : "bottom";
	return {
		projectName: typeof settings.projectName === "string" ? settings.projectName : "",
		namePosition,
		statusPosition,
		nameFontSize: FONT_SIZES.includes(settings.nameFontSize) ? settings.nameFontSize : DEFAULT_FONT_SIZE,
		statusFontSize: FONT_SIZES.includes(settings.statusFontSize) ? settings.statusFontSize : DEFAULT_FONT_SIZE,
	};
}
