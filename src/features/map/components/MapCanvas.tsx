import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeckGL } from '@deck.gl/react'
import type { MapViewState } from '@deck.gl/core'
import { FlyToInterpolator, WebMercatorViewport } from '@deck.gl/core'
import { TileLayer } from '@deck.gl/geo-layers'
import { BitmapLayer, ScatterplotLayer, GeoJsonLayer, PathLayer } from '@deck.gl/layers'
import type { Feature, Geometry, LineString } from 'geojson'
import { PORTS } from '@/data/ports'
import { SHIPPING_LANES } from '@/data/shipping-lanes'
import type { ShippingLaneProperties } from '@/data/shipping-lanes'
import type { SeaRouteFeature } from '@/lib/searoute'
import type { Port } from '@/types/port'
import { useMapStore } from '@/store/map'
import { BASEMAPS } from '../lib/basemaps'
import type { BasemapId } from '../lib/basemaps'
import {
  getPortFill,
  getPortRadiusPx,
  getRoleFill,
  ROLE_RING,
  ROLE_RADIUS_PX,
  ROLE_RING_WIDTH_PX,
} from '../lib/port-styles'
import { getLaneLineColor, getLaneLineWidth } from '../lib/shipping-lane-styles'
import { getRouteLineColor, getRouteLineWidth } from '../lib/route-styles'
import { seaRouteAlternatives, NoRouteError, SnapFailedError } from '@/lib/searoute'
import { detectTransitPorts } from '../lib/transit-detection'
import CompassRose from './CompassRose'
import MapControls from './MapControls'
import PortMarker from './PortMarker'
import SearchBar from '@/features/search/components/SearchBar'
import PortDetailSheet from '@/features/port-detail/components/PortDetailSheet'
import PortDetailPopover from '@/features/port-detail/components/PortDetailPopover'
import styles from './MapCanvas.module.css'

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: 20,
  latitude: 30,
  zoom: 1.5,
  pitch: 0,
  bearing: 0,
}

const PERSPECTIVE_PITCH = 45
const ZOOM_STEP = 1
const SELECTED_ZOOM = 5
const FLY_TO_DURATION_MS = 600
const ROUTE_FIT_PADDING_PX = 80
const TRANSIT_RADIUS_PX = 6

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

interface HoverState {
  port: Port
  x: number
  y: number
}

