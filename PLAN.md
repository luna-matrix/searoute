# SeaRoute — Design-Led Implementation Plan

Built from the ground up as a first-class maritime distance tool. Every interaction considered. Every pixel intentional.

---

## Design Principles

1. **The map is the product.** UI floats over it, never competes with it. The globe is the canvas — everything else is annotation.

2. **Information arrives in rhythm.** Not all at once. Port select → marker appears → second select → second marker → route traces → transit ports bloom → results surface. Choreographed.

3. **Maritime, not generic.** This should feel like a digital admiralty chart table. Deep navy blacks, chart-grid textures, nautical typography, subtle compass roses, depth contours. Nothing about this should say "SaaS dashboard."

4. **Respect professional intelligence.** Show the data maritime people care about — depths in metres, vessel size restrictions, UN/LOCODE, passage names. Hide nothing critical. Clutter nothing trivial.

5. **Delight is in the details.** Ripple on port click. Animated route trace. Counting distance numbers. Pulsing transit markers. Sonar ping on selection. Ocean ambient option. Every micro-interaction says "we care."

---

## Experience Architecture

### The Three Modes

```
MODE 1: EXPLORE                    MODE 2: ROUTE                      MODE 3: DETAIL
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│                     │    │  [Shanghai ▼] [Rotterdam ▼] │    │                     │
│   Rotating globe    │    │                     │    │   Globe + Route     │
│   Ports as lights   │    │   Animated route    │    │                     │
│   Compass rose      │    │   tracing on globe  │    │   ┌─────────────┐   │
│                     │    │   Transit ports     │    │   │ Port Detail │   │
│                     │    │   blooming in       │    │   │ ─────────── │   │
│    ┌─────────────┐  │    │                     │    │   │ Shanghai    │   │
│    │ Search bar  │  │    │   ┌─────────────┐   │    │   │ China       │   │
│    │ + Explore   │  │    │   │ Route Card  │   │    │   │ Channel 14m │   │
│    └─────────────┘  │    │   │ 10,666 nm   │   │    │   │ ...         │   │
│                     │    │   │ ▼ Segments  │   │    │   └─────────────┘   │
│                     │    │   └─────────────┘   │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Scene Transitions

| Transition | Animation | Duration | Feeling |
|---|---|---|---|
| App launches | Globe materializes from void, slow rotation begins, ports fade in as lights | 1200ms | Arrival |
| Click port | Ripple expands from click point, marker scales up 1→1.3→1, nearby ports brighten | 400ms | Precision |
| Port selected (origin) | Camera flies to port, green marker pulses twice, search bar shifts to destination mode | 600ms | Decision |
| Second port selected | Camera pulls back to show both ports, route traces from origin to dest, distance counter starts | 800ms | Anticipation |
| Route complete | Transit ports bloom in stagger (100ms each), results card slides up from bottom | 1000ms | Revelation |
| Switch transit option | Old route fades, new route traces, distance cross-fades to new value | 500ms | Comparison |
| Hover transit port | Port glows amber, mini-tooltip appears with "X nm from origin" | 150ms | Exploration |
| Open port detail | Panel slides up from bottom, map scales slightly to accommodate | 300ms | Focus |

---

## Visual Design System

### Color Palette — "Admiralty Night"

```
Deep Chart Navy    #060d17    Background — like deep ocean at night
Chart Table Steel  #0f1e33    Panel surfaces — like a metal chart table
Wet Ink Blue       #1a3352    Elevated panels
Admiralty Signal   #1e5fb4    Primary accent — like chart markings
Starboard Green    #00a86b    Origin / safe / recommended
Port Red           #e63946    Destination / warning
Signal Amber       #f77f00    Transit ports / alternatives / cape routes
Fathom Blue        #004e92    Depth contour reference
Fog Grey           #8899aa    Secondary text
Sea Spray          #c8d6e5    Primary text
Lantern Gold       #ffd166    Highlights / badges
Arctic White       #eef2f5    Interactive state / focus
```

### Typography

```
Family: 'Inter' for UI, 'JetBrains Mono' for all numbers and distances

