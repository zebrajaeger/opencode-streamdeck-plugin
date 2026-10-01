import assert from "node:assert/strict";
import test from "node:test";

globalThis.document = { querySelector: () => undefined };

const { inspectorRegistration, knownProjectsFromGlobalSettings, mergeKnownProjects, projectBasename, projectOptions, projectSettings } = await import("../de.lars-brandt.opencode.sdPlugin/property-inspector/project-status-inspector.mjs");

test("uses the inspector UUID as the action context for settings commands", () => {
	assert.deepEqual(inspectorRegistration("28196", "inspector-uuid", "registerPropertyInspector", JSON.stringify({ context: "stale-action-context" })), {
		context: "inspector-uuid",
		registration: { event: "registerPropertyInspector", uuid: "inspector-uuid" },
		url: "ws://127.0.0.1:28196",
	});
});

test("derives concise project labels and disambiguates duplicate directory names", () => {
	assert.equal(projectBasename("C:\\work\\alpha\\"), "alpha");
	assert.deepEqual(projectOptions([
		{ projectID: "project-a", directory: "C:\\work\\one\\app" },
		{ projectID: "project-b", directory: "D:\\work\\two\\app" },
		{ projectID: "project-c", directory: "/work/unique" },
	]), [
		{ projectID: "project-a", directory: "C:\\work\\one\\app", label: "app — C:\\work\\one\\app" },
		{ projectID: "project-b", directory: "D:\\work\\two\\app", label: "app — D:\\work\\two\\app" },
		{ projectID: "project-c", directory: "/work/unique", label: "unique" },
	]);
});

test("uses the existing projectID action-setting shape for both selector and manual entry", () => {
	assert.deepEqual(projectSettings("project-manual"), { projectID: "project-manual" });
});

test("seeds selector choices from validated persisted global settings without replacing fresher bridge metadata", () => {
	const persisted = knownProjectsFromGlobalSettings({
		knownProjects: {
			version: 1,
			projects: [
				{ projectID: "project-a", directory: "C:\\old\\app" },
				{ projectID: "", directory: "C:\\invalid" },
			],
		},
	});
	assert.deepEqual(persisted, [{ projectID: "project-a", directory: "C:\\old\\app" }]);
	assert.deepEqual(mergeKnownProjects(persisted, [{ projectID: "project-a", directory: "D:\\live\\app" }]), [
		{ projectID: "project-a", directory: "D:\\live\\app" },
	]);
	assert.deepEqual(mergeKnownProjects(persisted, [{ projectID: "project-c", directory: "D:\\live\\other" }]), [
		{ projectID: "project-a", directory: "C:\\old\\app" },
		{ projectID: "project-c", directory: "D:\\live\\other" },
	]);
	assert.deepEqual(knownProjectsFromGlobalSettings({ knownProjects: { version: 2, projects: persisted } }), []);
});
