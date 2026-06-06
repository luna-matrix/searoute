import { create } from 'zustand'
import type { SeaRouteAlternative, SeaRouteFeature } from '@/lib/searoute'
import type { Port } from '@/types/port'

/**
 * Map-level selection state.
 *
 * Phase 4 additions:
 * - route: the currently-displayed route (a seaRouteFeature). Null
 *   until both origin and destination are set and the route
 *   computation succeeds.
 * - alternatives: the full set of seaRouteAlternatives (route
 *   is just alternatives[selectedAlternativeIndex]).
 * - selectedAlternativeIndex: which alternative is active. Used
 *   for the switcher in chunk 4.6.
 * - transitPorts: the Major + Intermediate ports within 50 nm of
 *   the route, sorted by position along the path.
 * - isComputing: true while seaRouteAlternatives is in flight.
 * - error: the routing failure reason if any (SnapFailedError or
 *   NoRouteError from searoute-ts), or null.
 */
interface MapStore {
  selectedPortId: string | null
  originId: string | null
  destinationId: string | null
  viewingPortId: string | null
  route: SeaRouteFeature | null
  alternatives: SeaRouteAlternative[]
  selectedAlternativeIndex: number
  transitPorts: Port[]
  isComputing: boolean
  error: string | null
  selectPort: (id: string | null) => void
  setOrigin: (id: string | null) => void
  setDestination: (id: string | null) => void
  setViewingPort: (id: string | null) => void
  swapOriginDestination: () => void
  setRoute: (route: SeaRouteFeature | null) => void
  setAlternatives: (alts: SeaRouteAlternative[]) => void
  setSelectedAlternativeIndex: (i: number) => void
  setTransitPorts: (ports: Port[]) => void
  setComputing: (v: boolean) => void
  setError: (e: string | null) => void
  /** Clear all route-related state. Called when origin or
   *  destination changes (so we don't show a stale route). */
  clearRoute: () => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPortId: null,
  originId: null,
  destinationId: null,
  viewingPortId: null,
  route: null,
  alternatives: [],
  selectedAlternativeIndex: 0,
  transitPorts: [],
  isComputing: false,
  error: null,
  selectPort: (id) => set({ selectedPortId: id }),
  setOrigin: (id) => set({ originId: id }),
  setDestination: (id) => set({ destinationId: id }),
  setViewingPort: (id) => set({ viewingPortId: id }),
  swapOriginDestination: () =>
    set((s) => {
      if (!s.originId || !s.destinationId) return s
      return { originId: s.destinationId, destinationId: s.originId }
    }),
  setRoute: (route) => set({ route }),
  setAlternatives: (alts) => set({ alternatives: alts }),
  setSelectedAlternativeIndex: (i) => set({ selectedAlternativeIndex: i }),
  setTransitPorts: (ports) => set({ transitPorts: ports }),
  setComputing: (v) => set({ isComputing: v }),
  setError: (e) => set({ error: e }),
  clearRoute: () =>
    set({
      route: null,
      alternatives: [],
      selectedAlternativeIndex: 0,
      transitPorts: [],
      isComputing: false,
      error: null,
    }),
}))
