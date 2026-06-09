import type { LineString } from 'geojson'
import type { SeaRouteFeature } from '@/lib/searoute'
import type { Port, PortSize } from '@/types/port'
import { pathCrossesLand } from './point-in-polygon'

/**
 * Transit port detection.
 *
 * Given a route's LineString (hundreds of points), find Major +
 * Intermediate ports within `thresholdKm` of any point on the route.
 * Sort by position along the path (origin → destination) so the
 * timeline reads naturally.
 *
 * If `continentRings` are supplied, each candidate is validated
 * against a land-crossing check: the great-circle path between the
 * port and its nearest route coordinate is sampled, and if any
 * sample point falls inside a continent polygon ring, the port is
 * excluded.  This prevents false positives where a port is within
 * haversine distance but on the wrong side of a landmass
 * (e.g. east-coast Malaysia ports appearing for a Malacca Strait
 * route on the west side of the peninsula).
 *
 * We use the haversine great-circle distance, accurate to ~0.5%
 * — more than enough for "is this port near the route".
 */

const MAJOR_INTERMEDIATE: ReadonlyArray<PortSize> = ['Major', 'Intermediate']

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two [lng, lat] points in km. */
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
  continentRings?: readonly (readonly [number, number][])[] | null,
): Port[] {
  const coords = (route.geometry as LineString).coordinates as [number, number][]
  if (coords.length === 0) return []

  const candidates = ports.filter((p) => MAJOR_INTERMEDIATE.includes(p.size))
  const hits: TransitHit[] = []

  for (const port of candidates) {
    const portPt: readonly [number, number] = [port.lng, port.lat]
    let minDist = Infinity
    let nearestIndex = 0
    let nearestCoord: [number, number] = coords[0]!

    for (let i = 0; i < coords.length; i++) {
      const routePt = coords[i]!
      const dx = routePt[0] - portPt[0]
      const dy = routePt[1] - portPt[1]
      const euclidSq = dx * dx + dy * dy
      if (euclidSq > 25) continue

      const d = haversineKm(portPt, routePt)
      if (d < minDist) {
        minDist = d
        nearestIndex = i
        nearestCoord = routePt
      }
    }

    if (minDist > thresholdKm) continue

    if (continentRings && continentRings.length > 0) {
      if (pathCrossesLand(portPt, nearestCoord, continentRings)) continue
    }

    hits.push({ port, minDistanceKm: minDist, nearestIndex })
  }

  hits.sort((a, b) => a.nearestIndex - b.nearestIndex)
  return hits.map((h) => h.port)
}
