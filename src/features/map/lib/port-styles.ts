import type { Port, PortSize } from '@/types/port'

/**
 * Port marker styling. RGBA tuples (0-255 + 0-255 alpha) are
 * required by deck.gl's ScatterplotLayer.
 *
 * Color values mirror the Admiralty Night tokens in
 * src/styles/tokens.css (CSS custom properties can't be read by
 * deck.gl, so we duplicate the few values we need). If the token
 * values change, update here.
 *
 * Radius is in pixels (radiusUnits: 'pixels') so the dots stay
 * readable at all zooms — they're point features, not geographic
 * areas.
 */

type RGBA = [number, number, number, number]

const PORT_FILL: Record<PortSize, RGBA> = {
  Major: [200, 214, 229, 220], // sea-spray, high alpha
  Intermediate: [200, 214, 229, 170], // sea-spray, lower alpha
  Minor: [136, 153, 170, 130], // fog-grey, low alpha
  Small: [136, 153, 170, 90], // fog-grey, very low alpha
}

const PORT_RADIUS_PX: Record<PortSize, number> = {
  Major: 3,
  Intermediate: 2.2,
  Minor: 1.6,
  Small: 1.2,
}

export function getPortFill(port: Port): RGBA {
  return PORT_FILL[port.size]
}

export function getPortRadiusPx(port: Port): number {
  return PORT_RADIUS_PX[port.size]
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
