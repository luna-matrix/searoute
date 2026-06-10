import type { Port, PortSize } from '@/types/port'
import type { ThemeMode } from '../hooks/useTheme'

/**
 * Port marker styling. RGBA tuples (0-255 + 0-255 alpha) are
 * required by deck.gl's ScatterplotLayer.
 *
 * Color values mirror the Admiralty Night tokens in
 * src/styles/tokens.css (CSS custom properties can't be read by
 * deck.gl, so we duplicate the few values we need). If the token
 * values change, update here. Two palettes are exported — one per
 * theme — and the MapCanvas picks the right one based on the
 * active theme.
 *
 * Radius is in pixels (radiusUnits: 'pixels') so the dots stay
 * readable at all zooms — they're point features, not geographic
 * areas.
 */

type RGBA = [number, number, number, number]

interface PortPalette {
  fill: Record<PortSize, RGBA>
  stroke: RGBA
  /** Radius stays the same across themes — only the color shifts. */
  radiusPx: Record<PortSize, number>
}

const DARK: PortPalette = {
  fill: {
    Major: [200, 214, 229, 220], // sea-spray, high alpha
    Intermediate: [200, 214, 229, 170], // sea-spray, lower alpha
    Minor: [136, 153, 170, 130], // fog-grey, low alpha
    Small: [136, 153, 170, 90], // fog-grey, very low alpha
  },
  stroke: [238, 242, 245, 255], // arctic-white
  radiusPx: {
    Major: 3,
    Intermediate: 2.2,
    Minor: 1.6,
    Small: 1.2,
  },
}

const LIGHT: PortPalette = {
  // Inverted from dark: dark fill on light background. The Major
  // and Intermediate ports get the dark sea-spray tone so they pop
  // on the parchment basemap; the Minor and Small ports drop to
  // a medium-dark grey so the visual hierarchy survives the
  // theme switch.
  fill: {
    Major: [26, 42, 58, 220], // dark sea-spray, high alpha
    Intermediate: [26, 42, 58, 170],
    Minor: [90, 106, 122, 130],
    Small: [90, 106, 122, 90],
  },
  stroke: [26, 42, 58, 255], // dark stroke for contrast on light
  radiusPx: {
    Major: 3,
    Intermediate: 2.2,
    Minor: 1.6,
    Small: 1.2,
  },
}

export function getPortPalette(theme: ThemeMode): PortPalette {
  return theme === 'light' ? LIGHT : DARK
}

export function getPortFill(port: Port, theme: ThemeMode = 'dark'): RGBA {
  return getPortPalette(theme).fill[port.size]
}

export function getPortRadiusPx(port: Port): number {
  return DARK.radiusPx[port.size]
}

/** Stroke color (subtle ring) — used in chunk 2.6 for selected ports. */
export const PORT_STROKE: RGBA = [238, 242, 245, 255] // arctic-white

/** Origin / destination marker styling. Larger than the regular port
 *  dots so they read clearly as "role" markers, with a white ring to
 *  pop against the dark basemap. The colors mirror the Admiralty
 *  Night tokens: starboard-green for origin, port-red for destination. */
export const ORIGIN_FILL: RGBA = [0, 168, 107, 255]
export const DESTINATION_FILL: RGBA = [230, 57, 70, 255]
export const ROLE_RING: RGBA = [238, 242, 245, 255] // arctic-white
export const ROLE_RADIUS_PX = 8
export const ROLE_RING_WIDTH_PX = 2

export function getRoleFill(role: 'origin' | 'destination'): RGBA {
  return role === 'origin' ? ORIGIN_FILL : DESTINATION_FILL
}

/** Theme-aware ring colors. On dark backgrounds, arctic-white rings
 *  pop cleanly. On light (parchment) backgrounds, dark rings are
 *  needed for visibility — arctic-white is near-invisible on #f4ecd8. */
export function getRoleRing(theme: ThemeMode): RGBA {
  return theme === 'light' ? [26, 42, 58, 255] : [238, 242, 245, 255]
}

export function getWaypointRing(theme: ThemeMode): RGBA {
  return theme === 'light' ? [26, 42, 58, 255] : [238, 242, 245, 255]
}

export function getTransitRing(theme: ThemeMode): RGBA {
  return theme === 'light' ? [26, 42, 58, 200] : [238, 242, 245, 200]
}

export function getTransitFill(theme: ThemeMode): RGBA {
  return theme === 'light' ? [179, 87, 0, 220] : [247, 127, 0, 200]
}

/** Waypoint marker styling (Phase 5). Admiralty-signal blue so it
 *  sits visually between the green origin and red destination
 *  markers without competing with either. Slightly smaller than
 *  origin/destination to read as "intermediate". */
export const WAYPOINT_FILL: RGBA = [30, 95, 180, 255] // admiralty-signal
export const WAYPOINT_RING: RGBA = [238, 242, 245, 255] // arctic-white
export const WAYPOINT_RADIUS_PX = 6
export const WAYPOINT_RING_WIDTH_PX = 1.5

/** Along-route (transit) port markers — small amber dots for
 *  Major + Intermediate ports within 50 nm of the route.
 *  Smaller and less prominent than origin/destination/waypoints
 *  so they read as informational, not call-to-action. */
export const TRANSIT_PORT_RADIUS_PX = 3.5
