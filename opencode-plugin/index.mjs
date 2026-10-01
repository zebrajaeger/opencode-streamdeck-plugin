import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

import { Plugin } from "@opencode/plugin";
import pino from "pino";

import { BridgeStatus, PROTOCOL_VERSION } from "../shared/protocol.mjs";

const BRIDGE_URL = "ws://127.0.0.1:20666";
const WEB_SOCKET_OPEN = 1;
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;
const LOG_FILE = join(homedir(), ".local", "share", "opencode", "log", "streamdeck-status-bridge.log");

const logger = pino(
	{
		level: "debug",
		base: { plugin: "de.lars-brandt.opencode.streamdeck-status" },
		timestamp: pino.stdTimeFunctions.isoTime,
	},
	pino.destination({ dest: LOG_FILE, mkdir: true, sync: false }),
);

logger.info({ logFile: LOG_FILE }, "Stream Deck status bridge module loaded");

/**
 * A V2 OpenCode plugin that only reports local activity to Stream Deck. It
 * never interprets inbound bridge data as an OpenCode command.
 */
export default Plugin.define({
	id: "de.lars-brandt.opencode.streamdeck-status",
	async setup(context) {
		const bridge = new OpenCodeBridge(context);
		logger.info({ instanceID: bridge.instanceID, directory: bridge.directory }, "Setting up Stream Deck status bridge");
		const events = new AbortController();

		await bridge.initialize();
		void bridge.consumeEvents(context.event.subscribe({ signal: events.signal }));

		return () => {
			logger.info({ instanceID: bridge.instanceID, directory: bridge.directory }, "Disposing Stream Deck status bridge setup");
			events.abort();
			bridge.dispose();
		};
	},
});

class OpenCodeBridge {
	/** @param {import("@opencode/plugin/promise/plugin").Context} context */
	constructor(context) {
		logger.debug("Creating Stream Deck status bridge");
		this.context = context;
		this.instanceID = randomUUID();
		this.directory = context.location.directory;
		this.sessions = new Map();
		this.permissions = new Map();
		this.questions = new Map();
		this.socket = undefined;
		this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
		this.reconnectTimer = undefined;
		this.disposed = false;
	}

	async initialize() {
		logger.debug("Initializing Stream Deck status bridge");
		await this.captureSnapshot();
		this.connect();
	}

	async captureSnapshot() {
		logger.debug("Capturing OpenCode status snapshot");
		try {
			const { data: sessions } = await this.context.session.list();
			for (const session of sessions) {
				this.sessions.set(session.id, BridgeStatus.READY);
			}

			const { data: permissions } = await this.context.permission.request.list();
			for (const permission of permissions) {
				this.permissions.set(permission.id, { sessionID: permission.sessionID });
			}
		} catch (error) {
			// A reporting integration must never interfere with OpenCode itself.
			logger.warn({ err: error }, "Unable to capture OpenCode status snapshot");
		}
	}

	connect() {
		logger.debug({ instanceID: this.instanceID, directory: this.directory }, "Connecting to Stream Deck bridge");
		if (this.disposed || this.socket) return;

		try {
			const socket = createWebSocket(BRIDGE_URL);
			this.socket = socket;
			socket.addEventListener("open", () => {
				logger.info({ instanceID: this.instanceID, directory: this.directory, url: BRIDGE_URL }, "Connected to Stream Deck bridge");
				this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
				this.send({
					type: "hello",
					projectID: this.context.location.project.id,
					directory: this.directory,
				});
				this.sendSnapshot();
			});
			socket.addEventListener("close", () => {
				logger.warn({ instanceID: this.instanceID, directory: this.directory }, "Stream Deck bridge connection closed");
				if (this.socket === socket) this.socket = undefined;
				this.scheduleReconnect();
			});
			socket.addEventListener("error", () => {
				logger.warn({ instanceID: this.instanceID, directory: this.directory }, "Stream Deck bridge connection error");
				socket.close();
			});
		} catch (error) {
				logger.warn({ err: error, instanceID: this.instanceID, directory: this.directory }, "Unable to connect to Stream Deck bridge");
			this.socket = undefined;
			this.scheduleReconnect();
		}
	}

	/** @param {AsyncIterable<import("@opencode/client/promise").OpenCodeEvent>} events */
	async consumeEvents(events) {
		logger.debug("Consuming OpenCode events");
		try {
			for await (const event of events) this.handleEvent(event);
		} catch (error) {
			// Status reporting must never disrupt OpenCode when its event stream ends.
			logger.warn({ err: error }, "OpenCode event stream ended unexpectedly");
		}
	}

