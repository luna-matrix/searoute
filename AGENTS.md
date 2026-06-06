# AGENTS.md

> **Status: Phases 1–3 complete.** Vite + React 19 + TS scaffold, ESLint + Prettier + Husky pre-commit, deck.gl + searoute-ts + zustand with the searoute-ts code-split, 328-port dataset, 22 shipping lanes with a structural validator, Admiralty Night design tokens, the dark + satellite globe, the SearchBar with fuzzy search + keyboard nav, the PortDetailSheet + PortDetailPopover, and the origin/destination flow with click-to-set. Dev server: `npm run dev` → http://localhost:5173.

## Source of truth

`PLAN.md` is the spec — every design, architecture, and interaction decision is captured there. Read it before non-trivial work. Do not duplicate its contents in this file; they will drift.

## Project identity

- Product name: **SeaRoute** (per `PLAN.md:1`). Directory is `distance-calc`; do not rename files/PRs after the directory.
- Purpose: sea-only maritime distance and route tool, map-first.
- Standalone repo, not a workspace. No monorepo, no shared config with sibling directories under the parent.

## What this is, and isn't

This is a design-led product, not a utility. The `PLAN.md` "Wow Checklist" and motion choreography are spec, not aspiration. Ship a polished implementation, not a working-but-bare one. When in tension, design intent wins over schedule.

## Locked stack

- Build: Vite → SPA, not SSR. Do not reach for Next.js / Remix.
- UI: React 19 + TypeScript (`"strict": true` + `verbatimModuleSyntax` + `erasableSyntaxOnly` in `tsconfig.app.json`).
- Map: `deck.gl` (`@deck.gl/core`, `@deck.gl/react`, `@deck.gl/layers`, `@deck.gl/geo-layers`) — `TileLayer`, `GeoJsonLayer`, `ScatterplotLayer`, on a `MapView` with pitch + rotation. (`PathLayer` / `ArcLayer` are reserved for Phase 4.)
- Routing: `searoute-ts` v2 (Eurostat `marnet_plus_100km` maritime network — bundled in the JS, code-split via `src/lib/searoute.ts` so it only loads on first route compute, Phase 4+).
- State: Zustand, single store in `src/store/map.ts`.
- Styling: CSS custom properties for design tokens (`src/styles/tokens.css`) + **CSS Modules** for component-scoped styles (Vite has first-class support; file-scoped, no runtime cost). Vanilla CSS, CSS-in-JS, and Tailwind are out — don't mix.
- Fuzzy search: `fuzzysort` (3 KB gzip, fzf-style ranking, built-in HTML highlighting).
- Validation: `tsx` runs the data validator (`npm run validate:data`) — catches malformed JSON that TypeScript types can't see.

If a task seems to need a router, a different state lib, a different map library, or SSR, the answer is to revisit `PLAN.md`, not to add the dep.

## Design constraints agents will forget

- All numeric values (distances, coordinates, time) must use **tabular figures** — no layout shift on value change. The `.num` utility class in `src/styles/typography.css` applies JetBrains Mono + `font-variant-numeric: tabular-nums` + `-0.02em` letter-spacing.
- Every animation must respect `prefers-reduced-motion`. The duration tokens in `tokens.css` are zeroed under that media query, so any animation referencing `var(--duration-*)` is automatically disabled.
- Typography is split: **Inter** for UI, **JetBrains Mono** for numbers. Don't unify them.
- Inter and JetBrains Mono come from `@fontsource/inter` and `@fontsource/jetbrains-mono` — **Latin + Latin-Extended subsets only** (no CJK / Cyrillic / Greek / Arabic; not enough port data to justify the cost). `src/main.tsx` has the imports.
- Use the "Admiralty Night" tokens from `PLAN.md` "Visual Design System" — don't hardcode hex. `src/features/map/lib/port-styles.ts` and `shipping-lane-styles.ts` duplicate a few color values for deck.gl (which can't read CSS variables); if the token values change, update there too.

## Performance budget (hard ceilings, from `PLAN.md`)

- TTI < 3s; FCP < 1.5s
- Port search < 100ms; route compute < 1s; transit-port detection < 500ms
- 60 FPS on Apple Silicon, 30+ FPS on mobile
- Initial bundle < 1 MB; total < 4 MB
- The `searoute-ts` maritime network is the most likely budget violator — code-split it (dynamic import on first route compute, not on app boot). Verified in chunk 1.3: when reachable, the lazy chunk is 165 KB gzip; the initial bundle stays at ~60 KB gzip without it.
- Tiles are fetched at runtime, not bundled, so tile failure is a real error mode (`PLAN.md:461`) — the basemap layer should degrade gracefully. (Fallback UI is Phase 8 polish.)
- Current build (Phase 3): 306 KB gzip initial JS, 4.6 KB gzip initial CSS, ~250 KB woff2 (Latin + Latin-Extended fonts). Well under the 1 MB initial budget. Vite's 500 KB raw-chunk warning is informational — addressed in Phase 8.

