import { useMemo } from 'react'
import { useMapStore } from '@/store/map'
import { PORTS } from '@/data/ports'
import { computeVoyageSegments } from '../lib/voyage-segments'
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

export default function VoyageTimeline({ speedKnots }: VoyageTimelineProps) {
  const route = useMapStore((s) => s.route)
  const alongRoutePorts = useMapStore((s) => s.alongRoutePorts)
  const originId = useMapStore((s) => s.originId)
  const destinationId = useMapStore((s) => s.destinationId)

  const origin = originId ? PORTS.find((p) => p.id === originId) : null
  const destination = destinationId ? PORTS.find((p) => p.id === destinationId) : null

  const segments = useMemo(() => {
    if (!route || !origin || !destination) return null
    return computeVoyageSegments(route, origin.name, destination.name, speedKnots)
  }, [route, origin, destination, speedKnots])

  if (!route || !origin || !destination || !segments) return null

  const majorCount = alongRoutePorts.filter((p) => p.size === 'Major').length
  const hasPassages = segments.segments.length > 1

  return (
    <div className={styles.timeline} aria-label="Voyage summary">
      {hasPassages ? (
        <div className={styles.segmentList}>
          {segments.segments.map((seg, i) => (
            <div key={i} className={styles.segmentRow}>
              <div className={styles.segmentGutter}>
                <div
                  className={`${styles.segmentDot} ${i === 0 ? styles.dotOrigin : i === segments.segments.length - 1 ? styles.dotDestination : styles.dotChokepoint}`}
                />
                {i < segments.segments.length - 1 && <div className={styles.segmentLine} />}
              </div>
              <div className={styles.segmentBody}>
                <div className={styles.segmentLabel}>{seg.label}</div>
                <div className={styles.segmentMeta}>
                  <span className={styles.segmentDist}>{formatNm(seg.distanceNm)}</span>
                  <span className={styles.segmentSep}>·</span>
                  <span>{formatHours(seg.timeHours)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.simpleRow}>
          <div className={styles.simpleGutter}>
            <div className={`${styles.segmentDot} ${styles.dotOrigin}`} />
            <div className={styles.segmentLine} />
            <div className={`${styles.segmentDot} ${styles.dotDestination}`} />
          </div>
          <div className={styles.simpleBody}>
            <div className={styles.simpleLabel}>
              {origin.name} → {destination.name}
            </div>
            <div className={styles.simpleMeta}>
              <span className={styles.segmentDist}>{formatNm(segments.totalNm)}</span>
              <span className={styles.segmentSep}>·</span>
              <span>{formatHours(segments.segments[0]!.timeHours)}</span>
            </div>
          </div>
        </div>
      )}

      {majorCount > 0 && (
        <div className={styles.via}>
          via {majorCount} major {majorCount === 1 ? 'port' : 'ports'} along the route
        </div>
      )}
    </div>
  )
}