	/** @param {import("@opencode/client/promise").OpenCodeEvent} event */
	handleEvent(event) {
		//logger.debug({ eventType: event.type }, "Handling OpenCode event");
		switch (event.type) {
			case "session.execution.started":
				logger.debug("Marking session as busy");
				this.sessions.set(event.data.sessionID, BridgeStatus.BUSY);
				this.send({ type: "session.status", sessionID: event.data.sessionID, status: BridgeStatus.BUSY });
				break;
			case "session.execution.succeeded":
				logger.debug("Marking completed session as idle");
				this.sessions.set(event.data.sessionID, BridgeStatus.READY);
				this.send({ type: "session.idle", sessionID: event.data.sessionID });
				break;
			case "session.execution.interrupted":
				logger.debug("Marking interrupted session as idle");
				this.sessions.set(event.data.sessionID, BridgeStatus.READY);
				this.send({ type: "session.idle", sessionID: event.data.sessionID });
				break;
			case "session.status": {
				const { sessionID, status } = event.data;
				logger.debug({ status: status.type }, "Updating session status");
				this.sessions.set(sessionID, toBridgeStatus(status));
				this.send({ type: "session.status", sessionID, status: toBridgeStatus(status) });
				break;
			}
			case "session.idle":
				logger.debug("Marking session as idle");
				this.sessions.set(event.data.sessionID, BridgeStatus.READY);
				this.send({ type: "session.idle", sessionID: event.data.sessionID });
				break;
			case "session.execution.failed":
				logger.warn("Session execution failed");
				this.sessions.set(event.data.sessionID, BridgeStatus.ERROR);
				this.send({ type: "session.error", sessionID: event.data.sessionID });
				break;
			case "session.created":
				logger.debug("Registering new session");
				this.sessions.set(event.data.sessionID, BridgeStatus.READY);
				this.send({ type: "session.idle", sessionID: event.data.sessionID });
				break;
			case "session.deleted":
				logger.debug("Removing deleted session");
				this.sessions.delete(event.data.sessionID);
				for (const [permissionID, permission] of this.permissions) {
					if (permission.sessionID === event.data.sessionID) this.permissions.delete(permissionID);
				}
				for (const [questionID, question] of this.questions) {
					if (question.sessionID === event.data.sessionID) this.questions.delete(questionID);
				}
				this.sendSnapshot();
				break;
			case "permission.asked":
				logger.debug("Registering permission request");
				this.permissions.set(event.data.id, { sessionID: event.data.sessionID });
				this.send({ type: "permission.asked", permissionID: event.data.id, sessionID: event.data.sessionID });
				break;
			case "permission.replied":
				logger.debug("Removing answered permission request");
				this.permissions.delete(event.data.requestID);
				this.send({ type: "permission.replied", permissionID: event.data.requestID });
				break;
			case "question.asked":
				this.registerQuestion(event.data.id, event.data.sessionID);
				break;
			case "question.replied":
			case "question.rejected":
				this.resolveQuestion(event.data.requestID);
				break;
			// OpenCode 2.0.19 exposes agent questions as forms rather than the
			// legacy question.* events. Normalize both transports so the bridge
			// protocol and status aggregation stay independent of that change.
			case "form.created":
				this.registerQuestion(event.data.form.id, event.data.form.sessionID);
				break;
			case "form.replied":
			case "form.cancelled":
				this.resolveQuestion(event.data.id);
				break;
		}
	}

	/** @param {string} questionID @param {string} sessionID */
	registerQuestion(questionID, sessionID) {
		logger.debug({ questionID, sessionID }, "Registering agent question");
		this.questions.set(questionID, { sessionID });
		this.send({ type: "question.asked", questionID, sessionID });
	}

	/** @param {string} questionID */
	resolveQuestion(questionID) {
		logger.debug({ questionID }, "Removing resolved agent question");
		this.questions.delete(questionID);
		this.send({ type: "question.resolved", questionID });
	}

	sendSnapshot() {
		logger.debug("Sending Stream Deck status snapshot");
		this.send({
			type: "snapshot",
			sessions: [...this.sessions].map(([sessionID, status]) => ({ sessionID, status })),
			permissions: [...this.permissions].map(([permissionID, { sessionID }]) => ({ permissionID, sessionID })),
			questions: [...this.questions].map(([questionID, { sessionID }]) => ({ questionID, sessionID })),
		});
	}

	/** @param {Record<string, unknown>} message */
	send(message) {
		logger.debug({ messageType: message.type }, "Sending message to Stream Deck bridge");
		if (this.socket?.readyState !== WEB_SOCKET_OPEN) return;
		this.socket.send(JSON.stringify({ version: PROTOCOL_VERSION, instanceID: this.instanceID, ...message }));
	}

	scheduleReconnect() {
		logger.debug({ delayMs: this.reconnectDelay }, "Scheduling Stream Deck bridge reconnect");
		if (this.disposed || this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined;
			this.connect();
		}, this.reconnectDelay);
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
	}

	dispose() {
		logger.info({ instanceID: this.instanceID, directory: this.directory }, "Disposing Stream Deck status bridge");
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
