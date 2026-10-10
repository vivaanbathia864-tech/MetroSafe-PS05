# Phase 1 baseline record

## Project baseline

- Working folder: `C:\Users\vivaa\Desktop\MetroSafe`
- Git branch: `main`, tracking `origin/main`
- App entry point: `index.html`
- Offline 3D runtime: `vendor/three.min.js`
- Main files: `style.css`, `app.js`, `simulator.js`
- No external script, stylesheet, font, map tile or API URL is referenced by the app shell. Its CSS, Three.js runtime and app scripts are loaded from files beside `index.html`.
- The user previously confirmed the station model loaded in a browser. The Desktop copy passes the same local-file dependency audit. A final open-from-Desktop check with the network disconnected is still to be confirmed on the target browser.

## What the supplied drawings establish

The provided station-planning sheet images show a Type 1 side-platform station, ground and platform plans, a concourse plan, and station elevations/sections. These are planning drawings supplied as screenshots; this prototype does not read them as a surveyed BIM/CAD model.

The drawings support the broad arrangement used in the model: two side platforms around the track zone, a concourse level, vertical circulation between levels, and street access. They do not establish surveyed model coordinates, operating capacities, live crowd data, or approved crowd-control rules.

## What the 3D model assumes

- One schematic station and one event only.
- Two side platforms and two tracks.
- A concourse above the platforms, with modeled stairs and accessible lifts.
- Four illustrative surface access markers A–D, placed northwest/northeast/southwest/southeast in the model. Those names, orientation and exact positions are interface labels for the demo; the drawings do not identify official exit names or confirm these coordinates.
- A surface forecourt, gate area, waiting areas, canopies, stairs, lifts and platform furniture drawn to communicate circulation, not actual dimensions.
- Gate rates, zone capacities, passenger flows and train headways are illustrative scenario inputs, not operator-approved limits.

## Phase 1 evidence and remaining check

- [x] Desktop project folder exists and contains the browser app plus bundled engine.
- [x] App shell points to local CSS/JavaScript and a local Three.js file; no network asset is required to start the app.
- [x] Git remote and initial `main` checkpoints are in place.
- [x] Drawing/model boundary and schematic exit labels are documented here.
- [ ] Open `C:\Users\vivaa\Desktop\MetroSafe\index.html` in the target browser with internet disconnected and confirm the model renders.

When the last check is confirmed, mark Phase 1 complete in `EXECUTION_PLAN.md` and make the next small Git checkpoint.