Scale:
  hero-distance   3rem / 48px     The big number — the answer
  heading-1       1.5rem / 24px   Route name, port name in detail
  heading-2       1.125rem / 18px Section labels
  body            0.9375rem / 15px Primary content
  body-small      0.8125rem / 13px Secondary, descriptions
  caption         0.6875rem / 11px Labels, badges, coordinates
  micro           0.625rem / 10px Timestamps, meta, version

All numbers use tabular figures (font-variant-numeric: tabular-nums)
All distances use JetBrains Mono with -0.02em letter-spacing
```

### Surfaces

```
Glass panel:     rgba(15, 30, 51, 0.85) + backdrop-blur(20px) + 1px solid rgba(255,255,255,0.06)
Elevated card:   rgba(26, 51, 82, 0.92) + backdrop-blur(14px) + 1px solid rgba(255,255,255,0.10)
Chart grid:      repeating linear-gradient at 20px with rgba(255,255,255,0.02)
Depth contour:   subtle blue bands at zoom 4+ showing ocean bathymetry
```

### Icons & Visual Elements

```
Nautical compass rose    Rendered as SVG, positioned top-right, slowly matches map bearing
Port marker              Filled circle with subtle outer glow, size encodes port class
Route path               Glowing line with animated dash flow indicating direction
Transit port marker      Amber diamond shape, smaller than origin/dest
Origin pulse             Green ring expanding outward twice on selection
Destination pulse        Red ring expanding outward twice on selection
Voyage timeline          Vertical line with dots at each waypoint, styled like a radar plot
```

---

## Component Architecture

```
App
├── MapCanvas (DeckGL — full viewport, the hero)
│   ├── TileLayer             Dark / Satellite base
│   ├── GeoJsonLayer           Shipping lanes (ghost reference)
│   ├── ScatterplotLayer       All ports (subtle dots)
│   ├── ScatterplotLayer       Selected ports (highlighted + pulsing)
│   ├── ScatterplotLayer       Transit ports (amber diamonds)
│   ├── PathLayer              Route path (glowing, animated)
│   ├── ArcLayer               Direct reference path (abstract, semi-transparent)
│   └── GeoJsonLayer           Depth contours (very subtle, zoom-dependent)
│
├── CompassRose (SVG, top-right, rotates with map bearing)
│
├── SearchBar (floating at top, Apple Maps style)
│   ├── OriginInput
│   ├── DestinationInput
│   └── WaypointList (expandable)
│
├── RoutePanel (slides up from bottom when route computed)
│   ├── RouteHeader            Origin → Destination + transit name
│   ├── HeroDistance           The big number, animated count-up
│   ├── SailingTimeEstimate    Days/hours at configurable speed
│   ├── TransitOptionCards     Horizontal scroll of alternatives
│   ├── VoyageTimeline         Segments with transit ports
│   └── ActionBar              Copy / Share / Export
│
├── PortDetailSheet (replaces RoutePanel when a port is clicked)
│   ├── PortHeader             Name, country, size badge
│   ├── DepthChart             Visual depth indicator (channel, anchorage, pier)
│   ├── VesselInfo             Max vessel size, restrictions
│   ├── QuickActions            Set as Origin / Set as Destination / Close
│   └── NearbyPorts            5 closest ports shown as mini-list
│
├── MapControls (floating right edge)
│   ├── ZoomIn / ZoomOut
│   ├── ViewToggle             Perspective / Flat
│   ├── StyleToggle            Dark / Satellite
│   └── FullscreenToggle
│
└── AmbientLayer (optional, subtle)
    └── Ocean ambient switch   Toggle subtle ocean wave sound + dimmed UI
```

---

## Interaction Specifications

### Port Selection Flow

```
1. User clicks SearchBar → it expands, keyboard opens on mobile
2. Types "sha" → live results appear with matched characters in Signal Amber
3. Results show: port name (bold), country (fog), size badge, region tag
4. Keyboard nav: ↑↓ arrows, Enter to select, Esc to dismiss
5. On select:
   a. SearchBar collapses back to pill form showing selected port name
   b. Map smoothly flies to the port (FlyToInterpolator, 600ms)
   c. Camera zooms to ~zoom 5 showing port and surrounding region
   d. Selected port marker pulses: scale 1→1.4→1, repeats once (400ms)
   e. Outline ring expands outward and fades (600ms)
   f. The SearchBar transitions focus to Destination input
