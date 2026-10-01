import assert from "node:assert/strict";
import test from "node:test";

import { ProjectStatusSubscriptions } from "../src/actions/project-status-subscriptions.ts";

test("keeps an unconfigured key offline and replaces its project subscription after a settings change", () => {
	const statuses = [];
	const subscriptions = [];
	const unsubscribed = [];
	const projectStatus = new ProjectStatusSubscriptions((actionID, status) => statuses.push([actionID, status]));
	projectStatus.setSubscriber((projectID, listener) => {
		subscriptions.push({ projectID, listener });
		listener("READY");
		return () => unsubscribed.push(projectID);
	});

	projectStatus.update("key", undefined);
	assert.deepEqual(statuses.at(-1), ["key", "OFFLINE"]);

	projectStatus.update("key", " project-a ");
	assert.equal(subscriptions.at(-1).projectID, "project-a");
	assert.deepEqual(statuses.at(-1), ["key", "READY"]);

	projectStatus.update("key", "project-b");
	assert.deepEqual(unsubscribed, ["project-a"]);
	assert.equal(subscriptions.at(-1).projectID, "project-b");

	projectStatus.dispose("key");
	assert.deepEqual(unsubscribed, ["project-a", "project-b"]);
});
