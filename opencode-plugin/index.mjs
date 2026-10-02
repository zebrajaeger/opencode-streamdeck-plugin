import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

import { Plugin } from "@opencode/plugin";
import pino from "pino";

import { BridgeStatus, PROTOCOL_VERSION, SOURCE_SUPERSEDED_CLOSE_CODE } from "../shared/protocol.mjs";

const BRIDGE_URL = "ws://127.0.0.1:20666";
const WEB_SOCKET_OPEN = 1;
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;
const LOOKUP_TIMEOUT_MS = 2_000;
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

export class OpenCodeBridge {
	/** @param {import("@opencode/plugin/promise/plugin").Context} context */
	constructor(context) {
		logger.debug("Creating Stream Deck status bridge");
		this.context = context;
		this.instanceID = randomUUID();
		this.directory = context.location.directory;
		this.sessions = new Map();
		this.permissions = new Map();
		this.questions = new Map();
		this.membership = new Set();
		this.work = Promise.resolve();
		this.lifetime = new AbortController();
		this.socket = undefined;
		this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
		this.reconnectTimer = undefined;
		this.disposed = false;
		this.superseded = false;
	}

	async initialize() {
		logger.debug("Initializing Stream Deck status bridge");
		await this.captureSnapshot();
		this.connect();
	}

	async captureSnapshot() {
		return this.enqueue(() => this.refreshPermissions());
	}

	// Events and recovery share one queue; a failed item never poisons it.
	enqueue(operation) {
		this.work = this.work.then(async () => {
			if (!this.active()) return;
			await operation();
		}).catch(() => this.diagnostic("reporting-failed"));
		return this.work;
	}

	active(socket) {
		return !this.disposed && !this.superseded && (!socket || this.socket === socket);
	}

	diagnostic(reason, sessionID) {
		logger.warn({ instanceID: this.instanceID, reason, sessionID: typeof sessionID === "string" ? sessionID.slice(0, 128) : undefined }, "OpenCode ownership reporting diagnostic");
	}

	async bounded(read) {
		const controller = new AbortController();
		const abort = () => controller.abort();
		this.lifetime.signal.addEventListener("abort", abort, { once: true });
		let timer;
		try {
			return await Promise.race([
				Promise.resolve().then(() => read(controller.signal)),
				new Promise((_, reject) => {
					controller.signal.addEventListener("abort", () => reject(new Error("Ownership read aborted")), { once: true });
					timer = setTimeout(abort, LOOKUP_TIMEOUT_MS);
				}),
			]);
		} finally {
			clearTimeout(timer);
			this.lifetime.signal.removeEventListener("abort", abort);
			controller.abort();
		}
	}

	async ownership(sessionID, projectID, socket) {
		if (!this.active(socket) || typeof sessionID !== "string" || !sessionID) return false;
		if (projectID === undefined) {
			try {
				const info = await this.bounded((signal) => this.context.session.get({ sessionID }, { signal }));
				if (!this.active(socket)) return false;
				if (info?.id !== sessionID) throw new Error("Invalid session identity");
				projectID = info.projectID;
			} catch {
				if (this.active(socket)) this.diagnostic("session-unresolved", sessionID);
				return false;
			}
		}
		if (typeof projectID !== "string" || !projectID) {
			this.diagnostic("project-unresolved", sessionID);
			return false;
		}
		if (projectID !== this.context.location.project.id) {
			logger.debug({ instanceID: this.instanceID, reason: "foreign-project", sessionID: sessionID.slice(0, 128) }, "Ignoring foreign OpenCode session");
			if (this.removeSession(sessionID)) this.ownershipChanged = true;
			return false;
		}
		this.membership.add(sessionID);
		return true;
	}

	removeSession(sessionID) {
		const owned = this.membership.delete(sessionID);
		if (!owned) return false;
		this.sessions.delete(sessionID);
		for (const requests of [this.permissions, this.questions]) {
			for (const [id, request] of requests) if (request.sessionID === sessionID) requests.delete(id);
		}
		return true;
	}

