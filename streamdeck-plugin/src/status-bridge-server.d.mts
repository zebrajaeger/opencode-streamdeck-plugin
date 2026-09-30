import type { WebSocketServer } from "ws";

import type { GlobalStatusValue } from "./status-types.js";

export class StatusBridgeServer {
	readonly server: WebSocketServer;
	constructor(options?: { host?: string; port?: number });
	subscribe(listener: (status: GlobalStatusValue) => void): () => boolean;
	close(): Promise<void>;
}