6. Same flow for Destination
7. When both ports selected:
   a. Camera pulls back to frame both ports (fitBounds, 800ms)
   b. Route computation begins (loading spinner in RoutePanel area)
   c. Route path draws from origin → dest with animated dash flow (600ms)
   d. Transit ports detected and bloom in staggered (100ms each)
   e. RoutePanel slides up (ease-out, 400ms)
   f. Hero distance number counts up from 0 (requestAnimationFrame, 800ms)
```

### Route Alternative Switching

```
1. RoutePanel shows horizontal scroll of TransitOptionCards
2. Each card: transit name, distance, delta %, color-coded left border
3. Active card: elevated + full color fill + subtle glow
4. On tap/click alternative:
   a. Old PathLayer cross-fades out (300ms)
   b. New PathLayer cross-fades in (300ms)
   c. Transit port markers smoothly transition to new positions
   d. Hero distance number counts to new value
   e. Sailing time updates
   f. VoyageTimeline updates with new segments
```

### Transit Port Interaction

```
1. Transit ports render as amber diamond markers along the route
2. On hover: marker scales 1→1.2, tooltip appears:
   ┌──────────────────┐
   │ Singapore        │
   │ Transit port     │
   │ 2,240 nm from origin│
   │ 8,426 nm to dest │
   └──────────────────┘
3. On click: PathLayer freezes, PortDetailSheet slides up for that port
4. PortDetailSheet shows: port info + "on route between Origin and Dest"
```

### Speed Control

```
1. Speed slider is a custom-styled range input
2. Track: subtle gradient from slow (blue) to fast (green)
3. Thumb: circular, with halo on hover, number inside showing current speed
4. Default: 19 knots
5. Range: 10-25 knots
6. On drag: sailing time updates live with debounced (50ms) recomputation
7. Snap points at: 12 (slow steam), 15 (eco), 19 (standard), 22 (fast), 25 (max)
```

---

## Animation Library

```css
/* All animations respect prefers-reduced-motion */

@keyframes port-ripple {
  0%   { box-shadow: 0 0 0 0 rgba(30,95,180,0.5); }
  70%  { box-shadow: 0 0 0 20px rgba(30,95,180,0); }
  100% { box-shadow: 0 0 0 0 rgba(30,95,180,0); }
}

@keyframes route-trace {
  from { stroke-dashoffset: var(--path-length); }
  to   { stroke-dashoffset: 0; }
}

