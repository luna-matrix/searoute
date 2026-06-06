import { useEffect, useRef, useState } from 'react'
import { useMapStore } from '@/store/map'
import { PORTS } from '@/data/ports'
import VoyageTimeline from './VoyageTimeline'
import styles from './RoutePanel.module.css'

const DEFAULT_SPEED_KNOTS = 19
/** PLAN.md snap points: 12 (slow steam), 15 (eco), 19 (standard), 22 (fast), 25 (max). */
const SNAP_POINTS = [12, 15, 19, 22, 25] as const
const SNAP_THRESHOLD = 1

function snapValue(v: number): number {
  for (const sp of SNAP_POINTS) {
    if (Math.abs(sp - v) < SNAP_THRESHOLD) return sp
  }
  return v
}

function formatSailingTime(hours: number): string {
  if (hours <= 0) return '—'
  const days = Math.floor(hours / 24)
  const remainder = Math.round(hours % 24)
  return `${days}d ${remainder}h`
}

function formatDistance(nm: number): string {
  return Math.round(nm).toLocaleString()
}

/**
 * Animate a numeric value with requestAnimationFrame + ease-out cubic.
 * Honours prefers-reduced-motion by snapping to the target instantly.
 * The animation goes from the previously-displayed value to the new
 * target, so a route change animates from "old distance" to "new
 * distance" rather than always restarting from 0.
 */
function useCountUp(target: number, durationMs = 800): number {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef(target)

  useEffect(() => {
    if (target === targetRef.current) return
    const from = displayRef.current
    const to = target
    targetRef.current = to

    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced || durationMs === 0) {
      setDisplay(to)
      displayRef.current = to
      return
    }

    const startTime = performance.now()
    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / durationMs, 1)
      // ease-out cubic — fast start, gentle landing
      const eased = 1 - Math.pow(1 - t, 3)
      const value = from + (to - from) * eased
      setDisplay(value)
      displayRef.current = value
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
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
  }, [target, durationMs])

  return display
}

/**
 * Bottom-anchored panel that surfaces the route outcome.
 *
 * - Hidden when there's no route, no in-flight compute, and no
 *   error. Slide-up transition is honoured automatically via
 *   the duration-slow token (zeroed under prefers-reduced-motion).
 * - Loading: spinner + "Computing route…"
 * - Error: human-readable message (NoRouteError / SnapFailedError
 *   / generic — all mapped to strings in MapCanvas's
 *   auto-compute effect).
 * - Success: route header (origin → destination), then the
 *   HeroDistance (animated count-up to the route length in
 *   nautical miles), then the SailingTime at the user-chosen
 *   vessel speed (default 19 knots, snap points at
 *   12/15/19/22/25 per PLAN.md). Speed slider live-recomputes
 *   the SailingTime as the user drags.
 */
export default function RoutePanel() {
  const route = useMapStore((s) => s.route)
  const isComputing = useMapStore((s) => s.isComputing)
  const error = useMapStore((s) => s.error)
  const originId = useMapStore((s) => s.originId)
  const destinationId = useMapStore((s) => s.destinationId)

  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED_KNOTS)

  const origin = originId ? PORTS.find((p) => p.id === originId) : undefined
  const destination = destinationId ? PORTS.find((p) => p.id === destinationId) : undefined

  const hasContent = Boolean(route || isComputing || error)
  const distanceNm = route?.properties.length ?? 0
  const animatedDistance = useCountUp(distanceNm)
  const timeHours = speed > 0 ? distanceNm / speed : 0

  return (
    <div
      className={`${styles.panel} ${hasContent ? '' : styles.panelHidden}`}
      role="status"
      aria-live="polite"
    >
      {isComputing && !route && (
        <div className={styles.center}>
          <div className={styles.spinner} aria-hidden="true" />
          <div className={styles.centerText}>Computing route…</div>
        </div>
      )}

      {error && !route && (
        <div className={styles.center}>
          <div className={`${styles.centerText} ${styles.errorText}`}>{error}</div>
        </div>
      )}

      {route && origin && destination && (
        <div className={styles.body}>
          <div className={styles.route}>
            <span>
              <span className={`${styles.dot} ${styles.dotOrigin}`} />
              <span className={styles.portName}>{origin.name}</span>
            </span>
            <span className={styles.routeArrow}>→</span>
            <span>
              <span className={`${styles.dot} ${styles.dotDestination}`} />
              <span className={styles.portName}>{destination.name}</span>
            </span>
          </div>
          <div className={styles.hero}>
            <span className={styles.heroValue}>{formatDistance(animatedDistance)}</span>
            <span className={styles.heroUnit}>nm</span>
          </div>
          <div className={styles.subline}>
            <span className={styles.sublineLabel}>Sailing time @</span>
            <span>{speed} kn</span>
            <span>·</span>
            <span>{formatSailingTime(timeHours)}</span>
          </div>
          <div className={styles.speedControl}>
            <input
              type="range"
              min={10}
              max={25}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(snapValue(Number(e.target.value)))}
              className={styles.slider}
              aria-label="Vessel speed in knots"
              aria-valuemin={10}
              aria-valuemax={25}
              aria-valuenow={speed}
            />
            <div className={styles.speedValue}>{speed} kn</div>
          </div>
          <div className={styles.snapTicks}>
            {SNAP_POINTS.map((sp) => (
              <button
                key={sp}
                type="button"
                className={`${styles.snapTick} ${speed === sp ? styles.snapTickActive : ''}`}
                onClick={() => setSpeed(sp)}
                aria-label={`Set speed to ${sp} knots`}
                aria-pressed={speed === sp}
              >
                {sp}
              </button>
            ))}
          </div>
          <VoyageTimeline speedKnots={speed} />
        </div>
      )}
    </div>
  )
}
