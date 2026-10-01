/**
 * Version 1 of the local, read-only OpenCode-to-Stream-Deck bridge protocol.
 *
 * This module intentionally has no runtime dependencies so both integrations
 * can validate frames before they alter their local state.
 */
export const PROTOCOL_VERSION = 1;

export const BridgeStatus = Object.freeze({
	READY: "ready",
	BUSY: "busy",
	ERROR: "error",
});

const clientMessageTypes = new Set([
	"hello",
	"snapshot",
	"session.status",
	"session.idle",
	"session.error",
	"permission.asked",
	"permission.replied",
	"question.asked",
	"question.resolved",
]);

const reservedCommandTypes = new Set([
	"focus-session",
	"permission.respond",
	"session.abort",
	"tui.append-prompt",
]);

/**
 * Parses a JSON WebSocket payload without throwing for malformed, unknown, or
 * unsupported-version frames. Consumers must also enforce connection-level
 * identity rules before applying a valid frame.
 *
 * @param {unknown} payload
 * @returns {Record<string, unknown> | undefined}
 */
export function parseBridgeFrame(payload) {
	let frame = payload;

	if (typeof payload === "string") {
		try {
			frame = JSON.parse(payload);
		} catch {
			return undefined;
		}
	}

	if (!isRecord(frame)
		|| frame.version !== PROTOCOL_VERSION
		|| typeof frame.type !== "string"
		|| typeof frame.instanceID !== "string"
		|| frame.instanceID.length === 0
		|| !clientMessageTypes.has(frame.type)
		|| !isValidPayload(frame)) {
		return undefined;
	}

	return frame;
}

/**
 * Reserved future commands are recognized only so receivers can safely ignore
 * them. Version 1 never sends, accepts, or applies a command.
 *
 * @param {unknown} payload
 * @returns {boolean}
 */
export function isReservedCommandFrame(payload) {
	return isRecord(payload)
		&& payload.version === PROTOCOL_VERSION
		&& typeof payload.type === "string"
		&& reservedCommandTypes.has(payload.type);
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {Record<string, unknown>} frame */
function isValidPayload(frame) {
	switch (frame.type) {
		case "hello":
			return optionalString(frame.projectID) && optionalString(frame.directory);
		case "snapshot":
			return Array.isArray(frame.sessions)
				&& frame.sessions.every(isLiveSession)
				&& Array.isArray(frame.permissions)
				&& frame.permissions.every(isPermission)
				&& (frame.questions === undefined
					|| (Array.isArray(frame.questions) && frame.questions.every(isQuestion)));
		case "session.status":
			return typeof frame.sessionID === "string" && isLiveStatus(frame.status);
		case "session.idle":
		case "session.error":
			return typeof frame.sessionID === "string";
		case "permission.asked":
			return typeof frame.permissionID === "string" && typeof frame.sessionID === "string";
		case "permission.replied":
			return typeof frame.permissionID === "string";
		case "question.asked":
			return isNonEmptyString(frame.questionID) && isNonEmptyString(frame.sessionID);
		case "question.resolved":
			return isNonEmptyString(frame.questionID);
		default:
			return false;
	}
}

/** @param {unknown} value */
function optionalString(value) {
	return value === undefined || typeof value === "string";
}

/** @param {unknown} value */
function isNonEmptyString(value) {
	return typeof value === "string" && value.length > 0;
}

/** @param {unknown} value */
function isLiveStatus(value) {
	return value === BridgeStatus.READY || value === BridgeStatus.BUSY;
}

/** @param {unknown} value */
function isLiveSession(value) {
	return isRecord(value) && typeof value.sessionID === "string" && isLiveStatus(value.status);
}

/** @param {unknown} value */
function isPermission(value) {
	return isRecord(value) && typeof value.permissionID === "string" && typeof value.sessionID === "string";
}

/** @param {unknown} value */
function isQuestion(value) {
	return isRecord(value) && isNonEmptyString(value.questionID) && isNonEmptyString(value.sessionID);
}