@keyframes transit-bloom {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes count-up {
  /* Handled in JS with requestAnimationFrame */
}

@keyframes panel-slide-up {
  from { transform: translateY(100%); opacity: 0.6; }
  to   { transform: translateY(0); opacity: 1; }
}

@keyframes globe-appear {
  from { opacity: 0; transform: scale(0.95); filter: blur(8px); }
  to   { opacity: 1; transform: scale(1); filter: blur(0); }
}

@keyframes compass-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
  /* Subtle, very slow rotation — 120s per rotation */
}
```

---

## Data Architecture

### Port Dataset

Curated from World Port Index + UN/LOCODE. 1,200+ ports with:

```typescript
interface Port {
  id: string;
  name: string;
  country: string;
  countryCode: string;    // ISO 3166-1 alpha-2
  lat: number;
  lng: number;
  region: PortRegion;     // 18 maritime regions for filtering
  size: 'Major' | 'Intermediate' | 'Minor' | 'Small';
  unlocode?: string;      // UN/LOCODE for trade reference
  depths: {
    channel?: number;     // metres
    anchorage?: number;
    cargoPier?: number;
  };
  maxVessel?: {
    length?: number;      // metres
    beam?: number;
    draft?: number;
    dwt?: number;         // deadweight tonnage
  };
  restrictions?: string[]; // 'tide', 'swell', 'ice', 'other'
  type?: string;          // 'container', 'bulk', 'tanker', 'roro', 'general'
  connections?: string[]; // common trade partners (for intelligent suggestions)
}
```

### Route Computation

Uses `searoute-ts` with the Eurostat 2025 maritime network. Returns sea-only paths that never cross land. Each path is a dense LineString (hundreds of points) following actual maritime corridors.

**Transit port detection**: Every computed path is analyzed to find known ports within 50 nm. Filtered to Major + Intermediate ports, deduplicated, sorted by position along the path.

### Intelligent Defaults

From trade data patterns, when origin is selected, destination search pre-scores ports:
- Most common trade partners for that origin region
- Major hub ports in other regions
- Recently selected ports (localStorage)

---

## Micro-Interactions Catalog

| # | Trigger | Response |
|---|---|---|
| M1 | Hover port marker | Marker scales 1.2×, outer glow intensifies, tooltip fades in (150ms) |
| M2 | Click port marker | Ripple expands from click point, marker pulses twice, detail sheet slides up |
| M3 | Type in search | Input border glows admiralty blue, results appear with 30ms stagger |
| M4 | Select search result | Selected item flashes once, input contracts to pill, map flies to port |
| M5 | Both ports selected | Loading spinner in panel area (300ms), then route traces from origin → dest |
| M6 | Route finishes computing | Transit ports bloom in stagger (100ms each), panel slides up, distance counts |
| M7 | Switch transit option | Old route fades (300ms), new route traces (400ms), distance cross-fades |
| M8 | Hover transit port | Amber glow intensifies, mini-tooltip slides in from marker center |
| M9 | Drag speed slider | Thumb scales to 1.2×, sailing time updates live with subtle color shift |
| M10 | Toggle perspective/flat | Camera smoothly transitions (800ms), pitch animates in/out |
| M11 | Toggle dark/satellite | Tiles cross-fade (500ms), UI adapts subtly to maintain contrast |
| M12 | Resize window | Map resizes smoothly (ResizeObserver), panel adapts breakpoint instantly |
| M13 | Copy distance | "Copied" toast slides in from top (200ms), auto-dismisses after 2s |
| M14 | Idle (no interaction 30s) | Map slowly auto-rotates, ports pulse gently like breathing |

---

## Responsive Strategy

### Desktop (≥1024px)
- Full-screen map
- Floating search bar at top, centered, max-width 600px
- RoutePanel slides up from bottom, max-height 40vh
- PortDetailSheet slides up from bottom, max-height 50vh
- MapControls docked to right edge, 16px inset
- CompassRose top-right corner

### Tablet (640–1023px)
- Full-screen map
- Search bar full-width at top, smaller padding
- RoutePanel/DetailSheet slides up from bottom, max-height 55vh
- MapControls docked right, more compact
- TransitOptionCards smaller, horizontal scroll

### Mobile (<640px)
- Full-screen map
- Search bar as floating pill at top, expands to full width on focus
- RoutePanel/DetailSheet as draggable bottom sheet with snap points (15%, 50%, 85%)
- MapControls as small floating icon row bottom-right
- One-handed reachability: search at top, panel at bottom
- Touch targets minimum 44×44px

---

## Performance Budget

| Metric | Target |
|---|---|
| Time to Interactive | < 3 seconds (code-split data from app shell) |
| First Contentful Paint | < 1.5 seconds (dark background + globe outline) |
| Port search results | < 100ms (debounced 150ms input) |
| Route computation | < 1 second (searoute-ts Dijkstra) |
| Transit port detection | < 500ms (haversine on 1,200 ports × 100 samples) |
| Map frame rate | 60 FPS on M1/M2, 30+ FPS on mobile |
| Bundle (initial) | < 1 MB (code-split data to lazy chunks) |
| Bundle (total) | < 4 MB (ports, lanes, maritime network preloaded) |

---

## Implementation Phases

### Phase 1 — Foundation (Day 1)
- Vite + React 19 + TypeScript scaffold
- Install dependencies: Deck.gl, searoute-ts, Zustand
- Port dataset curation (1,200+ from WPI + UN/LOCODE)
- Maritime network (searoute-ts bundled)
- Shipping lanes GeoJSON
- Design tokens → CSS custom properties
- Global reset + typography + scrollbar + glass utility

### Phase 2 — The Globe (Day 2)
- DeckGL MapView with pitch + rotation
- TileLayer with dark/satellite sources
- Shipping lanes GeoJsonLayer (ghost layer)
- ScatterplotLayer — all ports as subtle dots
- CompassRose SVG component
- Route path rendering (PathLayer + ArcLayer)
- Port marker pulsing animation on selection
- Camera fly-to on port select

### Phase 3 — Search & Explore (Day 2-3)
- Floating SearchBar component with expand/collapse
- Origin + Destination autocomplete with fuzzy matching
- Highlighted match characters in results
- Keyboard navigation (arrows, enter, escape)
- Port detail popover on hover
- PortDetailSheet (slide-up panel)
- Port details: depths, vessel size, restrictions, UN/LOCODE

### Phase 4 — Route Intelligence (Day 3-4)
- searoute-ts integration (seaRouteAlternatives)
- Transit option ranking and recommendation
- Transit port detection engine
- Route segmentation from transit ports
- HeroDistance component with count-up animation
- SailingTime estimator with speed slider
- VoyageTimeline with segment breakdown
- Transit port marker layer on map

### Phase 5— Multi-leg & Fallback (Day 4)
- Waypoint support in store
- Waypoint input UI
- Multi-leg computation (seaRouteMulti)
- Snap failure handling with port suggestions
- Zero-alternatives fallback message
- Smart destination suggestions (trade partners)

### Phase 6 — Interaction Polish (Day 4-5)
- All micro-interactions (M1-M14 from catalog above)
- Route trace animation
- Transit port bloom stagger
- Speed slider snap points + live update
- View mode transitions (perspective ↔ flat)
- Tile cross-fade (dark ↔ satellite)
- Toast notifications (copy, errors)
- Keyboard accessibility pass

### Phase 7 — Responsive & Touch (Day 5)
- Desktop, tablet, mobile breakpoints
- Bottom sheet with snap points on mobile
- Touch gesture support (swipe, pinch, double-tap)
- Touch target sizing (44px minimum)
- Orientation change handling
- CSS containment for paint performance

### Phase 8 — Polish & Ship (Day 5-6)
- Loading skeleton states
- Empty state (explore prompt with rotating globe)
- Error states (tile failure, network error)
- prefers-reduced-motion support
- prefers-color-scheme support
- Final bundle optimization (dynamic imports)
- Lighthouse audit (target 90+ performance)
- Cross-browser smoke test
- Production build + deploy

---

## The "Wow" Checklist

Things that separate this from every other distance calculator:

- [ ] Globe materializes from void on launch — not a jarring pop-in
- [ ] Ports visible as lights from space, not just map pins
- [ ] Route traces like a sonar line — animated dash flow from origin to dest
- [ ] Transit ports bloom in staggered — each appears 100ms after the last
- [ ] Distance number counts up — like an odometer, not a static label
- [ ] Speed slider has snap points at standard steaming speeds
- [ ] Compass rose slowly rotates with map bearing
- [ ] Depth contours visible at close zoom — it feels like a chart, not a map
- [ ] Search results highlight matched characters in signal amber
- [ ] Port ripple effect on click — like dropping a pin in water
- [ ] Glass panels have subtle chart-grid texture behind them
- [ ] Hover states feel physical — markers lift, glow intensifies
- [ ] Selection flows naturally: click → ripple → fly → pulse → next step
- [ ] Empty state is beautiful — rotating globe with pulsing port lights
- [ ] Intelligent suggestions — "Most ships on this route stop at Singapore"
- [ ] One-click copy of route summary as formatted text
- [ ] Distance display is the hero — the biggest, most prominent element
- [ ] All numbers use tabular figures — no layout shift on value change
- [ ] Mobile bottom sheet has buttery-smooth spring physics
- [ ] Reduced motion respects system preference without losing meaning
