import type { Port } from '@/types/port'
import type { SeaRouteFeature } from '@/lib/searoute'
import type { VoyageSegment, VoyageSector } from './voyage-segments'

/**
 * Plain-text audit report generator.
 *
 * Produces two report formats:
 *   - Detailed: full audit report for emissions verification
 *   - Summary: compact copy/paste format
 *
 * Includes a conservative GHG distance estimate (+5% buffer) per
 * IMO DCS methodology (Resolution MEPC.338(76)).
 */

const KM_PER_NM = 1.852
const GHG_BUFFER = 1.05
const W = 76

function roundForDisplay(nm: number): number {
  if (nm >= 1000) return Math.round(nm / 100) * 100
  return Math.round(nm / 10) * 10
}

function fmtNm(nm: number): string {
  return Math.round(nm).toLocaleString().padStart(7)
}

function fmtKm(km: number): string {
  return Math.round(km).toLocaleString().padStart(8)
}

function fmtTime(hours: number): string {
  if (hours <= 0) return '--'.padStart(9)
  const d = Math.floor(hours / 24)
  const h = Math.round(hours % 24)
  if (d === 0) return (h + 'h').padStart(9)
  return (d + 'd ' + h + 'h').padStart(9)
}

function fmtTimeShort(hours: number): string {
  if (hours <= 0) return '--'
  const d = Math.floor(hours / 24)
  const h = Math.round(hours % 24)
  if (d === 0) return h + 'h'
  if (h === 0) return d + 'd'
  return d + 'd ' + h + 'h'
}

function fmtCoord(lat: number, lng: number): string {
  const latH = lat >= 0 ? 'N' : 'S'
  const lngH = lng >= 0 ? 'E' : 'W'
  return (
    Math.abs(lat).toFixed(4) + '\u00B0' + latH + '  ' + Math.abs(lng).toFixed(4) + '\u00B0' + lngH
  )
}

function line(w: number, ch: string): string {
  return ch.repeat(w)
}

function center(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(pad) + text
}

function padR(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length)
}

