import type { ThemeMode } from '../hooks/useTheme'

/**
 * Maritime reference lines: equator, tropics, and polar circles.
 *
 * These are important navigational references — they define
 * climate zones, trade-wind belts, and legal boundaries
 * (e.g. Arctic shipping regulations).  Rendered as subtle
 * dashed lines so they sit under the route and ports without
 * competing for visual attention.
 *
 * Each line is a dense array of [lng, lat] points at a fixed
 * latitude, sampled every 0.5° of longitude from -180 to +180.
 * On the globe this produces a smooth great-circle; on the flat
 * Mercator map it's a straight horizontal line.
 */

type RGBA = [number, number, number, number]

export interface ReferenceLineDef {
  id: string
  name: string
  latitude: number
  emphasis: 'primary' | 'secondary'
}

interface ReferenceLineStyle {
  color: RGBA
  widthPx: number
}

export interface ReferenceLineData {
  coords: [number, number][]
  color: RGBA
  widthPx: number
}

const SAMPLING_STEP_DEG = 0.5

function buildCoords(lat: number): [number, number][] {
  const coords: [number, number][] = []
  for (let lng = -180; lng <= 180; lng += SAMPLING_STEP_DEG) {
    coords.push([Number(lng.toFixed(1)), lat])
  }
  return coords
}

const LINES: readonly ReferenceLineDef[] = [
  { id: 'equator', name: 'Equator', latitude: 0, emphasis: 'primary' },
  { id: 'tropic-cancer', name: 'Tropic of Cancer', latitude: 23.44, emphasis: 'secondary' },
  { id: 'tropic-capricorn', name: 'Tropic of Capricorn', latitude: -23.44, emphasis: 'secondary' },
  { id: 'arctic-circle', name: 'Arctic Circle', latitude: 66.56, emphasis: 'secondary' },
  { id: 'antarctic-circle', name: 'Antarctic Circle', latitude: -66.56, emphasis: 'secondary' },
]

/** Cached per-theme so we don't rebuild on every render. */
const dataCache = new Map<string, ReferenceLineData[]>()

function buildLineData(theme: ThemeMode): ReferenceLineData[] {
  const cacheKey = theme
  const cached = dataCache.get(cacheKey)
  if (cached) return cached

  const data: ReferenceLineData[] = []
  for (const line of LINES) {
    const style = getLineStyle(theme, line.emphasis)
    data.push({
      coords: buildCoords(line.latitude),
      color: style.color,
      widthPx: style.widthPx,
    })
  }
  dataCache.set(cacheKey, data)
  return data
}

function getLineStyle(theme: ThemeMode, emphasis: 'primary' | 'secondary'): ReferenceLineStyle {
  if (theme === 'light') {
    return emphasis === 'primary'
      ? { color: [90, 100, 110, 100], widthPx: 1.0 }
      : { color: [90, 100, 110, 60], widthPx: 0.7 }
  }
  return emphasis === 'primary'
    ? { color: [136, 153, 170, 70], widthPx: 1.0 }
    : { color: [136, 153, 170, 40], widthPx: 0.7 }
}

export function getReferenceLineData(theme: ThemeMode): ReferenceLineData[] {
  return buildLineData(theme)
}
