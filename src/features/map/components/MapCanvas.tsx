import { useMemo } from 'react'
import { DeckGL } from '@deck.gl/react'
import { TileLayer } from '@deck.gl/geo-layers'
import { BitmapLayer } from '@deck.gl/layers'
import { BASEMAPS } from '../lib/basemaps'
import type { BasemapConfig } from '../lib/basemaps'
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
    ],
    [basemap],
  )

  return (
    <div className={styles.canvas}>
      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={layers} />
      <div className={styles.attribution}>{basemap.attribution}</div>
    </div>
  )
}
