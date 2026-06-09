import type { Feature, LineString } from 'geojson'
import type { SeaRouteFeature } from '@/lib/searoute'

/**
 * Voyage segment breaking.
 *
 * searoute-ts returns `properties.passages` — an ordered list of
 * named chokepoints the route traverses (e.g. malacca, suez,
 * gibraltar).  We use those as natural divisions to split the
 * route into "sectors" and compute per-sector distance and time.
 *
 * The passage order in `properties.passages` matches the order
 * the vessel encounters them — origin → passage₁ → passage₂ →
 * ... → destination.
 */

export interface VoyageSector {
  name: string
  /** Approximate position for display on the map. */
  position: [number, number]
  distanceNm: number
}

export interface VoyageSegment {
  label: string
  from: string
  to: string
  distanceNm: number
  timeHours: number
  percentage: number
}

const NM_PER_KM = 0.539957

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a[1])) * Math.cos(toRad(b[1]))
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

/** Display names and centre positions for each passage. */
const PASSAGE_INFO: Record<string, { name: string; position: [number, number] }> = {
  malacca: { name: 'Malacca Strait', position: [101.5, 3.5] },
  sunda: { name: 'Sunda Strait', position: [105.8, -6.2] },
  suez: { name: 'Suez Canal', position: [32.5, 30.5] },
  panama: { name: 'Panama Canal', position: [-79.7, 9.1] },
  gibraltar: { name: 'Strait of Gibraltar', position: [-5.6, 35.9] },
  babelmandeb: { name: 'Bab-el-Mandeb', position: [43.3, 12.7] },
  babalmandab: { name: 'Bab-el-Mandeb', position: [43.3, 12.7] },
  bosporus: { name: 'Bosphorus', position: [29.1, 41.2] },
  ormuz: { name: 'Strait of Hormuz', position: [56.5, 26.6] },
  dover: { name: 'Dover Strait', position: [1.5, 50.9] },
  kiel: { name: 'Kiel Canal', position: [9.5, 54.1] },
  corinth: { name: 'Corinth Canal', position: [23.0, 38.0] },
  bering: { name: 'Bering Strait', position: [-169.0, 65.5] },
  magellan: { name: 'Strait of Magellan', position: [-71.5, -53.5] },
  cape_horn: { name: 'Cape Horn', position: [-66.5, -56.5] },
  northwest: { name: 'Northwest Passage', position: [-95.0, 73.0] },
  northeast: { name: 'Northeast Passage', position: [105.0, 75.0] },
}

function distanceAlongRoute(coords: [number, number][]): number {
  let sum = 0
  for (let i = 1; i < coords.length; i++) {
    sum += haversineKm(coords[i - 1]!, coords[i]!)
  }
  return sum
}

/**
 * Split the route into sectors defined by named passages.
 * Returns an ordered list of sectors: origin→passage₁,
 * passage₁→passage₂, …, passageₙ→destination.
 */
export function computeVoyageSegments(
  route: SeaRouteFeature,
  originName: string,
  destName: string,
  speedKnots: number,
): { sectors: VoyageSector[]; segments: VoyageSegment[]; totalNm: number } {
  const feature = route as Feature<LineString>
  const coords = feature.geometry.coordinates as [number, number][]
  const passages = route.properties.passages ?? []
  const totalKm = distanceAlongRoute(coords)
  const totalNm = totalKm * NM_PER_KM

  const sectors: VoyageSector[] = []
  const info = PASSAGE_INFO

  if (passages.length === 0) {
    sectors.push({ name: originName, position: coords[0]!, distanceNm: totalNm })
    const hours = speedKnots > 0 ? totalNm / speedKnots : 0
    const segments: VoyageSegment[] = [
      {
        label: `${originName} → ${destName}`,
        from: originName,
        to: destName,
        distanceNm: totalNm,
        timeHours: hours,
        percentage: 100,
      },
    ]
    return { sectors, segments, totalNm }
  }

  for (const p of passages) {
    const pi = info[p]
    if (pi) {
      sectors.push({ name: pi.name, position: pi.position, distanceNm: 0 })
    }
  }

  const segments: VoyageSegment[] = []

  const allMarkers = [
    { name: originName, coord: coords[0]! },
    ...sectors.map((s) => ({ name: s.name, coord: findNearestCoord(coords, s.position) })),
    { name: destName, coord: coords[coords.length - 1]! },
  ]

  for (let i = 1; i < allMarkers.length; i++) {
    const from = allMarkers[i - 1]!
    const to = allMarkers[i]!
    const segKm = segmentDistance(coords, from.coord, to.coord)
    const segNm = segKm * NM_PER_KM
    const hours = speedKnots > 0 ? segNm / speedKnots : 0
    const pct = totalNm > 0 ? Math.round((segNm / totalNm) * 100) : 0

    segments.push({
      label: `${from.name} → ${to.name}`,
      from: from.name,
      to: to.name,
      distanceNm: segNm,
      timeHours: hours,
      percentage: pct,
    })
  }

  return { sectors, segments, totalNm }
}

function findNearestCoord(coords: [number, number][], target: [number, number]): [number, number] {
  let best = coords[0]!
  let bestD = Infinity
  for (const c of coords) {
    const d = haversineKm(c, target)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

function segmentDistance(
  coords: [number, number][],
  from: [number, number],
  to: [number, number],
): number {
  let sum = 0
  let started = false
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1]!
    const b = coords[i]!
    if (!started && haversineKm(a, from) < 10) started = true
    if (started) {
      sum += haversineKm(a, b)
      if (haversineKm(b, to) < 10) break
    }
  }
  return sum
}
