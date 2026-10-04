## ADDED Requirements

### Requirement: Additional cellular READY background choices
After the configurable READY background selection is available, both global and project property inspectors SHALL additionally offer Brian's Brain (`brians-brain`), Day & Night (`day-night`), and Generations + Trails (`generations-trails`). These values SHALL be persisted and restored independently per key, including initial settings, received settings, and reappearance. Plasma SHALL remain the default for missing, malformed, or unsupported values. Existing background choices, including choices added by other changes, and unrelated settings SHALL be preserved. The additional choices SHALL change only READY appearance, not effective status or non-READY backgrounds.

#### Scenario: Save and restore every cellular choice
- **WHEN** any of the three cellular choices is selected for a global or project key and its inspector is reopened or receives settings
- **THEN** the selected choice is restored without a settings feedback write and a visible READY key displays that background
- **AND** other keys, project selection, typography, positions, and section settings are unchanged

#### Scenario: Default and existing choices remain compatible
- **WHEN** a key uses absent or invalid settings, an existing supported background, or a supported choice added by another change
- **THEN** absent or invalid settings use Plasma and existing supported selections remain available and retain their behavior

#### Scenario: A cellular selection is changed outside READY
- **WHEN** a cellular READY background is selected while the key is BUSY, ATTENTION, ERROR, or OFFLINE
- **THEN** the current background and animation phase remain unchanged
- **AND** the selection takes effect on the next READY transition

### Requirement: Compact readable cellular backgrounds
All three cellular backgrounds SHALL evolve on a 24×24 grid with eight surrounding neighbors and wrapping opposite edges. On a 72×72 display each cell SHALL occupy a 3×3 pixel area. They SHALL use subdued sparks, organic structures, or progressively fading trails over a dark base, without a duration limit or whole-display flashing. The READY status label, status glyph, and configured project labels SHALL remain steady and readable using existing typography and layout settings. Animation SHALL use the existing image delivery mechanism without additional runtime dependencies or animated image files.

#### Scenario: Native-size appearance
- **WHEN** each cellular background is displayed at 72×72 over successive generations
- **THEN** its coarse cells and characteristic motion remain recognizable and the existing READY and project overlays remain readable
- **AND** the background does not animate or recolor the overlays

#### Scenario: Evolution across an edge
- **WHEN** a cell has active neighbors across the opposite grid edge
- **THEN** those cells count as adjacent neighbors for the next simultaneous generation

### Requirement: Brian's Brain evolution
Brian's Brain SHALL have off, active, and dying states. An off cell SHALL become active if and only if exactly two of its eight neighbors are active. An active cell SHALL become dying on the next generation, and a dying cell SHALL become off on the following generation regardless of neighbor count. Only active cells SHALL count toward births. Dying cells SHALL be visibly dimmer than active cells, producing short spark trails. All cells SHALL update simultaneously from the previous generation, except for localized recovery interventions.

#### Scenario: Birth and spark decay
- **WHEN** an off cell has exactly two active neighbors
- **THEN** it becomes active, then dying, then off over the next three generations
- **AND** dying neighbors do not contribute to another cell's birth

#### Scenario: Other neighbor counts do not cause birth
- **WHEN** an off cell has any active-neighbor count other than two
- **THEN** it stays off for that generation

### Requirement: Day and Night evolution
Day & Night SHALL use the two-state rule `B3678/S34678`: an off cell SHALL become active at exactly 3, 6, 7, or 8 active neighbors; an active cell SHALL survive at exactly 3, 4, 6, 7, or 8 active neighbors and otherwise become off. All cells SHALL update simultaneously from the previous generation, except for localized recovery interventions. Its appearance SHALL emphasize subdued organic structures rather than bright strobing.

#### Scenario: Birth and survival follow the named rule
- **WHEN** off and active cells have each possible active-neighbor count from zero through eight
- **THEN** births occur only at 3, 6, 7, and 8 and survival occurs only at 3, 4, 6, 7, and 8

