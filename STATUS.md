# SeaRoute — Project Status

> Last updated: 2026-06-09

---

## Phase completion

| Phase | Name                                                                                     | Status      |
| ----- | ---------------------------------------------------------------------------------------- | ----------- |
| 1     | Foundation — scaffold, lint, design tokens, data                                         | ✅ Complete |
| 2     | The Globe — MapCanvas, basemaps, ports + lanes, CompassRose, MapControls                 | ✅ Complete |
| 3     | Search & Explore — SearchBar, fuzzy search, origin/destination, PortDetailSheet          | ✅ Complete |
| 4     | Route Intelligence — searoute-ts, PathLayer, transit detection, RoutePanel, alternatives | ✅ Complete |
| 5     | Multi-leg & Fallback — waypoints, seaRouteMulti, snap-failure UI                         | ✅ Complete |
| 6     | Interaction Polish — label engine, grid lines, settings panel, text scaling, panel fixes | ✅ Complete |
| 7     | Responsive & Touch — breakpoints, mobile bottom sheet, touch gestures                    | 🔜 Planned  |
| 8     | Polish & Ship — loading/empty/error states, bundle optimisation, Lighthouse, deploy      | 🔜 Planned  |

---

## Build metrics

| Metric                                | Value   |
| ------------------------------------- | ------- |
| Initial JS (gzip)                     | 331 KB  |
| Lazy searoute chunk (gzip)            | 165 KB  |
| Initial CSS (gzip)                    | 7.6 KB  |
| Fonts (woff2, Latin + Latin-Extended) | ~250 KB |
| Total modules                         | 1,510   |
| Build time                            | ~1.5s   |

---

## Component inventory

### Map layers (rendered in order)

| #   | Layer                  | ID                   | Type                    | Gate                              |
| --- | ---------------------- | -------------------- | ----------------------- | --------------------------------- |
| 1   | Basemap tiles          | `basemap-${id}`      | TileLayer + BitmapLayer | Always                            |
| 2   | Continent outlines     | `continents`         | GeoJsonLayer            | `mapLayers.showContinentOutlines` |
| 3   | Lat/lon grid           | `grid-lines`         | PathLayer               | `grid.showGrid`                   |
| 4   | Reference lines        | `reference-lines`    | PathLayer               | `mapLayers.showReferenceLines`    |
| 5   | Shipping lanes         | `shipping-lanes`     | GeoJsonLayer            | `mapLayers.showShippingLanes`     |
| 6   | Map labels             | `country-labels`     | TextLayer               | Per-category via settings         |
| 7   | Route path             | `route`              | PathLayer               | `showRouteLayer`                  |
| 8   | Route trace (animated) | `route-trace`        | PathLayer               | `routeDisplay.showTraceAnimation` |
| 9   | Trace head dot         | `route-trace-head`   | ScatterplotLayer        | `routeDisplay.showTraceAnimation` |
| 10  | All ports              | `ports`              | ScatterplotLayer        | Always                            |
| 11  | Origin + destination   | `origin-destination` | ScatterplotLayer        | When O/D set                      |
| 12  | Waypoints              | `waypoints`          | ScatterplotLayer        | When waypoints set                |
| 13  | Along-route ports      | `along-route-ports`  | ScatterplotLayer        | `showAlongRoutePortLayer`         |
| 14  | Port labels            | `port-labels`        | TextLayer               | `label.showPortLabels`            |

### UI panels

| Panel             | Position    | Z-index | Visibility                                            |
| ----------------- | ----------- | ------- | ----------------------------------------------------- |
| SearchBar         | Top-left    | 30      | Always                                                |
| CompassRose       | Top-right   | 20      | Always                                                |
| RoutePanel        | Right       | 40      | When route active, not hidden by settings/port detail |
| PortDetailSheet   | Right       | 40      | When port selected                                    |
| SettingsPanel     | Right       | 41      | When gear icon clicked                                |
| MapLegend         | Bottom-left | 20      | Always (collapsible)                                  |
| MapControls       | Bottom-left | 20      | Always                                                |
| PortDetailPopover | Floating    | 45      | On port hover                                         |

---

## Data inventory

| Dataset             | Size                   | Source                                                    |
| ------------------- | ---------------------- | --------------------------------------------------------- |
| Ports (397)         | 5,098 lines TS         | Curated from UN/LOCODE, world port databases              |
| Map labels (132)    | 210 lines TS           | Countries, oceans, seas, straits, trenches, island groups |
| Shipping lanes (22) | 1,529 lines JSON       | Major maritime corridors                                  |
| Continent outlines  | 1.6 MB GeoJSON         | Natural Earth 1:50M (`ne_50m_land`)                       |
| Maritime network    | Bundled in searoute-ts | Eurostat `marnet_plus_100km`                              |

---

## Known issues & deferred work

### Phase 7 (Responsive & Touch)

- No responsive breakpoints — panels are fixed-width at 360px/400px
- No mobile bottom sheet — RoutePanel and SettingsPanel don't adapt to small screens
- No touch gesture handling for panel swipe-to-dismiss
- No CSS containment for paint/layout isolation

### Phase 8 (Polish & Ship)

- No loading state on initial app boot (blank screen while fonts/JS load)
- No toast notification system (defined z-index token unused)
- No retry button on route computation failure
- No reset-to-defaults button in SettingsPanel
- Bundle chunk warning for deck.gl (220 KB gzip) — addressed in Phase 8
- Lighthouse audit not yet performed
- No CI/CD pipeline configured

### Known minor issues

- `WebMercatorViewport.fitBounds` in route framing effect uses stale `viewState` closure (intentional — re-framing on every pan would be jarring)
- `useCountUp` animation has a one-frame glitch with React 18 Strict Mode double-mount (development only)
- No waypoint overflow scroll containment (deferred — needs wrapper element to avoid clipping dropdown)
- Compass rose may overlap RoutePanel on narrow screens (responsive design task)

---

## Settings persistence

Settings are persisted to `localStorage` under the key `searoute-settings` via Zustand's `persist` middleware. Only settings state is persisted — domain state (ports, routes, waypoints) is ephemeral.

| Storage key         | Content                                           | Managed by      |
| ------------------- | ------------------------------------------------- | --------------- |
| `searoute-settings` | Label, grid, map layer, route display preferences | Zustand persist |
| `searoute-theme`    | Theme preference (dark/light/system)              | useTheme hook   |

---

## Browser support

- Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- Requires WebGL 2.0 (deck.gl)
- Retina/HiDPI displays fully supported (`useDevicePixels: true`)
- `prefers-reduced-motion` honoured globally
- `prefers-color-scheme` honoured for theme auto-detection

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run format:check # Prettier check
npm run build        # Production build
npm run validate:data # Validate port + shipping lane data
```

Pre-commit hooks run `eslint --fix` and `prettier --write` on staged files via Husky + lint-staged.
