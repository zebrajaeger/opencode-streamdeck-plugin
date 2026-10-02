import type { GlobalStatusValue } from "../status-types";
import type { ProjectPresentation, TextPosition } from "../../de.lars-brandt.opencode.sdPlugin/property-inspector/project-presentation.mjs";
export const PROJECT_TEXT_BANDS: Record<TextPosition, number>;
export function projectStatusImage(image: string, status: GlobalStatusValue, settings: ProjectPresentation): string;
export function statusFontImage(image: string, status: GlobalStatusValue, settings: Partial<ProjectPresentation>): string;
