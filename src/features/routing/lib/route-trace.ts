import { useEffect, useRef, useState } from 'react'
import type { Feature, LineString } from 'geojson'
import { haversineKm } from '@/features/map/lib/transit-detection'

const NM_PER_KM = 0.539957

export interface RouteTraceState {
  /** The partial path from origin up to the current head position. */
  partialPath: [number, number][]
  /** The head position in [lng, lat]. */
  head: [number, number] | null
  /** True while the trace is animating. */
  active: boolean
}

/**
 * Route "draw-on" animation (Phase 6 wow effect).
 *
 * When the route changes, we run a 1500ms ease-out animation that
 * moves a head point from origin to destination along the path.
 * Returns the partial path (from origin up to the head) so the
 * caller can render a brighter "trace" line on top of the base
 * route, plus the head position for a glowing dot.
 *
 * Reduced motion: skips the animation, returns the full path
 * immediately so the user sees the complete route on the first
 * paint. Without this guard, the trace animation would be a
 * vestibular trigger for users who've asked for less motion.
 */
export function useRouteTrace(
  route: Feature<LineString> | null,
  durationMs = 1500,
): RouteTraceState {
  const [state, setState] = useState<RouteTraceState>({
    partialPath: [],
    head: null,
    active: false,
  })

  // Refs let the rAF callback read the latest values without
  // re-subscribing on every frame.
  const routeRef = useRef(route)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    routeRef.current = route
    if (!route) {
      setState({ partialPath: [], head: null, active: false })
      return
    }
    const coords = route.geometry.coordinates as [number, number][]
    if (coords.length < 2) {
      setState({ partialPath: coords, head: coords[0] ?? null, active: false })
      return
    }

    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced || durationMs === 0) {
      // Skip animation: show the full route immediately.
      setState({ partialPath: coords, head: coords[coords.length - 1] ?? null, active: false })
      return
    }

    // Pre-compute cumulative distance along the path so the
    // per-frame work is just a binary search + linear interp.
    const cum: number[] = new Array(coords.length)
    cum[0] = 0
    for (let i = 1; i < coords.length; i++) {
      cum[i] = cum[i - 1] + haversineKm(coords[i - 1]!, coords[i]!)
    }
    const total = cum[cum.length - 1]!

    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / durationMs, 1)
      // ease-out cubic — snappy start, gentle finish
      const eased = 1 - Math.pow(1 - t, 3)
      const target = eased * total

      // Find the segment where cum crosses `target`. cum is
      // monotonically increasing so a linear scan from the last
      // known index is the cheapest option, but with potentially
      // hundreds of coords a fresh scan is fine here.
      let segIdx = 1
      while (segIdx < cum.length - 1 && cum[segIdx]! < target) segIdx++

      const segStart = cum[segIdx - 1]!
      const segEnd = cum[segIdx]!
      const segLen = segEnd - segStart
      const segFrac = segLen > 0 ? Math.min(1, Math.max(0, (target - segStart) / segLen)) : 0
      const a = coords[segIdx - 1]!
      const b = coords[segIdx]!
      const head: [number, number] = [
        a[0] + (b[0] - a[0]) * segFrac,
        a[1] + (b[1] - a[1]) * segFrac,
      ]
      const partialPath: [number, number][] = [...coords.slice(0, segIdx), head]

      if (t < 1) {
        setState({ partialPath, head, active: true })
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Final frame: full path, head at the destination.
        setState({ partialPath: coords, head: coords[coords.length - 1]!, active: false })
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [route, durationMs])

  return state
}

/** Length of a route in nautical miles. */
export function routeLengthNm(coords: ReadonlyArray<readonly [number, number]>): number {
  let km = 0
  for (let i = 1; i < coords.length; i++) {
    km += haversineKm(coords[i - 1]!, coords[i]!)
  }
  return km * NM_PER_KM
}
