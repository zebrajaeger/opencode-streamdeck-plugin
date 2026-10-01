import type { WebSocketServer } from "ws";

import type { StatusRegistry } from "../../shared/status-registry.mjs";
import type { GlobalStatusValue } from "./status-types.js";

export class StatusBridgeServer {
	readonly server: WebSocketServer;
	constructor(options?: { host?: string; port?: number; registry?: StatusRegistry });
	subscribe(listener: (status: GlobalStatusValue) => void): () => boolean;
	subscribeProject(projectID: string, listener: (status: GlobalStatusValue) => void): () => boolean;
	close(): Promise<void>;
}
