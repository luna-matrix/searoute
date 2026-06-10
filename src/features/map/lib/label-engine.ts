import type { Port } from '@/types/port'
import type { MapLabel, LabelCategory } from '@/data/map-labels'
import type { LabelPalette } from './label-styles'
import { getCategoryStyle, getEmphasisSize } from './label-styles'
import { haversineKm } from './transit-detection'
import type { LabelSettings } from '@/store/map'
import type { ThemeMode } from '../hooks/useTheme'

/**
 * Label positioning engine.
 *
 * Produces pre-resolved data arrays for deck.gl TextLayers.
 * Every field (position, size, colour, opacity, visible,
 * pixelOffset, leaderLine) is computed here so the accessor
 * functions inside the layer can be pure property reads.
 */

type RGBA = [number, number, number, number]

export interface LabelRenderData {
  position: [number, number]
  text: string
  size: number
  color: RGBA
  visible: boolean
  /** Optional rotation in radians — used by strait/channel labels. */
  rotation?: number
  /** Pixel offset [x, y] — collision avoidance push. */
  pixelOffset?: [number, number]
  /** Text anchor override — 'start' for right-of-pin labels. */
  labelAnchor?: 'start' | 'middle' | 'end'
  /** Default pixel offset for this label's role (before collision). */
  defaultPixelOffset?: [number, number]
  /** Leader line from geographic anchor to offset label position. */
  leaderLine?: {
    from: [number, number]
    to: [number, number]
    color: RGBA
  }
}

