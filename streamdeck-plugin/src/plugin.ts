import streamDeck from "@elgato/streamdeck";

import { OpenCodeStatus } from "./actions/opencode-status";
import { StatusBridgeServer } from "./status-bridge-server.mjs";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

const statusAction = new OpenCodeStatus();
const statusBridge = new StatusBridgeServer();
statusBridge.subscribe((status) => statusAction.setStatus(status));

streamDeck.actions.registerAction(statusAction);

// Finally, connect to the Stream Deck.
streamDeck.connect();
