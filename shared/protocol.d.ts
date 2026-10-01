export const PROTOCOL_VERSION: 1;

export const BridgeStatus: Readonly<{
	READY: "ready";
	BUSY: "busy";
	ERROR: "error";
}>;

export type BridgeStatusValue = typeof BridgeStatus[keyof typeof BridgeStatus];

export type BridgeFrame =
	| { version: 1; type: "hello"; instanceID: string; projectID?: string; directory?: string }
	| { version: 1; type: "snapshot"; instanceID: string; sessions: Array<{ sessionID: string; status: BridgeStatusValue }>; permissions: Array<{ permissionID: string; sessionID: string }>; questions?: Array<{ questionID: string; sessionID: string }> }
	| { version: 1; type: "session.status"; instanceID: string; sessionID: string; status: BridgeStatusValue }
	| { version: 1; type: "session.idle" | "session.error"; instanceID: string; sessionID: string }
	| { version: 1; type: "permission.asked"; instanceID: string; permissionID: string; sessionID: string }
	| { version: 1; type: "permission.replied"; instanceID: string; permissionID: string }
	| { version: 1; type: "question.asked"; instanceID: string; questionID: string; sessionID: string }
	| { version: 1; type: "question.resolved"; instanceID: string; questionID: string };

export function parseBridgeFrame(payload: unknown): BridgeFrame | undefined;
export function isReservedCommandFrame(payload: unknown): boolean;
