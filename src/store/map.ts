import { create } from 'zustand'

/**
 * Map-level selection state.
 *
 * - selectedPortId: the most recently clicked port (drives the
 *   pulse marker). Phase 3 introduces the origin/destination flow;
 *   the pulse may be repurposed or moved to those in Phase 5.
 * - originId / destinationId: the start and end of the route the
 *   user is composing. Will grow to include a waypoint list in
 *   Phase 5.
 * - viewingPortId: opens the PortDetailSheet for that port. Set
 *   by the "View details" button in the search results dropdown.
 */
interface MapStore {
  selectedPortId: string | null
  originId: string | null
  destinationId: string | null
  viewingPortId: string | null
  selectPort: (id: string | null) => void
  setOrigin: (id: string | null) => void
  setDestination: (id: string | null) => void
  setViewingPort: (id: string | null) => void
  /** Swap origin and destination (atomic). No-op if either is unset. */
  swapOriginDestination: () => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPortId: null,
  originId: null,
  destinationId: null,
  viewingPortId: null,
  selectPort: (id) => set({ selectedPortId: id }),
  setOrigin: (id) => set({ originId: id }),
  setDestination: (id) => set({ destinationId: id }),
  setViewingPort: (id) => set({ viewingPortId: id }),
  swapOriginDestination: () =>
    set((s) => {
      if (!s.originId || !s.destinationId) return s
      return { originId: s.destinationId, destinationId: s.originId }
    }),
}))
