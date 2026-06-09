# SeaRoute

**Sea-only maritime distance and route tool — map-first.**

A design-led product for computing, visualising, and comparing sea routes between any two ports worldwide. Built as a single-page application with a 3D globe, curated route alternatives, and detailed voyage breakdowns.

![Tech stack: Vite + React 19 + TypeScript + deck.gl + searoute-ts + Zustand](https://img.shields.io/badge/stack-Vite%20%2B%20React%2019%20%2B%20deck.gl%20%2B%20searoute--ts-blue)

---

## Quick start

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # production build in dist/
```

**Requirements**: Node.js 18+.

---

## What it does

1. **Search** for any port worldwide (397 ports across 19 maritime regions) with fuzzy search and keyboard navigation.
2. **Set an origin and destination** — click ports on the map, use the search bar, or use the popover.
3. **View the computed sea route** drawn as a continuous path on the 3D globe or flat Mercator map.
4. **Compare alternatives** — Malacca vs Sunda/Lombok, Suez vs Cape of Good Hope, Panama vs Cape Horn.
5. **See the voyage breakdown** — distance, sailing time at adjustable speed, per-sector distances with named chokepoints.
6. **Customise the map** — toggle labels, grid lines, shipping lanes, and more from the Settings panel.

---

## Architecture

### Stack

| Layer   | Technology                                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| Build   | Vite 5 (SPA, no SSR)                                                                                          |
| UI      | React 19 + TypeScript `strict`                                                                                |
| Map     | deck.gl 9 (`GlobeView`, `MapView`, `TileLayer`, `GeoJsonLayer`, `ScatterplotLayer`, `PathLayer`, `TextLayer`) |
| Routing | searoute-ts v2 (Eurostat `marnet_plus_100km` maritime network, code-split)                                    |
| State   | Zustand (single store + `persist` middleware for settings)                                                    |
| Search  | fuzzysort (3 KB gzip, fzf-style ranking)                                                                      |
| Styling | CSS custom properties (Admiralty Night/Day design tokens) + CSS Modules                                       |
| Fonts   | Inter (UI) + JetBrains Mono (numbers), Latin + Latin-Extended subsets                                         |

### Project structure

```
src/
├── data/           # Ports dataset (397 ports), map labels (130+ labels), shipping lanes
├── features/
│   ├── map/        # MapCanvas, controls, legend, settings, basemaps, label engine
│   ├── routing/    # RoutePanel, voyage segments, curated alternatives, route trace
│   ├── search/     # SearchBar, fuzzy port search, common destinations
│   └── port-detail/# PortDetailSheet, PortDetailPopover
├── lib/            # Cross-feature utilities (searoute wrapper)
├── store/          # Zustand store (map state + settings)
├── styles/         # Design tokens, typography, reset, scrollbar, glass panels
└── types/          # Shared TypeScript types (Port, regions)
public/
└── data/           # Static GeoJSON (continents at 1:50M scale)
```

### Data pipeline

```
User picks origin + destination
        │
        ▼
MapCanvas useEffect fires
        │
        ├── No waypoints → computeCuratedAlternatives()
        │       ├── seaRoute(baseline)
        │       ├── seaRoute(Malacca restriction)
        │       ├── seaRoute(Panama restriction)
        │       └── seaRoute(Cape restriction, optional)
        │
        └── Waypoints → seaRouteMulti(points)
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

### Labelling engine

```
MAP_LABELS (130+ curated entries)
        │
        ▼
computeMapLabels() in label-engine.ts
        ├── Category filtering (land/water/channel/feature/island)
        ├── Zoom gating (smooth fade-in, not hard cutoffs)
        ├── Distance-from-center fading (labels at viewport edge are dimmer)
        ├── Collision avoidance (geographic proximity greedy algorithm)
        └── Returns LabelRenderData[] with pre-computed size/color/visibility
                │
                ▼
        TextLayer renders only visible labels with per-glyph accessors
```

---

## Performance budget

| Metric                 | Target      | Status                             |
| ---------------------- | ----------- | ---------------------------------- |
| TTI                    | < 3s        | ✓                                  |
| FCP                    | < 1.5s      | ✓                                  |
| Initial JS (gzip)      | < 1 MB      | ✓ (331 KB)                         |
| Total JS (gzip)        | < 4 MB      | ✓ (495 KB)                         |
| Port search            | < 100ms     | ✓ (fuzzysort, 397 ports)           |
| Route compute          | < 1s        | ✓ (searoute-ts Dijkstra)           |
| Transit port detection | < 500ms     | ✓ (haversine + land-crossing)      |
| searoute-ts chunk      | Lazy-loaded | ✓ (manualChunks in vite.config.ts) |

---

## Key design decisions

- **Pacific-centered default view** (longitude 150, latitude 20) — trans-Pacific routes read as continuous horizontal lines, not edge-wrapping artifacts.
- **No antimeridian splitting** — the globe draws rich-circle arcs naturally; the flat map shifts coordinates to [0, 360] space with `MapView repeat: true`.
- **Curated alternatives, not library defaults** — `computeCuratedAlternatives` calls `seaRoute` in parallel with explicit restrictions. The library's `seaRouteAlternatives` silently drops infeasible variants.
- **Two themes only** — Admiralty Night (dark) and Admiralty Day (light parchment). Three-state chooser: dark / light / system.
- **All numeric values use tabular figures** — JetBrains Mono + `font-variant-numeric: tabular-nums` prevents layout shift.
- **Every animation respects `prefers-reduced-motion`** — duration tokens are zeroed under the media query.

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
