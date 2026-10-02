export const TEXT_POSITIONS = ["top", "middle", "bottom"];

/** Shared by the inspector and runtime; only normalizes presentation fields. */
export function normalizeProjectPresentation(settings = {}) {
	const statusPosition = TEXT_POSITIONS.includes(settings.statusPosition) ? settings.statusPosition : "middle";
	let namePosition = TEXT_POSITIONS.includes(settings.namePosition) ? settings.namePosition : "bottom";
	if (namePosition === statusPosition) namePosition = statusPosition === "bottom" ? "middle" : "bottom";
	return {
		projectName: typeof settings.projectName === "string" ? settings.projectName : "",
		namePosition,
		statusPosition,
	};
}
