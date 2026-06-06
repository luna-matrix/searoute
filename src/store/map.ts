import { create } from 'zustand'

/**
 * Map-level selection state. Currently just the selected port; will
 * grow to include origin/destination and waypoint list (Phase 3, 5).
 */
interface MapStore {
  selectedPortId: string | null
  selectPort: (id: string | null) => void
}

export const useMapStore = create<MapStore>((set) => ({
  selectedPortId: null,
  selectPort: (id) => set({ selectedPortId: id }),
}))
