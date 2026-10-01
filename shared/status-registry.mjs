import { BridgeStatus } from "./protocol.mjs";

export const GlobalStatus = Object.freeze({
	OFFLINE: "OFFLINE",
	READY: "READY",
	BUSY: "BUSY",
	ATTENTION: "ATTENTION",
	ERROR: "ERROR",
});

export const ERROR_INDICATION_DURATION_MS = 15_000;

/**
 * Aggregates all bridge instances. Instance data is deliberately transient:
 * closing a connection removes every session and unanswered permission owned
 * by that instance.
 */
export class StatusRegistry {
	/** @param {{ now?: () => number, setTimeout?: typeof setTimeout, clearTimeout?: typeof clearTimeout }} [timers] */
	constructor({ now = Date.now, setTimeout: scheduleTimeout = setTimeout, clearTimeout: cancelTimeout = clearTimeout } = {}) {
		this.instances = new Map();
		this.listeners = new Set();
		this.now = now;
		this.scheduleTimeout = scheduleTimeout;
		this.cancelTimeout = cancelTimeout;
	}

	/** @param {(status: string) => void} listener */
	subscribe(listener) {
		this.listeners.add(listener);
		listener(this.status);
		return () => this.listeners.delete(listener);
	}

	/** @param {string} instanceID */
	connect(instanceID) {
		this.removeInstance(instanceID);
		this.instances.set(instanceID, {
			sessions: new Map(),
			permissions: new Map(),
			questions: new Map(),
			errorExpiresAt: undefined,
			errorTimer: undefined,
		});
		this.notify();
	}

	/** @param {string} instanceID */
	disconnect(instanceID) {
		if (this.removeInstance(instanceID)) this.notify();
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
				this.clearError(instance);
				break;
			case "session.status":
				instance.sessions.set(frame.sessionID, frame.status);
				this.clearError(instance);
				break;
			case "session.idle":
				instance.sessions.set(frame.sessionID, BridgeStatus.READY);
				this.clearError(instance);
				break;
			case "session.error":
				this.setError(instance);
				break;
			case "permission.asked":
				instance.permissions.set(frame.permissionID, frame.sessionID);
				this.clearError(instance);
				break;
			case "permission.replied":
				instance.permissions.delete(frame.permissionID);
				break;
			case "question.asked":
				instance.questions.set(frame.questionID, frame.sessionID);
				this.clearError(instance);
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
				if (sessionStatus === BridgeStatus.BUSY) busy = true;
			}
			if (instance.errorExpiresAt && instance.errorExpiresAt > this.now()) error = true;
		}

		if (error) return GlobalStatus.ERROR;
		if (busy) return GlobalStatus.BUSY;
		return GlobalStatus.READY;
	}

	notify() {
		const status = this.status;
		for (const listener of this.listeners) listener(status);
	}

	removeInstance(instanceID) {
		const instance = this.instances.get(instanceID);
		if (!instance) return false;
		this.clearError(instance);
		this.instances.delete(instanceID);
		return true;
	}

	setError(instance) {
		this.clearError(instance);
		instance.errorExpiresAt = this.now() + ERROR_INDICATION_DURATION_MS;
		instance.errorTimer = this.scheduleTimeout(() => {
			instance.errorTimer = undefined;
			instance.errorExpiresAt = undefined;
			this.notify();
		}, ERROR_INDICATION_DURATION_MS);
	}

	clearError(instance) {
		if (instance.errorTimer !== undefined) this.cancelTimeout(instance.errorTimer);
		instance.errorTimer = undefined;
		instance.errorExpiresAt = undefined;
	}
}
