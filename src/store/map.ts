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
 */
interface MapStore {
  selectedPortId: string | null
  originId: string | null
  destinationId: string | null
  selectPort: (id: string | null) => void
  setOrigin: (id: string | null) => void
  setDestination: (id: string | null) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPortId: null,
  originId: null,
  destinationId: null,
  selectPort: (id) => set({ selectedPortId: id }),
  setOrigin: (id) => set({ originId: id }),
  setDestination: (id) => set({ destinationId: id }),
}))
