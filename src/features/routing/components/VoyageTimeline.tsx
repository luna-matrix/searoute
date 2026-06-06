import { useMemo } from 'react'
import { useMapStore } from '@/store/map'
import { PORTS } from '@/data/ports'
import { computeRouteSegments } from '../lib/segments'
import styles from './VoyageTimeline.module.css'

interface VoyageTimelineProps {
  speedKnots: number
}

function formatNm(nm: number): string {
  return `${Math.round(nm).toLocaleString()} nm`
}

function formatHours(hours: number): string {
  if (hours <= 0) return '—'
  const days = Math.floor(hours / 24)
  const remainder = Math.round(hours % 24)
  return `${days}d ${remainder}h`
}

/**
 * Vertical radar-plot-style timeline. One row per leg of the
 * route, with the segment's from/to ports on the left and the
 * distance + time on the right. The connecting line on the
 * left is the maritime spine of the voyage; dots mark the
 * waypoints (origin green, transit amber, destination red).
 *
 * VoyageTimeline lives in the RoutePanel and only renders
 * when a route is present.
 */
export default function VoyageTimeline({ speedKnots }: VoyageTimelineProps) {
  const route = useMapStore((s) => s.route)
  const transitPorts = useMapStore((s) => s.transitPorts)
  const originId = useMapStore((s) => s.originId)
  const destinationId = useMapStore((s) => s.destinationId)

  const origin = originId ? PORTS.find((p) => p.id === originId) : null
  const destination = destinationId ? PORTS.find((p) => p.id === destinationId) : null

  const segments = useMemo(
    () =>
      route
        ? computeRouteSegments(route, transitPorts, origin ?? null, destination ?? null, speedKnots)
        : [],
    [route, transitPorts, origin, destination, speedKnots],
  )

  if (!route || segments.length === 0) return null

  return (
    <div className={styles.timeline} aria-label="Voyage timeline">
      <div className={styles.heading}>Voyage</div>
      {segments.map((seg, i) => {
        const isFirst = i === 0
        const isLast = i === segments.length - 1
        const dotClass =
          isFirst && seg.from === null
            ? `${styles.dot} ${styles.dotOrigin}`
            : isLast
              ? `${styles.dot} ${styles.dotDestination}`
              : styles.dot
        return (
          <div className={styles.segment} key={`${seg.from?.id ?? 'origin'}-${seg.to.id}`}>
            <div className={styles.gutter}>
              {!isFirst && <div className={styles.line} />}
              <div className={dotClass} />
            </div>
            <div className={`${styles.body} ${isLast ? styles.bodyLast : ''}`}>
              <div className={styles.ports}>
                {seg.from && (
                  <>
                    <span className={styles.portFrom}>{seg.from.name}</span>
                    <span className={styles.arrow}>→</span>
                  </>
                )}
                <span className={styles.portTo}>{seg.to.name}</span>
              </div>
              <div className={styles.metrics}>
                <span className={styles.metricValue}>{formatNm(seg.distanceNm)}</span>
                <span> · </span>
                <span>{formatHours(seg.timeHours)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