export default function MapCanvas() {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE)
  const [basemapId, setBasemapId] = useState<BasemapId>('dark')
  const basemap = BASEMAPS[basemapId]
  const [hover, setHover] = useState<HoverState | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

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

  const selectPort = useMapStore((s) => s.selectPort)
  const originId = useMapStore((s) => s.originId)
  const setOrigin = useMapStore((s) => s.setOrigin)
  const destinationId = useMapStore((s) => s.destinationId)
  const setDestination = useMapStore((s) => s.setDestination)
  const setViewingPort = useMapStore((s) => s.setViewingPort)
  const route = useMapStore((s) => s.route)
  const alternatives = useMapStore((s) => s.alternatives)
  const selectedAlternativeIndex = useMapStore((s) => s.selectedAlternativeIndex)
  const setRoute = useMapStore((s) => s.setRoute)
  const setAlternatives = useMapStore((s) => s.setAlternatives)
  const setTransitPorts = useMapStore((s) => s.setTransitPorts)
  const setComputing = useMapStore((s) => s.setComputing)
  const setError = useMapStore((s) => s.setError)
  const clearRoute = useMapStore((s) => s.clearRoute)

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

  // Auto-compute the route when both origin and destination are set.
  // The effect re-runs whenever either id changes, or a new route
  // needs to be requested. We use an AbortController to cancel an
  // in-flight seaRouteAlternatives call when the user changes input
  // quickly.
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
    let cancelled = false
    setComputing(true)
    setError(null)
    seaRouteAlternatives([origin.lng, origin.lat], [destination.lng, destination.lat])
      .then((alts) => {
        if (cancelled) return
        if (alts.length === 0) {
          setError('No route found between these ports.')
          setAlternatives([])
          setRoute(null)
          setTransitPorts([])
          return
        }
        setAlternatives(alts)
        const primary = alts[0]
        setRoute(primary)
        setTransitPorts(detectTransitPorts(primary, PORTS))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof NoRouteError) {
          setError('No maritime route found between these ports.')
        } else if (err instanceof SnapFailedError) {
          setError(
            'One or both ports are too far from the maritime network. Try ports closer to the coast.',
          )
        } else {
          setError(err instanceof Error ? err.message : 'Route computation failed.')
        }
        setAlternatives([])
        setRoute(null)
        setTransitPorts([])
      })
      .finally(() => {
        if (!cancelled) setComputing(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    originId,
    destinationId,
    clearRoute,
    setAlternatives,
    setComputing,
    setError,
    setRoute,
    setTransitPorts,
  ])

  // Frame the route when a new one becomes available. Uses
  // WebMercatorViewport.fitBounds to compute the viewport that
  // contains origin + destination + all transit ports.
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
    for (const tp of useMapStore.getState().transitPorts) {
      points.push([tp.lng, tp.lat])
    }
    if (points.length < 2) return
    const lngs = points.map((p) => p[0])
    const lats = points.map((p) => p[1])
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ]
    const viewport = new WebMercatorViewport({
      ...viewState,
      width: canvasSize.width,
      height: canvasSize.height,
    })
    const { longitude, latitude, zoom } = viewport.fitBounds(bounds, {
      padding: ROUTE_FIT_PADDING_PX,
    })
    setViewState((vs) => ({
      ...vs,
      longitude,
      latitude,
      zoom,
      transitionDuration: FLY_TO_DURATION_MS,
      transitionInterpolator: new FlyToInterpolator(),
    }))
    // fitBounds shouldn't re-fire on every viewState change — we
    // want it to fire when the route (or canvas size) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, originId, destinationId, canvasSize.width, canvasSize.height])

  const layers = useMemo(
    () => [
      new TileLayer({
        id: `basemap-${basemap.id}`,
        data: basemap.tiles,
        minZoom: basemap.minZoom,
        maxZoom: basemap.maxZoom,
        tileSize: basemap.tileSize,
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
      new GeoJsonLayer<ShippingLaneProperties>({
        id: 'shipping-lanes',
        data: SHIPPING_LANES,
        stroked: true,
        filled: false,
        getLineColor: getLaneLineColor,
        getLineWidth: getLaneLineWidth,
        lineWidthUnits: 'pixels',
        pickable: true,
        onHover: () => setHover(null),
      }),
      new PathLayer<SeaRouteFeature>({
        id: 'route',
        data: route ? [route] : [],
        getPath: (d) => (d.geometry as LineString).coordinates as [number, number][],
        getColor: getRouteLineColor,
        getWidth: getRouteLineWidth,
        widthUnits: 'pixels',
        capRounded: true,
        jointRounded: true,
        pickable: false,
      }),
      new ScatterplotLayer<Port>({
        id: 'ports',
        data: PORTS,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: getPortRadiusPx,
        getFillColor: getPortFill,
        radiusUnits: 'pixels',
        pickable: true,
        onClick: (info) => {
          const port = info.object as Port | undefined
          if (!port) return
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
            setHover({ port, x: info.x, y: info.y })
          } else {
            setHover(null)
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
      }),
      new ScatterplotLayer<Port>({
        id: 'transit-ports',
        data: useMapStore.getState().transitPorts,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: TRANSIT_RADIUS_PX,
        getFillColor: [247, 127, 0, 240], // signal-amber, slightly higher alpha
        getLineColor: [238, 242, 245, 255], // arctic-white
        getLineWidth: 1.5,
        stroked: true,
        filled: true,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        pickable: true,
        onHover: (info) => {
          const port = info.object as Port | undefined
          if (port) {
            setHover({ port, x: info.x, y: info.y })
          } else {
            setHover(null)
          }
        },
      }),
    ],
    [basemap, originId, destinationId, route, rolePorts, selectPort, setDestination, setOrigin],
  )

  // Lane tooltip stays in deck.gl's getTooltip; port hover is now
  // a React popover (richer than the deck.gl html tooltip).
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
  const onToggleStyle = useCallback(() => {
    setBasemapId((b) => (b === 'dark' ? 'satellite' : 'dark'))
  }, [])
  const onToggleView = useCallback(() => {
    setViewState((vs) => ({
      ...vs,
      pitch: (vs.pitch ?? 0) > 0 ? 0 : PERSPECTIVE_PITCH,
    }))
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
  const onPopoverViewDetails = useCallback(
    (port: Port) => {
      setViewingPort(port.id)
      setHover(null)
    },
    [setViewingPort],
  )

  // Currently-selected alternative and the full list will be
  // surfaced by the RoutePanel in chunk 4.6. For now we just
  // route the primary route (alternatives[0]) onto the map.
  void selectedAlternativeIndex
  void alternatives

  return (
    <div ref={canvasRef} className={styles.canvas}>
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
        onViewStateChange={({ viewState }) => {
          if ('longitude' in viewState && 'latitude' in viewState && 'zoom' in viewState) {
            setViewState(viewState as MapViewState)
          }
        }}
      />
      <SearchBar />
      <CompassRose bearing={viewState.bearing ?? 0} />
      <MapControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onToggleStyle={onToggleStyle}
        onToggleView={onToggleView}
        basemap={basemapId}
        perspective={(viewState.pitch ?? 0) > 0}
      />
      {hover && (
        <PortDetailPopover
          port={hover.port}
          screenX={hover.x}
          screenY={hover.y}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          isOrigin={hover.port.id === originId}
          isDestination={hover.port.id === destinationId}
          onSetOrigin={onPopoverSetOrigin}
          onSetDestination={onPopoverSetDestination}
          onViewDetails={onPopoverViewDetails}
        />
      )}
      <PortMarker viewState={viewState} width={canvasSize.width} height={canvasSize.height} />
      <PortDetailSheet />
      <div className={styles.attribution}>{basemap.attribution}</div>
    </div>
  )
}
