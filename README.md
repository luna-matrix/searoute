# SeaRoute

**Sea-only maritime distance and route tool — map-first.**

A design-led product for computing, visualising, and comparing sea routes between any two portsworldwide. Built as a single-page application with a 3D globe, curated route alternatives, detailed voyage breakdowns, and GHG distance estimates for emissions auditing.

![Tech stack: Vite + React 19 + TypeScript + deck.gl + searoute-ts + Zustand](https://img.shields.io/badge/stack-Vite%20%2B%20React%2019%20%2B%20deck.gl%20%2B%20searoute--ts-blue)

---

## Quick start

```bash
npm install
npm run dev        # -> http://localhost:5173
npm run build      # production build in dist/
npm run lint       # ESLint + Prettier check
npm run validate:data  # validate port dataset JSON
```

**Requirements**: Node.js 18+.

---

## What it does

1. **Search** for any port worldwide (1,384 ports across 19 maritime regions) with fuzzy search, keyboard navigation, and common destination suggestions.
2. **Set an origin and destination** — click ports on the map, use the search bar, or use the hover popover.
3. **View the computed sea route** drawn as a continuous path on the 3D globe or flat Mercator map, with a sonar-line trace animation.
4. **Compare alternatives** — Malacca vs Sunda/Lombok, Suez vs Cape of Good Hope, Panama vs Cape Horn. All alternatives shown by default.
5. **See the voyage breakdown** — distance, sailing time at adjustable speed, per-sector distances with named chokepoints, and a visual gutter timeline.
6. **Export the voyage report** — full audit report (IMO DCS compliant with GHG distance estimate and MEPC.338(76) citation) or compact summary. Download as TXT or copy to clipboard.
7. **Customise the map** — toggle labels, grid lines, shipping lanes, reference lines, and more from the Settings panel. Three basemaps: dark, light, satellite.

---

## Features

### Map & Globe

- **3D globe** (GlobeView) and **flat Mercator** (MapView) with seamless toggle
- **Perspective tilt** on flat map for a 3D look
- **Three basemaps**: Carto dark, Carto light, ESRI satellite — auto-synced to theme
- **Globe launch animation** — materializes from void with blur + scale
- **Idle auto-rotate** — globe slowly drifts after 30s of inactivity
- **Compass rose** — nautical SVG with fleur-de-lis N marker, rotates with map bearing
- **Depth-tested labels** — labels on the back of the globe are properly occluded

### Labels & Cartography

- **Curated map labels** — 156 labels across 5 categories: land, water, channel, feature, island
- **Channel/strait labels** — offset from geographic position with leader lines, light font weight, slight rotation
- **Dynamic port labels** — three priority tiers with zoom-gated visibility:
  - **Hero** (origin/destination): always visible, largest text, positioned to the right of the pin
  - **Waypoint**: fades in at medium zoom, staggered reveal
  - **Transit**: fades in at higher zoom, smallest text, 100ms bloom stagger
- **Collision avoidance** — diagonal pixel offset pushes overlapping labels apart; waypoints are never hidden
- **Vicinity deduplication** — transit ports within 50 km are clustered, keeping the most important 1-2
- **Route distance labels** — cumulative nm annotations at 25%, 50%, 75% along the route path

### Routing

- **Curated alternatives** — parallel computation of baseline, Malacca, Sunda, Panama, and Cape routes
- **Multi-leg waypoints** — add intermediate stops via `seaRouteMulti`
- **Transit port detection** — Major + Intermediate ports within 50 nm of the route, with land-crossing gate
- **Route trace animation** — sonar-line draw-on with glowing head dot (1,500ms ease-out)
- **Speed slider** — snap points at 12, 15, 19, 22, 25 knots with gradient track

### Port Details

- **Port detail sheet** — depths, max vessel dimensions, restrictions, region, UN/LOCODE
- **Port detail popover** — hover on map marker for quick info + Set as Origin/Destination/Waypoint
- **1,384-port dataset** with Major/Intermediate/Minor sizes

### Reports & Export

- **Full audit report** — 76-column formatted text with 6 sections:
  1. Voyage Summary (with GHG distance estimate)
  2. Segment Breakdown (distance, time, percentage)
  3. Waypoint Coordinates (with UN/LOCODE and size class)
  4. Port Details (depths, vessel limits, restrictions)
  5. Alternative Routes (with delta vs selected)
  6. Methodology & Assumptions (IMO MEPC.338(76) citation)
- **Quick summary** — compact ~30-line format for clipboard
- **Mode toggle** — switch between Full Report and Summary before export

### Theming

- **Admiralty Night** (dark) — deep chart navy, like a digital chart table
- **Admiralty Day** (light) — warm parchment, like a paper admiralty chart
- **System mode** — follows OS preference
- All deck.gl layer colors are theme-aware with WCAG AA contrast ratios

---

## Architecture

### Stack

| Layer   | Technology                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| Build   | Vite 5 (SPA, no SSR)                                                                                          |
| UI      | React 19 + TypeScript `strict` + `verbatimModuleSyntax` + `erasableSyntaxOnly`                                |
| Map     | deck.gl 9 (`GlobeView`, `MapView`, `TileLayer`, `GeoJsonLayer`, `ScatterplotLayer`, `PathLayer`, `TextLayer`) |
| Routing | searoute-ts v2 (Eurostat `marnet_plus_100km` maritime network, code-split via dynamic import)                 |
| State   | Zustand (single store + `persist` middleware for settings)                                                    |
| Search  | fuzzysort (3 KB gzip, fzf-style ranking, built-in HTML highlighting)                                          |
| Styling | CSS custom properties (Admiralty Night/Day design tokens) + CSS Modules                                       |
| Fonts   | Inter (UI) + JetBrains Mono (numbers), Latin + Latin-Extended subsets via @fontsource                         |

### Project structure

```
src/
├── data/               # Ports dataset (1,384 ports), map labels (156 labels), shipping lanes
├── features/
│   ├── map/            # MapCanvas, controls, legend, settings, basemaps, label engine
│   │   ├── components/ # MapCanvas, MapControls, CompassRose, MapLegend, SettingsPanel, PortMarker
│   │   ├── hooks/      # useTheme, useRouteTrace
│   │   └── lib/        # label-engine, label-styles, port-styles, route-styles, basemaps, grid-lines,
│   │                   # transit-detection, point-in-polygon, continent-styles, shipping-lane-styles,
│   │                   # reference-lines, label-styles
│   ├── routing/        # RoutePanel, voyage segments, curated alternatives, route trace, reports
│   │   ├── components/ # RoutePanel, ActionBar, VoyageTimeline (deleted - merged into RoutePanel)
│   │   └── lib/        # voyage-segments, curated-alternatives, route-trace, voyage-report
│   ├── search/         # SearchBar, fuzzy port search, common destinations
│   │   ├── components/ # SearchBar
│   │   └── lib/        # port-search
│   └── port-detail/    # PortDetailSheet, PortDetailPopover
│       └── components/ # PortDetailSheet, PortDetailPopover
├── lib/                # Cross-feature utilities (searoute wrapper with code-splitting)
├── shared/
│   └── components/     # Toast notification
├── store/              # Zustand store (map state + settings, persisted to localStorage)
├── styles/             # Design tokens, typography, reset, scrollbar, glass panels
└── types/              # Shared TypeScript types (Port, regions)
public/
└── data/               # Static GeoJSON (continents at 1:50M scale)
```

### Data pipeline

```
User picks origin + destination
        │
        ▼
MapCanvas useEffect fires
        │
        ├── No waypoints -> computeCuratedAlternatives()
        │       ├── seaRoute(baseline)
        │       ├── seaRoute(Malacca restriction)
        │       ├── seaRoute(Panama restriction)
        │       └── seaRoute(Cape restriction, optional)
        │
        └── Waypoints -> seaRouteMulti(points)
                │
                ▼
        Route returned as GeoJSON LineString
                │
                ├── PathLayer renders on globe/flat map
                ├── detectTransitPorts() finds ports within 50 nm
                │       └── Land-crossing gate removes false positives
                ├── computeVoyageSegments() splits into sectors
                └── RoutePanel displays distance, time, breakdown
```

### Label engine

```
MAP_LABELS (156 curated entries)
        │
        ▼
computeMapLabels() in label-engine.ts
        ├── Category filtering (land/water/channel/feature/island)
        ├── Zoom gating (smooth fade-in, not hard cutoffs)
        ├── Distance-from-center fading (labels at viewport edge are dimmer)
        ├── Collision avoidance (geographic proximity greedy algorithm)
        ├── Channel labels: offset position + leader line
        └── Returns LabelRenderData[] with pre-computed size/color/visibility/pixelOffset
                │
                ▼
        TextLayer renders only visible labels with per-glyph accessors

Route port labels (computeAllRoutePortLabels):
        ├── Vicinity deduplication (50 km cluster radius)
        ├── Priority tiers: Hero (always) > Waypoint (zoom 0.6+) > Transit (zoom 1.0+)
        ├── Staggered bloom reveal (100ms per transit port)
        ├── Collision avoidance with diagonal pixel offset
        └── Theme-aware colors for all roles
```

---

## Performance budget

| Metric                 | Target      | Status                             |
| ---------------------- | ----------- | ---------------------------------- |
| TTI                    | < 3s        | ✓                                  |
| FCP                    | < 1.5s      | ✓                                  |
| Initial JS (gzip)      | < 1 MB      | ✓ (374 KB)                         |
| Total JS (gzip)        | < 4 MB      | ✓ (539 KB)                         |
| Port search            | < 100ms     | ✓ (fuzzysort, 1,384 ports)         |
| Route compute          | < 1s        | ✓ (searoute-ts Dijkstra)           |
| Transit port detection | < 500ms     | ✓ (haversine + land-crossing)      |
| searoute-ts chunk      | Lazy-loaded | ✓ (manualChunks in vite.config.ts) |

---

## Key design decisions

- **Pacific-centered default view** (longitude 150, latitude 20) — trans-Pacific routes read as continuous horizontal lines, not edge-wrapping artifacts.
- **No antimeridian splitting** — the globe draws great-circle arcs naturally; the flat map shifts coordinates to [0, 360] space with `MapView repeat: true`.
- **Curated alternatives, not library defaults** — `computeCuratedAlternatives` calls `seaRoute` in parallel with explicit restrictions. The library's `seaRouteAlternatives` silently drops infeasible variants.
- **Two themes only** — Admiralty Night (dark) and Admiralty Day (light parchment). Three-state chooser: dark / light / system.
- **All numeric values use tabular figures** — JetBrains Mono + `font-variant-numeric: tabular-nums` prevents layout shift.
- **Every animation respects `prefers-reduced-motion`** — duration tokens are zeroed under the media query.
- **deck.gl layers can't read CSS variables** — all layer colors are duplicated as RGBA tuples in `*-styles.ts` files with theme-aware getter functions.
- **searoute-ts is code-split** — the maritime network is ~165 KB gzip and only loads on first route compute, not on app boot.
- **Chart-grid texture on glass panels** — subtle cross-hatch using `repeating-linear-gradient` with the `--color-chart-grid` token.

---

## Locked stack — do not add

- No SSR / Next.js / Remix
- No CSS-in-JS / Tailwind
- No router (React Router)
- No different state library (Zustand only)
- No different map library (deck.gl only)
- No backend / database / IndexedDB

---

## License

Proprietary. See LICENSE.