function portMeta(port: Port): string {
  let s = port.name
  if (port.unlocode) s += ' (' + port.unlocode + ')'
  s += ', ' + port.country
  return s
}

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
  const ghgNm = totalNm * GHG_BUFFER
  const ghgKm = ghgNm * KM_PER_NM
  const out: string[] = []

  out.push(line(W, '='))
  out.push(center('SEA ROUTE VOYAGE REPORT', W))
  out.push(line(W, '='))
  out.push('')
  out.push('Generated:       ' + now + ' UTC')
  out.push('Software:        SeaRoute v1')
  out.push('Routing engine:  searoute-ts v2 (Eurostat marnet_plus_100km)')
  out.push('')

  // 1. Voyage Summary
  out.push(line(W, '-'))
  out.push('  1. VOYAGE SUMMARY')
  out.push(line(W, '-'))
  out.push('')
  out.push('  Origin:          ' + portMeta(origin))
  out.push('                   ' + fmtCoord(origin.lat, origin.lng))
  if (waypoints.length > 0) {
    out.push(
      '  Via:             ' +
        waypoints
          .map(function (w) {
            return w.name
          })
          .join(' -> '),
    )
  }
  out.push('  Destination:     ' + portMeta(destination))
  out.push('                   ' + fmtCoord(destination.lat, destination.lng))
  out.push('')
  out.push('  Route variant:   ' + selectedLabel)
  out.push(
    '  Total distance:  ' +
      Math.round(totalNm).toLocaleString() +
      ' nm (' +
      Math.round(totalKm).toLocaleString() +
      ' km)',
  )
  out.push('  Sailing time:    ' + fmtTimeShort(totalHours) + ' @ ' + speedKnots + ' kn')
  out.push('')
  out.push(
    '  GHG distance:    ' +
      roundForDisplay(ghgNm).toLocaleString() +
      ' nm (' +
      roundForDisplay(ghgKm).toLocaleString() +
      ' km)',
  )
  out.push('                   Includes +5% buffer for weather routing, port')
  out.push('                   approach, and voyage deviation per IMO DCS')
  out.push('                   methodology (Resolution MEPC.338(76), adopted')
  out.push('                   17 June 2021, MEPC 76th session).')
  out.push('')

  const gcLength = route.properties.greatCircleLength ?? 0
  if (gcLength > 0) {
    const detour = Math.round((totalNm / gcLength - 1) * 100)
    out.push(
      '  Great-circle:    ' +
        Math.round(gcLength).toLocaleString() +
        ' nm (detour: +' +
        detour +
        '%)',
    )
    out.push('')
  }

  if (passages.length > 0) {
    out.push(
      '  Traverses:       ' +
        passages
          .map(function (p) {
            return p.charAt(0).toUpperCase() + p.slice(1).replace(/_/g, ' ')
          })
          .join(', '),
    )
    out.push('')
  }

  const snapO = Math.round(route.properties.originSnapKm ?? 0)
  const snapD = Math.round(route.properties.destinationSnapKm ?? 0)
  if (snapO > 0 || snapD > 0) {
    out.push('  Network snap:    Origin ' + snapO + ' km, Destination ' + snapD + ' km')
    out.push('')
  }

  // 2. Segment Breakdown
  out.push(line(W, '-'))
  out.push('  2. SEGMENT BREAKDOWN')
  out.push(line(W, '-'))
  out.push('')
  out.push(
    '  ' +
      padR('Segment', 38) +
      ' ' +
      'Dist (nm)'.padStart(9) +
      ' ' +
      'Dist (km)'.padStart(9) +
      ' ' +
      'Time'.padStart(9) +
      ' ' +
      '%'.padStart(5),
  )
  out.push('  ' + line(W - 2, '-'))

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const km = seg.distanceNm * KM_PER_NM
    out.push(
      '  ' +
        padR(seg.label, 38) +
        ' ' +
        fmtNm(seg.distanceNm) +
        '  ' +
        fmtKm(km) +
        '  ' +
        fmtTime(seg.timeHours) +
        ' ' +
        Math.round(seg.percentage).toString().padStart(4) +
        '%',
    )
  }

  out.push('  ' + line(W - 2, '-'))
  out.push(
    '  ' +
      padR('TOTAL', 38) +
      ' ' +
      fmtNm(totalNm) +
      '  ' +
      fmtKm(totalKm) +
      '  ' +
      fmtTime(totalHours) +
      '  100%',
  )
  out.push('')

  // 3. Waypoint Coordinates
  out.push(line(W, '-'))
  out.push('  3. WAYPOINT COORDINATES')
  out.push(line(W, '-'))
  out.push('')
  out.push(
    '  ' +
      padR('Point', 32) +
      ' ' +
      'Latitude'.padStart(12) +
      ' ' +
      'Longitude'.padStart(13) +
      ' ' +
      'Code'.padStart(7) +
      ' ' +
      'Size'.padStart(8),
  )
  out.push('  ' + line(W - 2, '-'))

  const allPoints = []
  allPoints.push({
    name: origin.name,
    lat: origin.lat,
    lng: origin.lng,
    code: origin.unlocode || '--',
    size: origin.size,
  })
  for (let wi = 0; wi < waypoints.length; wi++) {
    const wp = waypoints[wi]
    allPoints.push({
      name: wp.name,
      lat: wp.lat,
      lng: wp.lng,
      code: wp.unlocode || '--',
      size: wp.size,
    })
  }
  for (let si = 0; si < sectors.length; si++) {
    const sector = sectors[si]
    allPoints.push({
      name: sector.name,
      lat: sector.position[1],
      lng: sector.position[0],
      code: '--',
      size: '--',
    })
  }
  allPoints.push({
    name: destination.name,
    lat: destination.lat,
    lng: destination.lng,
    code: destination.unlocode || '--',
    size: destination.size,
  })

  for (let pi = 0; pi < allPoints.length; pi++) {
    const pt = allPoints[pi]
    out.push(
      '  ' +
        padR(pt.name, 30) +
        ' ' +
        fmtCoord(pt.lat, pt.lng).padStart(26) +
        ' ' +
        padR(pt.code, 7) +
        ' ' +
        padR(pt.size, 8),
    )
  }
  out.push('')

  // 4. Port Details
  out.push(line(W, '-'))
  out.push('  4. PORT DETAILS')
  out.push(line(W, '-'))
  out.push('')

  const detailPorts = [{ port: origin, role: 'Origin' }]
  for (let di = 0; di < waypoints.length; di++) {
    detailPorts.push({ port: waypoints[di], role: 'Waypoint' })
  }
  detailPorts.push({ port: destination, role: 'Destination' })

  for (let dpi = 0; dpi < detailPorts.length; dpi++) {
    const dp = detailPorts[dpi]
    const dlabel = dp.port.unlocode ? dp.port.name + ' (' + dp.port.unlocode + ')' : dp.port.name
    out.push('  ' + dp.role + ': ' + dlabel)
    out.push('    Class:         ' + dp.port.size)
    out.push('    Region:        ' + dp.port.region)

    const depths = []
    if (dp.port.depths.channel !== undefined)
      depths.push('Channel ' + dp.port.depths.channel + ' m')
    if (dp.port.depths.anchorage !== undefined)
      depths.push('Anchorage ' + dp.port.depths.anchorage + ' m')
    if (dp.port.depths.cargoPier !== undefined)
      depths.push('Pier ' + dp.port.depths.cargoPier + ' m')
    out.push('    Depth:         ' + (depths.length > 0 ? depths.join(', ') : '--'))

    if (dp.port.maxVessel) {
      const v = dp.port.maxVessel
      const vparts = []
      if (v.length) vparts.push(v.length + 'm L')
      if (v.beam) vparts.push(v.beam + 'm B')
      if (v.draft) vparts.push(v.draft + 'm draft')
      if (v.dwt) vparts.push(v.dwt.toLocaleString() + ' DWT')
      out.push('    Max vessel:    ' + vparts.join(' / '))
    }

    const restrictions =
      dp.port.restrictions && dp.port.restrictions.length > 0
        ? dp.port.restrictions.join(', ')
        : '--'
    out.push('    Restrictions:  ' + restrictions)
    out.push('')
  }

  // 5. Alternative Routes
  if (alternatives.length > 1) {
    let baseline = totalNm
    for (let ai = 0; ai < alternatives.length; ai++) {
      if (alternatives[ai].isSelected) {
        baseline = alternatives[ai].distanceNm
        break
      }
    }
    out.push(line(W, '-'))
    out.push('  5. ALTERNATIVE ROUTES')
    out.push(line(W, '-'))
    out.push('')
    out.push(
      '  ' + padR('Route', 42) + ' ' + 'Dist (nm)'.padStart(9) + ' ' + 'vs Selected'.padStart(14),
    )
    out.push('  ' + line(W - 2, '-'))
    for (let ali = 0; ali < alternatives.length; ali++) {
      const alt = alternatives[ali]
      const marker = alt.isSelected ? ' (selected)' : ''
      const delta = alt.distanceNm - baseline
      const deltaStr =
        delta === 0
          ? 'baseline'
          : (delta > 0 ? '+' : '') + Math.round(delta).toLocaleString() + ' nm'
      out.push(
        '  ' +
          padR(alt.label + marker, 42) +
          ' ' +
          fmtNm(alt.distanceNm) +
          '  ' +
          deltaStr.padStart(14),
      )
    }
    out.push('  ' + line(W - 2, '-'))
    let shortest = alternatives[0]
    for (let sli = 1; sli < alternatives.length; sli++) {
      if (alternatives[sli].distanceNm < shortest.distanceNm) shortest = alternatives[sli]
    }
    out.push(
      '  Shortest: ' +
        shortest.label +
        ' (' +
        Math.round(shortest.distanceNm).toLocaleString() +
        ' nm)',
    )
    out.push('')
  }

  // 6. Methodology
  out.push(line(W, '-'))
  out.push('  6. METHODOLOGY & ASSUMPTIONS')
  out.push(line(W, '-'))
  out.push('')
  out.push('  Routing engine:    searoute-ts v2')
  out.push('  Network:           Eurostat marnet_plus_100km global maritime graph')
  out.push('  Algorithm:         Dijkstra shortest-path with passage restrictions')
  out.push('  Distance unit:     Nautical miles (1 nm = 1.852 km)')
  out.push('  Speed assumption:  ' + speedKnots + ' knots (user-selected)')
  out.push('  Voyage time:       Distance / speed, continuous sailing, no port time')
  out.push('  Snap tolerance:    Ports snapped to nearest maritime network vertex')
  out.push('  Passage detection: Named chokepoints from searoute-ts passage database')
  out.push('  Arctic routes:     Blocked by default (Northwest / Northeast passages)')
  out.push('  Display rounding:  Distances >= 1000 nm to nearest 100; < 1000 nm to nearest 10')
  out.push('')
  out.push('  GHG distance basis:')
  out.push('    Conservative estimate = total distance x 1.05')
  out.push('    Buffer accounts for weather routing deviations, port approach')
  out.push('    manoeuvring, anchorage holding patterns, and speed adjustment')
  out.push('    zones.')
  out.push('')
  out.push('    Reference: IMO MARPOL Annex VI, Regulation 22A (Data Collection')
  out.push('    System for fuel oil consumption).  IMO Resolution MEPC.338(76)')
  out.push('    "2021 Guidelines on the Operational Carbon Intensity Reduction')
  out.push('    Factors relative to reference lines" (adopted 17 June 2021,')
  out.push('    MEPC 76th session).  See also EU Regulation 2015/757 (EU MRV)')
  out.push('    Article 14 for voyage distance methodology.')
  out.push('')
  out.push('    For emissions calculation: multiply GHG distance (nm) by the')
  out.push('    applicable emissions factor (gCO2/nm) for vessel type, size,')
  out.push('    speed, and load condition.')
  out.push('')

  out.push(line(W, '='))
  out.push(center('END OF REPORT', W))
  out.push(line(W, '='))

  return out.join('\n')
}

