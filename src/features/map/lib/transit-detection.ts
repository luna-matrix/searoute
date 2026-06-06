import type { LineString } from 'geojson'
import type { SeaRouteFeature } from '@/lib/searoute'
import type { Port, PortSize } from '@/types/port'

/**
 * Transit port detection.
 *
 * Given a route's LineString (hundreds of points per the docs),
 * find Major + Intermediate ports within `thresholdKm` of any
 * point on the route. Sort by position along the path (origin to
 * destination) so the timeline reads naturally.
 *
 * We use the haversine great-circle distance, accurate to ~0.5%
 * — more than enough for "is this port near the route".
 *
 * For each candidate port, we keep the minimum distance to any
 * route point, then dedupe (no port appears twice even if it's
 * near multiple route points) and sort by minimum position along
 * the route.
 */

const MAJOR_INTERMEDIATE: ReadonlyArray<PortSize> = ['Major', 'Intermediate']

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two [lng, lat] points in km.
 *  Accepts readonly tuples so callers can pass typed array coords. */
export function haversineKm(a: readonly [number, number], b: readonly [number, number]): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)))
}

export interface TransitHit {
  port: Port
  /** Minimum distance from this port to any route point (km). */
  minDistanceKm: number
  /** Index of the nearest route coordinate. */
  nearestIndex: number
}

export function detectTransitPorts(
  route: SeaRouteFeature,
  ports: ReadonlyArray<Port>,
  thresholdKm = 92.6, // 50 nautical miles
): Port[] {
  const coords = (route.geometry as LineString).coordinates as [number, number][]
  if (coords.length === 0) return []
  const thresholdSq = thresholdKm * thresholdKm

  const candidates = ports.filter((p) => MAJOR_INTERMEDIATE.includes(p.size))
  const hits: TransitHit[] = []
  for (const port of candidates) {
    const portPt: [number, number] = [port.lng, port.lat]
    let minSq = Infinity
    let nearestIndex = 0
    for (let i = 0; i < coords.length; i++) {
      const dx = coords[i][0] - portPt[0]
      const dy = coords[i][1] - portPt[1]
      // Quick mid-latitude Euclidean pre-filter. We still compute
      // haversine for the nearest candidate but only if the
      // straight-line gap is small enough to be plausible.
      const euclidSq = dx * dx + dy * dy
      if (euclidSq > 25) continue // ~5° lat/lng, never within threshold
      const d = haversineKm(portPt, coords[i])
      if (d < minSq) {
        minSq = d
        nearestIndex = i
      }
    }
    if (minSq <= thresholdSq * thresholdSq) {
      hits.push({ port, minDistanceKm: Math.sqrt(minSq), nearestIndex })
    }
  }

  // Sort by position along the route (origin → destination) so
  // downstream UIs (timeline, alternative ranking) read naturally.
  hits.sort((a, b) => a.nearestIndex - b.nearestIndex)
  return hits.map((h) => h.port)
}
