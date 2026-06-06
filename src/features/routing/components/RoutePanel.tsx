import { useMapStore } from '@/store/map'
import { PORTS } from '@/data/ports'
import styles from './RoutePanel.module.css'

const DEFAULT_SPEED_KNOTS = 19

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
 * Bottom-anchored panel that surfaces the route outcome.
 *
 * - Hidden when there's no route, no in-flight compute, and no
 *   error. The slide-up transition is honoured automatically via
 *   the duration-slow token (zeroed under prefers-reduced-motion).
 * - Loading state: spinner + "Computing route…"
 * - Error state: human-readable message (NoRouteError /
 *   SnapFailedError / generic — all mapped to strings in
 *   MapCanvas's auto-compute effect).
 * - Success state: route header (origin → destination), the
 *   HeroDistance (big tabular number), SailingTime at the
 *   default 19 knots. Speed slider + count-up animation land
 *   in chunk 4.4.
 */
export default function RoutePanel() {
  const route = useMapStore((s) => s.route)
  const isComputing = useMapStore((s) => s.isComputing)
  const error = useMapStore((s) => s.error)
  const originId = useMapStore((s) => s.originId)
  const destinationId = useMapStore((s) => s.destinationId)

  const origin = originId ? PORTS.find((p) => p.id === originId) : undefined
  const destination = destinationId ? PORTS.find((p) => p.id === destinationId) : undefined

  const hasContent = Boolean(route || isComputing || error)
  const distanceNm = route?.properties.length ?? 0
  const timeHours = distanceNm / DEFAULT_SPEED_KNOTS

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
            <span className={styles.heroValue}>{formatDistance(distanceNm)}</span>
            <span className={styles.heroUnit}>nm</span>
          </div>
          <div className={styles.subline}>
            <span className={styles.sublineLabel}>Sailing time @</span>
            <span>{DEFAULT_SPEED_KNOTS} kn</span>
            <span>·</span>
            <span>{formatSailingTime(timeHours)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
