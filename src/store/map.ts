import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SeaRouteFeature } from '@/lib/searoute'
import type { Port } from '@/types/port'

/**
 * Map-level selection state + user settings.
 *
 * Map domain state (ports, routes, waypoints) is held here as
 * before.  The settings slice controls label visibility, grid
 * density, route display, and map-layer toggles — all persisted
 * to localStorage under the key 'searoute-settings'.
 */

/* ------------------------------------------------------------------ */
/*  Settings types                                                      */
/* ------------------------------------------------------------------ */

type CollisionMode = 'off' | 'simple'
export type GridDensity = 'major' | 'medium' | 'fine'

export interface LabelSettings {
  showCountryLabels: boolean
  showWaterLabels: boolean
  showChannelLabels: boolean
  showFeatureLabels: boolean
  showIslandLabels: boolean
  showPortLabels: boolean
  labelDensity: number
  labelSize: number
  collisionMode: CollisionMode
}

export interface GridSettings {
  showGrid: boolean
  gridDensity: GridDensity
  gridOpacity: number
}

export interface MapLayerSettings {
  showShippingLanes: boolean
  showContinentOutlines: boolean
  showReferenceLines: boolean
}

export interface RouteDisplaySettings {
  routeLineWidth: number
  showTraceAnimation: boolean
}

const DEFAULT_LABEL: LabelSettings = {
  showCountryLabels: true,
  showWaterLabels: true,
  showChannelLabels: true,
  showFeatureLabels: true,
  showIslandLabels: true,
  showPortLabels: true,
  labelDensity: 1.0,
  labelSize: 1.0,
  collisionMode: 'simple',
}

const DEFAULT_GRID: GridSettings = {
  showGrid: true,
  gridDensity: 'medium',
  gridOpacity: 0.5,
}

const DEFAULT_MAP_LAYERS: MapLayerSettings = {
  showShippingLanes: true,
  showContinentOutlines: true,
  showReferenceLines: true,
}

const DEFAULT_ROUTE_DISPLAY: RouteDisplaySettings = {
  routeLineWidth: 3,
  showTraceAnimation: true,
}

/* ------------------------------------------------------------------ */
/*  Combined map store                                                  */
/* ------------------------------------------------------------------ */

interface MapStore {
  selectedPortId: string | null
  originId: string | null
  destinationId: string | null
  waypoints: string[]
  includeLongAlternatives: boolean
  viewingPortId: string | null
  route: SeaRouteFeature | null
  alternatives: SeaRouteFeature[]
  alternativeLabels: string[]
  selectedAlternativeIndex: number
  alongRoutePorts: Port[]
  isComputing: boolean
  error: string | null

  selectPort: (id: string | null) => void
  setOrigin: (id: string | null) => void
  setDestination: (id: string | null) => void
  addWaypoint: (id: string) => void
  removeWaypoint: (index: number) => void
  moveWaypoint: (fromIndex: number, toIndex: number) => void
  clearWaypoints: () => void
  setWaypoints: (ids: string[]) => void
  setIncludeLongAlternatives: (v: boolean) => void
  setViewingPort: (id: string | null) => void
  swapOriginDestination: () => void
  setRoute: (route: SeaRouteFeature | null) => void
  setAlternatives: (alts: SeaRouteFeature[], labels: string[]) => void
  setSelectedAlternativeIndex: (i: number) => void
  setAlongRoutePorts: (ports: Port[]) => void
  setComputing: (v: boolean) => void
  setError: (e: string | null) => void
  clearRoute: () => void

  label: LabelSettings
  setLabel: (patch: Partial<LabelSettings>) => void
  grid: GridSettings
  setGrid: (patch: Partial<GridSettings>) => void
  mapLayers: MapLayerSettings
  setMapLayers: (patch: Partial<MapLayerSettings>) => void
  routeDisplay: RouteDisplaySettings
  setRouteDisplay: (patch: Partial<RouteDisplaySettings>) => void
}

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      selectedPortId: null,
      originId: 'panjang',
      destinationId: null,
      waypoints: [],
      includeLongAlternatives: true,
      viewingPortId: null,
      route: null,
      alternatives: [],
      alternativeLabels: [],
      selectedAlternativeIndex: 0,
      alongRoutePorts: [],
      isComputing: false,
      error: null,

      selectPort: (id) => set({ selectedPortId: id }),
      setOrigin: (id) => set({ originId: id }),
      setDestination: (id) => set({ destinationId: id }),
      addWaypoint: (id) =>
        set((s) => (s.waypoints.includes(id) ? s : { waypoints: [...s.waypoints, id] })),
      removeWaypoint: (index) =>
        set((s) => ({
          waypoints: s.waypoints.filter((_, i) => i !== index),
        })),
      moveWaypoint: (fromIndex, toIndex) =>
        set((s) => {
          if (fromIndex === toIndex) return s
          if (fromIndex < 0 || fromIndex >= s.waypoints.length) return s
          if (toIndex < 0 || toIndex >= s.waypoints.length) return s
          const next = [...s.waypoints]
          const [moved] = next.splice(fromIndex, 1)
          if (moved) next.splice(toIndex, 0, moved)
          return { waypoints: next }
        }),
      clearWaypoints: () => set({ waypoints: [] }),
      setWaypoints: (ids) => set({ waypoints: ids }),
      setIncludeLongAlternatives: (v) => set({ includeLongAlternatives: v }),
      setViewingPort: (id) => set({ viewingPortId: id }),
      swapOriginDestination: () =>
        set((s) => {
          if (!s.originId || !s.destinationId) return s
          return { originId: s.destinationId, destinationId: s.originId }
        }),
      setRoute: (route) => set({ route }),
      setAlternatives: (alts, labels) => set({ alternatives: alts, alternativeLabels: labels }),
      setSelectedAlternativeIndex: (i) => set({ selectedAlternativeIndex: i }),
      setAlongRoutePorts: (ports) => set({ alongRoutePorts: ports }),
      setComputing: (v) => set({ isComputing: v }),
      setError: (e) => set({ error: e }),
      clearRoute: () =>
        set({
          route: null,
          alternatives: [],
          alternativeLabels: [],
          selectedAlternativeIndex: 0,
          alongRoutePorts: [],
          isComputing: false,
          error: null,
        }),

      label: DEFAULT_LABEL,
      setLabel: (patch) => set((s) => ({ label: { ...s.label, ...patch } })),
      grid: DEFAULT_GRID,
      setGrid: (patch) => set((s) => ({ grid: { ...s.grid, ...patch } })),
      mapLayers: DEFAULT_MAP_LAYERS,
      setMapLayers: (patch) => set((s) => ({ mapLayers: { ...s.mapLayers, ...patch } })),
      routeDisplay: DEFAULT_ROUTE_DISPLAY,
      setRouteDisplay: (patch) => set((s) => ({ routeDisplay: { ...s.routeDisplay, ...patch } })),
    }),
    {
      name: 'searoute-settings',
      partialize: (state) => ({
        label: state.label,
        grid: state.grid,
        mapLayers: state.mapLayers,
        routeDisplay: state.routeDisplay,
      }),
    },
  ),
)
