import { WebSocketServer } from "ws";

import { parseBridgeFrame } from "../../shared/protocol.mjs";
import { StatusRegistry } from "../../shared/status-registry.mjs";

const LOOPBACK_HOST = "127.0.0.1";
const BRIDGE_PORT = 20666;

/** Hosts the local OpenCode status protocol for the Stream Deck plugin. */
export class StatusBridgeServer {
	/** @param {{ host?: string, port?: number }} [options] */
	constructor({ host = LOOPBACK_HOST, port = BRIDGE_PORT } = {}) {
		this.registry = new StatusRegistry();
		this.sockets = new Map();
		this.instanceSockets = new Map();
		this.directorySources = new Map();
		this.server = new WebSocketServer({ host, port });
		this.server.on("connection", (socket, request) => this.handleConnection(socket, request.socket.remoteAddress));
		this.server.on("error", (error) => console.error("OpenCode status bridge error:", error));
	}

	/** @param {(status: import("../../shared/status-registry.mjs").GlobalStatusValue) => void} listener */
	subscribe(listener) {
		return this.registry.subscribe(listener);
	}

	async close() {
		for (const socket of this.sockets.keys()) socket.close();
		await new Promise((resolve) => this.server.close(() => resolve()));
	}

	/** @param {import("ws").WebSocket} socket @param {string | undefined} remoteAddress */
	handleConnection(socket, remoteAddress) {
		if (!isLoopbackAddress(remoteAddress)) {
			socket.close(1008, "Local connections only");
			return;
		}

		socket.on("message", (data) => this.handleMessage(socket, rawDataToText(data)));
		socket.on("close", () => this.handleClose(socket));
	}

	/** @param {import("ws").WebSocket} socket @param {string} payload */
	handleMessage(socket, payload) {
		const frame = parseBridgeFrame(payload);
		if (!frame) return;

		const currentSource = this.sockets.get(socket);
		if (frame.type === "hello") {
			if (currentSource) this.retireSource(currentSource);

			const previousSocket = this.instanceSockets.get(frame.instanceID);
			if (previousSocket && previousSocket !== socket) {
				const previousSource = this.sockets.get(previousSocket);
				if (previousSource) this.retireSource(previousSource);
				previousSocket.close(1000, "Replaced by reconnection");
			}

			const directory = nonEmptyDirectory(frame.directory);
			const previousDirectorySource = directory && this.directorySources.get(directory);
			if (previousDirectorySource && previousDirectorySource.socket !== socket) {
				this.retireSource(previousDirectorySource);
				logLifecycle("source.replaced", {
					directory,
					previousInstanceID: previousDirectorySource.instanceID,
					instanceID: frame.instanceID,
				});
				previousDirectorySource.socket.close(1000, "Replaced by directory source");
			}

			const source = { instanceID: frame.instanceID, directory, socket };
			this.sockets.set(socket, source);
			this.instanceSockets.set(frame.instanceID, socket);
			if (directory) this.directorySources.set(directory, source);
			this.registry.connect(frame.instanceID);
			logLifecycle("source.registered", { instanceID: frame.instanceID, directory });
			return;
		}

		if (currentSource?.instanceID !== frame.instanceID) return;
		this.registry.apply(frame);
	}

	/** @param {import("ws").WebSocket} socket */
	handleClose(socket) {
		const source = this.sockets.get(socket);
		if (source) this.retireSource(source);
	}

	/** @param {{ instanceID: string, directory: string | undefined, socket: import("ws").WebSocket }} source */
	retireSource(source) {
		if (this.sockets.get(source.socket) !== source) return;
		this.sockets.delete(source.socket);
		this.removeInstanceSocket(source.instanceID, source.socket);
		this.removeDirectorySource(source.directory, source);
	}

	/** @param {string} instanceID @param {import("ws").WebSocket} socket */
	removeInstanceSocket(instanceID, socket) {
		if (this.instanceSockets.get(instanceID) !== socket) return;
		this.instanceSockets.delete(instanceID);
		this.registry.disconnect(instanceID);
	}

	/** @param {string | undefined} directory @param {{ instanceID: string, socket: import("ws").WebSocket }} source */
	removeDirectorySource(directory, source) {
		if (!directory || this.directorySources.get(directory) !== source) return;
		this.directorySources.delete(directory);
	}
}

/** @param {unknown} directory */
function nonEmptyDirectory(directory) {
	return typeof directory === "string" && directory.length > 0 ? directory : undefined;
}

/** @param {string} action @param {Record<string, unknown>} details */
function logLifecycle(action, details) {
	console.info("OpenCode status bridge lifecycle", { action, ...details });
}

/** @param {import("ws").RawData} data */
function rawDataToText(data) {
	if (Array.isArray(data)) return Buffer.concat(data).toString();
	if (data instanceof ArrayBuffer) return Buffer.from(data).toString();
	return data.toString();
}

function isLoopbackAddress(address) {
	return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}
