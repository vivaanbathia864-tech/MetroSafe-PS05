# MetroSafe PS-05 roadmap

## Scope

Build a hackathon prototype for one event at one Ahmedabad metro station. The control desk should accept event attendance, end time and expected metro share; estimate minute-by-minute arrivals; show crowd pressure on the station's 3D levels; recommend gate and street-holding arrangements; and generate a timed action plan with English, Hindi and Gujarati announcement drafts. A surge scenario should update the plan live.

The supplied drawings support a schematic Type 1 side-platform station model. Exit positions and all operating rates remain assumptions until confirmed by the operator. This is a decision-support demo, not a live station-control or safety system.

## Today’s checkpoint

- [x] Keep the project in `C:\Users\vivaa\Desktop\MetroSafe`.
- [x] Preserve the existing offline 3D station explorer and its locally bundled Three.js dependency.
- [x] Capture the PS-05 scope, assumptions and staged build plan in this roadmap.
- [x] Create a private GitHub repository named `MetroSafe-PS05` under the project owner’s account.
- [x] Push the current project as the initial `main` branch checkpoint.

## Build roadmap

### Phase 1 — Establish the baseline

- Confirm project files open offline on the target laptop/browser.
- Record the station drawing references, visible exits and schematic geometry decisions.
- Keep a known-good Git checkpoint before each feature phase.

**Done when:** the team can launch the same baseline locally without network access and explain what is schematic.

### Phase 2 — Event demand

- Capture one event’s venue, attendance, end time and expected metro share.
- Calculate the estimated metro rider demand for the demo station.
- Produce an inspectable per-minute arrival profile and show its total reconciles with the estimate.

**Done when:** changing inputs updates the profile, totals and peak minute consistently.

### Phase 3 — Station crowd picture

- Map modeled forecourt, concourse and platform occupancy to distinct 3D colors.
- Make levels, gates, stairs, lifts, waiting areas and exits easy to identify.
- Allow the user to scrub or play through time and inspect the minute-level values.

**Done when:** the selected minute in the timeline matches the displayed map and occupancy figures.

### Phase 4 — Operations response

- Recommend a gate configuration from the modeled arrival rate.
- Identify a street-level holding area; do not use stairs, lift landings, gate throats or platform edges as holding areas.
- Suggest train-service readiness/augmentation timing where the scenario assumptions support it.
- Generate a timed action plan and announcement drafts in English, Hindi and Gujarati.

**Done when:** each recommendation has a visible reason, time and explicit assumption.

### Phase 5 — Surge exercise

- Add a controllable sudden-release scenario.
- Recalculate arrivals, queue pressure, station colors, recommendations, action plan and announcements.
- Keep total modeled riders conserved when the scenario only changes timing.

**Done when:** one action injects a surge and every downstream view updates together.

### Phase 6 — Validate and present

- Replace illustrative capacities, rates, headways and exit locations with operator-approved values where available.
- Tabletop the baseline and surge with station/venue operations stakeholders.
- Compare predicted arrival counts with observed event data.
- Prepare the short demo, model boundaries and pilot-data request.

**Done when:** assumptions are documented and stakeholders can trace each operational recommendation to approved inputs or clearly marked demo assumptions.

## Dependencies and guardrails

- The browser app should remain self-contained and usable offline for the demo.
- Required pilot inputs include station circulation layout and usable widths, gate processing rates, occupancy limits, authorized holding areas, available train capacity/headways, dispatch lead time, staffing and event release patterns.
- Safety-related thresholds and actions require review by the metro operator and venue/station safety teams. Do not present placeholder values as official instructions.
- Preserve a small commit after each completed phase so progress can be pushed and rolled back cleanly.
