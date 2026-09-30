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

		const currentInstanceID = this.sockets.get(socket);
		if (frame.type === "hello") {
			if (currentInstanceID && currentInstanceID !== frame.instanceID) {
				this.removeInstanceSocket(currentInstanceID, socket);
			}

			const previousSocket = this.instanceSockets.get(frame.instanceID);
			if (previousSocket && previousSocket !== socket) previousSocket.close(1000, "Replaced by reconnection");

			this.sockets.set(socket, frame.instanceID);
			this.instanceSockets.set(frame.instanceID, socket);
			this.registry.connect(frame.instanceID);
			return;
		}

		if (currentInstanceID !== frame.instanceID) return;
		this.registry.apply(frame);
	}

	/** @param {import("ws").WebSocket} socket */
	handleClose(socket) {
		const instanceID = this.sockets.get(socket);
		this.sockets.delete(socket);
		if (instanceID) this.removeInstanceSocket(instanceID, socket);
	}

	/** @param {string} instanceID @param {import("ws").WebSocket} socket */
	removeInstanceSocket(instanceID, socket) {
		if (this.instanceSockets.get(instanceID) !== socket) return;
		this.instanceSockets.delete(instanceID);
		this.registry.disconnect(instanceID);
	}
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