	async refreshPermissions(socket) {
		const source = this.context.permission?.request;
		if (typeof source?.list !== "function") {
			this.diagnostic("permission-snapshot-unavailable");
			return;
		}
		try {
			const { data } = await this.bounded((signal) => source.list(undefined, { signal }));
			if (!this.active(socket)) return;
			if (!Array.isArray(data)) throw new Error("Invalid permission list");
			const verified = new Map();
			for (const permission of data) {
				if (typeof permission.id === "string" && await this.ownership(permission.sessionID, undefined, socket)) {
					verified.set(permission.id, { sessionID: permission.sessionID });
				} else if (this.membership.has(permission.sessionID) && this.permissions.get(permission.id)?.sessionID === permission.sessionID) {
					// A transient lookup failure excludes publication, not retained
					// event-observed state. Authoritative foreign ownership removes it.
					verified.set(permission.id, this.permissions.get(permission.id));
				}
				if (!this.active(socket)) return;
			}
			this.permissions = verified;
		} catch {
			if (this.active(socket)) this.diagnostic("permission-snapshot-failed");
		}
	}

	connect() {
		logger.debug({ instanceID: this.instanceID, directory: this.directory }, "Connecting to Stream Deck bridge");
		if (this.disposed || this.superseded || this.socket) return;

		try {
			const socket = createWebSocket(BRIDGE_URL);
			this.socket = socket;
			socket.addEventListener("open", () => {
				if (this.socket !== socket || this.disposed || this.superseded) return;
				logger.info({ instanceID: this.instanceID, directory: this.directory, url: BRIDGE_URL }, "Connected to Stream Deck bridge");
				this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
				this.send({
					type: "hello",
					projectID: this.context.location.project.id,
					directory: this.directory,
				});
				void this.sendSnapshot(socket, true);
			});
			socket.addEventListener("close", (event) => {
				if (this.socket !== socket || this.disposed || this.superseded) return;
				this.socket = undefined;
				if (event.code === SOURCE_SUPERSEDED_CLOSE_CODE) {
					this.superseded = true;
					this.lifetime.abort();
					if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
					this.reconnectTimer = undefined;
					logger.info({ instanceID: this.instanceID, directory: this.directory, closeCode: event.code, outcome: "superseded" }, "Stream Deck bridge source retired");
					return;
				}
				logger.warn({ instanceID: this.instanceID, directory: this.directory, closeCode: event.code }, "Stream Deck bridge connection closed");
				this.scheduleReconnect();
			});
			socket.addEventListener("error", () => {
				if (this.socket !== socket || this.disposed || this.superseded) return;
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
			for await (const event of events) {
				if (!this.active()) break;
				await this.handleEvent(event);
			}
		} catch (error) {
			// Status reporting must never disrupt OpenCode when its event stream ends.
			logger.warn({ err: error }, "OpenCode event stream ended unexpectedly");
		}
	}

	/** @param {import("@opencode/client/promise").OpenCodeEvent} event */
	handleEvent(event) {
		return this.enqueue(async () => {
			this.ownershipChanged = false;
			await this.applyEvent(event);
			if (this.active() && this.ownershipChanged) await this.publishSnapshot(this.socket);
		});
	}

	async applyEvent(event) {
		const creations = ["session.execution.started", "session.execution.succeeded", "session.execution.interrupted", "session.status", "session.idle", "session.execution.failed", "session.compaction.failed", "session.retry.scheduled", "session.created", "session.moved", "permission.asked", "question.asked", "form.created"];
		const data = event.data;
		if (creations.includes(event.type)) {
			const sessionID = event.type === "form.created" ? data.form.sessionID : data.sessionID;
			const projectID = event.type === "session.created" || event.type === "session.moved" ? data.projectID : undefined;
			if (!await this.ownership(sessionID, projectID)) return;
			if (!this.active()) return;
		}
		switch (event.type) {
			case "session.execution.started":
			case "session.retry.scheduled":
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
			// A failed execution or compaction ends the work that was last
			// observed for that session. Retaining its busy state would outlive
			// the transient error indication and never be cleared, because no
			// idle event follows a failure. Later real activity restores it.
			case "session.execution.failed":
			case "session.compaction.failed":
				logger.warn({ event: event.type }, "Session work failed");
				this.sessions.set(event.data.sessionID, BridgeStatus.READY);
				this.send({ type: "session.error", sessionID: event.data.sessionID });
				break;
			case "session.created":
				logger.debug("Registering new session");
				this.sessions.set(event.data.sessionID, BridgeStatus.READY);
				this.send({ type: "session.idle", sessionID: event.data.sessionID });
				break;
			case "session.deleted":
				if (this.removeSession(data.sessionID)) this.ownershipChanged = true;
				break;
			case "permission.asked":
				logger.debug("Registering permission request");
				this.permissions.set(event.data.id, { sessionID: event.data.sessionID });
				this.send({ type: "permission.asked", permissionID: event.data.id, sessionID: event.data.sessionID });
				break;
			case "permission.replied":
				if (!await this.admitResolution(this.permissions, data.requestID, data.sessionID)) return;
				logger.debug("Removing answered permission request");
				this.permissions.delete(event.data.requestID);
				this.send({ type: "permission.replied", permissionID: event.data.requestID });
				break;
			case "question.asked":
				this.registerQuestion(event.data.id, event.data.sessionID);
				break;
			case "question.replied":
			case "question.rejected":
				if (await this.admitResolution(this.questions, data.requestID, data.sessionID)) this.resolveQuestion(data.requestID);
				break;
			// OpenCode 2.0.19 exposes agent questions as forms rather than the
			// legacy question.* events. Normalize both transports so the bridge
			// protocol and status aggregation stay independent of that change.
			case "form.created":
				this.registerQuestion(event.data.form.id, event.data.form.sessionID);
				break;
			case "form.replied":
			case "form.cancelled":
				if (await this.admitResolution(this.questions, data.id, data.sessionID)) this.resolveQuestion(data.id);
				break;
		}
	}

	async admitResolution(requests, id, sessionID) {
		const request = requests.get(id);
		if (!request || (sessionID !== undefined && sessionID !== request.sessionID)) return false;
		return await this.ownership(request.sessionID) && this.active();
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

	sendSnapshot(socket = this.socket, refresh = false) {
		return this.enqueue(async () => {
			if (!this.active(socket)) return;
			if (refresh) await this.refreshPermissions(socket);
			if (this.active(socket)) await this.publishSnapshot(socket);
		});
	}

	async publishSnapshot(socket) {
		if (!this.active(socket)) return;
		const verified = new Set();
		const ids = new Set([...this.sessions.keys(), ...[...this.permissions.values(), ...this.questions.values()].map(({ sessionID }) => sessionID)]);
		for (const id of ids) {
			if (await this.ownership(id, undefined, socket)) verified.add(id);
			if (!this.active(socket)) return;
		}
		logger.debug("Sending Stream Deck status snapshot");
		this.send({
			type: "snapshot",
			sessions: [...this.sessions]
				.filter(([id, status]) => verified.has(id) && (status === BridgeStatus.READY || status === BridgeStatus.BUSY))
				.map(([sessionID, status]) => ({ sessionID, status })),
			permissions: [...this.permissions].filter(([, { sessionID }]) => verified.has(sessionID)).map(([permissionID, { sessionID }]) => ({ permissionID, sessionID })),
			questions: [...this.questions].filter(([, { sessionID }]) => verified.has(sessionID)).map(([questionID, { sessionID }]) => ({ questionID, sessionID })),
		}, socket);
	}

	/** @param {Record<string, unknown>} message */
	send(message, socket = this.socket) {
		logger.debug({ messageType: message.type }, "Sending message to Stream Deck bridge");
		if (!this.active(socket) || socket?.readyState !== WEB_SOCKET_OPEN) return;
		socket.send(JSON.stringify({ version: PROTOCOL_VERSION, instanceID: this.instanceID, ...message }));
	}

	scheduleReconnect() {
		logger.debug({ delayMs: this.reconnectDelay }, "Scheduling Stream Deck bridge reconnect");
		if (this.disposed || this.superseded || this.reconnectTimer !== undefined) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined;
			this.connect();
		}, this.reconnectDelay);
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
	}

	dispose() {
		logger.info({ instanceID: this.instanceID, directory: this.directory }, "Disposing Stream Deck status bridge");
		this.disposed = true;
		this.lifetime.abort();
		if (this.reconnectTimer !== undefined) clearTimeout(this.reconnectTimer);
		this.reconnectTimer = undefined;
		const socket = this.socket;
		this.socket = undefined;
		socket?.close();
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
