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
  color: [200, 214, 229, 240],
  outlineColor: [6, 13, 23, 220],
  fontSizePx: 12,
  emphasisSize: { large: 15, normal: 12, small: 10, micro: 8 },
  fontWeight: 500,
}

const DARK_WATER: CategoryStyle = {
  color: [136, 153, 170, 200],
  outlineColor: [6, 13, 23, 180],
  fontSizePx: 11,
  emphasisSize: { large: 14, normal: 11, small: 9, micro: 7 },
  fontWeight: 400,
  fontStyle: 'italic',
}

const DARK_CHANNEL: CategoryStyle = {
  color: [247, 127, 0, 180],
  outlineColor: [6, 13, 23, 160],
  fontSizePx: 10,
  emphasisSize: { large: 11, normal: 10, small: 8, micro: 7 },
  fontWeight: 500,
}

const DARK_FEATURE: CategoryStyle = {
  color: [0, 78, 146, 160],
  outlineColor: [6, 13, 23, 140],
  fontSizePx: 9,
  emphasisSize: { large: 10, normal: 9, small: 8, micro: 7 },
  fontWeight: 400,
  fontStyle: 'italic',
}

const DARK_ISLAND: CategoryStyle = {
  color: [200, 214, 229, 190],
  outlineColor: [6, 13, 23, 180],
  fontSizePx: 10,
  emphasisSize: { large: 11, normal: 10, small: 8, micro: 7 },
  fontWeight: 400,
}

const DARK: LabelPalette = {
  land: DARK_LAND,
  water: DARK_WATER,
  channel: DARK_CHANNEL,
  feature: DARK_FEATURE,
  island: DARK_ISLAND,
  globalOutline: [15, 30, 51, 180],
  port: [238, 242, 245, 240],
  portFontSizePx: 10,
  portFontWeight: 600,
  countryFontSizePx: { large: 15, normal: 12, small: 10 },
  countryFontWeight: 500,
  country: [200, 214, 229, 230],
  countryOutline: [15, 30, 51, 200],
}

/* ------------------------------------------------------------------ */
/*  Light theme                                                        */
/* ------------------------------------------------------------------ */

const LIGHT_LAND: CategoryStyle = {
  color: [26, 42, 58, 240],
  outlineColor: [255, 255, 255, 200],
  fontSizePx: 12,
  emphasisSize: { large: 15, normal: 12, small: 10, micro: 8 },
  fontWeight: 500,
}

const LIGHT_WATER: CategoryStyle = {
  color: [90, 100, 110, 210],
  outlineColor: [255, 255, 255, 170],
  fontSizePx: 11,
  emphasisSize: { large: 14, normal: 11, small: 9, micro: 7 },
  fontWeight: 400,
  fontStyle: 'italic',
}

const LIGHT_CHANNEL: CategoryStyle = {
  color: [217, 110, 0, 190],
  outlineColor: [255, 255, 255, 150],
  fontSizePx: 10,
  emphasisSize: { large: 11, normal: 10, small: 8, micro: 7 },
  fontWeight: 500,
}

const LIGHT_FEATURE: CategoryStyle = {
  color: [0, 78, 146, 170],
  outlineColor: [255, 255, 255, 140],
  fontSizePx: 9,
  emphasisSize: { large: 10, normal: 9, small: 8, micro: 7 },
  fontWeight: 400,
  fontStyle: 'italic',
}

const LIGHT_ISLAND: CategoryStyle = {
  color: [26, 42, 58, 200],
  outlineColor: [255, 255, 255, 170],
  fontSizePx: 10,
  emphasisSize: { large: 11, normal: 10, small: 8, micro: 7 },
  fontWeight: 400,
}

const LIGHT: LabelPalette = {
  land: LIGHT_LAND,
  water: LIGHT_WATER,
  channel: LIGHT_CHANNEL,
  feature: LIGHT_FEATURE,
  island: LIGHT_ISLAND,
  globalOutline: [255, 255, 255, 180],
  port: [26, 42, 58, 240],
  portFontSizePx: 10,
  portFontWeight: 600,
  countryFontSizePx: { large: 15, normal: 12, small: 10 },
  countryFontWeight: 500,
  country: [26, 42, 58, 240],
  countryOutline: [255, 255, 255, 180],
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
