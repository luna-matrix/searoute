import type { Port } from '@/types/port'
import type { SeaRouteFeature } from '@/lib/searoute'
import type { VoyageSegment, VoyageSector } from './voyage-segments'

/**
 * Plain-text audit report generator.
 *
 * Produces a formatted voyage report suitable for distance-based
 * emissions auditing.  Contains the route summary, per-segment
 * distances (nm + km), sailing time breakdown, alternative route
 * comparison, and methodology notes.
 *
 * Callers download this as a .txt file or copy to clipboard.
 */

const KM_PER_NM = 1.852

function fmtNm(nm: number): string {
  return Math.round(nm).toLocaleString().padStart(7)
}

function fmtKm(km: number): string {
  return Math.round(km).toLocaleString().padStart(8)
}

function fmtTime(hours: number): string {
  if (hours <= 0) return '—'.padStart(9)
  const d = Math.floor(hours / 24)
  const h = Math.round(hours % 24)
  if (d === 0) return `${h}h`.padStart(9)
  return `${d}d ${h}h`.padStart(9)
}

function fmtCoord(lat: number, lng: number): string {
  const latH = lat >= 0 ? 'N' : 'S'
  const lngH = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}°${latH}  ${Math.abs(lng).toFixed(4)}°${lngH}`
}

function line(w: number, ch = '-'): string {
  return ch.repeat(w)
}

const W = 70

export interface ReportInput {
  origin: Port
  destination: Port
  waypoints: Port[]
  route: SeaRouteFeature
  segments: VoyageSegment[]
  sectors: VoyageSector[]
  totalNm: number
  speedKnots: number
  selectedLabel: string
  alternatives: { label: string; distanceNm: number; isSelected: boolean }[]
}

export function generateReport(input: ReportInput): string {
  const {
    origin,
    destination,
    waypoints,
    route,
    segments,
    sectors,
    totalNm,
    speedKnots,
    selectedLabel,
    alternatives,
  } = input

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const totalKm = totalNm * KM_PER_NM
  const totalHours = speedKnots > 0 ? totalNm / speedKnots : 0
  const passages = route.properties.passages ?? []

  const out: string[] = []

  out.push(line(W, '='))
  out.push(center('SEA ROUTE VOYAGE REPORT', W))
  out.push(line(W, '='))
  out.push('')
  out.push(`Generated:       ${now} UTC`)
  out.push(`Software:        SeaRoute v1`)
  out.push(`Routing engine:  searoute-ts v2 (Eurostat marnet_plus_100km)`)
  out.push('')

  // ---- 1. Voyage summary ----
  out.push(line(W, '-'))
  out.push('1. VOYAGE SUMMARY')
  out.push(line(W, '-'))
  out.push('')
  out.push(
    `Origin:          ${origin.name}, ${origin.country}${origin.unlocode ? ` (${origin.unlocode})` : ''}`,
  )
  out.push(`                 ${fmtCoord(origin.lat, origin.lng)}`)
  const waypointList = waypoints.map((w) => w.name).join(' → ')
  if (waypointList) {
    out.push(`Via:             ${waypointList}`)
  }
  out.push(
    `Destination:     ${destination.name}, ${destination.country}${destination.unlocode ? ` (${destination.unlocode})` : ''}`,
  )
  out.push(`                 ${fmtCoord(destination.lat, destination.lng)}`)
  out.push('')
  out.push(`Route variant:   ${selectedLabel}`)
  out.push(
    `Total distance:  ${Math.round(totalNm).toLocaleString()} nautical miles (${Math.round(totalKm).toLocaleString()} km)`,
  )
  out.push(`Sailing time:    ${fmtTime(totalHours).trim()} @ ${speedKnots} kn`)
  out.push('')
  const gcLength = route.properties.greatCircleLength ?? 0
  const detour = gcLength > 0 ? Math.round((totalNm / gcLength - 1) * 100) : 0
  if (gcLength > 0) {
    out.push(`Great-circle:    ${Math.round(gcLength).toLocaleString()} nm (detour: +${detour}%)`)
    out.push('')
  }

  if (passages.length > 0) {
    const passageNames = passages
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' '))
      .join(', ')
    out.push(`Traverses:       ${passageNames}`)
    out.push('')
  }

  const snapO = Math.round(route.properties.originSnapKm ?? 0)
  const snapD = Math.round(route.properties.destinationSnapKm ?? 0)
  if (snapO > 0 || snapD > 0) {
    out.push(`Network snap:    Origin ${snapO} km, Destination ${snapD} km`)
    out.push('')
  }

  // ---- 2. Segment breakdown ----
  out.push(line(W, '-'))
  out.push('2. SEGMENT BREAKDOWN')
  out.push(line(W, '-'))
  out.push('')
  out.push(
    `Segment                                         Dist (nm)  Dist (km)  Time @ ${speedKnots} kn`,
  )
  out.push(line(W, '-'))

  for (const seg of segments) {
    const km = seg.distanceNm * KM_PER_NM
    out.push(
      `${seg.label.padEnd(47)}  ${fmtNm(seg.distanceNm)}  ${fmtKm(km)}  ${fmtTime(seg.timeHours)}`,
    )
  }

  out.push(line(W, '-'))
  out.push(
    `TOTAL                                             ${fmtNm(totalNm)}  ${fmtKm(totalKm)}  ${fmtTime(totalHours)}`,
  )
  out.push('')

  // ---- Key waypoint coordinates ----
  out.push(line(W, '-'))
  out.push('3. WAYPOINT COORDINATES')
  out.push(line(W, '-'))
  out.push('')
  out.push(`Point                                             Latitude       Longitude`)
  out.push(line(W, '-'))
  out.push(`${origin.name.padEnd(49)} ${fmtCoord(origin.lat, origin.lng)}`)
  for (const wp of waypoints) {
    out.push(`${wp.name.padEnd(49)} ${fmtCoord(wp.lat, wp.lng)}`)
  }
  for (const sector of sectors) {
    out.push(`${sector.name.padEnd(49)} ${fmtCoord(sector.position[1], sector.position[0])}`)
  }
  out.push(`${destination.name.padEnd(49)} ${fmtCoord(destination.lat, destination.lng)}`)
  out.push('')

  // ---- 4. Alternative routes ----
  if (alternatives.length > 1) {
    const baseline = alternatives.find((a) => a.isSelected)?.distanceNm ?? totalNm
    out.push(line(W, '-'))
    out.push('3. ALTERNATIVE ROUTES')
    out.push(line(W, '-'))
    out.push('')
    out.push(`Route                                             Dist (nm)  vs Baseline`)
    out.push(line(W, '-'))
    for (const alt of alternatives) {
      const marker = alt.isSelected ? ' (selected)' : ''
      const delta = alt.distanceNm - baseline
      const deltaStr =
        delta === 0 ? 'baseline' : `${delta > 0 ? '+' : ''}${Math.round(delta).toLocaleString()} nm`
      out.push(`${(alt.label + marker).padEnd(49)}  ${fmtNm(alt.distanceNm)}  ${deltaStr}`)
    }
    out.push(line(W, '-'))
    out.push('')
  }

  // ---- 5. Methodology ----
  out.push(line(W, '-'))
  out.push('5. METHODOLOGY & ASSUMPTIONS')
  out.push(line(W, '-'))
  out.push('')
  out.push(`Routing engine:    searoute-ts v2`)
  out.push(`Network:           Eurostat marnet_plus_100km global maritime graph`)
  out.push(`Algorithm:         Dijkstra shortest-path with passage restrictions`)
  out.push(`Distance unit:     Nautical miles (1 nm = 1.852 km)`)
  out.push(`Speed assumption:  ${speedKnots} knots (user-selected)`)
  out.push(`Voyage time:       Distance ÷ speed, continuous sailing`)
  out.push(`Snap tolerance:    Ports snapped to nearest maritime network vertex`)
  out.push(`Passage detection: Named chokepoints from searoute-ts passage database`)
  out.push(`Arctic routes:     Blocked by default (Northwest / Northeast passages)`)
  out.push('')
  out.push(`For emissions auditing, multiply the segment or total distances by`)
  out.push(`the applicable emissions factor per vessel type, size, and load.`)
  out.push('')

  // ---- Footer ----
  out.push(line(W, '='))
  out.push(center('END OF REPORT', W))
  out.push(line(W, '='))

  return out.join('\n')
}

function center(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(pad) + text
}
