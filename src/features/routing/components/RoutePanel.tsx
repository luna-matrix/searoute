import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMapStore } from '@/store/map'
import { PORTS } from '@/data/ports'
import type { Port } from '@/types/port'
import { detectTransitPorts } from '@/features/map/lib/transit-detection'
import { computeVoyageSegments } from '../lib/voyage-segments'
import type { ReportInput } from '../lib/voyage-report'
import VoyageTimeline from './VoyageTimeline'
import ActionBar from './ActionBar'
import styles from './RoutePanel.module.css'

type Projection = 'globe' | 'flat'
type SectionId = 'overview' | 'breakdown' | 'alternatives' | 'map' | 'speed'

const DEFAULT_SPEED_KNOTS = 19
const SNAP_POINTS = [12, 15, 19, 22, 25] as const
const SNAP_THRESHOLD = 1
const KM_PER_NM = 1.852

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

function formatDelta(nm: number): string {
  const sign = nm >= 0 ? '+' : ''
  return `${sign}${Math.round(nm).toLocaleString()}`
}

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

export default function RoutePanel({
  projection,
  continentRings,
  settingsOpen,
}: {
  projection: Projection
  continentRings?: readonly (readonly [number, number][])[] | null
  settingsOpen?: boolean
}) {
  const route = useMapStore((s) => s.route)
  const alternatives = useMapStore((s) => s.alternatives)
  const selectedAlternativeIndex = useMapStore((s) => s.selectedAlternativeIndex)
  const isComputing = useMapStore((s) => s.isComputing)
  const error = useMapStore((s) => s.error)
  const originId = useMapStore((s) => s.originId)
  const destinationId = useMapStore((s) => s.destinationId)
  const setRoute = useMapStore((s) => s.setRoute)
  const setSelectedAlternativeIndex = useMapStore((s) => s.setSelectedAlternativeIndex)
  const setAlongRoutePorts = useMapStore((s) => s.setAlongRoutePorts)
  const viewingPortId = useMapStore((s) => s.viewingPortId)
  const includeLongAlternatives = useMapStore((s) => s.includeLongAlternatives)
  const setIncludeLongAlternatives = useMapStore((s) => s.setIncludeLongAlternatives)

  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED_KNOTS)
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    () => new Set<SectionId>(['breakdown', 'alternatives', 'map']),
  )

  const origin = originId ? PORTS.find((p) => p.id === originId) : undefined
  const destination = destinationId ? PORTS.find((p) => p.id === destinationId) : undefined
  const waypointIds = useMapStore((s) => s.waypoints)
  const alternativeLabels = useMapStore((s) => s.alternativeLabels)
  const waypoints: Port[] = waypointIds
    .map((id) => PORTS.find((p) => p.id === id))
    .filter((p): p is Port => p !== undefined)
  const isMultiLeg = waypoints.length > 0

  const hasContent = Boolean((route || isComputing || error) && !viewingPortId && !settingsOpen)
  const distanceNm = route?.properties.length ?? 0
  const animatedDistance = useCountUp(distanceNm)
  const timeHours = speed > 0 ? distanceNm / speed : 0

  const segments = useMemo(() => {
    if (!route || !origin || !destination) return null
    return computeVoyageSegments(route, origin.name, destination.name, speed)
  }, [route, origin, destination, speed])

  const baselineNm =
    alternatives.length > 0 ? (alternatives[0]?.properties.length ?? distanceNm) : distanceNm

  const reportInput = useMemo<ReportInput | null>(() => {
    if (!route || !origin || !destination || !segments) return null
    return {
      origin,
      destination,
      waypoints,
      route,
      segments: segments.segments,
      sectors: segments.sectors,
      totalNm: segments.totalNm,
      speedKnots: speed,
      selectedLabel: isMultiLeg
        ? `Multi-leg route (${waypoints.length} stops)`
        : (alternativeLabels[selectedAlternativeIndex] ?? 'Baseline'),
      alternatives: alternatives.map((alt, i) => ({
        label: alternativeLabels[i] ?? `Route ${i + 1}`,
        distanceNm: alt.properties.length,
        isSelected: i === selectedAlternativeIndex,
      })),
    }
  }, [
    route,
    origin,
    destination,
    waypoints,
    segments,
    speed,
    alternatives,
    alternativeLabels,
    selectedAlternativeIndex,
    isMultiLeg,
  ])

  const onSelectAlternative = useCallback(
    (i: number) => {
      const newRoute = alternatives[i]
      if (!newRoute) return
      setRoute(newRoute)
      setSelectedAlternativeIndex(i)
      setAlongRoutePorts(detectTransitPorts(newRoute, PORTS, undefined, continentRings))
    },
    [alternatives, setRoute, setSelectedAlternativeIndex, setAlongRoutePorts, continentRings],
  )

  const toggleSection = useCallback((section: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

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
          {/* ---- Header ---- */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>Voyage</div>
            <div className={styles.headerMeta}>
              <span className={styles.headerChip}>{isMultiLeg ? 'Multi-leg' : 'Direct'}</span>
              <span className={styles.headerChip}>{projection === 'globe' ? 'Globe' : 'Flat'}</span>
            </div>
          </div>

          {/* ---- Route line ---- */}
          <div className={styles.routeRow}>
            <span>
              <span className={`${styles.dot} ${styles.dotOrigin}`} />
              <span className={styles.portName}>{origin.name}</span>
            </span>
            {waypoints.map((wp) => (
              <span key={wp.id} className={styles.routeSeg}>
                <span className={styles.routeArrow}>→</span>
                <span className={`${styles.dot} ${styles.dotWaypoint}`} />
                <span className={styles.portName}>{wp.name}</span>
              </span>
            ))}
            <span className={styles.routeSeg}>
              <span className={styles.routeArrow}>→</span>
              <span className={`${styles.dot} ${styles.dotDestination}`} />
              <span className={styles.portName}>{destination.name}</span>
            </span>
          </div>

          {/* ---- Hero ---- */}
          <div className={styles.hero}>
            <span className={styles.heroValue}>{formatDistance(animatedDistance)}</span>
            <span className={styles.heroUnit}>nm</span>
          </div>
          <div className={styles.heroKm}>{formatDistance(animatedDistance * KM_PER_NM)} km</div>
          <div className={styles.subline}>
            <span className={styles.sublineLabel}>Sailing time @ {speed} kn</span>
            <span>·</span>
            <span>{formatSailingTime(timeHours)}</span>
          </div>

          {/* ---- Speed pills ---- */}
          <div className={styles.speedPills}>
            {SNAP_POINTS.map((sp) => (
              <button
                key={sp}
                type="button"
                className={`${styles.speedPill} ${speed === sp ? styles.speedPillActive : ''}`}
                onClick={() => setSpeed(sp)}
                aria-label={`Set speed to ${sp} knots`}
              >
                {sp} kn
              </button>
            ))}
          </div>

          {/* ---- Accordion: Breakdown ---- */}
          {segments && segments.segments.length > 0 && (
            <Section
              id="breakdown"
              title="Route Breakdown"
              open={openSections.has('breakdown')}
              onToggle={() => toggleSection('breakdown')}
            >
              <div className={styles.breakdown}>
                {segments.segments.map((seg, i) => (
                  <div key={i} className={styles.breakdownRow}>
                    <span className={styles.breakdownLabel}>{seg.label}</span>
                    <span className={styles.breakdownDist}>
                      {formatDistance(seg.distanceNm)} nm
                    </span>
                    <span className={styles.breakdownTime}>{formatSailingTime(seg.timeHours)}</span>
                    <span className={styles.breakdownPct}>{seg.percentage}%</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ---- Accordion: Alternatives ---- */}
          {!isMultiLeg && alternatives.length > 1 && (
            <Section
              id="alternatives"
              title={`Alternatives (${alternatives.length})`}
              open={openSections.has('alternatives')}
              onToggle={() => toggleSection('alternatives')}
            >
              <div className={styles.altList}>
                {alternatives.map((alt, i) => {
                  const isActive = i === selectedAlternativeIndex
                  const label = alternativeLabels[i] ?? `Route ${i + 1}`
                  const altNm = alt.properties.length
                  const delta = altNm - baselineNm
                  return (
                    <button
                      key={`${label}-${i}`}
                      type="button"
                      className={`${styles.altPill} ${isActive ? styles.altPillActive : ''}`}
                      onClick={() => onSelectAlternative(i)}
                    >
                      <span className={styles.altPillIcon}>
                        {isActive ? '✓' : altNm === baselineNm ? '◦' : '↺'}
                      </span>
                      <span className={styles.altPillLabel}>{label}</span>
                      <span className={styles.altPillNm}>{formatDistance(altNm)} nm</span>
                      {delta !== 0 && (
                        <span
                          className={`${styles.altPillDelta} ${delta > 0 ? styles.altPillDeltaUp : ''}`}
                        >
                          {formatDelta(delta)} nm
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className={styles.showLongToggle}
                onClick={() => setIncludeLongAlternatives(!includeLongAlternatives)}
                aria-pressed={includeLongAlternatives}
              >
                {includeLongAlternatives ? '− Hide longer detours' : '+ Show longer detours'}
              </button>
            </Section>
          )}

          {/* ---- Speed slider (collapsible) ---- */}
          <Section
            id="speed"
            title="Vessel Speed"
            open={openSections.has('speed')}
            onToggle={() => toggleSection('speed')}
          >
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
              />
              <div className={styles.speedValue}>{speed} kn</div>
            </div>
          </Section>

          {/* ---- Timeline ---- */}
          <Section
            id="map"
            title="Voyage Map"
            open={openSections.has('map')}
            onToggle={() => toggleSection('map')}
          >
            <VoyageTimeline speedKnots={speed} />
          </Section>

          {reportInput && <ActionBar reportInput={reportInput} />}
        </div>
      )}
    </div>
  )
}

function Section({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`rp-section-${id}`}
      >
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionChevron}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div id={`rp-section-${id}`} className={styles.sectionBody}>
          {children}
        </div>
      )}
    </div>
  )
}
