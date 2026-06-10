import type { ThemeMode } from '../hooks/useTheme'

type RGBA = [number, number, number, number]

/**
 * Route line styling. Theme-aware — mirrors Admiralty Night/Day
 * tokens from tokens.css. deck.gl can't read CSS variables, so
 * we duplicate the few RGBA values here.
 */

export const ROUTE_LINE_WIDTH_PX = 3

export function getRouteLineColor(theme: ThemeMode): RGBA {
  return theme === 'light' ? [30, 95, 180, 240] : [30, 95, 180, 220]
}

export function getRouteLineWidth(): number {
  return ROUTE_LINE_WIDTH_PX
}

/**
 * Trace overlay — drawn on top of the base route during the
 * draw-on animation. Brighter, slightly thicker, with rounded
 * caps. Hidden once animation completes.
 */
export const ROUTE_TRACE_WIDTH_PX = 4

export function getRouteTraceColor(theme: ThemeMode): RGBA {
  return theme === 'light' ? [26, 42, 58, 255] : [238, 242, 245, 255]
}

/**
 * Glowing head dot that travels from origin to destination
 * during the trace animation.
 */
export const ROUTE_TRACE_HEAD_COLOR: RGBA = [30, 95, 180, 255]
export const ROUTE_TRACE_HEAD_RADIUS_PX = 5
export const ROUTE_TRACE_HEAD_RING_WIDTH_PX = 2

export function getRouteTraceHeadRing(theme: ThemeMode): RGBA {
  return theme === 'light' ? [26, 42, 58, 255] : [238, 242, 245, 255]
}

/**
 * Route distance label styling — labels rendered on the map
 * showing cumulative nm from origin along the route path.
 */
export const ROUTE_LABEL_FONT = 'JetBrains Mono, SF Mono, Menlo, monospace'
export const ROUTE_LABEL_SIZE_PX = 4
export const ROUTE_LABEL_OUTLINE_WIDTH = 2

export function getRouteLabelColor(theme: ThemeMode): RGBA {
  return theme === 'light' ? [26, 42, 58, 220] : [200, 214, 229, 200]
}

export function getRouteLabelOutline(theme: ThemeMode): RGBA {
  return theme === 'light' ? [255, 255, 255, 200] : [6, 13, 23, 220]
}

export function getRouteLabelBg(theme: ThemeMode): RGBA {
  return theme === 'light' ? [255, 255, 255, 180] : [6, 13, 23, 180]
}

/**
 * Compute distance labels along the route path.
 * Places labels at regular intervals showing cumulative nm.
 */
export function computeRouteDistanceLabels(
  routeCoords: readonly [number, number][],
  totalNm: number,
  isGlobe: boolean,
  theme: ThemeMode,
): Array<{
  position: [number, number]
  text: string
  size: number
  color: RGBA
}> {
  if (routeCoords.length < 2) return []

  const labels: Array<{
    position: [number, number]
    text: string
    size: number
    color: RGBA
  }> = []

  const size = isGlobe ? 4 : ROUTE_LABEL_SIZE_PX
  const mainColor = getRouteLabelColor(theme)
  const subColor: RGBA = theme === 'light' ? [26, 42, 58, 160] : [200, 214, 229, 140]

  // Midpoint — total distance
  const midIndex = Math.floor(routeCoords.length / 2)
  const midCoord = routeCoords[midIndex]
  if (midCoord) {
    labels.push({
      position: midCoord,
      text: Math.round(totalNm).toLocaleString() + ' nm',
      size: size + 2,
      color: mainColor,
    })
  }

  // 25% and 75% — progress labels
  const quarterIndex = Math.floor(routeCoords.length / 4)
  const threeQuarterIndex = Math.floor((routeCoords.length * 3) / 4)

  const quarterCoord = routeCoords[quarterIndex]
  if (quarterCoord) {
    labels.push({
      position: quarterCoord,
      text: Math.round(totalNm * 0.25).toLocaleString() + ' nm',
      size,
      color: subColor,
    })
  }

  const threeQuarterCoord = routeCoords[threeQuarterIndex]
  if (threeQuarterCoord) {
    labels.push({
      position: threeQuarterCoord,
      text: Math.round(totalNm * 0.75).toLocaleString() + ' nm',
      size,
      color: subColor,
    })
  }

  return labels
}