interface EngineOptions {
  palette: LabelPalette
  settings: LabelSettings
  viewportCenter: [number, number]
  zoom: number
  isGlobe: boolean
  canvasSize: { width: number; height: number }
  theme: ThemeMode
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
  return Math.max(0.7, Math.min(1, t))
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
/*  Collision avoidance — map labels                                   */
/* ------------------------------------------------------------------ */

interface PlacedLabel {
  position: [number, number]
  priority: number
}

function separationDeg(zoom: number, density: number, isGlobe: boolean): number {
  const divisor = isGlobe ? 10 : 14
  return divisor / (zoom * density + 0.5)
}

function placedLabelsCollisionFree(
  labels: MapLabel[],
  zoom: number,
  density: number,
  center: [number, number],
  isGlobe: boolean,
): Set<number> {
  const separation = separationDeg(zoom, density, isGlobe)
  const placed: PlacedLabel[] = []
  const kept = new Set<number>()

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
/*  Transit port deduplication                                         */
/* ------------------------------------------------------------------ */

const CLUSTER_RADIUS_KM = 50
const MAX_LABELS_PER_CLUSTER = 1
const MAX_LABELS_PER_CLUSTER_ZOOMED = 2
const ZOOM_THRESHOLD_FOR_2_LABELS_GLOBE = 1.0
const ZOOM_THRESHOLD_FOR_2_LABELS_FLAT = 2.5
const MAX_TRANSIT_LABELS = 8

interface Cluster {
  ports: Port[]
  center: [number, number]
}

/**
 * Cluster transit ports within CLUSTER_RADIUS_KM of each other.
 * Within each cluster, keep Major ports + up to N Intermediate.
 */
function dedupTransitPorts(ports: Port[], zoom: number, isGlobe: boolean): Port[] {
  if (ports.length === 0) return []

  const threshold = isGlobe ? ZOOM_THRESHOLD_FOR_2_LABELS_GLOBE : ZOOM_THRESHOLD_FOR_2_LABELS_FLAT
  const maxPerCluster = zoom >= threshold ? MAX_LABELS_PER_CLUSTER_ZOOMED : MAX_LABELS_PER_CLUSTER

  const clusters: Cluster[] = []
  for (const port of ports) {
    let merged = false
    for (const cluster of clusters) {
      const dist = haversineKm([port.lng, port.lat], cluster.center)
      if (dist < CLUSTER_RADIUS_KM) {
        cluster.ports.push(port)
        const n = cluster.ports.length
        cluster.center = [
          cluster.ports.reduce((s, p) => s + p.lng, 0) / n,
          cluster.ports.reduce((s, p) => s + p.lat, 0) / n,
        ]
        merged = true
        break
      }
    }
    if (!merged) {
      clusters.push({ ports: [port], center: [port.lng, port.lat] })
    }
  }

  const result: Port[] = []
  for (const cluster of clusters) {
    const sorted = [...cluster.ports].sort((a, b) => {
      const sizeOrder = { Major: 0, Intermediate: 1, Minor: 2, Small: 3 }
      const sizeDiff = (sizeOrder[a.size] ?? 3) - (sizeOrder[b.size] ?? 3)
      if (sizeDiff !== 0) return sizeDiff
      const aFields = [a.depths.channel, a.depths.anchorage, a.depths.cargoPier].filter(
        Boolean,
      ).length
      const bFields = [b.depths.channel, b.depths.anchorage, b.depths.cargoPier].filter(
        Boolean,
      ).length
      return bFields - aFields
    })
    result.push(...sorted.slice(0, maxPerCluster))
  }

  if (result.length > MAX_TRANSIT_LABELS) {
    const major = result.filter((p) => p.size === 'Major')
    const intermediate = result.filter((p) => p.size === 'Intermediate')
    const remaining = MAX_TRANSIT_LABELS - major.length
    return [...major, ...intermediate.slice(0, Math.max(0, remaining))]
  }

  return result
}

/* ------------------------------------------------------------------ */
/*  Port label collision avoidance                                     */
/* ------------------------------------------------------------------ */

const COLLISION_GAP_PX = 8
const OFFSET_BASE_PX = 12

function estimateLabelWidthPx(text: string, sizePx: number): number {
  return text.length * sizePx * 0.6
}

interface CollisionEntry {
  position: [number, number]
  text: string
  size: number
  priority: number
  isWaypoint: boolean
}

/**
 * Compute pixel offsets for port labels to push them away from
 * each other. Waypoints are never hidden — only offset.
 * Diagonal push alternating per label index.
 */
function computePortCollisionOffsets(
  entries: CollisionEntry[],
  zoom: number,
  isGlobe: boolean,
): { offsets: Map<number, [number, number]>; hidden: Set<number> } {
  const offsets = new Map<number, [number, number]>()
  const hidden = new Set<number>()

  if (entries.length < 2) return { offsets, hidden }

  const extentDeg = visibleExtentDeg(zoom, isGlobe)
  const pxPerDeg = 800 / extentDeg

  const pixelPositions = entries.map((e, i) => ({
    x: e.position[0] * pxPerDeg,
    y: e.position[1] * pxPerDeg,
    radius: estimateLabelWidthPx(e.text, e.size) / 2,
    priority: e.priority,
    isWaypoint: e.isWaypoint,
    index: i,
  }))

  for (let i = 0; i < pixelPositions.length; i++) {
    if (hidden.has(i)) continue
    const a = pixelPositions[i]!

    for (let j = i + 1; j < pixelPositions.length; j++) {
      if (hidden.has(j)) continue
      const b = pixelPositions[j]!

      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = a.radius + b.radius + COLLISION_GAP_PX

      if (dist < minDist) {
        const overlap = minDist - dist
        const pushDist = Math.min(OFFSET_BASE_PX, overlap * 0.6)

        // Never hide waypoints — they're user-intentional
        // Only hide non-waypoint labels when push is negligible
        if (pushDist < 2 && !a.isWaypoint && !b.isWaypoint) {
          if (a.priority >= b.priority) hidden.add(j)
          else {
            hidden.add(i)
            break
          }
          continue
        }

        // Diagonal push: even index → up-right, odd → down-left
        const dirA = i % 2 === 0 ? [1, -1] : [-1, 1]
        const dirB = j % 2 === 0 ? [1, -1] : [-1, 1]

        const existingA = offsets.get(i) ?? [0, 0]
        const existingB = offsets.get(j) ?? [0, 0]

        offsets.set(i, [existingA[0] + dirA[0] * pushDist, existingA[1] + dirA[1] * pushDist])
        offsets.set(j, [existingB[0] + dirB[0] * pushDist, existingB[1] + dirB[1] * pushDist])
      }
    }
  }

  return { offsets, hidden }
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
      ? placedLabelsCollisionFree(applicable, zoom, settings.labelDensity, viewportCenter, isGlobe)
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

    // Channel/strait labels: compute offset position + leader line
    if (label.category === 'channel') {
      const dx = label.position[0] - viewportCenter[0]
      const dy = label.position[1] - viewportCenter[1]
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      // Push outward from viewport center by ~1.5° geographic
      const offsetLng = (dx / dist) * 1.5
      const offsetLat = (dy / dist) * 1.5
      const offsetPos: [number, number] = [
        label.position[0] + offsetLng,
        label.position[1] + offsetLat,
      ]

      return {
        position: offsetPos,
        text: label.depth ? `${label.name} – ${label.depth.toLocaleString()} m` : label.name,
        size: getEmphasisSize(style, label.emphasis) * sizeMul,
        color,
        visible,
        rotation: -0.15,
        labelAnchor: 'start',
        leaderLine: {
          from: label.position,
          to: offsetPos,
          color: opts.theme === 'light' ? [90, 106, 120, 100] : [136, 153, 170, 80],
        },
      }
    }

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

/* ------------------------------------------------------------------ */
/*  Route port labels — priority tiers + zoom gating + collision       */
/* ------------------------------------------------------------------ */

const ROUTE_PORT_COLORS_DARK: Record<string, RGBA> = {
  origin: [0, 168, 107, 255],
  destination: [230, 57, 70, 255],
  waypoint: [30, 95, 180, 230],
  transit: [247, 127, 0, 200],
}

const ROUTE_PORT_COLORS_LIGHT: Record<string, RGBA> = {
  origin: [0, 135, 90, 255],
  destination: [214, 40, 40, 255],
  waypoint: [30, 95, 180, 240],
  transit: [179, 87, 0, 220],
}

interface RoutePortLabelInput {
  origin: Port | null
  destination: Port | null
  waypoints: readonly Port[]
  transitPorts: readonly Port[]
}

interface PriorityTier {
  zoomMinGlobe: number
  zoomMinFlat: number
  sizeBase: number
  sizeGlobe: number
  maxOpacity: number
  span: number
  staggerPerPort: number
}

const TIER_HERO: PriorityTier = {
  zoomMinGlobe: 0,
  zoomMinFlat: 0,
  sizeBase: 12,
  sizeGlobe: 14,
  maxOpacity: 1.0,
  span: 0.1,
  staggerPerPort: 0,
}

const TIER_WAYPOINT: PriorityTier = {
  zoomMinGlobe: 0.4,
  zoomMinFlat: 1.5,
  sizeBase: 10,
  sizeGlobe: 12,
  maxOpacity: 0.9,
  span: 0.4,
  staggerPerPort: 0.05,
}

const TIER_TRANSIT: PriorityTier = {
  zoomMinGlobe: 1.0,
  zoomMinFlat: 2.2,
  sizeBase: 8,
  sizeGlobe: 10,
  maxOpacity: 0.7,
  span: 0.5,
  staggerPerPort: 0.06,
}

const ROLE_PRIORITY: Record<string, number> = {
  origin: 100,
  destination: 100,
  waypoint: 80,
  transit: 50,
}

export function computeAllRoutePortLabels(
  input: RoutePortLabelInput,
  opts: EngineOptions,
): LabelRenderData[] {
  const { settings, zoom, isGlobe, viewportCenter } = opts
  if (!settings.showPortLabels) return []

  const sizeMul = settings.labelSize

  const dedupedTransit = dedupTransitPorts([...input.transitPorts], zoom, isGlobe)

  const entries: {
    port: Port
    role: keyof typeof ROUTE_PORT_COLORS_DARK
    tier: PriorityTier
    staggerIndex: number
    priority: number
  }[] = []

  if (input.origin)
    entries.push({
      port: input.origin,
      role: 'origin',
      tier: TIER_HERO,
      staggerIndex: 0,
      priority: ROLE_PRIORITY.origin,
    })
  if (input.destination)
    entries.push({
      port: input.destination,
      role: 'destination',
      tier: TIER_HERO,
      staggerIndex: 0,
      priority: ROLE_PRIORITY.destination,
    })

  let wpIndex = 0
  for (const wp of input.waypoints) {
    entries.push({
      port: wp,
      role: 'waypoint',
      tier: TIER_WAYPOINT,
      staggerIndex: wpIndex++,
      priority: ROLE_PRIORITY.waypoint,
    })
  }

  let tpIndex = 0
  for (const tp of dedupedTransit) {
    entries.push({
      port: tp,
      role: 'transit',
      tier: TIER_TRANSIT,
      staggerIndex: tpIndex++,
      priority: ROLE_PRIORITY.transit,
    })
  }

  // Phase 1: compute base render data
  const renderData: LabelRenderData[] = entries.map(({ port, role, tier, staggerIndex }) => {
    const zoomMin =
      (isGlobe ? tier.zoomMinGlobe : tier.zoomMinFlat) + staggerIndex * tier.staggerPerPort
    const zV = zoomVisibility(zoom, zoomMin, tier.span)
    const dF = distanceFade([port.lng, port.lat], viewportCenter, zoom, isGlobe)

    const op = zV * dF * tier.maxOpacity
    const visible = op > 0.04

    const baseSize = isGlobe ? tier.sizeGlobe : tier.sizeBase
    const zoomScale = role === 'transit' ? Math.min(1.3, 1 + (zoom - zoomMin) * 0.15) : 1
    const size = baseSize * sizeMul * zoomScale

    const routeColors = opts.theme === 'light' ? ROUTE_PORT_COLORS_LIGHT : ROUTE_PORT_COLORS_DARK
    const baseColor = routeColors[role] ?? routeColors.transit
    const color: RGBA = [baseColor[0], baseColor[1], baseColor[2], Math.round(baseColor[3] * op)]

    // Origin/destination: label to the right of the pin
    // Waypoint/transit: label below the pin
    const isHero = role === 'origin' || role === 'destination'

    return {
      position: [port.lng, port.lat],
      text: port.name,
      size,
      color,
      visible,
      labelAnchor: isHero ? 'start' : 'middle',
      defaultPixelOffset: isHero ? [14, -4] : [0, 12],
    }
  })

  // Phase 2: collision avoidance
  const collisionEntries: CollisionEntry[] = entries.map((e) => ({
    position: [e.port.lng, e.port.lat] as [number, number],
    text: e.port.name,
    size: renderData[entries.indexOf(e)]!.size,
    priority: e.priority,
    isWaypoint: e.role === 'waypoint',
  }))

  const { offsets, hidden } = computePortCollisionOffsets(collisionEntries, zoom, isGlobe)

  // Phase 3: apply offsets and hidden state
  return renderData.map((data, i) => ({
    ...data,
    visible: data.visible && !hidden.has(i),
    pixelOffset: offsets.get(i),
  }))
}
