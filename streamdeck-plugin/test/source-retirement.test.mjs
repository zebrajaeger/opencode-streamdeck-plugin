import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { SOURCE_SUPERSEDED_CLOSE_CODE } from "../../shared/protocol.mjs";
import { StatusBridgeServer } from "../src/status-bridge-server.mjs";

for (const sameInstance of [false, true]) {
	test(`replacement owns state despite retired frames and delayed closure (same instance: ${sameInstance})`, async (t) => {
		const server = new StatusBridgeServer({ port: 0 });
		await once(server.server, "listening");
		t.after(() => server.close());
		const socket = () => ({ closes: [], close(...args) { this.closes.push(args); } });
		const old = socket();
		const replacement = socket();
		const send = (target, type, properties = {}) => server.handleMessage(target, JSON.stringify({
			version: 1, instanceID: target === old || sameInstance ? "old" : "new", type, ...properties,
		}));
		send(old, "hello", { directory: "C:\\work\\project", projectID: "project" });
		send(old, "permission.asked", { sessionID: "session", permissionID: "permission" });
		send(replacement, "hello", { directory: "C:\\work\\project", projectID: "project" });
		assert.equal(old.closes.length, 1);
		assert.equal(old.closes[0][0], SOURCE_SUPERSEDED_CLOSE_CODE);
		send(replacement, "session.status", { sessionID: "session", status: "busy" });
		send(old, "session.idle", { sessionID: "session" });
		send(old, "permission.asked", { sessionID: "session", permissionID: "late" });
		server.handleClose(old);
		assert.equal(server.registry.projectStatus("project"), "BUSY");
		assert.equal(server.registry.instances.size, 1);
		assert.equal(server.sockets.size, 1);
		assert.equal(server.instanceSockets.size, 1);
		assert.equal(server.directorySources.get("C:\\work\\project").socket, replacement);
		server.handleClose(replacement);
		assert.equal(server.registry.status, "OFFLINE");
	});
}