## Phasing

`PLAN.md` phases 1→8 are sequential. Don't pull work from a later phase into an earlier one without flagging the conflict. In particular: **multi-leg waypoint support is Phase 5** — the store and route computation need to anticipate waypoints from the start (current store has `originId` / `destinationId`; `waypoints` will join in 5.1).

Also design for **routing failure** from day one: `searoute-ts` can fail to find a path (`SnapFailedError`, `NoRouteError`) and routes can have zero alternatives. The UI and the route layer must both degrade gracefully — Phase 4's `RoutePanel` will own most of this.

### Phase status

| Phase | Status | Notes |
|---|---|---|
| 1 Foundation | ✅ done | scaffold, lint, locked deps, design tokens, port dataset, shipping lanes |
| 2 The Globe | ✅ done | MapCanvas, basemaps, ports + lanes layers, CompassRose, MapControls, flyTo + pulse |
| 3 Search & Explore | ✅ done | SearchBar, fuzzy search, keyboard nav, origin/destination markers, PortDetailSheet, PortDetailPopover |
| 4 Route Intelligence | 🔜 next | searoute-ts integration, PathLayer, transit detection, HeroDistance, VoyageTimeline, SailingTime, RoutePanel |
| 5 Multi-leg & Fallback | pending | waypoints, seaRouteMulti, snap-failure UI, smart destination suggestions |
| 6 Interaction Polish | pending | micro-interactions M1–M14, route trace animation, transit bloom, speed snap points, tile cross-fade, toasts, a11y pass |
| 7 Responsive & Touch | pending | breakpoints, mobile bottom sheet, gestures, touch targets, orientation, CSS containment |
| 8 Polish & Ship | pending | loading/empty/error states, reduced-motion, bundle optimization, Lighthouse, deploy |

## Persistence

`localStorage` is used for user preferences (recent ports, `PLAN.md:325`). It is **not** for server-synced data — there is no backend. Don't add IndexedDB, don't add a sync layer, don't add auth.

## Open decisions (TBD with the team)

Resolved (move out as Phase 4+ lands):

- ~~Tile / basemap provider~~ — **Carto `dark-matter` for dark, ESRI World Imagery for satellite**, both API-key-free, in `src/features/map/lib/basemaps.ts`. To switch providers (Stadia, Mapbox, MapTiler), edit that file.
- ~~Lint + format~~ — **ESLint 9 flat config + Prettier 3**, wired in chunk 1.2.
- ~~CI / pre-commit hooks~~ — **Husky + lint-staged**, the pre-commit hook runs `eslint --fix` and `prettier --write` on staged files. CI is not yet set up; a Phase 8 decision.

Still open:

- **Unit test runner** (Vitest is the natural pair with Vite, unconfirmed)
- **Hosting / deploy target** (static SPA host — which one?)
- **Trade-partner data source** for the `Port.connections` field and "intelligent destination suggestions" (curated? fetched? Phase 5)
- **Browser support target** (deck.gl needs WebGL 2; Safari versions matter; no target is pinned in `PLAN.md`)

## Conventions worth knowing

- **Imports**: ESM throughout. `@/...` alias resolves to `src/`. No relative paths crossing feature boundaries.
- **Feature folders**: `src/features/{map,search,routing,port-detail}/{components,hooks,lib}`. Components live in `components/`, pure-React hooks in `hooks/`, pure-utility helpers in `lib/`.
- **Cross-feature utilities** in `src/lib/`. Cross-feature UI primitives (planned: `GlassPanel`, `Button`) in `src/shared/components/`.
- **CSS Modules**: every component has a co-located `.module.css`. Use the design tokens (`var(--color-*)`, `var(--space-*)`, `var(--duration-*)`, etc.) — no hardcoded hex / px values.
- **Tooltip state**: lane tooltips use deck.gl's `getTooltip`; port hovers use a React `PortDetailPopover` positioned at the deck.gl pick point. Don't add a third mechanism.
- **Hover state** for the popover lives in `MapCanvas` (`useState<HoverState | null>`). Not in the Zustand store — it's UI state, not domain state.
- **`dangerouslySetInnerHTML` is used for fuzzysort-highlighted port names in the search dropdown.** fuzzysort escapes source text so this is safe; the alternative is a per-character splitter. Document the assumption if you add another use.
- **Don't add CSS classes in the global stylesheet** — every component owns its own `.module.css`. The global stylesheet (`src/styles/*`) holds only design tokens, reset, typography, scrollbar, and glass.
- **Vite 500 KB chunk warning** is fine for now; deck.gl alone is 220 KB gzip. Phase 8 is the right time to address it.
