import { BridgeStatus } from "./protocol.mjs";

export const GlobalStatus = Object.freeze({
	OFFLINE: "OFFLINE",
	READY: "READY",
	BUSY: "BUSY",
	ATTENTION: "ATTENTION",
	ERROR: "ERROR",
});

/**
 * Aggregates all bridge instances. Instance data is deliberately transient:
 * closing a connection removes every session and unanswered permission owned
 * by that instance.
 */
export class StatusRegistry {
	constructor() {
		this.instances = new Map();
		this.listeners = new Set();
	}

	/** @param {(status: string) => void} listener */
	subscribe(listener) {
		this.listeners.add(listener);
		listener(this.status);
		return () => this.listeners.delete(listener);
	}

	/** @param {string} instanceID */
	connect(instanceID) {
		this.instances.set(instanceID, { sessions: new Map(), permissions: new Map(), questions: new Map() });
		this.notify();
	}

	/** @param {string} instanceID */
	disconnect(instanceID) {
		if (this.instances.delete(instanceID)) this.notify();
	}

	/** @param {Record<string, unknown>} frame */
	apply(frame) {
		const instance = this.instances.get(frame.instanceID);
		if (!instance) return;

		switch (frame.type) {
			case "snapshot":
				instance.sessions = new Map(frame.sessions.map(({ sessionID, status }) => [sessionID, status]));
				instance.permissions = new Map(frame.permissions.map(({ permissionID, sessionID }) => [permissionID, sessionID]));
				instance.questions = new Map((frame.questions ?? []).map(({ questionID, sessionID }) => [questionID, sessionID]));
				break;
			case "session.status":
				instance.sessions.set(frame.sessionID, frame.status);
				break;
			case "session.idle":
				instance.sessions.set(frame.sessionID, BridgeStatus.READY);
				break;
			case "session.error":
				instance.sessions.set(frame.sessionID, BridgeStatus.ERROR);
				break;
			case "permission.asked":
				instance.permissions.set(frame.permissionID, frame.sessionID);
				break;
			case "permission.replied":
				instance.permissions.delete(frame.permissionID);
				break;
			case "question.asked":
				instance.questions.set(frame.questionID, frame.sessionID);
				break;
			case "question.resolved":
				instance.questions.delete(frame.questionID);
				break;
		}

		this.notify();
	}

	get status() {
		if (this.instances.size === 0) return GlobalStatus.OFFLINE;

		let busy = false;
		let error = false;
		for (const instance of this.instances.values()) {
			if (instance.permissions.size > 0 || instance.questions.size > 0) return GlobalStatus.ATTENTION;
			for (const sessionStatus of instance.sessions.values()) {
				if (sessionStatus === BridgeStatus.ERROR) error = true;
				if (sessionStatus === BridgeStatus.BUSY) busy = true;
			}
		}

		if (error) return GlobalStatus.ERROR;
		if (busy) return GlobalStatus.BUSY;
		return GlobalStatus.READY;
	}

	notify() {
		const status = this.status;
		for (const listener of this.listeners) listener(status);
	}
}
