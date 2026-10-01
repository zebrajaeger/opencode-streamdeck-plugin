import streamDeck from "@elgato/streamdeck";

import { OpenCodeProjectStatus } from "./actions/opencode-project-status";
import { OpenCodeStatus } from "./actions/opencode-status";
import { StatusBridgeServer } from "./status-bridge-server.mjs";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

const statusAction = new OpenCodeStatus();
const projectStatusAction = new OpenCodeProjectStatus();
const statusBridge = new StatusBridgeServer();
statusBridge.subscribe((status) => statusAction.setStatus(status));
projectStatusAction.setProjectSubscriber((projectID, listener) => statusBridge.subscribeProject(projectID, listener));

streamDeck.actions.registerAction(statusAction);
streamDeck.actions.registerAction(projectStatusAction);

// Finally, connect to the Stream Deck.
streamDeck.connect();
