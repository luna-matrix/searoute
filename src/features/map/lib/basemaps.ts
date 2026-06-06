/**
 * Basemap configurations. Each basemap is a set of XYZ tile URLs and the
 * attribution required to display it. We use providers that don't require
 * API keys for v1:
 *   - Carto dark-matter (https://carto.com/basemaps) — fits Admiralty Night
 *   - ESRI World Imagery — public satellite endpoint, no key
 *
 * To swap providers later, edit the URLs here. Phase 8 polish can make
 * these env-driven if we move to keyed providers (Stadia, Mapbox, MapTiler).
 */

export type BasemapId = 'dark' | 'satellite'

export interface BasemapConfig {
  id: BasemapId
  label: string
  /** XYZ tile URL templates. Multiple URLs are load-balanced across subdomains. */
  tiles: string[]
  /** Tile pixel size. Carto's @2x variants are 512px when tileSize is 256. */
  tileSize: 256 | 512
  attribution: string
  minZoom: number
  maxZoom: number
}

export const BASEMAPS: Record<BasemapId, BasemapConfig> = {
  dark: {
    id: 'dark',
    label: 'Dark',
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}@2x.png',
      'https://d.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}@2x.png',
    ],
    tileSize: 256,
    attribution: '© OpenStreetMap contributors · © CARTO',
    minZoom: 0,
    maxZoom: 20,
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    tileSize: 256,
    attribution:
      'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    minZoom: 0,
    maxZoom: 19,
  },
}
