## 1. Particle animation component

- [x] 1.1 Implement a reusable per-key particle-network animation component that maintains deterministic particle state, renders SVG Data-URI frames, and exposes centrally tunable visual and frame-rate parameters; verify focused unit tests cover particle advancement and frame SVG output.
- [x] 1.2 Implement the component's start, stop, and disposal lifecycle so it schedules frames only while active and prevents late frame writes after stopping; verify focused unit tests cover timer cleanup and stale-frame protection.

## 2. Status action integration

- [x] 2.1 Integrate one animation component per visible key into the global status action so `BUSY` starts or maintains its particle animation and the existing status title remains visible; verify an action-level test observes independent animations for two visible BUSY keys.
- [x] 2.2 Handle status transitions and key disappearance by stopping and removing the affected animation before rendering the appropriate static status image or releasing the key; verify action-level tests cover BUSY-to-READY, BUSY-to-ATTENTION/ERROR, and key-removal behavior.

## 3. Verification

- [x] 3.1 Run the Stream Deck plugin test suite and production build, and verify both complete successfully without adding runtime dependencies.