### Requirement: Five-state Generations trails
Generations + Trails SHALL use states 0 through 4, with 0 off and only 4 active for neighbor counting. State 0 SHALL become 4 if and only if it has exactly two state-4 neighbors. Nonzero states SHALL decay `4 → 3 → 2 → 1 → 0` on successive generations regardless of neighbor count, without rebirth during decay. States 3, 2, and 1 SHALL render progressively dimmer trails. All cells SHALL update simultaneously from the previous generation, except for localized recovery interventions.

#### Scenario: Active neighbors create a fading particle
- **WHEN** a state-0 cell has exactly two state-4 neighbors
- **THEN** it becomes 4 and subsequently decays through 3, 2, 1, and 0
- **AND** states 1 through 3 neither count as active neighbors nor cause premature rebirth of a decaying cell

### Requirement: Local recovery from cellular stagnation
Cellular backgrounds SHALL recover without a visible whole-grid reinitialization. If the entire grid is off, or Day & Night is entirely active, the next simulation advance SHALL insert localized rule-appropriate seed patches. If at most five of the 576 cells change state in each of 100 consecutive simulation generations, a localized recovery SHALL occur on the hundredth such generation. For Brian's Brain and Generations + Trails, if at most eight cells are active (state 1 or state 4 respectively) in each of 100 consecutive simulation generations, a localized recovery SHALL also occur on the hundredth such generation, even when more than five cells change per generation. The two consecutive counters SHALL be independent; a generation that exceeds a counter's threshold SHALL reset that counter, and recovery SHALL reset both. Each recovery SHALL affect one to three patches of at most 3×3 cells each and preserve every cell outside those patches. Dense Day & Night recovery SHALL permit local clearing as well as activation to create boundaries. Normal motion with more than eight active cells SHALL not trigger sparse-pattern recovery. Detection SHALL count simulation generations, not delivered frames or presentation refreshes.

#### Scenario: Extinction or saturation
- **WHEN** the grid becomes entirely off or Day & Night becomes entirely active
- **THEN** the next advance introduces localized seed patches without replacing the rest of the grid or restarting the animation

#### Scenario: Sustained low activity
- **WHEN** no more than five cells change in each of 100 consecutive generations
- **THEN** recovery occurs on the hundredth generation and changes no more than 27 cell positions
- **AND** cells outside the selected patches and the current presentation remain unchanged

#### Scenario: A moving but sparse oscillator
- **WHEN** Brian's Brain or Generations + Trails has at most eight active cells for 100 consecutive generations while its moving pattern changes more than five cells per generation
- **THEN** localized recovery occurs on the hundredth generation, changing only cells within one to three 3×3 patches
- **AND** snapshots and label refreshes neither increment nor reset the sparse-pattern counter

#### Scenario: Active evolution and refreshes
- **WHEN** a generation changes more than five cells, has more than eight active cells, or the presentation is refreshed without advancing the simulation
- **THEN** each exceeded threshold resets only its corresponding consecutive counter, and a presentation refresh does not advance or trigger recovery

### Requirement: Stable independent cellular lifecycle
Every visible key using a cellular READY background SHALL own independent simulation state. Duplicate READY reports, unchanged background selections, and typography/layout refreshes SHALL NOT reinitialize its grid or advance it merely to redraw. Live background changes and status transitions SHALL follow the existing serialized switching contract: only the changed key restarts, latest selection wins, superseded queued frames cannot overwrite the new presentation, and failures do not block later frames or cleanup. Disappearance SHALL release its resources and suppress queued and newly scheduled writes; already issued writes are allowed to settle. Reappearance SHALL immediately display the current selection without waiting for a status report.

#### Scenario: Refresh and duplicate reports preserve the grid
- **WHEN** a cellular READY key receives duplicate reports or a font, label, or layout refresh with the same effective background
- **THEN** the simulation state is retained and updated overlays apply to the current and subsequent frames

#### Scenario: Independent keys and safe switching
- **WHEN** one of multiple cellular READY keys changes background during a delayed or failing image write
- **THEN** only that key switches and settles on its latest selection after the issued write settles
- **AND** other simulations continue independently and old queued frames cannot overwrite the latest presentation

#### Scenario: Disappearance and reused action ID
- **WHEN** a cellular key disappears during an issued write and a new key appears using the same action ID
- **THEN** the old simulation stops, its queued and scheduled writes are suppressed, and the new key displays its current selected presentation after the issued write settles
