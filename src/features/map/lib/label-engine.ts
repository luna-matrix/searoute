import type { Port } from '@/types/port'
import type { MapLabel, LabelCategory } from '@/data/map-labels'
import type { LabelPalette } from './label-styles'
import { getCategoryStyle, getEmphasisSize } from './label-styles'
import { haversineKm } from './transit-detection'
import type { LabelSettings } from '@/store/map'

/**
 * Label positioning engine.
 *
 * Three compute functions produce pre-resolved data arrays for
 * the deck.gl TextLayers — every field (position, size, colour,
 * opacity, visible) is computed here so the accessor functions
 * inside the layer can be pure property reads.
 */

type RGBA = [number, number, number, number]

export interface LabelRenderData {
  position: [number, number]
  text: string
  size: number
  color: RGBA
  visible: boolean
}

interface EngineOptions {
  palette: LabelPalette
  settings: LabelSettings
  viewportCenter: [number, number]
  zoom: number
  isGlobe: boolean
  canvasSize: { width: number; height: number }
}

/* ------------------------------------------------------------------ */
/*  Visibility helpers                                                 */
/* ------------------------------------------------------------------ */

function visibleExtentDeg(zoom: number, isGlobe: boolean): number {
  if (isGlobe) return 45 / Math.pow(2, zoom)
  return 360 / Math.pow(2, zoom)
}

function distanceFade(
  labelPos: [number, number],
  center: [number, number],
  zoom: number,
  isGlobe: boolean,
): number {
  const distKm = haversineKm(labelPos, center)
  const extentKm = visibleExtentDeg(zoom, isGlobe) * 111
  const t = 1 - distKm / extentKm
  return Math.max(0.3, Math.min(1, t))
}

/** Smooth zoom-tier visibility: 0 → 1 fade-in over `span` units. */
function zoomVisibility(zoom: number, labelMin: number, span = 0.3): number {
  return Math.max(0, Math.min(1, (zoom - labelMin) / span))
}

function labelOpacity(
  label: MapLabel,
  zoom: number,
  isGlobe: boolean,
  center: [number, number],
): number {
  const minZoom = label.zoomMin ?? 0
  const zV = zoomVisibility(zoom, minZoom)
  const dF = distanceFade(label.position, center, zoom, isGlobe)
  return zV * dF
}

/* ------------------------------------------------------------------ */
/*  Collision avoidance                                                */
/* ------------------------------------------------------------------ */

interface PlacedLabel {
  position: [number, number]
  priority: number
}

function separationDeg(zoom: number, density: number): number {
  return 24 / (zoom * density + 0.5)
}

function placedLabelsCollisionFree(
  labels: MapLabel[],
  zoom: number,
  density: number,
  center: [number, number],
): Set<number> {
  const separation = separationDeg(zoom, density)
  const placed: PlacedLabel[] = []
  const kept = new Set<number>()

  // Sort by emphasis (large → micro), tie-break by distance from center
  const priorityOrder = { large: 4, normal: 3, small: 2, micro: 1 }
  const sorted = labels
    .map((l, i) => ({ label: l, index: i }))
    .sort((a, b) => {
      const pA = priorityOrder[a.label.emphasis]
      const pB = priorityOrder[b.label.emphasis]
      if (pA !== pB) return pB - pA
      const dA = haversineKm(a.label.position, center)
      const dB = haversineKm(b.label.position, center)
      return dA - dB
    })

  for (const { label, index } of sorted) {
    let collides = false
    for (const p of placed) {
      const d = haversineKm(label.position, p.position)
      if (d < separation * 111) {
        collides = true
        break
      }
    }
    if (!collides) {
      placed.push({ position: label.position, priority: priorityOrder[label.emphasis] })
      kept.add(index)
    }
  }

  return kept
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function computeMapLabels(
  labels: readonly MapLabel[],
  opts: EngineOptions & { categories: LabelCategory[] },
): LabelRenderData[] {
  const { palette, settings, viewportCenter, zoom, isGlobe, categories } = opts
  const catSet = new Set(categories)

  const applicable = labels.filter((l) => catSet.has(l.category))
  if (applicable.length === 0) return []

  const collisionFree =
    settings.collisionMode === 'simple'
      ? placedLabelsCollisionFree(applicable, zoom, settings.labelDensity, viewportCenter)
      : null

  const sizeMul = settings.labelSize

  return applicable.map((label, i) => {
    const style = getCategoryStyle(palette, label.category)
    const op = labelOpacity(label, zoom, isGlobe, viewportCenter)
    const collisionOk = collisionFree === null || collisionFree.has(i)
    const visible = op > 0.04 && collisionOk

    const color: RGBA = [
      style.color[0],
      style.color[1],
      style.color[2],
      Math.round(style.color[3] * op),
    ]

    return {
      position: label.position,
      text: label.depth ? `${label.name} – ${label.depth.toLocaleString()} m` : label.name,
      size: getEmphasisSize(style, label.emphasis) * sizeMul,
      color,
      visible,
    }
  })
}

export function computePortLabels(
  alongRoutePorts: readonly Port[],
  opts: EngineOptions,
): LabelRenderData[] {
  const { palette, settings, zoom, isGlobe, viewportCenter } = opts
  if (!settings.showPortLabels || alongRoutePorts.length === 0) return []

  const sizeMul = settings.labelSize
  const portSize = (isGlobe ? palette.portFontSizePx + 3 : palette.portFontSizePx) * sizeMul
  const portColor = palette.port

  return alongRoutePorts.map((p) => {
    const op = distanceFade([p.lng, p.lat], viewportCenter, zoom, isGlobe)
    const visible = op > 0.1

    const color: RGBA = [portColor[0], portColor[1], portColor[2], Math.round(portColor[3] * op)]

    return {
      position: [p.lng, p.lat],
      text: p.name,
      size: portSize,
      color,
      visible,
    }
  })
}
