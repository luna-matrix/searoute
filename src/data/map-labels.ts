/**
 * Curated map labels — countries, seas, oceans, channels, straits,
 * geographical features (trenches, ridges), and island groups.
 *
 * Each label has a `category` that the label engine uses to pick
 * colour, size, and zoom gating.
 *
 * `zoomMin` is the globe zoom at which the label first appears.
 * `zoomMinFlat` overrides that for the flat Mercator map (which
 * uses a different zoom scale).  When absent, the engine scales
 * `zoomMin` appropriately.
 */
export type LabelCategory = 'land' | 'water' | 'channel' | 'feature' | 'island'
export type LabelEmphasis = 'large' | 'normal' | 'small' | 'micro'

export interface MapLabel {
  name: string
  position: [number, number]
  category: LabelCategory
  emphasis: LabelEmphasis
  zoomMin?: number
  zoomMinFlat?: number
  depth?: number
}

export const MAP_LABELS: MapLabel[] = [
  /* ================================================================ */
  /*  LAND — Countries & Continents                                    */
  /* ================================================================ */

  // Asia
  { name: 'China', position: [104.0, 35.0], category: 'land', emphasis: 'large' },
  { name: 'Japan', position: [138.0, 36.5], category: 'land', emphasis: 'normal' },
  { name: 'Korea', position: [128.0, 36.0], category: 'land', emphasis: 'normal' },
  { name: 'Philippines', position: [122.0, 12.5], category: 'land', emphasis: 'normal' },
  { name: 'Indonesia', position: [113.0, -2.0], category: 'land', emphasis: 'normal' },
  { name: 'Vietnam', position: [107.0, 15.0], category: 'land', emphasis: 'normal' },
  { name: 'India', position: [78.0, 22.0], category: 'land', emphasis: 'large' },
  { name: 'Saudi Arabia', position: [45.0, 25.0], category: 'land', emphasis: 'normal' },
  { name: 'Iran', position: [54.0, 32.0], category: 'land', emphasis: 'normal' },
  { name: 'Myanmar', position: [96.0, 22.0], category: 'land', emphasis: 'normal' },
  { name: 'Thailand', position: [101.0, 15.0], category: 'land', emphasis: 'normal' },
  { name: 'Malaysia', position: [110.0, 4.0], category: 'land', emphasis: 'normal' },
  { name: 'Sri Lanka', position: [81.0, 7.5], category: 'land', emphasis: 'small' },

  // Europe
  { name: 'United Kingdom', position: [-2.0, 54.0], category: 'land', emphasis: 'normal' },
  { name: 'France', position: [2.0, 46.5], category: 'land', emphasis: 'normal' },
  { name: 'Spain', position: [-3.5, 40.0], category: 'land', emphasis: 'normal' },
  { name: 'Germany', position: [10.5, 51.0], category: 'land', emphasis: 'normal' },
  { name: 'Netherlands', position: [5.5, 52.0], category: 'land', emphasis: 'small' },
  { name: 'Italy', position: [12.5, 42.5], category: 'land', emphasis: 'normal' },
  { name: 'Greece', position: [22.0, 39.0], category: 'land', emphasis: 'normal' },
  { name: 'Turkey', position: [35.0, 39.0], category: 'land', emphasis: 'normal' },
  { name: 'Russia', position: [60.0, 60.0], category: 'land', emphasis: 'large' },
  { name: 'Norway', position: [10.0, 62.0], category: 'land', emphasis: 'normal' },
  { name: 'Sweden', position: [17.0, 62.0], category: 'land', emphasis: 'normal' },
  { name: 'Finland', position: [26.0, 64.0], category: 'land', emphasis: 'small' },
  { name: 'Poland', position: [19.0, 52.0], category: 'land', emphasis: 'normal' },
  { name: 'Portugal', position: [-8.0, 39.0], category: 'land', emphasis: 'small' },
  { name: 'Iceland', position: [-19.0, 65.0], category: 'land', emphasis: 'small' },
  { name: 'Ireland', position: [-8.0, 53.5], category: 'land', emphasis: 'small' },
  { name: 'Denmark', position: [10.0, 56.0], category: 'land', emphasis: 'small' },

  // Africa
  { name: 'Egypt', position: [29.0, 26.0], category: 'land', emphasis: 'normal' },
  { name: 'South Africa', position: [25.0, -29.0], category: 'land', emphasis: 'normal' },
  { name: 'Nigeria', position: [8.0, 9.0], category: 'land', emphasis: 'normal' },
  { name: 'Kenya', position: [38.0, 0.0], category: 'land', emphasis: 'normal' },
  { name: 'Morocco', position: [-6.0, 32.0], category: 'land', emphasis: 'normal' },
  { name: 'Algeria', position: [3.0, 28.0], category: 'land', emphasis: 'normal' },
  { name: 'Libya', position: [17.0, 27.0], category: 'land', emphasis: 'small' },
  { name: 'Sudan', position: [30.0, 16.0], category: 'land', emphasis: 'small' },
  { name: 'Ethiopia', position: [40.0, 8.0], category: 'land', emphasis: 'small' },
  { name: 'Tanzania', position: [35.0, -6.0], category: 'land', emphasis: 'small' },
  { name: 'Angola', position: [15.0, -12.0], category: 'land', emphasis: 'small' },
  { name: 'Namibia', position: [17.0, -22.0], category: 'land', emphasis: 'small' },
  { name: 'Mozambique', position: [35.0, -18.0], category: 'land', emphasis: 'small' },
  { name: 'Madagascar', position: [47.0, -20.0], category: 'land', emphasis: 'small' },

  // Americas
  { name: 'United States', position: [-100.0, 40.0], category: 'land', emphasis: 'large' },
  { name: 'Canada', position: [-100.0, 56.0], category: 'land', emphasis: 'normal' },
  { name: 'Mexico', position: [-102.0, 23.0], category: 'land', emphasis: 'normal' },
  { name: 'Brazil', position: [-55.0, -10.0], category: 'land', emphasis: 'large' },
  { name: 'Argentina', position: [-65.0, -35.0], category: 'land', emphasis: 'normal' },
  { name: 'Chile', position: [-71.0, -38.0], category: 'land', emphasis: 'normal' },
  { name: 'Peru', position: [-75.0, -9.0], category: 'land', emphasis: 'normal' },
  { name: 'Colombia', position: [-73.0, 4.0], category: 'land', emphasis: 'normal' },
  { name: 'Venezuela', position: [-66.0, 7.0], category: 'land', emphasis: 'small' },
  { name: 'Panama', position: [-80.0, 8.5], category: 'land', emphasis: 'small' },
  { name: 'Cuba', position: [-79.0, 21.5], category: 'land', emphasis: 'small' },
  { name: 'Greenland', position: [-42.0, 72.0], category: 'land', emphasis: 'normal' },

  // Oceania
  { name: 'Australia', position: [134.0, -25.0], category: 'land', emphasis: 'large' },
  { name: 'New Zealand', position: [172.0, -41.0], category: 'land', emphasis: 'normal' },
  { name: 'Papua New Guinea', position: [144.0, -6.0], category: 'land', emphasis: 'small' },

  /* ================================================================ */
  /*  WATER — Oceans, Seas, Gulfs, Bays                                */
  /* ================================================================ */

  // Oceans
  { name: 'Pacific Ocean', position: [-150.0, -10.0], category: 'water', emphasis: 'large' },
  { name: 'Atlantic Ocean', position: [-30.0, 0.0], category: 'water', emphasis: 'large' },
  { name: 'Indian Ocean', position: [78.0, -15.0], category: 'water', emphasis: 'large' },
  { name: 'Arctic Ocean', position: [0.0, 85.0], category: 'water', emphasis: 'normal' },
  { name: 'Southern Ocean', position: [0.0, -65.0], category: 'water', emphasis: 'normal' },

  // Regional seas
  { name: 'South China Sea', position: [115.0, 12.0], category: 'water', emphasis: 'normal' },
  { name: 'Mediterranean Sea', position: [18.0, 35.0], category: 'water', emphasis: 'normal' },
  { name: 'North Sea', position: [3.0, 56.0], category: 'water', emphasis: 'normal' },
  { name: 'Caribbean Sea', position: [-75.0, 15.0], category: 'water', emphasis: 'normal' },
  { name: 'Arabian Sea', position: [62.0, 16.0], category: 'water', emphasis: 'normal' },
  { name: 'Bay of Bengal', position: [88.0, 15.0], category: 'water', emphasis: 'normal' },
  { name: 'Norwegian Sea', position: [2.0, 68.0], category: 'water', emphasis: 'small' },
  { name: 'Barents Sea', position: [40.0, 73.0], category: 'water', emphasis: 'small' },
  { name: 'Greenland Sea', position: [-5.0, 75.0], category: 'water', emphasis: 'small' },
  { name: 'Labrador Sea', position: [-55.0, 57.0], category: 'water', emphasis: 'small' },
  { name: 'Beaufort Sea', position: [-140.0, 73.0], category: 'water', emphasis: 'small' },
  { name: 'Chukchi Sea', position: [-170.0, 68.0], category: 'water', emphasis: 'small' },
  { name: 'Bering Sea', position: [-175.0, 58.0], category: 'water', emphasis: 'small' },
  { name: 'Sea of Japan', position: [135.0, 39.0], category: 'water', emphasis: 'small' },
  { name: 'Yellow Sea', position: [123.0, 36.0], category: 'water', emphasis: 'small' },
  { name: 'East China Sea', position: [125.0, 29.0], category: 'water', emphasis: 'small' },
  { name: 'Philippine Sea', position: [133.0, 17.0], category: 'water', emphasis: 'small' },
  { name: 'Java Sea', position: [111.0, -4.0], category: 'water', emphasis: 'small' },
  { name: 'Celebes Sea', position: [122.0, 3.0], category: 'water', emphasis: 'small' },
  { name: 'Sulu Sea', position: [120.0, 8.0], category: 'water', emphasis: 'small' },
  { name: 'Andaman Sea', position: [96.0, 11.0], category: 'water', emphasis: 'small' },
  { name: 'Timor Sea', position: [127.0, -12.0], category: 'water', emphasis: 'small' },
  { name: 'Arafura Sea', position: [136.0, -9.0], category: 'water', emphasis: 'small' },
  { name: 'Coral Sea', position: [155.0, -18.0], category: 'water', emphasis: 'small' },
  { name: 'Tasman Sea', position: [162.0, -37.0], category: 'water', emphasis: 'small' },
  { name: 'Red Sea', position: [39.0, 21.0], category: 'water', emphasis: 'small' },
  { name: 'Black Sea', position: [34.0, 44.0], category: 'water', emphasis: 'small' },
  { name: 'Baltic Sea', position: [20.0, 58.0], category: 'water', emphasis: 'small' },
  { name: 'Gulf of Mexico', position: [-90.0, 25.0], category: 'water', emphasis: 'small' },
  { name: 'Persian Gulf', position: [51.0, 27.0], category: 'water', emphasis: 'small' },
  { name: 'Gulf of Aden', position: [46.0, 12.0], category: 'water', emphasis: 'small' },
  { name: 'Gulf of Oman', position: [58.0, 24.0], category: 'water', emphasis: 'small' },
  { name: 'Gulf of Alaska', position: [-147.0, 58.0], category: 'water', emphasis: 'small' },
  { name: 'Gulf of Guinea', position: [2.0, 1.0], category: 'water', emphasis: 'small' },
  { name: 'Bay of Biscay', position: [-5.0, 45.0], category: 'water', emphasis: 'small' },
  { name: 'Hudson Bay', position: [-82.0, 59.0], category: 'water', emphasis: 'small' },
  { name: 'Weddell Sea', position: [-45.0, -72.0], category: 'water', emphasis: 'small' },
  { name: 'Ross Sea', position: [175.0, -75.0], category: 'water', emphasis: 'small' },

  /* ================================================================ */
  /*  CHANNELS — Straits, Canals, Passages                              */
  /* ================================================================ */

  { name: 'English Channel', position: [-2.0, 50.0], category: 'channel', emphasis: 'small' },
  { name: 'Malacca Strait', position: [101.0, 2.0], category: 'channel', emphasis: 'small' },
  { name: 'Gibraltar Strait', position: [-5.5, 36.0], category: 'channel', emphasis: 'small' },
  { name: 'Suez Canal', position: [32.5, 30.5], category: 'channel', emphasis: 'small' },
  { name: 'Panama Canal', position: [-80.0, 9.0], category: 'channel', emphasis: 'small' },
  { name: 'Bab-el-Mandeb', position: [43.0, 12.5], category: 'channel', emphasis: 'small' },
  { name: 'Strait of Hormuz', position: [56.0, 26.0], category: 'channel', emphasis: 'small' },
  { name: 'Bosphorus', position: [29.0, 41.0], category: 'channel', emphasis: 'small' },
  { name: 'Dover Strait', position: [1.5, 51.0], category: 'channel', emphasis: 'small' },
  { name: 'Sunda Strait', position: [105.8, -6.0], category: 'channel', emphasis: 'micro' },
  { name: 'Lombok Strait', position: [115.7, -8.5], category: 'channel', emphasis: 'micro' },
  { name: 'Magellan Strait', position: [-71.0, -53.5], category: 'channel', emphasis: 'micro' },
  { name: 'Bering Strait', position: [-169.0, 65.5], category: 'channel', emphasis: 'micro' },
  { name: 'Taiwan Strait', position: [120.0, 24.0], category: 'channel', emphasis: 'micro' },
  { name: 'Mozambique Channel', position: [42.0, -18.0], category: 'channel', emphasis: 'small' },
  { name: 'Kiel Canal', position: [9.5, 54.0], category: 'channel', emphasis: 'micro' },

  /* ================================================================ */
  /*  FEATURES — Trenches, Ridges, Basins, Currents                     */
  /* ================================================================ */

  // Trenches
  {
    name: 'Mariana Trench',
    position: [142.2, 11.3],
    category: 'feature',
    emphasis: 'micro',
    depth: 11034,
  },
  {
    name: 'Tonga Trench',
    position: [-173.5, -22.5],
    category: 'feature',
    emphasis: 'micro',
    depth: 10882,
  },
  {
    name: 'Philippine Trench',
    position: [126.5, 10.0],
    category: 'feature',
    emphasis: 'micro',
    depth: 10540,
  },
  {
    name: 'Kuril Trench',
    position: [155.0, 47.0],
    category: 'feature',
    emphasis: 'micro',
    depth: 10542,
  },
  {
    name: 'Japan Trench',
    position: [144.0, 38.0],
    category: 'feature',
    emphasis: 'micro',
    depth: 9000,
  },
  {
    name: 'Puerto Rico Tr.',
    position: [-65.0, 19.5],
    category: 'feature',
    emphasis: 'micro',
    depth: 8605,
  },
  {
    name: 'Java Trench',
    position: [108.0, -10.5],
    category: 'feature',
    emphasis: 'micro',
    depth: 7725,
  },
  {
    name: 'Aleutian Trench',
    position: [175.0, 52.0],
    category: 'feature',
    emphasis: 'micro',
    depth: 7822,
  },
  {
    name: 'Peru-Chile Tr.',
    position: [-76.0, -26.0],
    category: 'feature',
    emphasis: 'micro',
    depth: 8065,
  },
  {
    name: 'Kermadec Trench',
    position: [-179.0, -32.0],
    category: 'feature',
    emphasis: 'micro',
    depth: 10047,
  },

  // Ridges
  { name: 'Mid-Atlantic Ridge', position: [-20.0, 5.0], category: 'feature', emphasis: 'micro' },
  { name: 'East Pacific Rise', position: [-110.0, -20.0], category: 'feature', emphasis: 'micro' },
  { name: 'Central Indian Rdg.', position: [66.0, -25.0], category: 'feature', emphasis: 'micro' },

  // Basins
  { name: 'N. Atlantic Basin', position: [-40.0, 30.0], category: 'feature', emphasis: 'micro' },
  { name: 'S. Atlantic Basin', position: [-25.0, -25.0], category: 'feature', emphasis: 'micro' },
  { name: 'N. Pacific Basin', position: [-155.0, 35.0], category: 'feature', emphasis: 'micro' },
  { name: 'S. Pacific Basin', position: [-140.0, -40.0], category: 'feature', emphasis: 'micro' },
  { name: 'Indian Ocean Basin', position: [80.0, -20.0], category: 'feature', emphasis: 'micro' },
  { name: 'Arctic Basin', position: [0.0, 85.0], category: 'feature', emphasis: 'micro' },

  // Currents
  { name: 'Gulf Stream', position: [-45.0, 37.0], category: 'feature', emphasis: 'micro' },
  { name: 'Kuroshio Current', position: [140.0, 35.0], category: 'feature', emphasis: 'micro' },
  { name: 'Humboldt Current', position: [-75.0, -25.0], category: 'feature', emphasis: 'micro' },
  { name: 'Antarctic Circump.', position: [0.0, -55.0], category: 'feature', emphasis: 'micro' },

  /* ================================================================ */
  /*  ISLANDS — Island Groups & Archipelagos                            */
  /* ================================================================ */

  { name: 'Aleutian Is.', position: [-172.0, 53.0], category: 'island', emphasis: 'small' },
  { name: 'Hawaiian Is.', position: [-157.0, 20.0], category: 'island', emphasis: 'small' },
  { name: 'Galapagos Is.', position: [-90.5, -0.5], category: 'island', emphasis: 'small' },
  { name: 'Falkland Is.', position: [-59.0, -52.0], category: 'island', emphasis: 'small' },
  { name: 'Azores', position: [-28.0, 38.0], category: 'island', emphasis: 'small' },
  { name: 'Canary Is.', position: [-15.5, 28.0], category: 'island', emphasis: 'small' },
  { name: 'Cape Verde', position: [-24.0, 16.0], category: 'island', emphasis: 'small' },
  { name: 'Maldives', position: [73.5, 3.0], category: 'island', emphasis: 'small' },
  { name: 'Seychelles', position: [55.0, -4.5], category: 'island', emphasis: 'small' },
  { name: 'Fiji', position: [178.0, -17.5], category: 'island', emphasis: 'small' },
  { name: 'Tahiti', position: [-149.5, -17.5], category: 'island', emphasis: 'small' },
  { name: 'Bermuda', position: [-64.8, 32.3], category: 'island', emphasis: 'small' },
  { name: 'Bahamas', position: [-76.0, 24.0], category: 'island', emphasis: 'small' },
  { name: 'Mariana Is.', position: [145.0, 15.0], category: 'island', emphasis: 'small' },
  { name: 'Marshall Is.', position: [168.0, 8.0], category: 'island', emphasis: 'small' },
]

/**
 * Backward-compatible export — the label engine expects the
 * old name in a few places during the transition.  Remove
 * once all consumers use `MAP_LABELS`.
 */
export { MAP_LABELS as COUNTRY_LABELS }
