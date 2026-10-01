## Why

An OpenCode agent can pause to ask the user a question while its session still reports as busy. The Stream Deck status currently tracks only permission requests, so it continues to display `BUSY` and does not visibly signal that user input is required.

## What Changes

- Treat an unanswered OpenCode agent question as an attention condition in the local status bridge.
- Report question creation and resolution from the OpenCode plugin, including rejected questions, and include outstanding questions in reconnect snapshots.
- Aggregate outstanding questions with existing permission requests so the Stream Deck displays `ATTENTION` until the last attention request is resolved, then resumes the highest applicable session status.
- Add protocol, registry, bridge-server, and plugin coverage for question-driven attention transitions.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `opencode-status-indicator`: Include unanswered agent questions in the global attention state and its priority rules.

## Impact

- Affects the OpenCode plugin event handling and startup snapshot, shared local bridge protocol and status registry, Stream Deck bridge-server tests, and bridge documentation.
- Remains read-only: the Stream Deck will not answer, reject, or otherwise control agent questions.
