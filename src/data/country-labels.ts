/**
 * Curated country / region labels.
 *
 * We don't show all 177 countries from the continents GeoJSON
 * — that would over-label the map. Instead we pick a handful
 * of countries / regions the user is most likely orienting by
 * on a maritime chart (the ones shipping routes pass through or
 * next to) and place a single label per region at a
 * representative point.
 *
 * Each label is a small Point — the `TextLayer` reads
 * `getPosition` from it and renders the text at that screen
 * position. No polygons involved.
 *
 * Positioning heuristic: the label point sits inside the
 * country's landmass, away from busy maritime junctions (so it
 * doesn't compete with route lines or port markers). Latitude /
 * longitude values are approximate; they were chosen by hand
 * for legibility at zoom 0-2 on the globe.
 */
export interface CountryLabel {
  /** Display text. Usually the country name; a few regional
   *  names (e.g. "Indian Ocean", "Mediterranean Sea") cover
   *  water bodies we want labelled. */
  name: string
  /** Position to anchor the label at. */
  position: [number, number]
  /** Optional styling hint — larger countries get a larger font. */
  emphasis?: 'large' | 'normal' | 'small'
}

export const COUNTRY_LABELS: CountryLabel[] = [
  // === Asia ===
  { name: 'China', position: [104.0, 35.0], emphasis: 'large' },
  { name: 'Japan', position: [138.0, 36.5] },
  { name: 'Korea', position: [128.0, 36.0] },
  { name: 'Philippines', position: [122.0, 12.5] },
  { name: 'Indonesia', position: [113.0, -2.0] },
  { name: 'Vietnam', position: [107.0, 15.0] },
  { name: 'India', position: [78.0, 22.0], emphasis: 'large' },
  { name: 'Saudi Arabia', position: [45.0, 25.0] },
  { name: 'Iran', position: [54.0, 32.0] },

  // === Europe ===
  { name: 'United Kingdom', position: [-2.0, 54.0] },
  { name: 'France', position: [2.0, 46.5] },
  { name: 'Spain', position: [-3.5, 40.0] },
  { name: 'Germany', position: [10.5, 51.0] },
  { name: 'Netherlands', position: [5.5, 52.0] },
  { name: 'Italy', position: [12.5, 42.5] },
  { name: 'Greece', position: [22.0, 39.0] },
  { name: 'Turkey', position: [35.0, 39.0] },
  { name: 'Russia', position: [60.0, 60.0], emphasis: 'large' },

  // === Africa ===
  { name: 'Egypt', position: [29.0, 26.0] },
  { name: 'South Africa', position: [25.0, -29.0] },
  { name: 'Nigeria', position: [8.0, 9.0] },
  { name: 'Kenya', position: [38.0, 0.0] },

  // === Americas ===
  { name: 'United States', position: [-100.0, 40.0], emphasis: 'large' },
  { name: 'Canada', position: [-100.0, 56.0] },
  { name: 'Mexico', position: [-102.0, 23.0] },
  { name: 'Brazil', position: [-55.0, -10.0] },
  { name: 'Argentina', position: [-65.0, -35.0] },
  { name: 'Chile', position: [-71.0, -38.0] },

  // === Oceania ===
  { name: 'Australia', position: [134.0, -25.0], emphasis: 'large' },
  { name: 'New Zealand', position: [172.0, -41.0] },

  // === Major water bodies (a few, for orientation) ===
  { name: 'Indian Ocean', position: [78.0, -15.0], emphasis: 'small' },
  { name: 'South China Sea', position: [115.0, 12.0], emphasis: 'small' },
  { name: 'Mediterranean Sea', position: [18.0, 35.0], emphasis: 'small' },
  { name: 'North Sea', position: [3.0, 56.0], emphasis: 'small' },
  { name: 'Caribbean Sea', position: [-75.0, 15.0], emphasis: 'small' },
  { name: 'Bay of Bengal', position: [88.0, 15.0], emphasis: 'small' },
  { name: 'Arabian Sea', position: [62.0, 16.0], emphasis: 'small' },
]
