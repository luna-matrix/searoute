type RGBA = [number, number, number, number]

/**
 * Route line styling. The primary route gets the brighter admiralty-
 * signal; alternative routes (chunk 4.6) will reuse these with a
 * lower alpha. Mirrors the Admiralty Night tokens in tokens.css.
 */
export const ROUTE_LINE_COLOR: RGBA = [30, 95, 180, 220]
export const ROUTE_LINE_WIDTH_PX = 3

export function getRouteLineColor(): RGBA {
  return ROUTE_LINE_COLOR
}

export function getRouteLineWidth(): number {
  return ROUTE_LINE_WIDTH_PX
}
