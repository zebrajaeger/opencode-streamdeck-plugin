import assert from "node:assert/strict";
import test from "node:test";

import { isReservedCommandFrame, parseBridgeFrame } from "../../shared/protocol.mjs";

test("accepts valid protocol frames", () => {
	const frame = parseBridgeFrame(JSON.stringify({
		version: 1,
		type: "snapshot",
		instanceID: "instance",
		sessions: [{ sessionID: "session", status: "busy" }],
		permissions: [],
	}));
	assert.equal(frame?.type, "snapshot");
});

test("accepts hello frames with and without a directory", () => {
	const directoryHello = parseBridgeFrame({
		version: 1,
		type: "hello",
		instanceID: "instance",
		directory: "C:\\work\\project",
	});
	assert.equal(directoryHello?.directory, "C:\\work\\project");

	const legacyHello = parseBridgeFrame({ version: 1, type: "hello", instanceID: "instance" });
	assert.equal(legacyHello?.type, "hello");
	assert.equal(parseBridgeFrame({ version: 1, type: "hello", instanceID: "instance", directory: 1 }), undefined);
});

test("rejects invalid and unknown frames without throwing", () => {
	assert.equal(parseBridgeFrame("not json"), undefined);
	assert.equal(parseBridgeFrame({ version: 1, type: "unexpected", instanceID: "instance" }), undefined);
	assert.equal(parseBridgeFrame({ version: 2, type: "hello", instanceID: "instance" }), undefined);
});

test("recognizes but does not enable reserved commands", () => {
	assert.equal(isReservedCommandFrame({ version: 1, type: "permission.respond" }), true);
	assert.equal(parseBridgeFrame({ version: 1, type: "permission.respond", instanceID: "instance" }), undefined);
});
