import streamDeck from "@elgato/streamdeck";
import { OpenCodeProjectStatus } from "./actions/opencode-project-status";
import { OpenCodeStatus } from "./actions/opencode-status";
import { KnownProjectPersistence, KnownProjectStore } from "./known-projects";
import { StatusBridgeServer } from "./status-bridge-server.mjs";

const statusAction = new OpenCodeStatus();
const projectStatusAction = new OpenCodeProjectStatus();
const statusBridge = new StatusBridgeServer();
const knownProjects = new KnownProjectPersistence(new KnownProjectStore(), streamDeck.settings, (projects) => projectStatusAction.setKnownProjects(projects));

statusBridge.subscribeKnownProject(({ projectID, directory }) => {
	knownProjects.observe(projectID, directory);
});
statusBridge.subscribe((status) => statusAction.setStatus(status));
projectStatusAction.setProjectSubscriber((projectID, listener) => statusBridge.subscribeProject(projectID, listener));

streamDeck.actions.registerAction(statusAction);
streamDeck.actions.registerAction(projectStatusAction);

async function startPlugin(): Promise<void> {
	await streamDeck.connect();
	await knownProjects.load();
}

void startPlugin();
