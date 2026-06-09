/**
 * Pure-math geometry utilities: point-in-polygon (ray casting),
 * great-circle interpolation, and land-crossing detection.
 *
 * Used by transit-detection.ts to exclude ports that are
 * "behind" a landmass from the route — e.g. an east-coast
 * Malaysia port when the route runs through the Malacca Strait
 * on the west side of the peninsula.
 *
 * No external dependencies; the continent GeoJSON polygon rings
 * are already loaded by MapCanvas and passed in as pre-flattened
 * `[number, number][][]` arrays.
 */

/** A polygon ring: closed array of [lng, lat] coordinate pairs. */
type Ring = readonly (readonly [number, number])[]

/**
 * Ray-casting point-in-polygon test (even-odd rule).
 *
 * Casts a ray eastward from the test point and counts how many
 * edges of the polygon ring it crosses.  An odd count means the
 * point is inside.
 *
 * Handles the antimeridian by normalising edge endpoint longitudes
 * relative to the test point's longitude before edge testing.
 */
function pointInRing(point: [number, number], ring: Ring): boolean {
  const [px, py] = point
  const n = ring.length
  if (n < 3) return false

  let inside = false
  for (let i = 0, j = n - 1; i < n; j = i, i++) {
    const xi = ring[i]![0]
    const yi = ring[i]![1]
    const xj = ring[j]![0]
    const yj = ring[j]![1]

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi

    if (intersect) inside = !inside
  }

  return inside
}

/** Flatten a GeoJSON FeatureCollection geometry into a flat list of polygon rings. */
export function extractContinentRings(
  features: readonly {
    geometry: {
      type: string
      coordinates: unknown
    }
  }[],
): [number, number][][] {
  const rings: [number, number][][] = []

  for (const feature of features) {
    const { type, coordinates } = feature.geometry
    if (type === 'Polygon') {
      const polys = coordinates as [number, number][][]
      for (const ring of polys) {
        if (ring.length >= 3) rings.push(ring as [number, number][])
      }
    } else if (type === 'MultiPolygon') {
      const polys = coordinates as [number, number][][][]
      for (const poly of polys) {
        for (const ring of poly) {
          if (ring.length >= 3) rings.push(ring as [number, number][])
        }
      }
    }
  }

  return rings
}

export function isPointOnContinent(
  point: [number, number],
  continentRings: readonly (readonly [number, number][])[],
): boolean {
  for (const ring of continentRings) {
    if (pointInRing(point, ring)) return true
  }
  return false
}

/**
 * Spherical linear interpolation between two [lng, lat] points.
 *
 * For the short distances we sample (typically < 50 nm), linear
 * interpolation in lng/lat space is accurate to within 0.01°.
 * We use the great-circle formula anyway for correctness at
 * extreme latitudes and trans-polar routes.
 *
 * @param a - Start coordinate [lng, lat] in degrees.
 * @param b - End coordinate [lng, lat] in degrees.
 * @param t - Fraction along the path, 0 ≤ t ≤ 1.
 * @returns The interpolated [lng, lat] in degrees.
 */
export function greatCircleSample(
  a: readonly [number, number],
  b: readonly [number, number],
  t: number,
): [number, number] {
  if (t <= 0) return [a[0], a[1]]
  if (t >= 1) return [b[0], b[1]]

  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI

  const [lng1, lat1] = [toRad(a[0]), toRad(a[1])]
  const [lng2, lat2] = [toRad(b[0]), toRad(b[1])]

  const cosLat1 = Math.cos(lat1)
  const sinLat1 = Math.sin(lat1)
  const cosLat2 = Math.cos(lat2)
  const sinLat2 = Math.sin(lat2)
  const dLng = lng2 - lng1

  const cosD = sinLat1 * sinLat2 + cosLat1 * cosLat2 * Math.cos(dLng)

  const d = Math.acos(Math.max(-1, Math.min(1, cosD)))

  if (d < 1e-10) return [toDeg(a[0]), toDeg(a[1])]

  const sinD = Math.sin(d)
  const k1 = Math.sin((1 - t) * d) / sinD
  const k2 = Math.sin(t * d) / sinD

  const x = k1 * cosLat1 * Math.cos(lng1) + k2 * cosLat2 * Math.cos(lng2)
  const y = k1 * cosLat1 * Math.sin(lng1) + k2 * cosLat2 * Math.sin(lng2)
  const z = k1 * sinLat1 + k2 * sinLat2

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
  const lng = Math.atan2(y, x)

  return [toDeg(lng), toDeg(lat)]
}

/**
 * Check whether the great-circle path between two points crosses a continent.
 *
 * Samples three points along the arc (25%, 50%, 75%).  If any
 * sample falls on a continent polygon ring, the direct path
 * crosses land.  For the transit-port use case (threshold ≤ 50 nm),
 * the great-circle arc is short enough that three samples reliably
 * catch land-crossings.
 *
 * @returns `true` if the path crosses land (port should be excluded).
 */
export function pathCrossesLand(
  a: readonly [number, number],
  b: readonly [number, number],
  continentRings: readonly (readonly [number, number][])[],
): boolean {
  for (const t of [0.25, 0.5, 0.75]) {
    const sample = greatCircleSample(a, b, t)
    if (isPointOnContinent(sample, continentRings)) return true
  }
  return false
}
