import type { PortCommodity } from '../types/port'

/**
 * Curated port overrides applied after automatic WPI + UN/LOCODE
 * generation.  Use this file to add ports that are missing from
 * the source datasets, correct classification, add trade partner
 * connections, and tag commodity specialisations.
 */
export interface PortOverride {
  /** Must match the generated port id, or be a NEW id for new ports. */
  id: string
  /**
   * When this is a NEW port (does not exist in the generated set),
   * provide the full port data.  The generator will append these
   * entries to the output.
   */
  newPort?: {
    name: string
    country: string
    countryCode: string
    lat: number
    lng: number
    region: string
    size: 'Major' | 'Intermediate' | 'Minor'
    unlocode?: string
    subdivision?: string
    depths?: {
      channel?: number
      anchorage?: number
      cargoPier?: number
    }
    type?: 'container' | 'bulk' | 'tanker' | 'roro' | 'general'
  }
  /** Trade partner port ids — powers "Common destinations" in search. */
  connections?: string[]
  /** Curated commodity tags for trade-flow search boosting. */
  commodities?: PortCommodity[]
  /** ISO 3166-2 subdivision code / administrative area. */
  subdivision?: string
}

/**
 * Home port — Panjang (Bandar Lampung), Indonesia.
 * A major Sumatran port for palm oil / oleochemical exports.
 */
const PANJANG: PortOverride = {
  id: 'panjang',
  newPort: {
    name: 'Panjang',
    country: 'Indonesia',
    countryCode: 'ID',
    lat: -5.46,
    lng: 105.31,
    region: 'Southeast Asia',
    size: 'Major',
    unlocode: 'IDPNJ',
    subdivision: 'ID-LA',
    depths: { channel: 12, anchorage: 10, cargoPier: 12 },
    type: 'bulk',
  },
  connections: [
    'rotterdam',
    'valencia',
    'antwerpen',
    'liverpool',
    'qingdao-gang',
    'xiamen',
    'shanghai',
    'shekou',
  ],
  commodities: ['palm_oil', 'CPO', 'oleochemical', 'biofuel'],
}

/**
 * Oleochemical + biofuel ports — used for search ranking boost.
 * These ports handle significant volumes of palm oil, vegetable
 * oils, biodiesel, or oleochemical derivatives.
 */
const OLEO_PORTS: Record<string, PortCommodity[]> = {
  // Indonesia — world's largest palm oil producer
  dumai: ['palm_oil', 'CPO', 'oleochemical', 'biofuel'],
  belawan: ['palm_oil', 'CPO', 'oleochemical'],
  palembang: ['palm_oil', 'CPO'],
  semarang: ['palm_oil', 'oleochemical'],
  surabaya: ['palm_oil', 'oleochemical'],
  balikpapan: ['palm_oil', 'CPO'],

  // Malaysia — second-largest palm oil producer
  'port-klang': ['palm_oil', 'CPO', 'oleochemical', 'biofuel'],
  'kuantan-new-port': ['palm_oil', 'CPO', 'oleochemical'],
  bintulu: ['palm_oil', 'CPO'],
  'kota-kinabalu': ['palm_oil', 'CPO'],

  // Singapore — major refining / trading hub
  'jurong-island': ['oleochemical', 'chemical', 'biofuel'],
  'pulau-bukom': ['oleochemical', 'chemical'],
  'keppel-east-singapore': ['chemical', 'biofuel'],

  // Thailand
  bangkok: ['palm_oil', 'CPO', 'biofuel'],
  'laem-chabang': ['palm_oil', 'oleochemical'],

  // India — major edible oil importer / processor
  mumbai: ['edible_oil', 'oleochemical'],
  kandla: ['edible_oil', 'palm_oil'],
  chennai: ['edible_oil', 'oleochemical'],
  kochi: ['edible_oil', 'palm_oil'],
  haldia: ['edible_oil', 'palm_oil'],

  // China — major oleochemical importer
  shanghai: ['oleochemical', 'chemical', 'biofuel'],
  'qingdao-gang': ['oleochemical', 'edible_oil'],
  xiamen: ['oleochemical', 'palm_oil'],
  shekou: ['oleochemical', 'chemical'],
  tianjin: ['oleochemical', 'chemical'],
  lianyungang: ['oleochemical', 'edible_oil'],

  // Europe — major biofuel mandate markets
  rotterdam: ['biofuel', 'oleochemical', 'chemical'],
  antwerpen: ['biofuel', 'oleochemical', 'chemical'],
  valencia: ['biofuel', 'oleochemical'],
  hamburg: ['biofuel', 'oleochemical'],
  liverpool: ['biofuel'],
  leixões: ['biofuel'],

  // Americas
  houston: ['chemical', 'biofuel'],
  'new-orleans': ['oleochemical', 'biofuel'],
  santos: ['biofuel', 'oleochemical'],
  paranagua: ['oleochemical'],
}

/** Build the full override list. */
export function buildOverrides(): PortOverride[] {
  const overrides: PortOverride[] = [PANJANG]

  for (const [id, commodities] of Object.entries(OLEO_PORTS)) {
    overrides.push({ id, commodities })
  }

  return overrides
}

/**
 * Connections for major global hub ports — powers the origin
 * suggestions dropdown and the "Intelligent defaults" system
 * from PLAN.md.
 */
export const HUB_CONNECTIONS: Record<string, string[]> = {
  shanghai: ['rotterdam', 'singapore-sg', 'los-angeles', 'busan', 'hamburg', 'antwerpen'],
  singapore: ['rotterdam', 'shanghai', 'port-klang', 'dubai-jebel-ali', 'hong-kong', 'mumbai'],
  rotterdam: ['shanghai', 'singapore-sg', 'antwerpen', 'hamburg', 'houston', 'le-havre'],
  antwerpen: ['rotterdam', 'shanghai', 'singapore-sg', 'hamburg', 'houston', 'le-havre'],
  hamburg: ['rotterdam', 'shanghai', 'antwerpen', 'singapore-sg', 'bremerhaven', 'gdansk'],
  'port-klang': ['rotterdam', 'singapore', 'shanghai', 'dubai-jebel-ali', 'mumbai', 'chennai'],
  'dubai-jebel-ali': ['shanghai', 'rotterdam', 'singapore', 'mumbai', 'port-klang', 'jeddah'],
  busan: ['shanghai', 'los-angeles', 'rotterdam', 'singapore', 'tokyo', 'hong-kong'],
  mumbai: ['dubai-jebel-ali', 'rotterdam', 'singapore', 'shanghai', 'port-klang', 'chennai'],
  'los-angeles': ['shanghai', 'busan', 'rotterdam', 'tokyo', 'hong-kong', 'manzanillo'],
}
