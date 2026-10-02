import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { OpenCodeBridge } from "../../opencode-plugin/index.mjs";
import { ERROR_INDICATION_DURATION_MS, StatusRegistry } from "../../shared/status-registry.mjs";
import { StatusBridgeServer } from "../src/status-bridge-server.mjs";

function createClock() {
	let now = 0, nextTimerID = 1;
	const timers = new Map();
	return {
		now: () => now,
		setTimeout(callback, delay) { timers.set(nextTimerID, { callback, at: now + delay }); return nextTimerID++; },
		clearTimeout(timerID) { timers.delete(timerID); },
		advance(duration) {
			now += duration;
			for (const [timerID, timer] of [...timers]) {
				if (timer.at > now) continue;
				timers.delete(timerID);
				timer.callback();
			}
		},
	};
}

for (const failure of ["session.execution.failed", "session.compaction.failed"]) {
	test(`${failure} releases the failed project without an idle event while other work continues`, async (t) => {
		const clock = createClock();
		const server = new StatusBridgeServer({ port: 0, registry: new StatusRegistry(clock) });
		await once(server.server, "listening");
		t.after(() => server.close());
		const original = globalThis.WebSocket;
		globalThis.WebSocket = class {
			readyState = 0;
			listeners = new Map();
			messages = [];
			constructor() { this.peer = { close: (code) => this.close(code) }; }
			addEventListener(type, listener) { this.listeners.set(type, listener); }
			open() { this.readyState = 1; this.listeners.get("open")(); }
			send(payload) { this.messages.push(JSON.parse(payload)); server.handleMessage(this.peer, payload); }
			close(code = 1000) { this.readyState = 3; server.handleClose(this.peer); this.listeners.get("close")({ code }); }
		};
		t.after(() => { globalThis.WebSocket = original; });

		const owners = new Map([["a", "A"], ["b", "B"]]);
		const bridges = [];
		for (const projectID of ["A", "B"]) {
			const bridge = new OpenCodeBridge({
				location: { directory: `C:\\work\\${projectID}`, project: { id: projectID } },
				session: { get: async ({ sessionID }) => ({ id: sessionID, projectID: owners.get(sessionID) }) },
				permission: { request: { list: async () => ({ data: [] }) } },
			});
			bridges.push(bridge);
			t.after(() => bridge.dispose());
			await bridge.initialize(); bridge.socket.open(); await bridge.work;
		}
		const [a] = bridges;
		const statuses = (expected) => assert.deepEqual([server.registry.projectStatus("A"), server.registry.projectStatus("B"), server.registry.status], expected);
		const feed = async (type, data) => {
			const input = { type, data, location: { directory: "C:\\work\\B" } };
			await Promise.all(bridges.map((bridge) => bridge.handleEvent(input)));
		};

		await feed("session.execution.started", { sessionID: "a" });
		await feed("session.execution.started", { sessionID: "b" });
		statuses(["BUSY", "BUSY", "BUSY"]);

		await feed(failure, { sessionID: "a", reason: "auto" });
		statuses(["ERROR", "BUSY", "ERROR"]);
		clock.advance(ERROR_INDICATION_DURATION_MS);
		// A failed chat stops reporting work on its own; B keeps running.
		statuses(["READY", "BUSY", "BUSY"]);

		await feed("session.idle", { sessionID: "b" });
		statuses(["READY", "READY", "READY"]);

		// Foreign and unresolved failures must not change a project's status.
		await feed("session.execution.started", { sessionID: "a" });
		await feed(failure, { sessionID: "b", reason: "auto" });
		clock.advance(ERROR_INDICATION_DURATION_MS);
		statuses(["BUSY", "READY", "BUSY"]);

		// Restarted work after a failure is reported again.
		await feed(failure, { sessionID: "a", reason: "manual" });
		clock.advance(ERROR_INDICATION_DURATION_MS);
		statuses(["READY", "READY", "READY"]);
		await feed("session.retry.scheduled", { sessionID: "a", attempt: 2 });
		statuses(["BUSY", "READY", "BUSY"]);

		// A reconnect must not resurrect the failed session's busy state.
		await feed(failure, { sessionID: "a", reason: "auto" });
		a.socket.close();
		clearTimeout(a.reconnectTimer); a.reconnectTimer = undefined;
		a.connect(); a.socket.open(); await a.work;
		assert.deepEqual(a.socket.messages[1].sessions, [{ sessionID: "a", status: "ready" }]);
		statuses(["READY", "READY", "READY"]);
	});
}
