/**
 * SeaRoute's maritime regions. See PLAN.md "Data Architecture → Port
 * Dataset" for rationale. The list is a coarse filter, not authoritative
 * boundaries — a port on the boundary of two regions is assigned to the
 * one it most commonly trades with. PLAN.md calls for "18 maritime
 * regions"; we have 19 here because Arctic warrants its own bucket
 * (Murmansk, Arkhangelsk, Tiksi, Pevek, Prudhoe Bay, Churchill).
 */
export const PORT_REGIONS = [
  'North Sea',
  'Baltic Sea',
  'Mediterranean Sea',
  'Black Sea',
  'West Africa',
  'East Africa',
  'Red Sea & Persian Gulf',
  'Indian Ocean',
  'South Asia',
  'Southeast Asia',
  'East Asia',
  'Oceania',
  'North Pacific',
  'South Pacific',
  'North Atlantic',
  'Caribbean & Gulf of Mexico',
  'South Atlantic',
  'Great Lakes',
  'Arctic',
] as const

export type PortRegion = (typeof PORT_REGIONS)[number]

export type PortSize = 'Major' | 'Intermediate' | 'Minor' | 'Small'

export type PortType = 'container' | 'bulk' | 'tanker' | 'roro' | 'general'

export type PortRestriction = 'tide' | 'swell' | 'ice' | 'other'

/**
 * A maritime port. See PLAN.md:286-312 for the field definitions.
 * - `depths` is always present; its inner fields are optional because
 *   not every port publishes every depth measurement.
 * - `connections` is for Phase 5's "intelligent destination suggestions"
 *   — curated list of common trade partners (other port ids).
 * - `lat` and `lng` are decimal degrees, 4-digit precision (~11 m).
 */
export interface Port {
  id: string
  name: string
  country: string
  /** ISO 3166-1 alpha-2 */
  countryCode: string
  lat: number
  lng: number
  region: PortRegion
  size: PortSize
  /** UN/LOCODE for trade reference. */
  unlocode?: string
  /** Depths in metres. */
  depths: {
    channel?: number
    anchorage?: number
    cargoPier?: number
  }
  maxVessel?: {
    /** metres */
    length?: number
    /** metres */
    beam?: number
    /** metres */
    draft?: number
    /** deadweight tonnage */
    dwt?: number
  }
  restrictions?: PortRestriction[]
  type?: PortType
  /** Other port ids — common trade partners. Phase 5 use. */
  connections?: string[]
}
