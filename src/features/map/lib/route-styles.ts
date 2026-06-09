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

/**
 * Phase 6: "trace" overlay drawn on top of the base route while
 * the draw-on animation plays. Brighter, slightly thicker, with
 * rounded caps. When the animation finishes, this layer collapses
 * to the same path as the base route, so we hide it entirely.
 */
export const ROUTE_TRACE_COLOR: RGBA = [238, 242, 245, 255] // arctic-white
export const ROUTE_TRACE_WIDTH_PX = 4

/**
 * Phase 6: glowing head dot that travels from origin to
 * destination during the trace. Admiralty-signal + additive-style
 * bright color for a sonar-ping feel.
 */
export const ROUTE_TRACE_HEAD_COLOR: RGBA = [30, 95, 180, 255]
export const ROUTE_TRACE_HEAD_RING: RGBA = [238, 242, 245, 255]
export const ROUTE_TRACE_HEAD_RADIUS_PX = 5
export const ROUTE_TRACE_HEAD_RING_WIDTH_PX = 2
