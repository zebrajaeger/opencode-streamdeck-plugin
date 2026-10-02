import { normalizeProjectPresentation } from "../../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";

export const PROJECT_TEXT_BANDS = { top: 8, middle: 56, bottom: 104 };

function escapeText(value) {
	return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}

/** Flat SVG groups are supported by Stream Deck's Qt renderer; nested SVG is not. */
function textBand(value, position, label) {
	const characters = Array.from(value.replace(/\s+/gu, " ").trim());
	if (!characters.length) return "";
	// Bound width without relying on textLength/lengthAdjust or nested viewports.
	const text = characters.length > 12 ? `${characters.slice(0, 11).join("")}…` : characters.join("");
	const size = Math.max(10, Math.min(18, 120 / Array.from(text).length));
	const y = PROJECT_TEXT_BANDS[position];
	return `<g transform="translate(8 ${y})" data-label="${label}" data-position="${position}"><rect width="128" height="32" rx="5" fill="#101216"/><text x="64" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}" fill="#FFFFFF">${escapeText(text)}</text></g>`;
}

/** Compose project-only labels on either a static image or a particle frame. */
export function projectStatusImage(image, status, settings) {
	const presentation = normalizeProjectPresentation(settings);
	const svg = decodeURIComponent(image.slice(image.indexOf(",") + 1));
	const labels = textBand(presentation.projectName, presentation.namePosition, "name") + textBand(status, presentation.statusPosition, "status");
	return `data:image/svg+xml,${encodeURIComponent(svg.replace(/<\/svg>$/, `${labels}</svg>`))}`;
}
