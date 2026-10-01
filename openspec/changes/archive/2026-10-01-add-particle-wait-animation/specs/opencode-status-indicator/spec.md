## MODIFIED Requirements

### Requirement: Activity status aggregation
The system SHALL display `BUSY` when one or more connected OpenCode sessions are working and no higher-priority state applies. Each visible status key displaying `BUSY` SHALL present the dynamic particle-network wait animation defined by the `particle-wait-animation` capability instead of the regular static status image.

#### Scenario: One session is working
- **WHEN** one connected session reports that it is working
- **THEN** the status action displays `BUSY` with the particle-network wait animation

#### Scenario: Sessions from separate instances are working
- **WHEN** sessions in two or more connected OpenCode instances report that they are working
- **THEN** the status action displays one global `BUSY` state with the particle-network wait animation
