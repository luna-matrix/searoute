import type { Feature, Geometry } from 'geojson'
import type { ShippingLaneImportance, ShippingLaneProperties } from '@/data/shipping-lanes'
import type { ThemeMode } from '../hooks/useTheme'

type RGBA = [number, number, number, number]

/**
 * Shipping lane styling. Subtle "ghost reference" lines so the lanes
 * sit behind the route + ports. Theme-aware — slightly more opaque
 * on light backgrounds for visibility.
 */
const LANE_LINE_COLOR_DARK: Record<ShippingLaneImportance, RGBA> = {
  primary: [30, 95, 180, 100],
  alternative: [30, 95, 180, 50],
  restricted: [247, 127, 0, 60],
}

const LANE_LINE_COLOR_LIGHT: Record<ShippingLaneImportance, RGBA> = {
  primary: [30, 95, 180, 140],
  alternative: [30, 95, 180, 80],
  restricted: [179, 87, 0, 80],
}

const LANE_LINE_WIDTH_PX: Record<ShippingLaneImportance, number> = {
  primary: 1.4,
  alternative: 1,
  restricted: 0.8,
}

let currentTheme: ThemeMode = 'dark'

export function setLaneTheme(theme: ThemeMode): void {
  currentTheme = theme
}

export function getLaneLineColor(feature: Feature<Geometry, ShippingLaneProperties>): RGBA {
  const importance = feature.properties?.importance ?? 'primary'
  const palette = currentTheme === 'light' ? LANE_LINE_COLOR_LIGHT : LANE_LINE_COLOR_DARK
  return palette[importance]
}

export function getLaneLineWidth(feature: Feature<Geometry, ShippingLaneProperties>): number {
  return LANE_LINE_WIDTH_PX[feature.properties?.importance ?? 'primary']
}
