# Operating model and technical notes

## 1. What the operator sees

The interface has one event form, one station model, and one response summary. It does not search for events, select among stations, fetch live status or assume the drawings contain reliable surveyed dimensions. The form collects event name/venue, expected attendance, end time and metro share.

The initial example is a demo case: 30,000 attendees and 35% expected metro share gives 10,500 metro-bound riders. In this single-station scenario, all 10,500 are assigned to the displayed station. If the input share is a corridor-wide or network-wide figure, that will overstate the station demand until a station-allocation percentage is added.

## 2. Arrival curve by minute

The horizon is 120 minutes after event end. For each minute `t`, a three-wave release weight is calculated:

```text
w(t) = .50·G(t,24,15) + .34·G(t,48,18) + .16·G(t,76,15)
G(t,μ,σ) = exp(-0.5·((t-μ)/σ)^2)
arrivals(t) = integer allocation of riders × w(t) / Σw
```

Largest-remainder rounding allocates the integer rider total across minutes without dropping or creating riders. The arrival profile is a visible, editable prototype assumption, not a measured Ahmedabad event curve.

### Surge

The surge button moves 22% of estimated riders from baseline minutes outside the selected window into that ten-minute pulse. This works at early and late surge times and does not change attendance or the total modeled rider count. The selected pulse start is a minute after event end. It tests the consequence of compression; it is not a probability forecast.

## 3. Per-minute station flow

For every minute, the simulation updates these queues:

1. **External forecourt** receives that minute's arrivals.
2. **Ticket gates** admit up to `open gates × 58 passengers/minute`. The prototype prepares between 2 and 8 gates based on the maximum near-term arrival minute plus a small backlog allowance.
3. **Concourse** receives gate flow. At most 220 people/minute are moved down the modeled stairs. People remaining in this queue stay in the concourse counter.
4. **Platforms** receive stair flow, split 52%/48% across the side platforms with whole-person rounding.
5. **Trains** arrive on the suggested headway and board up to 650 modeled passengers at a service time. Boarding is allocated proportionally between the two platforms.

Prototype zone thresholds used for heat-map color are forecourt 1,800, concourse 850 and both platforms combined 1,200 people. Below 50% is green, 50–80% amber, and 80% or above red. These values only make the demo legible; they are not published or approved capacities for any actual station.

## 4. Recommendation rules

- The peak is the maximum rolling five-minute average of arrivals.
- Gate recommendation is `ceil(peak rate / 58)` clamped to 2–8. If peak exceeds the assumed maximum gate flow, the summary calls this out and recommends external metering rather than pushing excess into the station.
- Base headway is six minutes. The illustrative rule suggests four minutes at 175+ arrivals/minute and three minutes at 300+ arrivals/minute.
- Holding is always outside at the designated schematic forecourt. Holding must never block stairs, lift landings, fare-gate throats or platforms.
- The runbook schedules team preparation, gate readiness, peak staffing, train-control coordination, holding-area metering, rechecks, surge response and a staged stand-down.

Every capacity and threshold is exposed in this guide and in the UI. A real operation must use values approved by the station operator and train control, with a reviewed incident command plan.

## 5. 3D density view

The existing station geometry is divided into street, concourse and platform groups. Four semi-transparent floor patches receive the current minute's occupancies: outside forecourt, concourse queue, platform 1 and platform 2. The material changes green/amber/red against each zone's prototype threshold. The timeline slider selects one of 120 minutes; play advances through the two-hour scenario. Exit markers remain visible; labels for individual modeled fixtures are removed to keep the view clear. The outside legend and minute log explain the modeled zones.

This is an area-level heat overlay. It does not render individual people, calculate local density in people/m², model opposing flows, infer crush risk, or read CCTV/AFC sensors.

## 6. Announcements

The English, Hindi and Gujarati scripts are local templates populated with event, venue, gate count and suggested train headway. They are drafts for an operator to review. The prototype does not machine-translate arbitrary text or broadcast announcements.

## 7. Data and validation required for a pilot

- Station-specific pedestrian network, accurate floor plans, usable clear widths and accessible routes.
- AFC/turnstile counts and measured service rates by gate type and operating mode.
- Platform and concourse approved occupancy limits and dwell-time observations.
- Venue exit/release schedule, historical event curves, and the share of event riders assigned to this station.
- Current train timetable, train capacity by consist, spare capacity, control-room lead time and dispatch constraints.
- Actual holding-area capacity, barriers, approach roads, emergency access, staffing and command/escalation responsibilities.
- A station-operator tabletop exercise and validation against observed counts before any operational pilot.

## 8. Why these guardrails exist

PS-05 asks for event details, minute-by-minute crowd planning, gates, holding, train additions and Gujarati/Hindi/English announcements. The participant brief says offline operation is not required, but warns that connectivity can drop during the event, so this prototype remains self-contained.

A government Metro Railway Disaster Management Manual lists entry/exit points, areas near ticketing and platform gates, stairs/lifts and platforms among potential crowd-risk locations. A separate Government of India railways release describes outside holding areas and controlled access in a rail-station festival context. Those examples support the prototype's conservative guardrail of keeping queues away from stairs and platforms; neither document approves this station layout, the model's capacities or these particular actions.

## 9. Decision-support boundary

The system is rule-based and deterministic. It has no AI/ML component and no operator system integration. Recommendations are scenario prompts only. Do not use the current prototype to authorize extra trains, restrict public entry, declare an emergency threshold or direct real passenger movement.
