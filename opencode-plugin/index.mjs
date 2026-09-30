import { randomUUID } from "node:crypto";

import { Plugin } from "@opencode/plugin";

import { BridgeStatus, PROTOCOL_VERSION } from "../shared/protocol.mjs";

const BRIDGE_URL = "ws://127.0.0.1:20666";
const WEB_SOCKET_OPEN = 1;
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;

/**
 * A V2 OpenCode plugin that only reports local activity to Stream Deck. It
 * never interprets inbound bridge data as an OpenCode command.
 */
export default Plugin.define({
	id: "de.lars-brandt.opencode.streamdeck-status",
	async setup(context) {
		const bridge = new OpenCodeBridge(context);
		const events = new AbortController();

		await bridge.initialize();
		void bridge.consumeEvents(context.event.subscribe({ signal: events.signal }));

		return () => {
			events.abort();
			bridge.dispose();
		};
	},
});

class OpenCodeBridge {
	/** @param {import("@opencode/plugin/promise/plugin").Context} context */
	constructor(context) {
		this.context = context;
		this.instanceID = randomUUID();
		this.sessions = new Map();
		this.permissions = new Map();
		this.socket = undefined;
		this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
		this.reconnectTimer = undefined;
		this.disposed = false;
	}

	async initialize() {
		await this.captureSnapshot();
		this.connect();
	}

	async captureSnapshot() {
		try {
			const activeSessions = await this.context.session.active();
			for (const sessionID of Object.keys(activeSessions)) {
				this.sessions.set(sessionID, BridgeStatus.BUSY);
			}

			const { data: sessions } = await this.context.session.list();
			for (const session of sessions) {
				if (!this.sessions.has(session.id)) this.sessions.set(session.id, BridgeStatus.READY);
			}

			const { data: permissions } = await this.context.permission.request.list();
			for (const permission of permissions) {
				this.permissions.set(permission.id, { sessionID: permission.sessionID });
			}
		} catch {
			// A reporting integration must never interfere with OpenCode itself.
		}
	}

	connect() {
		if (this.disposed || this.socket) return;

		try {
			const socket = createWebSocket(BRIDGE_URL);
			this.socket = socket;
			socket.addEventListener("open", () => {
				this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
				this.send({
					type: "hello",
					projectID: this.context.location.project.id,
					directory: this.context.location.directory,
				});
				this.sendSnapshot();
			});
			socket.addEventListener("close", () => {
				if (this.socket === socket) this.socket = undefined;
				this.scheduleReconnect();
			});
			socket.addEventListener("error", () => socket.close());
		} catch {
			this.socket = undefined;
			this.scheduleReconnect();
		}
	}

	/** @param {AsyncIterable<import("@opencode/client/promise").OpenCodeEvent>} events */
	async consumeEvents(events) {
		try {
			for await (const event of events) this.handleEvent(event);
		} catch {
			// Status reporting must never disrupt OpenCode when its event stream ends.
		}
	}

	/** @param {import("@opencode/client/promise").OpenCodeEvent} event */
	handleEvent(event) {
		switch (event.type) {
			case "session.status": {
				const { sessionID, status } = event.data;
				this.sessions.set(sessionID, toBridgeStatus(status));
				this.send({ type: "session.status", sessionID, status: toBridgeStatus(status) });
				break;
			}
			case "session.idle":
				this.sessions.set(event.data.sessionID, BridgeStatus.READY);
				this.send({ type: "session.idle", sessionID: event.data.sessionID });
				break;
			case "session.execution.failed":
				this.sessions.set(event.data.sessionID, BridgeStatus.ERROR);
				this.send({ type: "session.error", sessionID: event.data.sessionID });
				break;
			case "session.created":
				this.sessions.set(event.data.sessionID, BridgeStatus.READY);
				this.send({ type: "session.idle", sessionID: event.data.sessionID });
				break;
			case "session.deleted":
				this.sessions.delete(event.data.sessionID);
				for (const [permissionID, permission] of this.permissions) {
					if (permission.sessionID === event.data.sessionID) this.permissions.delete(permissionID);
				}
				this.sendSnapshot();
				break;
			case "permission.asked":
				this.permissions.set(event.data.id, { sessionID: event.data.sessionID });
				this.send({ type: "permission.asked", permissionID: event.data.id, sessionID: event.data.sessionID });
				break;
			case "permission.replied":
				this.permissions.delete(event.data.requestID);
				this.send({ type: "permission.replied", permissionID: event.data.requestID });
				break;
		}
	}

	sendSnapshot() {
		this.send({
			type: "snapshot",
			sessions: [...this.sessions].map(([sessionID, status]) => ({ sessionID, status })),
			permissions: [...this.permissions].map(([permissionID, { sessionID }]) => ({ permissionID, sessionID })),
		});
	}

	/** @param {Record<string, unknown>} message */
	send(message) {
		if (this.socket?.readyState !== WEB_SOCKET_OPEN) return;
		this.socket.send(JSON.stringify({ version: PROTOCOL_VERSION, instanceID: this.instanceID, ...message }));
	}

	scheduleReconnect() {
		if (this.disposed || this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined;
			this.connect();
		}, this.reconnectDelay);
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
	}

	dispose() {
		this.disposed = true;
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.socket?.close();
	}
}

/** @param {import("@opencode/client/promise").SessionStatus} status */
function toBridgeStatus(status) {
	return status.type === "busy" || status.type === "retry" ? BridgeStatus.BUSY : BridgeStatus.READY;
}

/**
 * OpenCode runs on Bun in production, while Node 22+ also supplies the
 * WebSocket global for local command-line validation.
 *
 * @param {string} url
 */
function createWebSocket(url) {
	if (typeof WebSocket !== "undefined") return new WebSocket(url);
	throw new Error("OpenCode status bridge requires a WebSocket runtime");
}
