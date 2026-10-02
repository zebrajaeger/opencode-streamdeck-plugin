export const TEXT_POSITIONS = ["top", "middle", "bottom"];
export const FONT_SIZES = Array.from({ length: 13 }, (_, index) => index + 16);
export const DEFAULT_FONT_SIZE = 20;
export const FONT_FAMILIES = ["Arial", "Arial Black", "Courier New", "Georgia", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana"];
export const FONT_STYLES = ["Regular", "Bold", "Italic", "Bold Italic"];

const font = (settings, prefix) => ({
	[`${prefix}FontSize`]: FONT_SIZES.includes(settings[`${prefix}FontSize`]) ? settings[`${prefix}FontSize`] : DEFAULT_FONT_SIZE,
	[`${prefix}FontFamily`]: FONT_FAMILIES.includes(settings[`${prefix}FontFamily`]) ? settings[`${prefix}FontFamily`] : "Arial",
	[`${prefix}FontStyle`]: FONT_STYLES.includes(settings[`${prefix}FontStyle`]) ? settings[`${prefix}FontStyle`] : "Regular",
	[`${prefix}FontUnderline`]: typeof settings[`${prefix}FontUnderline`] === "boolean" ? settings[`${prefix}FontUnderline`] : false,
	[`${prefix}FontColor`]: typeof settings[`${prefix}FontColor`] === "string" && /^#[0-9a-fA-F]{6}$/.test(settings[`${prefix}FontColor`]) ? settings[`${prefix}FontColor`].toUpperCase() : "#FFFFFF",
});

/** Shared by the inspector and runtime; only normalizes presentation fields. */
export function normalizeProjectPresentation(settings = {}) {
	const statusPosition = TEXT_POSITIONS.includes(settings.statusPosition) ? settings.statusPosition : "middle";
	let namePosition = TEXT_POSITIONS.includes(settings.namePosition) ? settings.namePosition : "bottom";
	if (namePosition === statusPosition) namePosition = statusPosition === "bottom" ? "middle" : "bottom";
	return {
		projectName: typeof settings.projectName === "string" ? settings.projectName : "",
		namePosition,
		statusPosition,
		...font(settings, "name"),
		...font(settings, "status"),
	};
}
