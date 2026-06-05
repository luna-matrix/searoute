# AGENTS.md

> **Status: pre-implementation.** This repo currently contains only `PLAN.md`. No `package.json`, source, tests, CI, lint, or `opencode.json` exist yet. Verify with `ls` before assuming any command or path exists.

## Source of truth

`PLAN.md` is the spec — every design, architecture, and interaction decision is captured there. Read it before non-trivial work. Do not duplicate its contents in this file; they will drift.

## Project identity

- Product name: **SeaRoute** (per `PLAN.md:1`). Directory is `distance-calc`; do not rename files/PRs after the directory.
- Purpose: sea-only maritime distance and route tool, map-first.
- Standalone repo, not a workspace. No monorepo, no shared config with sibling directories under the parent.

## What this is, and isn't

This is a design-led product, not a utility. The `PLAN.md` "Wow Checklist" and motion choreography are spec, not aspiration. Ship a polished implementation, not a working-but-bare one. When in tension, design intent wins over schedule.

## Locked stack (from `PLAN.md` Phase 1)

- Build: Vite → SPA, not SSR. Do not reach for Next.js / Remix.
- UI: React 19 + TypeScript (use `"strict": true` in `tsconfig.json`).
- Map: `deck.gl` — `TileLayer`, `GeoJsonLayer`, `ScatterplotLayer`, `PathLayer`, `ArcLayer`, on a `MapView` with pitch + rotation.
- Routing: `searoute-ts` (Eurostat 2025 maritime network — bundled in the JS, not fetched).
- State: Zustand.
- Styling: CSS custom properties for design tokens + **CSS Modules** for component-scoped styles (Vite has first-class support; file-scoped, no runtime cost). Vanilla CSS, CSS-in-JS, and Tailwind are out — don't mix.

If a task seems to need a router, a different state lib, a different map library, or SSR, the answer is to revisit `PLAN.md`, not to add the dep.

## Design constraints agents will forget

- All numeric values (distances, coordinates, time) must use **tabular figures** — no layout shift on value change.
- Every animation must respect `prefers-reduced-motion`. Keyframes live in `PLAN.md` "Animation Library".
- Typography is split: **Inter** for UI, **JetBrains Mono** for numbers. Don't unify them.
- Inter and JetBrains Mono come from the `@fontsource/inter` and `@fontsource/jetbrains-mono` packages — no Google Fonts CDN link.
- Use the "Admiralty Night" tokens from `PLAN.md` "Visual Design System" — don't hardcode hex.

## Performance budget (hard ceilings, from `PLAN.md`)

- TTI < 3s; FCP < 1.5s
- Port search < 100ms; route compute < 1s; transit-port detection < 500ms
- 60 FPS on Apple Silicon, 30+ FPS on mobile
- Initial bundle < 1 MB; total < 4 MB
- The `searoute-ts` maritime network is the most likely budget violator — code-split it (dynamic import on first route compute, not on app boot).
- Tiles are fetched at runtime, not bundled, so tile failure is a real error mode (`PLAN.md:461`) — build the fallback.

## Phasing

`PLAN.md` phases 1→8 are sequential. Don't pull work from a later phase into an earlier one without flagging the conflict. In particular: **multi-leg waypoint support is Phase 5** — don't build an origin/destination-only app; the store, store shape, and route computation need to anticipate waypoints from the start.

Also design for **routing failure** from day one: `searoute-ts` can fail to find a path ("Snap failure", `PLAN.md:436`) and routes can have zero alternatives. The UI and the route layer must both degrade gracefully.

## Persistence

`localStorage` is used for user preferences (recent ports, `PLAN.md:325`). It is **not** for server-synced data — there is no backend. Don't add IndexedDB, don't add a sync layer, don't add auth.

## Open decisions (TBD with the team)

Flag, don't guess:

- **Tile / basemap provider** for dark + satellite (Carto / Stadia / Mapbox / MapTiler — license and API-key implications differ)
- **Unit test runner** (Vitest is the natural pair with Vite, unconfirmed)
- **Lint + format** (ESLint + Prettier are common, not pinned)
- **CI / pre-commit hooks**
- **Hosting / deploy target** (static SPA host — which one?)
- **Trade-partner data source** for the `Port.connections` field and "intelligent destination suggestions" (curated? fetched? Phase 5)
- **Browser support target** (deck.gl needs WebGL 2; Safari versions matter; no target is pinned in `PLAN.md`)
