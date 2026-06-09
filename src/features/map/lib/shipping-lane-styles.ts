import type { Feature, Geometry } from 'geojson'
import type { ShippingLaneImportance, ShippingLaneProperties } from '@/data/shipping-lanes'

type RGBA = [number, number, number, number]

/**
 * Shipping lane styling. Subtle "ghost reference" lines so the lanes
 * sit behind the route + ports. Primary lanes are slightly more
 * visible than alternatives; restricted lanes get a signal-amber tint
 * to mark them as conditional (e.g., Northwest Passage in winter).
 *
 * Color values mirror the Admiralty Night tokens in tokens.css.
 */
const LANE_LINE_COLOR: Record<ShippingLaneImportance, RGBA> = {
  primary: [30, 95, 180, 100],
  alternative: [30, 95, 180, 50],
  restricted: [247, 127, 0, 60],
}

const LANE_LINE_WIDTH_PX: Record<ShippingLaneImportance, number> = {
  primary: 1.4,
  alternative: 1,
  restricted: 0.8,
}

/**
 * Accessor for deck.gl's GeoJsonLayer. The layer types features as
 * Feature<Geometry, P> (geometry is the full union), but our data
 * is always LineString. We only read `properties.importance` so the
 * wider Geometry type is fine.
 */
export function getLaneLineColor(feature: Feature<Geometry, ShippingLaneProperties>): RGBA {
  return LANE_LINE_COLOR[feature.properties?.importance ?? 'primary']
}

export function getLaneLineWidth(feature: Feature<Geometry, ShippingLaneProperties>): number {
  return LANE_LINE_WIDTH_PX[feature.properties?.importance ?? 'primary']
}
