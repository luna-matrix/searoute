/**
 * Maritime region boundary boxes.
 *
 * Simple longitude/latitude bounding rectangles used by the port
 * generation script (`generate-ports.ts`) to assign each port to
 * one of the 19 maritime regions.  A box is `[[west, south], [east, north]]`.
 *
 * The 19 regions match `PORT_REGIONS` in `src/types/port.ts`.
 * Boundaries are approximate and deliberately overlap slightly
 * at edges so ports on boundaries land in at least one region.
 * When a port falls in multiple regions the FIRST match wins
 * (the regions array is ordered from most-specific to most-general).
 */

export interface RegionBox {
  name: string
  box: [[number, number], [number, number]]
}

/**
 * Ordered from most-specific to most-general.  A port's lat/lng
 * is tested against each box in order; the first matching region
 * is assigned.  This lets us handle edge cases like the Black Sea
 * (nested inside the broader Mediterranean/Eastern Europe area)
 * or the Baltic (nested inside Northern Europe).
 */
export const REGION_BOXES: RegionBox[] = [
  // ---- Enclosed / semi-enclosed seas first (most specific) ----
  {
    name: 'Black Sea',
    box: [
      [27.0, 40.5],
      [42.0, 47.5],
    ],
  },
  {
    name: 'Baltic Sea',
    box: [
      [9.0, 53.5],
      [30.5, 66.0],
    ],
  },
  {
    name: 'Mediterranean Sea',
    box: [
      [-6.0, 30.0],
      [37.0, 46.5],
    ],
  },
  {
    name: 'Red Sea & Persian Gulf',
    box: [
      [32.0, 9.0],
      [60.0, 31.0],
    ],
  },
  {
    name: 'Caribbean & Gulf of Mexico',
    box: [
      [-98.0, 7.0],
      [-58.0, 31.0],
    ],
  },
  {
    name: 'Great Lakes',
    box: [
      [-92.5, 40.5],
      [-76.0, 49.5],
    ],
  },
  {
    name: 'North Sea',
    box: [
      [-5.0, 49.5],
      [13.0, 62.0],
    ],
  },

  // ---- Ocean-basin regions (broader) ----
  {
    name: 'Southeast Asia',
    box: [
      [95.0, -12.0],
      [150.0, 21.0],
    ],
  },
  {
    name: 'East Asia',
    box: [
      [105.0, 20.0],
      [150.0, 44.0],
    ],
  },
  {
    name: 'South Asia',
    box: [
      [65.0, 4.0],
      [93.0, 26.0],
    ],
  },
  {
    name: 'Indian Ocean',
    box: [
      [38.0, -28.0],
      [90.0, 7.0],
    ],
  },
  {
    name: 'Oceania',
    box: [
      [110.0, -45.0],
      [180.0, 0.0],
    ],
  },
  {
    name: 'East Africa',
    box: [
      [35.0, -28.0],
      [52.0, 4.0],
    ],
  },
  {
    name: 'West Africa',
    box: [
      [-18.0, -28.0],
      [16.0, 6.0],
    ],
  },
  {
    name: 'South Atlantic',
    box: [
      [-60.0, -58.0],
      [20.0, -3.0],
    ],
  },
  {
    name: 'North Atlantic',
    box: [
      [-70.0, 24.0],
      [5.0, 52.0],
    ],
  },
  {
    name: 'North Pacific',
    box: [
      [-180.0, 20.0],
      [-115.0, 64.0],
    ],
  },
  {
    name: 'South Pacific',
    box: [
      [-180.0, -58.0],
      [-65.0, -2.0],
    ],
  },
  {
    name: 'Arctic',
    box: [
      [-180.0, 64.0],
      [180.0, 90.0],
    ],
  },
]

/** Match a (lng, lat) to the first region box that contains it. */
export function regionForLatLng(lng: number, lat: number): string {
  for (const rb of REGION_BOXES) {
    const [[west, south], [east, north]] = rb.box
    if (lng >= west && lng <= east && lat >= south && lat <= north) {
      return rb.name
    }
  }
  return 'North Atlantic' // fallback
}
