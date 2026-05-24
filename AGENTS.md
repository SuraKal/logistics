# AGENTS.md

## Project Overview

This repository is a standalone Vite + React 18 logistics dashboard.

The app is page-driven CRUD with local demo persistence:

- Route screens live in `src/pages/`
- Shared UI primitives live in `src/components/ui/`
- App-specific helpers live in `src/components/`
- Local demo data and persistence live in `src/lib/seed-data.js` and `src/lib/local-client.js`
- Entity schema/reference files live in `entities/` and intentionally remain JSON

There is no Base44 dependency or hosted backend in the current app. Data is stored in browser `localStorage` through the local client.

## Where To Start

When adding or changing a feature, inspect files in this order:

1. `src/App.jsx`
2. `src/lib/AuthContext.jsx`
3. `src/lib/local-client.js`
4. The relevant `entities/*.json` schema/reference file
5. The matching page in `src/pages/`
6. Shared helpers in `src/components/`

## Current Route Map

- `/` -> `src/pages/Dashboard.jsx`
- `/vehicles` -> `src/pages/Vehicles.jsx`
- `/vehicles/:id` -> `src/pages/VehicleDetail.jsx`
- `/garage-sessions` -> `src/pages/GarageSessions.jsx`
- `/garage-sessions/:id` -> `src/pages/ServiceSessionDetail.jsx`
- `/trips` -> `src/pages/Trips.jsx`
- `/trips/:id` -> `src/pages/TripDetail.jsx`
- `/drivers` -> `src/pages/Drivers.jsx`
- `/notifications` -> `src/pages/Notifications.jsx`
- `*` -> `src/lib/PageNotFound.jsx`

`src/pages/Users.jsx` exists but is not routed.

## Important Runtime Files

- `src/main.jsx`: mounts the app and global CSS
- `src/App.jsx`: app shell, routing, query provider, auth provider
- `src/lib/AuthContext.jsx`: local demo auth state
- `src/lib/local-client.js`: local CRUD client and demo session helpers
- `src/lib/seed-data.js`: initial fleet/demo records
- `src/lib/query-client.js`: React Query client config
- `src/index.css`: global styles and Tailwind layers
- `vite.config.js`: React + alias config

## Data Access Pattern

The local client mirrors the old CRUD shape:

- `appClient.entities.EntityName.list()`
- `appClient.entities.EntityName.list("-created_date", limit)`
- `appClient.entities.EntityName.filter({ field: value })`
- `appClient.entities.EntityName.get(id)`
- `appClient.entities.EntityName.create(payload)`
- `appClient.entities.EntityName.update(id, payload)`

Data persists in browser `localStorage`. Resetting local storage resets the demo dataset.

## Entity Notes

The `entities/*.json` files are plain JSON reference files by choice. They are not runtime-generated and do not need to be converted unless a future feature specifically requires another format.

## UI / Styling Conventions

- Tailwind is the main styling mechanism
- Shared status rendering is centralized in `src/components/StatusBadge.jsx`
- Inputs, dialogs, labels, buttons, selects, and textareas come from `src/components/ui/`

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run lint:fix`
- `npm run typecheck`
- `npm run preview`

## Validation Reality

Current practical validation steps:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`

At the time of this update, the standalone app passes all three commands.

## Notes For Future Codex Agents

- Keep the app backend-free unless the user explicitly asks for a real API
- Prefer preserving the existing page-level CRUD pattern
- Keep `entities/*.json` as JSON unless there is a concrete need to rename or reformat them
- If you add new demo entities, seed them in `src/lib/seed-data.js`
