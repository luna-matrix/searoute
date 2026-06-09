# SeaRoute — User Manual

## Getting started

Open the app. You'll see a 3D globe centred on the Pacific Ocean with port dots scattered across every continent.

---

## Finding ports

### Way 1 — Search bar (top-left)

Start typing in the **Origin port** field. The fuzzy search finds matching ports as you type. Use arrow keys to navigate, Enter to select.

After selecting an origin, the focus moves to **Destination port**. If you've picked an origin, "Common from [origin]" suggestions appear for quick destination selection.

### Way 2 — Click on the map

Click any port dot on the globe. Your first click sets the **Origin** (green dot). Your second click sets the **Destination** (red dot). The route computes automatically.

### Way 3 — Hover and use the popover

Hover over any port to see its name, country, and size. Click **Set as Origin** or **Set as Destination** from the popover.

---

## Viewing the route

Once both origin and destination are set, the **Route Panel** appears on the right side. It shows:

| Section             | Content                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Voyage**          | Origin → destination with port names, hero distance (nm + km), sailing time                                            |
| **Speed pills**     | Quick speed presets: 12 (slow steam), 15 (eco), 19 (standard), 22 (fast), 25 (max) knots                               |
| **Route Breakdown** | Per-sector distances and times. Sectors are divided at major chokepoints (Malacca Strait, Suez Canal, Gibraltar, etc.) |
| **Alternatives**    | Different route options with distances and deltas from the baseline                                                    |
| **Vessel Speed**    | Collapsible slider for fine-tuning speed                                                                               |
| **Voyage Map**      | Visual timeline showing origin → chokepoint → ... → destination                                                        |

---

## Map controls (bottom-left)

| Button                      | Action                                         |
| --------------------------- | ---------------------------------------------- |
| **+ / −**                   | Zoom in/out                                    |
| **Layers icon**             | Cycle basemap: Dark → Light → Satellite → Dark |
| **Globe / Flat icon**       | Switch between 3D globe and 2D Mercator map    |
| **Moon / Sun / A**          | Theme: Dark / Light / System (follows your OS) |
| **Gear**                    | Open Settings panel                            |
| **3D cube** (flat map only) | Toggle perspective tilt                        |

---

## Settings panel

Open via the gear icon in the bottom-left control stack.

### Labels

- Toggle individual label categories: countries, water bodies, channels, geographical features, island groups, port labels
- **Label density**: Fewer labels at low values, more at high values
- **Label size**: Scale all map labels up or down
- **Collision avoidance**: When enabled, overlapping labels are automatically removed

### Grid

- **Show lat/lon grid**: Toggle the admiralty-chart spider-web
- **Grid density**: Major only (30°), Medium (15°), Fine (10°)
- **Grid opacity**: Fade the grid for subtlety

### Map layers

- **Shipping lanes**: 22 major maritime corridors (toggle on/off)
- **Continent outlines**: Light landmass reference (toggle on/off)
- **Reference lines**: Equator, tropics, and polar circles (toggle on/off)

### Route display

- **Route line width**: 1–6px
- **Trace animation**: Animated draw-on effect when a route appears

---

## Waypoints (multi-leg routes)

Use **+ Add stop** between origin and destination to insert intermediate waypoints. The route is computed as a multi-leg path passing through each waypoint in order. Waypoints appear as blue dots on the map.

---

## Port details

Click the **(i)** icon next to any search result, or click a port on the map, to open the **Port Detail Sheet**. It shows:

- Port name, country, region
- Size classification (Major / Intermediate / Minor / Small)
- UN/LOCODE
- Depths (channel, anchorage, cargo pier)
- Maximum vessel dimensions (length, beam, draft, DWT)
- Published restrictions (tide, swell, ice, other)
- Primary use type (container, bulk, tanker, roro, general)

---

## Map legend

The collapsible legend (bottom-left, above the controls) shows which layers are visible. Click items to toggle them on the map.

---

## Keyboard shortcuts

| Key                 | Context                      | Action                       |
| ------------------- | ---------------------------- | ---------------------------- |
| **Arrow Down / Up** | Search dropdown              | Navigate results             |
| **Enter**           | Search dropdown              | Select highlighted port      |
| **Escape**          | Search dropdown, Port Detail | Close dropdown / close panel |
| **Tab**             | Search dropdown              | Dismiss dropdown             |

---

## Tips

- **Pacific-centred view**: Trans-Pacific routes (e.g., Singapore → Los Angeles) render as continuous paths. The map automatically frames the route after computation.
- **Speed affects time**: Changing the vessel speed updates sailing time and per-sector times instantly.
- **Cape of Good Hope**: Toggle "Show longer detours" in the Route Panel to see the Cape route for Asia↔Europe voyages. It adds ~30% distance but is available when Suez is disrupted.
- **Map labels respond to zoom**: More labels appear as you zoom in. Features like ocean trenches and currents appear only at higher zoom levels.
- **Settings persist**: All settings are saved to your browser and restored on your next visit.
