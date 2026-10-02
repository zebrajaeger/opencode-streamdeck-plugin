import { normalizeProjectPresentation } from "../../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";

export const PROJECT_TEXT_BANDS = { top: 8, middle: 56, bottom: 104 };

function escapeText(value) {
	return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}

/** Flat SVG groups are supported by Stream Deck's Qt renderer; nested SVG is not. */
function textBand(value, position, label, size) {
	const characters = Array.from(value.replace(/\s+/gu, " ").trim());
	if (!characters.length) return "";
	// Conservative Arial advances (in em), with room for fallback glyphs.
	const uppercase = { A: .70, B: .70, C: .75, D: .75, E: .70, F: .65, G: .81, H: .75, I: .31, J: .53, K: .70, L: .59, M: .87, N: .75, O: .81, P: .70, Q: .81, R: .75, S: .70, T: .65, U: .75, V: .70, W: .98, X: .70, Y: .70, Z: .65 };
	const advance = (character) => uppercase[character] ?? (/[ilj'.,:;!|]/.test(character) ? .35 : /[mw]/.test(character) ? .87 : /[a-z0-9]/.test(character) ? .65 : character === " " ? .32 : 1.1);
	const width = (text) => text.reduce((sum, character) => sum + advance(character) * size, 0);
	let text = characters.join("");
	if (width(characters) > 120) {
		const shortened = [];
		let used = size * 1.1; // Reserve the ellipsis at the same size.
		for (const character of characters) {
			if (used + advance(character) * size > 120) break;
			shortened.push(character);
			used += advance(character) * size;
		}
		text = `${shortened.join("")}…`;
	}
	const y = PROJECT_TEXT_BANDS[position];
	return `<g transform="translate(8 ${y})" data-label="${label}" data-position="${position}"><text x="64" y="${16 + size * .34}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}" fill="#FFFFFF">${escapeText(text)}</text></g>`;
}

/** Compose project-only labels on either a static image or a particle frame. */
export function projectStatusImage(image, status, settings) {
	const presentation = normalizeProjectPresentation(settings);
	const svg = decodeURIComponent(image.slice(image.indexOf(",") + 1));
	const labels = textBand(presentation.projectName, presentation.namePosition, "name", presentation.nameFontSize) + textBand(status, presentation.statusPosition, "status", presentation.statusFontSize);
	return `data:image/svg+xml,${encodeURIComponent(svg.replace(/<\/svg>$/, `${labels}</svg>`))}`;
}
