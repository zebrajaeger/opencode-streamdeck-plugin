import type { BridgeFrame } from "./protocol.mjs";

export const GlobalStatus: Readonly<{
	OFFLINE: "OFFLINE";
	READY: "READY";
	BUSY: "BUSY";
	ATTENTION: "ATTENTION";
	ERROR: "ERROR";
}>;

export type GlobalStatusValue = typeof GlobalStatus[keyof typeof GlobalStatus];

export class StatusRegistry {
	subscribe(listener: (status: GlobalStatusValue) => void): () => boolean;
	connect(instanceID: string): void;
	disconnect(instanceID: string): void;
	apply(frame: BridgeFrame): void;
	readonly status: GlobalStatusValue;
}
