import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeckGL } from '@deck.gl/react'
import type { MapViewState } from '@deck.gl/core'
import { FlyToInterpolator } from '@deck.gl/core'
import { TileLayer } from '@deck.gl/geo-layers'
import { BitmapLayer, ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers'
import type { Feature, Geometry } from 'geojson'
import { PORTS } from '@/data/ports'
import { SHIPPING_LANES } from '@/data/shipping-lanes'
import type { ShippingLaneProperties } from '@/data/shipping-lanes'
import type { Port } from '@/types/port'
import { useMapStore } from '@/store/map'
import { BASEMAPS } from '../lib/basemaps'
import type { BasemapId } from '../lib/basemaps'
import { getPortFill, getPortRadiusPx } from '../lib/port-styles'
import { getLaneLineColor, getLaneLineWidth } from '../lib/shipping-lane-styles'
import CompassRose from './CompassRose'
import MapControls from './MapControls'
import PortMarker from './PortMarker'
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

function isPort(o: unknown): o is Port {
  return typeof o === 'object' && o !== null && 'unlocode' in o && 'lat' in o && 'lng' in o
}

function isLane(o: unknown): o is Feature<Geometry, ShippingLaneProperties> {
  return typeof o === 'object' && o !== null && 'geometry' in o && 'properties' in o
}

interface TooltipInfo {
  object?: unknown
  layer?: { id?: string } | null
}

export default function MapCanvas() {
  const [viewState, setViewState] = useState<MapViewState>(INITIAL_VIEW_STATE)
  const [basemapId, setBasemapId] = useState<BasemapId>('dark')
  const basemap = BASEMAPS[basemapId]

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

  const selectedPortId = useMapStore((s) => s.selectedPortId)
  const selectPort = useMapStore((s) => s.selectPort)

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
          if (selectedPortId === port.id) {
            selectPort(null)
            return
          }
          selectPort(port.id)
          setViewState((vs) => ({
            ...vs,
            longitude: port.lng,
            latitude: port.lat,
            zoom: SELECTED_ZOOM,
            transitionDuration: FLY_TO_DURATION_MS,
            transitionInterpolator: new FlyToInterpolator(),
          }))
        },
      }),
    ],
    [basemap, selectedPortId, selectPort],
  )

  const getTooltip = useCallback((info: TooltipInfo) => {
    if (!info.object) return null

    if (info.layer?.id === 'ports' && isPort(info.object)) {
      const port = info.object
      const locode = port.unlocode
        ? `<div class="${styles.tooltipMeta}">${port.unlocode}</div>`
        : ''
      return {
        html: `<div class="${styles.tooltip}">
            <div class="${styles.tooltipName}">${port.name}</div>
            <div class="${styles.tooltipCountry}">${port.country}</div>
            ${locode}
          </div>`,
      }
    }

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

  return (
    <div ref={canvasRef} className={styles.canvas}>
      <DeckGL
        viewState={viewState}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
        onViewStateChange={({ viewState }) => {
          // viewState is MapViewState | TransitionProps. During a
          // transition the transition payload lacks longitude/latitude
          // keys; only commit when it looks like a real view state.
          if ('longitude' in viewState && 'latitude' in viewState && 'zoom' in viewState) {
            setViewState(viewState as MapViewState)
          }
        }}
      />
      <PortMarker viewState={viewState} width={canvasSize.width} height={canvasSize.height} />
      <CompassRose bearing={viewState.bearing ?? 0} />
      <MapControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onToggleStyle={onToggleStyle}
        onToggleView={onToggleView}
        basemap={basemapId}
        perspective={(viewState.pitch ?? 0) > 0}
      />
      <div className={styles.attribution}>{basemap.attribution}</div>
    </div>
  )
}
