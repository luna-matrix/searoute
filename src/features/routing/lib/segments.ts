import type { LineString } from 'geojson'
import { haversineKm } from '@/features/map/lib/transit-detection'
import type { SeaRouteFeature } from '@/lib/searoute'
import type { Port } from '@/types/port'

/**
 * Voyage segment computation.
 *
 * Given the route and the list of transit ports (already sorted
 * by position along the path from chunk 4.1's
 * detectTransitPorts), split the route into N+1 segments
 * (origin → transit1 → transit2 → … → destination). Each
 * segment gets its great-circle length (sum of haversine
 * distances between consecutive route coordinates in the
 * segment's range) and an estimated time at the current
 * vessel speed.
 */

export interface RouteSegment {
  from: Port | null // null for the very first segment's "from" (origin)
  to: Port
  /** Great-circle distance in nautical miles for this leg. */
  distanceNm: number
  /** Estimated time at the given speed, in hours. */
  timeHours: number
}

/** Find the route-coordinate index nearest to a port. */
function nearestIndex(
  coords: ReadonlyArray<readonly [number, number]>,
  pt: readonly [number, number],
): number {
  let minSq = Infinity
  let idx = 0
  for (let i = 0; i < coords.length; i++) {
    const dx = coords[i][0] - pt[0]
    const dy = coords[i][1] - pt[1]
    const sq = dx * dx + dy * dy
    if (sq < minSq) {
      minSq = sq
      idx = i
    }
  }
  return idx
}

/** Sum haversine distances between consecutive coords in [start, end]. */
function sumSegment(
  coords: ReadonlyArray<readonly [number, number]>,
  start: number,
  end: number,
): number {
  let total = 0
  for (let i = start; i < end; i++) {
    total += haversineKm(coords[i], coords[i + 1])
  }
  return total
}

export function computeRouteSegments(
  route: SeaRouteFeature,
  transitPorts: ReadonlyArray<Port>,
  origin: Port | null,
  destination: Port | null,
  speedKnots: number,
): RouteSegment[] {
  const coords = (route.geometry as LineString).coordinates as [number, number][]
  if (coords.length < 2 || !origin || !destination) return []

  // Build the ordered waypoint list: origin → transits → destination.
  // For each transit, find its nearest route index (recomputed here
  // because the store only carries the port objects, not the
  // nearest-index; the work is cheap).
  const waypoints: { port: Port; idx: number }[] = [
    { port: origin, idx: 0 },
    ...transitPorts.map((p) => ({ port: p, idx: nearestIndex(coords, [p.lng, p.lat]) })),
    { port: destination, idx: coords.length - 1 },
  ]
  // Sort transit waypoints by index (origin and destination are already at 0 and end).
  for (let i = 1; i < waypoints.length - 1; i++) {
    // Simple insertion sort — small N
    let j = i
    while (j > 1 && waypoints[j].idx < waypoints[j - 1].idx) {
      ;[waypoints[j], waypoints[j - 1]] = [waypoints[j - 1], waypoints[j]]
      j--
    }
  }

  const segments: RouteSegment[] = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i]
    const end = waypoints[i + 1]
    const distanceKm = sumSegment(coords, start.idx, end.idx)
    const distanceNm = distanceKm / 1.852 // km → nautical miles
    const timeHours = speedKnots > 0 ? distanceNm / speedKnots : 0
    segments.push({
      from: start.port,
      to: end.port,
      distanceNm,
      timeHours,
    })
  }
  return segments
}
