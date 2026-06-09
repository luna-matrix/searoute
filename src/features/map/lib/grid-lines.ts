import type { ThemeMode } from '../hooks/useTheme'
import type { GridSettings } from '@/store/map'

/**
 * Latitude / longitude grid lines — a subtle "admiralty chart"
 * spider-web drawn below everything except the basemap tiles.
 *
 * Each grid line is a dense array of [lng, lat] points.
 * Meridians run from pole to pole at a fixed longitude.
 * Parallels circle the globe at a fixed latitude.
 *
 * Density adapts to zoom — wider intervals at low zoom,
 * tighter intervals at high zoom.
 */

type RGBA = [number, number, number, number]

export interface GridLineData {
  coords: [number, number][]
  color: RGBA
  widthPx: number
  isMajor: boolean
}

const PARALLEL_STEP = 0.5
const MERIDIAN_STEP = 0.5

function parallelCoords(lat: number): [number, number][] {
  const coords: [number, number][] = []
  for (let lng = -180; lng <= 180; lng += PARALLEL_STEP) {
    coords.push([Number(lng.toFixed(1)), lat])
  }
  return coords
}

function meridianCoords(lng: number): [number, number][] {
  const coords: [number, number][] = []
  for (let lat = -85; lat <= 85; lat += MERIDIAN_STEP) {
    coords.push([lng, Number(lat.toFixed(1))])
  }
  // Close the meridian — draw a short segment across the pole
  // so the line reads as a complete north-south arc on the sphere.
  if (coords.length > 0 && coords[coords.length - 1]![1] === 85) {
    coords.push([lng, 90])
  }
  return coords
}

function colorForTheme(theme: ThemeMode, isMajor: boolean, opacityMul: number): RGBA {
  const base = isMajor ? 1.5 : 1.0
  const alpha = Math.round(Math.min(255, 20 * base * opacityMul))
  if (theme === 'light') {
    return [90, 100, 110, alpha]
  }
  return [136, 153, 170, alpha]
}

const MAJOR_PARALLELS = new Set([-60, -30, 0, 30, 60])
const MAJOR_MERIDIANS = new Set([-180, -90, 0, 90, 180])

function isMajor(line: 'parallel' | 'meridian', value: number): boolean {
  if (line === 'parallel') return MAJOR_PARALLELS.has(value)
  return MAJOR_MERIDIANS.has(value)
}

/**
 * Build the grid-line data array for the current zoom level
 * and settings.  Returns empty when `settings.showGrid` is false.
 */
export function computeGridLines(
  theme: ThemeMode,
  zoom: number,
  settings: GridSettings,
): GridLineData[] {
  if (!settings.showGrid) return []

  const interval =
    settings.gridDensity === 'major'
      ? 30
      : settings.gridDensity === 'medium'
        ? zoom < 1.0
          ? 30
          : zoom < 2.0
            ? 15
            : 10
        : zoom < 1.0
          ? 15
          : zoom < 2.0
            ? 10
            : 5

  const lines: GridLineData[] = []

  for (let lat = -90 + interval; lat <= 90 - interval; lat += interval) {
    lines.push({
      coords: parallelCoords(lat),
      color: colorForTheme(theme, isMajor('parallel', lat), settings.gridOpacity),
      widthPx: 0.4,
      isMajor: isMajor('parallel', lat),
    })
  }

  for (let lng = -180; lng < 180; lng += interval) {
    lines.push({
      coords: meridianCoords(lng),
      color: colorForTheme(theme, isMajor('meridian', lng), settings.gridOpacity),
      widthPx: 0.4,
      isMajor: isMajor('meridian', lng),
    })
  }

  return lines
}
