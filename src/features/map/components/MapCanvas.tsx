import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeckGL } from '@deck.gl/react'
import {
  FlyToInterpolator,
  _GlobeView as GlobeView,
  MapView,
  WebMercatorViewport,
  type View,
} from '@deck.gl/core'
import { TileLayer } from '@deck.gl/geo-layers'
import { BitmapLayer, ScatterplotLayer, GeoJsonLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import type { Feature, FeatureCollection, Geometry, LineString } from 'geojson'
import { PORTS } from '@/data/ports'
import { SHIPPING_LANES } from '@/data/shipping-lanes'
import type { ShippingLaneProperties } from '@/data/shipping-lanes'
import type { Port } from '@/types/port'
import { useMapStore } from '@/store/map'
import { BASEMAPS } from '../lib/basemaps'
import type { BasemapId } from '../lib/basemaps'
import {
  getPortRadiusPx,
  getRoleFill,
  ROLE_RING,
  ROLE_RADIUS_PX,
  ROLE_RING_WIDTH_PX,
  WAYPOINT_FILL,
  WAYPOINT_RING,
  WAYPOINT_RADIUS_PX,
  WAYPOINT_RING_WIDTH_PX,
  TRANSIT_PORT_FILL,
  TRANSIT_PORT_RING,
  TRANSIT_PORT_RADIUS_PX,
} from '../lib/port-styles'
import { getPortPalette } from '../lib/port-styles'
import { useTheme } from '../hooks/useTheme'
import { getLaneLineColor, getLaneLineWidth } from '../lib/shipping-lane-styles'
import {
  getRouteLineColor,
  ROUTE_TRACE_COLOR,
  ROUTE_TRACE_WIDTH_PX,
  ROUTE_TRACE_HEAD_COLOR,
  ROUTE_TRACE_HEAD_RING,
  ROUTE_TRACE_HEAD_RADIUS_PX,
  ROUTE_TRACE_HEAD_RING_WIDTH_PX,
} from '../lib/route-styles'
import { useRouteTrace } from '@/features/routing/lib/route-trace'
import { getReferenceLineData, type ReferenceLineData } from '../lib/reference-lines'
import { getContinentPalette } from '../lib/continent-styles'
import { getLabelPalette } from '../lib/label-styles'
import { MAP_LABELS } from '@/data/map-labels'
import type { LabelCategory } from '@/data/map-labels'
import { seaRouteMulti, NoRouteError, SnapFailedError, type SeaRouteFeature } from '@/lib/searoute'
import { detectTransitPorts } from '../lib/transit-detection'
import { extractContinentRings } from '../lib/point-in-polygon'
import { computeMapLabels, computePortLabels } from '../lib/label-engine'
import { computeGridLines } from '../lib/grid-lines'
import { computeCuratedAlternatives } from '@/features/routing/lib/curated-alternatives'
import CompassRose from './CompassRose'
import MapLegend from './MapLegend'
import MapControls from './MapControls'
import PortMarker from './PortMarker'
import SearchBar from '@/features/search/components/SearchBar'
import PortDetailSheet from '@/features/port-detail/components/PortDetailSheet'
import PortDetailPopover from '@/features/port-detail/components/PortDetailPopover'
import RoutePanel from '@/features/routing/components/RoutePanel'
import SettingsPanel from './SettingsPanel'
import styles from './MapCanvas.module.css'

/** Shared view state for both MapView and GlobeView. Pitch and
 *  bearing are honored on the flat map and ignored on the globe.
 *  The transition props are optional and forwarded to DeckGL. */
type ViewState = {
  longitude: number
  latitude: number
  zoom: number
  pitch?: number
  bearing?: number
  transitionDuration?: number | 'auto'
  transitionInterpolator?: FlyToInterpolator
}

/** Globe zoom is camera-altitude-based; 0 ≈ full earth, each
 *  unit halves the distance to the surface. 1.0 frames the
 *  Pacific comfortably with the globe filling the viewport. */
const GLOBE_DEFAULT_ZOOM = 1.0
const MAP_DEFAULT_ZOOM = 2.5

/**
 * Initial view state.
 *
 * Pacific-centered at longitude 150 so the International Date
 * Line sits in the middle of the viewport — Asia on the left,
 * Americas on the right, trans-Pacific routes read as continuous
 * horizontal lines.
 */
const INITIAL_LONGITUDE = 150
const INITIAL_LATITUDE = 20

const PERSPECTIVE_PITCH = 45
const ZOOM_STEP = 0.5

/**
 * Fit a bounding box to the globe view.
 *
 * GlobeViewport doesn't expose fitBounds, so we approximate it
 * here: centre on the box midpoint, then pick a zoom that makes
 * the largest angular extent fit with some margin.
 *
 * Dateline-aware: if the longitude span exceeds 180°, the shorter
 * arc crosses the antimeridian.  We normalise to [0, 360] space,
 * compute the true centre and extent, then shift the centre back
 * to [-180, 180].
 *
 * At zoom 0 the viewport shows roughly 45° of arc.  Each zoom unit
 * halves the camera altitude (~doubles the visible extent).  The
 * zoom is log₂(extent / 45) with a 1.5× padding and a 0.8 floor.
 */
function fitGlobeBounds(bounds: [[number, number], [number, number]]): {
  longitude: number
  latitude: number
  zoom: number
} {
  const [[west, south], [east, north]] = bounds
  const rawSpan = east - west
  const crossesDateline = rawSpan > 180

  let centerLng: number
  let lngExtent: number

  if (crossesDateline) {
    const westNorm = west < 0 ? west + 360 : west
    const eastNorm = east < 0 ? east + 360 : east
    const centerNorm = (westNorm + eastNorm) / 2
    centerLng = centerNorm > 180 ? centerNorm - 360 : centerNorm
    lngExtent = 360 - rawSpan
  } else {
    centerLng = (west + east) / 2
    lngExtent = rawSpan
  }

  const centerLat = (south + north) / 2
  const latExtent = Math.abs(north - south)
  const maxExtent = Math.max(lngExtent, latExtent) * 1.5
  const zoom = Math.max(0.8, Math.log2(Math.max(1, maxExtent) / 45))
  return { longitude: centerLng, latitude: centerLat, zoom }
}
const SELECTED_ZOOM = 5
const FLY_TO_DURATION_MS = 600
const ROUTE_FIT_PADDING_PX = 80
const HOVER_DISMISS_DELAY_MS = 200
const TOOLTIP_Z_INDEX = 45

function isLane(o: unknown): o is Feature<Geometry, ShippingLaneProperties> {
  return typeof o === 'object' && o !== null && 'geometry' in o && 'properties' in o
}

interface TooltipInfo {
  object?: unknown
  layer?: { id?: string } | null
}

interface RolePort {
  port: Port
  role: 'origin' | 'destination'
}

/**
 * Depth-test parameters for port-marker layers.
 *
 * On the globe view, deck.gl's layers draw in their declared
 * order, not in 3D depth — so a port on the *back* of the sphere
 * still renders at its projected screen position, appearing as a
 * floating dot inside the globe. Enabling `depthCompare: less-equal`
 * with `depthTest: true` ties the marker to the sphere's depth
 * buffer: the marker is occluded when the sphere is in front of
 * it. Result: ports on the far side of the earth disappear.
 *
 * This is a no-op on the flat MapView (no sphere, no depth
 * occlusion) but the parameters are safe to leave on.
 */
const PORT_MARKER_PARAMS = {
  depthCompare: 'less-equal' as const,
  depthTest: true as const,
}

interface HoverState {
  port: Port
  x: number
  y: number
}

export default function MapCanvas() {
  const [isGlobe, setIsGlobe] = useState(true)
  const [viewState, setViewState] = useState<ViewState>({
    longitude: INITIAL_LONGITUDE,
    latitude: INITIAL_LATITUDE,
    zoom: GLOBE_DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0,
  })
  const [basemapId, setBasemapId] = useState<BasemapId>('dark')
  const basemap = BASEMAPS[basemapId]
  const [hover, setHover] = useState<HoverState | null>(null)
  /** Grace-period dismiss timer: when the mouse leaves a port, the
   *  popover stays open for HOVER_DISMISS_DELAY_MS so the user
   *  can reach its buttons. While the mouse is over the popover
   *  itself, this timer is cancelled. */
  const dismissTimerRef = useRef<number | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [continents, setContinents] = useState<FeatureCollection<Geometry> | null>(null)
  const { theme, preference: themePreference, setPreference: setThemePreference } = useTheme()
  const continentPalette = getContinentPalette(theme)
  const portPalette = getPortPalette(theme)
  const labelPalette = getLabelPalette(theme)
  const referenceLineData = useMemo(() => getReferenceLineData(theme), [theme])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setCanvasSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const [legendOpen, setLegendOpen] = useState(true)
  const [showRouteLayer, setShowRouteLayer] = useState(true)
  const [showWaypointLayer, setShowWaypointLayer] = useState(true)
  const [showAlongRoutePortLayer, setShowAlongRoutePortLayer] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const selectPort = useMapStore((s) => s.selectPort)
  const originId = useMapStore((s) => s.originId)
  const setOrigin = useMapStore((s) => s.setOrigin)
  const destinationId = useMapStore((s) => s.destinationId)
  const setDestination = useMapStore((s) => s.setDestination)
  const setViewingPort = useMapStore((s) => s.setViewingPort)
  const waypoints = useMapStore((s) => s.waypoints)
  const route = useMapStore((s) => s.route)
  const setSelectedAlternativeIndex = useMapStore((s) => s.setSelectedAlternativeIndex)
  const alongRoutePorts = useMapStore((s) => s.alongRoutePorts)
  const setRoute = useMapStore((s) => s.setRoute)
  const setAlternatives = useMapStore((s) => s.setAlternatives)
  const setAlongRoutePorts = useMapStore((s) => s.setAlongRoutePorts)
  const setComputing = useMapStore((s) => s.setComputing)
  const setError = useMapStore((s) => s.setError)
  const clearRoute = useMapStore((s) => s.clearRoute)
  const includeLongAlternatives = useMapStore((s) => s.includeLongAlternatives)
  const labelSettings = useMapStore((s) => s.label)
  const gridSettings = useMapStore((s) => s.grid)
  const mapLayerSettings = useMapStore((s) => s.mapLayers)
  const routeDisplaySettings = useMapStore((s) => s.routeDisplay)

  const cancelDismiss = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
  }, [])

  const scheduleDismiss = useCallback(() => {
    cancelDismiss()
    dismissTimerRef.current = window.setTimeout(() => {
      setHover(null)
      dismissTimerRef.current = null
    }, HOVER_DISMISS_DELAY_MS)
  }, [cancelDismiss])

  const dismissNow = useCallback(() => {
    cancelDismiss()
    setHover(null)
  }, [cancelDismiss])

  const rolePorts = useMemo<RolePort[]>(() => {
    const result: RolePort[] = []
    if (originId) {
      const port = PORTS.find((p) => p.id === originId)
      if (port) result.push({ port, role: 'origin' })
    }
    if (destinationId) {
      const port = PORTS.find((p) => p.id === destinationId)
      if (port) result.push({ port, role: 'destination' })
    }
    return result
  }, [originId, destinationId])

  const waypointPorts = useMemo<Port[]>(() => {
    const seen = new Set<string>()
    const out: Port[] = []
    for (const id of waypoints) {
      if (seen.has(id)) continue
      const p = PORTS.find((x) => x.id === id)
      if (p) {
        seen.add(id)
        out.push(p)
      }
    }
    return out
  }, [waypoints])

  const currentZoom = viewState.zoom ?? (isGlobe ? GLOBE_DEFAULT_ZOOM : MAP_DEFAULT_ZOOM)

  const engineOpts = useMemo(
    () => ({
      palette: labelPalette,
      settings: labelSettings,
      viewportCenter: [viewState.longitude, viewState.latitude] as [number, number],
      zoom: currentZoom,
      isGlobe,
      canvasSize,
    }),
    [
      labelPalette,
      labelSettings,
      viewState.longitude,
      viewState.latitude,
      currentZoom,
      isGlobe,
      canvasSize,
    ],
  )

  const activeCategories = useMemo<LabelCategory[]>(() => {
    const cats: LabelCategory[] = []
    if (labelSettings.showCountryLabels) cats.push('land')
    if (labelSettings.showWaterLabels) cats.push('water')
    if (labelSettings.showChannelLabels) cats.push('channel')
    if (labelSettings.showFeatureLabels) cats.push('feature')
    if (labelSettings.showIslandLabels) cats.push('island')
    return cats
  }, [labelSettings])

  const mapLabelData = useMemo(
    () => computeMapLabels(MAP_LABELS, { ...engineOpts, categories: activeCategories }),
    [engineOpts, activeCategories],
  )

  const portLabelData = useMemo(
    () => computePortLabels(alongRoutePorts, engineOpts),
    [alongRoutePorts, engineOpts],
  )

  const gridLineData = useMemo(
    () => computeGridLines(theme, currentZoom, gridSettings),
    [theme, currentZoom, gridSettings],
  )

  const trace = useRouteTrace(route ? (route as Feature<LineString>) : null)

  /**
   * When a route crosses the dateline its raw coords jump from
   * ~+179 to ~-179.  On the flat Mercator map this creates a
   * 357° horizontal wrap-around line; on the globe the great-circle
   * arc between ±179 is physically short but can produce rendering
   * artifacts at the seam.
   *
   * Shifting every negative longitude by +360° produces coords in
   * continuous [0, 360] space — an unbroken eastward path.  On the
   * sphere, longitudes 241° and -119° map to the same 3D position,
   * so the shift is harmless.  On the flat map with `repeat: true`,
   * the basemap tiles at 241°.
   *
   * Only shift when the raw longitude span exceeds 180°
   * (the shorter arc crosses the dateline).
   */
  const datelineShiftedRoute = useMemo<[number, number][]>(() => {
    if (!route) return []
    const coords = (route.geometry as LineString).coordinates as [number, number][]
    if (coords.length < 2) return coords
    const lngs = coords.map((c) => c[0])
    if (Math.max(...lngs) - Math.min(...lngs) <= 180) return coords
    return coords.map(([lng, lat]): [number, number] => [lng < 0 ? lng + 360 : lng, lat])
  }, [route])

  const traceCoords = useMemo<[number, number][]>(() => {
    if (!trace.active || trace.partialPath.length < 2) return []
    const coords = trace.partialPath as [number, number][]
    const lngs = coords.map((c) => c[0])
    if (Math.max(...lngs) - Math.min(...lngs) <= 180) return coords
    return coords.map(([lng, lat]): [number, number] => [lng < 0 ? lng + 360 : lng, lat])
  }, [trace.partialPath, trace.active])

  const traceHead = useMemo<[number, number] | null>(() => {
    if (!trace.head) return null
    const [lng, lat] = trace.head
    if (lng >= 0 || datelineShiftedRoute.length === 0) return [lng, lat] as [number, number]
    const shifted = datelineShiftedRoute
    const shiftedLngs = shifted.map((c) => c[0])
    if (shiftedLngs.length === 0) return [lng, lat] as [number, number]
    if (Math.max(...shiftedLngs) - Math.min(...shiftedLngs) <= 180)
      return [lng, lat] as [number, number]
    return [lng + 360, lat] as [number, number]
  }, [trace.head, datelineShiftedRoute])

  const continentRings = useMemo(() => {
    if (!continents) return null
    return extractContinentRings(
      continents.features as readonly {
        geometry: { type: string; coordinates: unknown }
      }[],
    )
  }, [continents])

  useEffect(() => {
    let cancelled = false
    fetch('/data/countries-50m.geo.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Continents fetch failed: ${r.status}`)
        return r.json()
      })
      .then((data: FeatureCollection<Geometry>) => {
        if (!cancelled) setContinents(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // Basemap is still a usable backdrop; we just log so the
        // map remains functional even if the world data 404s.
        console.error('Failed to load continent outlines:', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-compute the route when origin, destination, and any
  // waypoints are set. Two paths:
  //  - no waypoints: curated alternatives (Malacca / Sunda /
  //    Panama / optional Cape). We fire all variants in parallel
  //    and surface the ones that return a real route.
  //  - one or more waypoints: seaRouteMulti (a single forced
  //    multi-leg path; the user has already chosen the stops).
  useEffect(() => {
    if (!originId || !destinationId) {
      clearRoute()
      return
    }
    const origin = PORTS.find((p) => p.id === originId)
    const destination = PORTS.find((p) => p.id === destinationId)
    if (!origin || !destination) {
      clearRoute()
      return
    }
    const waypointPorts: Port[] = waypoints
      .map((id) => PORTS.find((p) => p.id === id))
      .filter((p): p is Port => p !== undefined)
    const ids = [origin.id, ...waypointPorts.map((p) => p.id), destination.id]
    const dup = ids.find((id, i) => ids.indexOf(id) !== i)
    if (dup) {
      setError('Origin, destination, and waypoints must all be different ports.')
      setRoute(null)
      setAlternatives([], [])
      setSelectedAlternativeIndex(0)
      setAlongRoutePorts([])
      setComputing(false)
      return
    }
    let cancelled = false
    setComputing(true)
    setError(null)
    const finishWithError = (msg: string) => {
      if (cancelled) return
      setError(msg)
      setRoute(null)
      setAlternatives([], [])
      setSelectedAlternativeIndex(0)
      setAlongRoutePorts([])
    }
    const finishWithRoute = (r: SeaRouteFeature) => {
      if (cancelled) return
      setRoute(r)
      setAlongRoutePorts(detectTransitPorts(r, PORTS, undefined, continentRings))
    }
    if (waypointPorts.length === 0) {
      computeCuratedAlternatives({
        origin: [origin.lng, origin.lat],
        destination: [destination.lng, destination.lat],
        includeLongAlternatives,
        continentRings,
      })
        .then((alts) => {
          if (cancelled) return
          if (alts.length === 0) {
            finishWithError('No route found between these ports.')
            return
          }
          setAlternatives(
            alts.map((a) => a.route),
            alts.map((a) => a.label),
          )
          setSelectedAlternativeIndex(0)
          finishWithRoute(alts[0]!.route)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          if (err instanceof NoRouteError) {
            finishWithError('No maritime route found between these ports.')
          } else if (err instanceof SnapFailedError) {
            finishWithError(
              'One or both ports are too far from the maritime network. Try ports closer to the coast.',
            )
          } else {
            finishWithError(err instanceof Error ? err.message : 'Route computation failed.')
          }
        })
        .finally(() => {
          if (!cancelled) setComputing(false)
        })
    } else {
      const points: [number, number][] = [
        [origin.lng, origin.lat],
        ...waypointPorts.map((p): [number, number] => [p.lng, p.lat]),
        [destination.lng, destination.lat],
      ]
      seaRouteMulti(points)
        .then((r) => {
          if (cancelled) return
          setAlternatives([], [])
          setSelectedAlternativeIndex(0)
          finishWithRoute(r)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          if (err instanceof NoRouteError) {
            finishWithError(
              'No maritime route through those waypoints. Some ports may be unreachable from each other.',
            )
          } else if (err instanceof SnapFailedError) {
            finishWithError(
              'One of the ports is too far from the maritime network. Try ports closer to the coast.',
            )
          } else {
            finishWithError(err instanceof Error ? err.message : 'Route computation failed.')
          }
        })
        .finally(() => {
          if (!cancelled) setComputing(false)
        })
    }
    return () => {
      cancelled = true
    }
    // continentRings is intentionally omitted from deps — it is a
    // secondary refinement that arrives asynchronously (continents
    // GeoJSON fetch). Re-running the expensive route computation
    // just to re-filter along-route ports would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    originId,
    destinationId,
    waypoints,
    includeLongAlternatives,
    clearRoute,
    setAlternatives,
    setSelectedAlternativeIndex,
    setComputing,
    setError,
    setRoute,
    setAlongRoutePorts,
  ])

  // Frame the route when a new one becomes available.  Frames
  // origin + destination + all along-route ports.  Handles the
  // antimeridian: if the longitude span exceeds 180° the shorter
  // arc crosses the dateline and we normalise to [0, 360] space
  // before computing the centre and extent.
  useEffect(() => {
    if (!route || canvasSize.width === 0 || canvasSize.height === 0) return
    const points: [number, number][] = []
    if (originId) {
      const p = PORTS.find((x) => x.id === originId)
      if (p) points.push([p.lng, p.lat])
    }
    if (destinationId) {
      const p = PORTS.find((x) => x.id === destinationId)
      if (p) points.push([p.lng, p.lat])
    }
    for (const tp of alongRoutePorts) {
      points.push([tp.lng, tp.lat])
    }
    if (points.length < 2) return

    const lngs = points.map((p) => p[0])
    const lats = points.map((p) => p[1])
    const rawWest = Math.min(...lngs)
    const rawEast = Math.max(...lngs)
    const south = Math.min(...lats)
    const north = Math.max(...lats)

    let centerLng: number
    let lngExtent: number

    if (rawEast - rawWest > 180) {
      const westNorm = rawWest < 0 ? rawWest + 360 : rawWest
      const eastNorm = rawEast < 0 ? rawEast + 360 : rawEast
      const centerNorm = (westNorm + eastNorm) / 2
      centerLng = centerNorm > 180 ? centerNorm - 360 : centerNorm
      lngExtent = 360 - (rawEast - rawWest)
    } else {
      centerLng = (rawWest + rawEast) / 2
      lngExtent = rawEast - rawWest
    }

    const centerLat = (south + north) / 2
    const latExtent = north - south

    const bounds: [[number, number], [number, number]] = [
      [centerLng - lngExtent / 2, centerLat - latExtent / 2],
      [centerLng + lngExtent / 2, centerLat + latExtent / 2],
    ]

    let longitude: number
    let latitude: number
    let zoom: number
    if (isGlobe) {
      const fit = fitGlobeBounds(bounds)
      longitude = fit.longitude
      latitude = fit.latitude
      zoom = fit.zoom
    } else {
      const viewport = new WebMercatorViewport({
        ...viewState,
        width: canvasSize.width,
        height: canvasSize.height,
      })
      const fb = viewport.fitBounds(bounds, {
        padding: ROUTE_FIT_PADDING_PX,
      })
      longitude = fb.longitude
      latitude = fb.latitude
      zoom = fb.zoom
    }
    setViewState((vs) => ({
      ...vs,
      longitude,
      latitude,
      zoom,
      transitionDuration: FLY_TO_DURATION_MS,
      transitionInterpolator: new FlyToInterpolator(),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, originId, destinationId, canvasSize.width, canvasSize.height, isGlobe])

  const layers = useMemo(
    () => [
      new TileLayer({
        id: `basemap-${basemap.id}`,
        data: basemap.tiles,
        minZoom: basemap.minZoom,
        maxZoom: basemap.maxZoom,
        tileSize: basemap.tileSize,
        zoomOffset: 0,
        maxRequests: 12,
        refinementStrategy: 'best-available',
        onTileError: (err) => {
          if (import.meta.env.DEV) console.debug('Tile fetch failed:', err?.url ?? err)
        },
        renderSubLayers: (props) => {
          // Tile2DHeader.boundingBox is typed as number[][]. For a 2D
          // XYZ tile (our default) it's always [[lng,lat],[lng,lat]],
          // so we narrow the tuple shape here.
          const tile = props.tile as unknown as {
            boundingBox: [[number, number], [number, number]]
          }
          const [[west, south], [east, north]] = tile.boundingBox
          return new BitmapLayer(props, {
            image: props.data,
            bounds: [west, south, east, north],
          })
        },
      }),
      // Continent / country outline layer. Drawn above the
      // basemap and below everything else so the user can
      // always see landmasses, even when the basemap tiles
      // fail to load (Carto / ESRI are runtime-fetched and
      // not always available). Subtle fill + thin outline so
      // it reads as a chart-table reference, not the focus.
      continents &&
        mapLayerSettings.showContinentOutlines &&
        new GeoJsonLayer({
          id: 'continents',
          data: continents,
          stroked: true,
          filled: true,
          getFillColor: continentPalette.fill,
          getLineColor: continentPalette.stroke,
          getLineWidth: continentPalette.strokeWidthPx,
          lineWidthUnits: 'pixels',
          lineWidthMinPixels: 0.5,
          pickable: false,
        }),
      referenceLineData.length > 0 &&
        mapLayerSettings.showReferenceLines &&
        new PathLayer<ReferenceLineData>({
          id: 'reference-lines',
          data: referenceLineData,
          getPath: (d) => d.coords,
          getColor: (d) => d.color,
          getWidth: (d) => d.widthPx,
          widthUnits: 'pixels',
          capRounded: false,
          jointRounded: false,
          pickable: false,
        }),
      mapLayerSettings.showShippingLanes &&
        new GeoJsonLayer<ShippingLaneProperties>({
          id: 'shipping-lanes',
          data: SHIPPING_LANES,
          stroked: true,
          filled: false,
          getLineColor: getLaneLineColor,
          getLineWidth: getLaneLineWidth,
          lineWidthUnits: 'pixels',
          pickable: true,
          onHover: () => scheduleDismiss(),
        }),
      // Latitude / longitude grid — subtle admiralty-chart
      // spider-web drawn below all data layers.
      gridLineData.length > 0 &&
        new PathLayer<{
          coords: [number, number][]
          color: number[]
          widthPx: number
        }>({
          id: 'grid-lines',
          data: gridLineData,
          getPath: (d) => d.coords,
          getColor: (d) => d.color as [number, number, number, number],
          getWidth: (d) => d.widthPx,
          widthUnits: 'pixels',
          capRounded: false,
          jointRounded: false,
          pickable: false,
        }),
      // Map labels — countries, seas, channels, features, islands.
      // Computed by the label engine with zoom gating, distance
      // fading, and optional collision avoidance.
      mapLabelData.length > 0 &&
        new TextLayer<(typeof mapLabelData)[number]>({
          id: 'country-labels',
          data: mapLabelData.filter((d) => d.visible),
          getPosition: (d) => d.position,
          getText: (d) => d.text,
          getSize: (d) => d.size,
          getColor: (d) => d.color,
          getPixelOffset: [0, 0],
          fontFamily: 'var(--font-family-ui), system-ui, sans-serif',
          fontWeight: labelPalette.countryFontWeight,
          fontSettings: { sdf: true, fontSize: 128, buffer: 16 },
          sizeUnits: 'pixels',
          sizeScale: 1,
          sizeMinPixels: isGlobe ? 27 : 24,
          sizeMaxPixels: isGlobe ? 54 : 48,
          background: false,
          backgroundPadding: [4, 2],
          getBackgroundColor: [0, 0, 0, 0],
          outlineWidth: 2,
          outlineColor: labelPalette.globalOutline,
          characterSet: 'auto',
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          pickable: false,
        }),
      // The route is a single feature from searoute-ts.
      // `datelineShiftedRoute` is already normalised to [0, 360]
      // space when the route crosses the dateline, producing a
      // continuous eastward path on both projections.
      showRouteLayer && datelineShiftedRoute.length >= 2
        ? new PathLayer<{ coords: [number, number][] }>({
            id: 'route',
            data: [{ coords: datelineShiftedRoute }],
            getPath: (d) => d.coords,
            getColor: getRouteLineColor,
            getWidth: routeDisplaySettings.routeLineWidth,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            pickable: false,
          })
        : null,
      // Phase 6: trace overlay — a brighter, thicker line that
      // grows from origin to destination as the draw-on animation
      // plays. Hidden once the animation completes.
      showRouteLayer && routeDisplaySettings.showTraceAnimation && traceCoords.length >= 2
        ? new PathLayer<{ coords: [number, number][] }>({
            id: 'route-trace',
            data: [{ coords: traceCoords }],
            getPath: (d) => d.coords,
            getColor: ROUTE_TRACE_COLOR,
            getWidth: ROUTE_TRACE_WIDTH_PX,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            pickable: false,
          })
        : null,
      // Phase 6: glowing head dot that travels along the path
      // during the trace. Hidden when no trace is active.
      showRouteLayer && routeDisplaySettings.showTraceAnimation && traceHead
        ? new ScatterplotLayer<{ pos: [number, number] }>({
            id: 'route-trace-head',
            data: [{ pos: traceHead }],
            getPosition: (d) => d.pos,
            getRadius: ROUTE_TRACE_HEAD_RADIUS_PX,
            getFillColor: ROUTE_TRACE_HEAD_COLOR,
            getLineColor: ROUTE_TRACE_HEAD_RING,
            getLineWidth: ROUTE_TRACE_HEAD_RING_WIDTH_PX,
            stroked: true,
            filled: true,
            radiusUnits: 'pixels',
            lineWidthUnits: 'pixels',
            pickable: false,
            parameters: PORT_MARKER_PARAMS,
          })
        : null,
      new ScatterplotLayer<Port>({
        id: 'ports',
        data: PORTS,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: getPortRadiusPx,
        getFillColor: (d) => portPalette.fill[d.size],
        radiusUnits: 'pixels',
        pickable: true,
        parameters: PORT_MARKER_PARAMS,
        onClick: (info) => {
          const port = info.object as Port | undefined
          if (!port) return
          dismissNow()
          selectPort(port.id)
          if (!originId) {
            setOrigin(port.id)
          } else if (originId && !destinationId && originId !== port.id) {
            setDestination(port.id)
          }
          setViewState((vs) => ({
            ...vs,
            longitude: port.lng,
            latitude: port.lat,
            zoom: SELECTED_ZOOM,
            transitionDuration: FLY_TO_DURATION_MS,
            transitionInterpolator: new FlyToInterpolator(),
          }))
        },
        onHover: (info) => {
          const port = info.object as Port | undefined
          if (port) {
            cancelDismiss()
            setHover({ port, x: info.x, y: info.y })
          } else {
            scheduleDismiss()
          }
        },
      }),
      new ScatterplotLayer<RolePort>({
        id: 'origin-destination',
        data: rolePorts,
        getPosition: (d) => [d.port.lng, d.port.lat],
        getRadius: ROLE_RADIUS_PX,
        getFillColor: (d) => getRoleFill(d.role),
        getLineColor: ROLE_RING,
        getLineWidth: ROLE_RING_WIDTH_PX,
        stroked: true,
        filled: true,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        pickable: false,
        parameters: PORT_MARKER_PARAMS,
      }),
      // Phase 5: waypoint markers (one per user-added intermediate
      // stop). Sits above origin/destination so the visual order
      // matches the route path (origin → …waypoints… → destination).
      showWaypointLayer &&
        new ScatterplotLayer<Port>({
          id: 'waypoints',
          data: waypointPorts,
          getPosition: (d) => [d.lng, d.lat],
          getRadius: WAYPOINT_RADIUS_PX,
          getFillColor: WAYPOINT_FILL,
          getLineColor: WAYPOINT_RING,
          getLineWidth: WAYPOINT_RING_WIDTH_PX,
          stroked: true,
          filled: true,
          radiusUnits: 'pixels',
          lineWidthUnits: 'pixels',
          pickable: true,
          parameters: PORT_MARKER_PARAMS,
          onHover: (info) => {
            const port = info.object as Port | undefined
            if (port) {
              cancelDismiss()
              setHover({ port, x: info.x, y: info.y })
            } else {
              scheduleDismiss()
            }
          },
        }),
      showAlongRoutePortLayer &&
        new ScatterplotLayer<Port>({
          id: 'along-route-ports',
          data: alongRoutePorts,
          getPosition: (d) => [d.lng, d.lat],
          getRadius: TRANSIT_PORT_RADIUS_PX,
          getFillColor: TRANSIT_PORT_FILL,
          getLineColor: TRANSIT_PORT_RING,
          getLineWidth: 1,
          stroked: true,
          filled: true,
          radiusUnits: 'pixels',
          lineWidthUnits: 'pixels',
          pickable: true,
          parameters: PORT_MARKER_PARAMS,
          onHover: (info) => {
            const port = info.object as Port | undefined
            if (port) {
              cancelDismiss()
              setHover({ port, x: info.x, y: info.y })
            } else {
              scheduleDismiss()
            }
          },
        }),
      // Port-name labels for Major + Intermediate along-route ports.
      // Sits above the marker layer so the text reads cleanly.
      // Only populated when there's an active route — otherwise
      // the label set would be empty (alongRoutePorts is recomputed
      // per route) and the layer would still allocate its
      // instance, so we gate on the data being non-empty.
      portLabelData.length > 0
        ? new TextLayer<(typeof portLabelData)[number]>({
            id: 'port-labels',
            data: portLabelData.filter((d) => d.visible),
            getPosition: (d) => d.position,
            getText: (d) => d.text,
            getSize: (d) => d.size,
            getColor: (d) => d.color,
            getPixelOffset: [0, 12],
            fontFamily: 'var(--font-family-ui), system-ui, sans-serif',
            fontWeight: labelPalette.portFontWeight,
            fontSettings: { sdf: true, fontSize: 128, buffer: 16 },
            sizeUnits: 'pixels',
            sizeScale: 1,
            sizeMinPixels: isGlobe ? 33 : 30,
            sizeMaxPixels: isGlobe ? 45 : 42,
            background: false,
            outlineWidth: 2,
            outlineColor: labelPalette.globalOutline,
            characterSet: 'auto',
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'top',
            pickable: false,
          })
        : null,
    ],
    [
      basemap,
      originId,
      destinationId,
      rolePorts,
      alongRoutePorts,
      mapLabelData,
      portLabelData,
      gridLineData,
      isGlobe,
      showRouteLayer,
      showWaypointLayer,
      showAlongRoutePortLayer,
      continents,
      waypointPorts,
      traceHead,
      traceCoords,
      datelineShiftedRoute,
      mapLayerSettings,
      routeDisplaySettings,
      continentPalette.fill,
      continentPalette.stroke,
      continentPalette.strokeWidthPx,
      referenceLineData,
      portPalette.fill,
      labelPalette.globalOutline,
      labelPalette.portFontWeight,
      labelPalette.countryFontWeight,
      selectPort,
      setDestination,
      setOrigin,
      cancelDismiss,
      scheduleDismiss,
      dismissNow,
    ],
  )

  // Lane tooltip stays in deck.gl's getTooltip; port hover is now
  // a React popover (richer than the deck.gl html tooltip).
  // The style.zIndex lifts the tooltip above the panels but below
  // the popover; backgroundColor/padding are reset so the
  // .laneTooltip class shows through (deck.gl's default styles
  // would otherwise draw a black background).
  const getTooltip = useCallback((info: TooltipInfo) => {
    if (!info.object) return null
    if (info.layer?.id === 'shipping-lanes' && isLane(info.object)) {
      const lane = info.object
      const importanceClass =
        lane.properties.importance === 'restricted' ? styles.laneMetaImportant : styles.laneMeta
      return {
        html: `<div class="${styles.laneTooltip}">
            <div class="${styles.laneName}">${lane.properties.name}</div>
            <div class="${importanceClass}">${lane.properties.type} · ${lane.properties.importance}</div>
          </div>`,
        style: {
          // CSSStyleDeclaration values must be strings. Use
          // empty string for properties we want to remove
          // (zIndex gets a numeric cast inside deck.gl — pass as string).
          zIndex: String(TOOLTIP_Z_INDEX),
          background: 'transparent',
          padding: '0',
          margin: '0',
          boxShadow: 'none',
          color: 'inherit',
          font: 'inherit',
        },
      }
    }
    return null
  }, [])

  const onZoomIn = useCallback(() => {
    setViewState((vs) => ({ ...vs, zoom: (vs.zoom ?? 0) + ZOOM_STEP }))
  }, [])
  const onZoomOut = useCallback(() => {
    setViewState((vs) => ({ ...vs, zoom: (vs.zoom ?? 0) - ZOOM_STEP }))
  }, [])
  const onCycleBasemap = useCallback(() => {
    setBasemapId((b) => {
      if (b === 'dark') return 'light'
      if (b === 'light') return 'satellite'
      return 'dark'
    })
  }, [])
  // Auto-sync the basemap to the theme when the theme changes.
  // Satellite is left alone — the user explicitly picked it, and
  // satellite imagery works on both themes.
  useEffect(() => {
    setBasemapId((b) => {
      if (b === 'satellite') return b
      return theme === 'light' ? 'light' : 'dark'
    })
  }, [theme])
  const onToggleView = useCallback(() => {
    setViewState((vs) => ({
      ...vs,
      pitch: (vs.pitch ?? 0) > 0 ? 0 : PERSPECTIVE_PITCH,
    }))
  }, [])
  // Projection toggle: globe ↔ flat Mercator. Each projection
  // uses a different zoom scale (camera altitude vs Mercator tile
  // resolution), so we reset to a sensible default for the new
  // projection when the user toggles. Longitude/latitude are
  // preserved so the user stays in roughly the same area.
  const onToggleProjection = useCallback(() => {
    setIsGlobe((g) => {
      const next = !g
      setViewState((vs) => ({
        ...vs,
        zoom: next ? GLOBE_DEFAULT_ZOOM : MAP_DEFAULT_ZOOM,
        pitch: 0,
        bearing: 0,
      }))
      return next
    })
  }, [])

  const onPopoverSetOrigin = useCallback(
    (port: Port) => {
      setOrigin(port.id)
      setHover(null)
    },
    [setOrigin],
  )
  const onPopoverSetDestination = useCallback(
    (port: Port) => {
      setDestination(port.id)
      setHover(null)
    },
    [setDestination],
  )
  const addWaypoint = useMapStore((s) => s.addWaypoint)
  const onPopoverAddWaypoint = useCallback(
    (port: Port) => {
      if (!originId || !destinationId) return
      if (port.id === originId || port.id === destinationId) return
      addWaypoint(port.id)
      setHover(null)
    },
    [addWaypoint, originId, destinationId],
  )
  const onPopoverViewDetails = useCallback(
    (port: Port) => {
      setViewingPort(port.id)
      setHover(null)
    },
    [setViewingPort],
  )

  // Currently-selected alternative and the full list will be

  // Dynamic view: GlobeView (3D sphere) or MapView (flat Mercator).
  // The user toggles via the projection button in MapControls. The
  // viewport is recomputed below based on the active projection.
  //
  // GlobeView `resolution` is in degrees of the underlying sphere
  // mesh. Default 10° gives ~3600 triangles — visibly faceted on
  // coastlines. 2° gives ~32,000 triangles — smooth at all zoom
  // levels on Retina displays, with basemap tiles defining coastline
  // detail.
  const activeView: View = useMemo(
    () =>
      isGlobe
        ? new GlobeView({ id: 'globe', resolution: 2 })
        : new MapView({ id: 'map', repeat: true }),
    [isGlobe],
  )

  return (
    <div ref={canvasRef} className={styles.canvas}>
      <DeckGL
        views={activeView}
        viewState={viewState}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
        useDevicePixels={true}
        onClick={(info) => {
          if (!info.object) dismissNow()
        }}
        onViewStateChange={({ viewState }) => {
          if ('longitude' in viewState && 'latitude' in viewState && 'zoom' in viewState) {
            setViewState(viewState as ViewState)
          }
        }}
      />
      <SearchBar />
      <CompassRose bearing={viewState.bearing ?? 0} />
      <div className={styles.bottomStack}>
        <MapLegend
          open={legendOpen}
          onToggleOpen={() => setLegendOpen((v) => !v)}
          showRoute={showRouteLayer}
          onToggleRoute={() => setShowRouteLayer((v) => !v)}
          showWaypoints={showWaypointLayer}
          onToggleWaypoints={() => setShowWaypointLayer((v) => !v)}
          showAlongRoutePorts={showAlongRoutePortLayer}
          onToggleAlongRoutePorts={() => setShowAlongRoutePortLayer((v) => !v)}
        />
        <MapControls
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onCycleBasemap={onCycleBasemap}
          onToggleView={onToggleView}
          onToggleProjection={onToggleProjection}
          onSetThemePreference={setThemePreference}
          onOpenSettings={() => setSettingsOpen((v) => !v)}
          basemap={basemapId}
          perspective={(viewState.pitch ?? 0) > 0}
          projection={isGlobe ? 'globe' : 'flat'}
          theme={theme}
          themePreference={themePreference}
          settingsOpen={settingsOpen}
        />
        <div className={styles.attribution}>{basemap.attribution}</div>
      </div>
      {hover && (
        <PortDetailPopover
          port={hover.port}
          screenX={hover.x}
          screenY={hover.y}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          isOrigin={hover.port.id === originId}
          isDestination={hover.port.id === destinationId}
          isWaypoint={waypoints.includes(hover.port.id)}
          canAddWaypoint={Boolean(originId && destinationId)}
          onSetOrigin={onPopoverSetOrigin}
          onSetDestination={onPopoverSetDestination}
          onAddWaypoint={onPopoverAddWaypoint}
          onViewDetails={onPopoverViewDetails}
          onMouseEnter={cancelDismiss}
          onMouseLeave={scheduleDismiss}
        />
      )}
      <PortMarker
        viewState={viewState}
        width={canvasSize.width}
        height={canvasSize.height}
        isGlobe={isGlobe}
      />
      <PortDetailSheet />
      <RoutePanel
        projection={isGlobe ? 'globe' : 'flat'}
        continentRings={continentRings}
        settingsOpen={settingsOpen}
      />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
