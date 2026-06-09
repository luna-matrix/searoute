/**
 * Continent / country outline styling. Subtle "chart table"
 * fill with a thin border so landmasses stay visible even
 * when the basemap fails to load (Carto / ESRI are
 * runtime-fetched and can fail in low-connectivity contexts).
 *
 * The values mirror the Admiralty Night tokens in tokens.css.
 * deck.gl can't read CSS variables, so the raw RGBA lives here.
 * Two palettes are exported — one per theme — and the MapCanvas
 * picks the right one based on the active theme.
 */
import type { ThemeMode } from '../hooks/useTheme'

type RGBA = [number, number, number, number]

interface ContinentPalette {
  fill: RGBA
  stroke: RGBA
  strokeWidthPx: number
}

const DARK: ContinentPalette = {
  fill: [15, 30, 51, 40],
  stroke: [136, 153, 170, 120],
  strokeWidthPx: 0.5,
}

const LIGHT: ContinentPalette = {
  fill: [180, 160, 120, 40],
  stroke: [90, 100, 110, 160],
  strokeWidthPx: 0.5,
}

export function getContinentPalette(theme: ThemeMode): ContinentPalette {
  return theme === 'light' ? LIGHT : DARK
}