export function generateQuickSummary(input: ReportInput): string {
  const {
    origin,
    destination,
    waypoints,
    segments,
    totalNm,
    speedKnots,
    selectedLabel,
    alternatives,
  } = input

  const totalKm = totalNm * KM_PER_NM
  const totalHours = speedKnots > 0 ? totalNm / speedKnots : 0
  const ghgNm = totalNm * GHG_BUFFER
  const ghgKm = ghgNm * KM_PER_NM
  const out: string[] = []

  out.push(line(W, '='))
  out.push(center('SEA ROUTE - QUICK SUMMARY', W))
  out.push(line(W, '='))
  out.push('')

  const wpStr =
    waypoints.length > 0
      ? ' via ' +
        waypoints
          .map(function (w) {
            return w.name
          })
          .join(', ')
      : ''
  out.push(
    '  ' +
      origin.name +
      ' (' +
      (origin.unlocode || '--') +
      ') -> ' +
      destination.name +
      ' (' +
      (destination.unlocode || '--') +
      ')' +
      wpStr,
  )
  out.push('')
  out.push('  Route:       ' + selectedLabel)
  out.push(
    '  Distance:    ' +
      Math.round(totalNm).toLocaleString() +
      ' nm (' +
      Math.round(totalKm).toLocaleString() +
      ' km)',
  )
  out.push(
    '  GHG basis:   ' +
      roundForDisplay(ghgNm).toLocaleString() +
      ' nm (' +
      roundForDisplay(ghgKm).toLocaleString() +
      ' km) -- +5% buffer',
  )
  out.push('  Sailing:     ' + fmtTimeShort(totalHours) + ' @ ' + speedKnots + ' kn')
  out.push('')

  if (segments.length > 0) {
    out.push('  Segments:')
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      out.push(
        '    ' +
          padR(seg.label, 36) +
          ' ' +
          fmtNm(seg.distanceNm) +
          ' nm  ' +
          fmtTimeShort(seg.timeHours).padStart(7) +
          '  ' +
          Math.round(seg.percentage).toString().padStart(3) +
          '%',
      )
    }
    out.push('')
  }

  if (alternatives.length > 1) {
    let baseline = totalNm
    for (let ai = 0; ai < alternatives.length; ai++) {
      if (alternatives[ai].isSelected) {
        baseline = alternatives[ai].distanceNm
        break
      }
    }
    out.push('  Alternatives:')
    for (let ali = 0; ali < alternatives.length; ali++) {
      const alt = alternatives[ali]
      const marker = alt.isSelected ? ' (selected)' : ''
      const delta = alt.distanceNm - baseline
      const deltaStr =
        delta === 0
          ? 'baseline'
          : (delta > 0 ? '+' : '') + Math.round(delta).toLocaleString() + ' nm'
      out.push(
        '    ' + padR(alt.label + marker, 40) + ' ' + fmtNm(alt.distanceNm) + ' nm  ' + deltaStr,
      )
    }
    out.push('')
  }

  out.push('  GHG ref: IMO MEPC.338(76), 17 June 2021')
  out.push('')
  out.push(line(W, '='))

  return out.join('\n')
}
