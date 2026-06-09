import type { ThemeMode } from '../hooks/useTheme'
import type { LabelCategory, LabelEmphasis } from '@/data/map-labels'

type RGBA = [number, number, number, number]

/**
 * Multi-category label styling.
 *
 * Each label category (land, water, channel, feature, island)
 * gets its own colour + size treatment so the user can visually
 * distinguish country names from ocean names from strait names
 * at a glance.
 *
 * Port labels are treated as a separate category — they use
 * the store-controlled alongRoutePorts array, not the curated
 * map-labels dataset.
 */

export interface CategoryStyle {
  color: RGBA
  outlineColor: RGBA
  fontSizePx: number
  /** Category font sizes indexed by emphasis tier. */
  emphasisSize: Record<LabelEmphasis, number>
  fontWeight: number
  fontStyle?: 'normal' | 'italic'
}

export interface LabelPalette {
  land: CategoryStyle
  water: CategoryStyle
  channel: CategoryStyle
  feature: CategoryStyle
  island: CategoryStyle
  globalOutline: RGBA
  port: RGBA
  portFontSizePx: number
  portFontWeight: number
  /** Size multiplier per emphasis, used by pre-multi-category codepaths. */
  countryFontSizePx: Record<'large' | 'normal' | 'small', number>
  countryFontWeight: number
  country: RGBA
  countryOutline: RGBA
}

/* ------------------------------------------------------------------ */
/*  Dark theme                                                         */
/* ------------------------------------------------------------------ */

const DARK_LAND: CategoryStyle = {
  color: [200, 214, 229, 160],
  outlineColor: [6, 13, 23, 220],
  fontSizePx: 42,
  emphasisSize: { large: 54, normal: 42, small: 36, micro: 27 },
  fontWeight: 500,
}

const DARK_WATER: CategoryStyle = {
  color: [136, 153, 170, 120],
  outlineColor: [6, 13, 23, 180],
  fontSizePx: 39,
  emphasisSize: { large: 48, normal: 39, small: 33, micro: 24 },
  fontWeight: 400,
  fontStyle: 'italic',
}

const DARK_CHANNEL: CategoryStyle = {
  color: [247, 127, 0, 100],
  outlineColor: [6, 13, 23, 160],
  fontSizePx: 33,
  emphasisSize: { large: 39, normal: 33, small: 30, micro: 24 },
  fontWeight: 500,
}

const DARK_FEATURE: CategoryStyle = {
  color: [0, 78, 146, 90],
  outlineColor: [6, 13, 23, 140],
  fontSizePx: 30,
  emphasisSize: { large: 36, normal: 30, small: 27, micro: 24 },
  fontWeight: 400,
  fontStyle: 'italic',
}

const DARK_ISLAND: CategoryStyle = {
  color: [200, 214, 229, 110],
  outlineColor: [6, 13, 23, 180],
  fontSizePx: 33,
  emphasisSize: { large: 39, normal: 33, small: 30, micro: 24 },
  fontWeight: 400,
}

const DARK: LabelPalette = {
  land: DARK_LAND,
  water: DARK_WATER,
  channel: DARK_CHANNEL,
  feature: DARK_FEATURE,
  island: DARK_ISLAND,
  globalOutline: [6, 13, 23, 200],
  port: [238, 242, 245, 220],
  portFontSizePx: 36,
  portFontWeight: 600,
  countryFontSizePx: { large: 54, normal: 42, small: 36 },
  countryFontWeight: 500,
  country: [200, 214, 229, 150],
  countryOutline: [6, 13, 23, 220],
}

/* ------------------------------------------------------------------ */
/*  Light theme                                                        */
/* ------------------------------------------------------------------ */

const LIGHT_LAND: CategoryStyle = {
  color: [26, 42, 58, 170],
  outlineColor: [255, 255, 255, 200],
  fontSizePx: 42,
  emphasisSize: { large: 54, normal: 42, small: 36, micro: 27 },
  fontWeight: 500,
}

const LIGHT_WATER: CategoryStyle = {
  color: [90, 100, 110, 140],
  outlineColor: [255, 255, 255, 170],
  fontSizePx: 39,
  emphasisSize: { large: 48, normal: 39, small: 33, micro: 24 },
  fontWeight: 400,
  fontStyle: 'italic',
}

const LIGHT_CHANNEL: CategoryStyle = {
  color: [217, 110, 0, 110],
  outlineColor: [255, 255, 255, 150],
  fontSizePx: 33,
  emphasisSize: { large: 39, normal: 33, small: 30, micro: 24 },
  fontWeight: 500,
}

const LIGHT_FEATURE: CategoryStyle = {
  color: [0, 78, 146, 100],
  outlineColor: [255, 255, 255, 140],
  fontSizePx: 30,
  emphasisSize: { large: 36, normal: 30, small: 27, micro: 24 },
  fontWeight: 400,
  fontStyle: 'italic',
}

const LIGHT_ISLAND: CategoryStyle = {
  color: [26, 42, 58, 130],
  outlineColor: [255, 255, 255, 170],
  fontSizePx: 33,
  emphasisSize: { large: 39, normal: 33, small: 30, micro: 24 },
  fontWeight: 400,
}

const LIGHT: LabelPalette = {
  land: LIGHT_LAND,
  water: LIGHT_WATER,
  channel: LIGHT_CHANNEL,
  feature: LIGHT_FEATURE,
  island: LIGHT_ISLAND,
  globalOutline: [255, 255, 255, 200],
  port: [26, 42, 58, 230],
  portFontSizePx: 36,
  portFontWeight: 600,
  countryFontSizePx: { large: 54, normal: 42, small: 36 },
  countryFontWeight: 500,
  country: [26, 42, 58, 170],
  countryOutline: [255, 255, 255, 200],
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

export function getLabelPalette(theme: ThemeMode): LabelPalette {
  return theme === 'light' ? LIGHT : DARK
}

export function getCategoryStyle(palette: LabelPalette, category: LabelCategory): CategoryStyle {
  switch (category) {
    case 'land':
      return palette.land
    case 'water':
      return palette.water
    case 'channel':
      return palette.channel
    case 'feature':
      return palette.feature
    case 'island':
      return palette.island
  }
}

/** Font size for a category + emphasis pair. */
export function getEmphasisSize(style: CategoryStyle, emphasis: LabelEmphasis): number {
  return style.emphasisSize[emphasis] ?? style.fontSizePx
}
