# MetroSafe · PS-05 Stadium Surge Desk

MetroSafe is an offline-first prototype for **PS-05: The Stadium Surge**. It takes one event and models one Type 1 side-platform demo station. The 3D station view is schematic; the supplied drawings do not provide surveyed exit coordinates or operating capacities.

## Run it

Open `index.html` in a modern desktop browser with WebGL enabled. No server, package install, network connection or backend is required. The 3D engine is bundled in `vendor/three.min.js`.

## Demo flow

1. Enter the event attendance, end time and expected metro share. The venue is editable too.
2. Choose **Generate crowd plan**. MetroSafe calculates riders and a 120-minute arrival curve for the single demo station.
3. Move the timeline slider or press play. The map recolors the forecourt, concourse and both platforms for the selected minute. The full minute table is below the chart.
4. Review the number of ticket gates, suggested event headway, external holding area and timed runbook.
5. Choose English, Hindi or Gujarati and copy the draft announcement.
6. Choose **Inject a 10-minute surge**. The model shifts 22% of riders from later minutes into a ten-minute pulse, preserves the total rider count, then recalculates the peak, gate plan, train plan, density map, action plan and announcements.
7. Open **How the prototype works** for formulas, limits and assumptions.

## Project files

- `index.html` — event setup, station view, recommendations, chart and runbook.
- `style.css` — responsive control-room interface and density labels.
- `app.js` — Three.js station model, level/exit interaction, and crowd heat overlays.
- `simulator.js` — minute-arrival, queue, train, recommendation, chart, timeline and announcement logic.
- `vendor/three.min.js` — bundled Three.js r128 runtime (MIT licensed).
- `docs/OPERATING_MODEL.md` — detailed model explanation and assumptions.
- `docs/EXECUTION_PLAN.md` — step-by-step build/demo/validation plan.

`requirements (3).txt` belongs to the earlier Python architecture notes; this browser prototype does not use those packages.

## Important boundary

This is a hackathon decision-support demo, not an approved crowd-safety, evacuation, train-dispatch or station-control system. Gate rates, train capacity, headways and zone capacities are illustrative placeholders. Replace them with GMRC-approved values and validate the operating plan with station, train-control, safety and venue teams before any real use. The 3D model is not a surveyed station BIM model.
