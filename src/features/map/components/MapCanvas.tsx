import { useMemo, useCallback } from 'react'
import { DeckGL } from '@deck.gl/react'
import { TileLayer } from '@deck.gl/geo-layers'
import { BitmapLayer, ScatterplotLayer } from '@deck.gl/layers'
import { PORTS } from '@/data/ports'
import type { Port } from '@/types/port'
import { BASEMAPS } from '../lib/basemaps'
import type { BasemapConfig } from '../lib/basemaps'
import { getPortFill, getPortRadiusPx } from '../lib/port-styles'
import styles from './MapCanvas.module.css'

interface MapCanvasProps {
  basemap?: BasemapConfig
}

/**
 * Initial view state: centered roughly on the densest part of global
 * maritime traffic (Europe / Africa / Middle East / South Asia visible
 * in one frame), zoomed out so the curvature of the globe shows at the
 * edges. Pitch and bearing are 0 for the v1 flat-projection view; the
 * perspective toggle ships in chunk 2.5 and pitch transitions in Phase 6.
 */
const INITIAL_VIEW_STATE = {
  longitude: 20,
  latitude: 30,
  zoom: 1.5,
  pitch: 0,
  bearing: 0,
}

export default function MapCanvas({ basemap = BASEMAPS.dark }: MapCanvasProps) {
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
      new ScatterplotLayer<Port>({
        id: 'ports',
        data: PORTS,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: getPortRadiusPx,
        getFillColor: getPortFill,
        radiusUnits: 'pixels',
        pickable: true,
        // Click handler lands in chunk 2.6 with the selection store.
        onClick: (info) => {
          const port = info.object as Port | undefined
          if (port) {
            console.log('[SeaRoute] port clicked:', port.name, port.id)
          }
        },
      }),
    ],
    [basemap],
  )

  const getTooltip = useCallback(({ object }: { object?: Port }) => {
    if (!object) return null
    const port = object
    const locode = port.unlocode ? `<div class="${styles.tooltipMeta}">${port.unlocode}</div>` : ''
    return {
      html: `<div class="${styles.tooltip}">
        <div class="${styles.tooltipName}">${port.name}</div>
        <div class="${styles.tooltipCountry}">${port.country}</div>
        ${locode}
      </div>`,
    }
  }, [])

  return (
    <div className={styles.canvas}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
      />
      <div className={styles.attribution}>{basemap.attribution}</div>
    </div>
  )
}
