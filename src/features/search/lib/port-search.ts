import fuzzysort from 'fuzzysort'
import { PORTS } from '@/data/ports'
import type { Port } from '@/types/port'

/**
 * Fuzzy port search powered by fuzzysort (fzf-style ranking).
 *
 * Searches against port name, country, country aliases, and
 * UN/LOCODE simultaneously via a concatenated search target.
 * Major ports get a 1.5× ranking boost; Intermediate get 1.2×.
 * Commodity-tagged ports (biofuels, oleochemicals) get 1.3×.
 */

const MAX_RESULTS = 12

const SIZE_BOOST: Record<string, number> = {
  Major: 1.5,
  Intermediate: 1.2,
  Minor: 1.0,
  Small: 0.8,
}

/**
 * Country alias map — common short codes, abbreviations, and
 * alternative names.  Expands the search target so "usa",
 * "america", or "us" all match "United States".
 */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'united states',
  us: 'united states',
  america: 'united states',
  uk: 'united kingdom',
  gb: 'united kingdom',
  england: 'united kingdom',
  uae: 'united arab emirates',
  emirates: 'united arab emirates',
  prc: 'china',
  cn: 'china',
  drc: 'dr congo',
  sk: 'south korea',
  rok: 'south korea',
  korea: 'south korea',
  nk: 'north korea',
  dprk: 'north korea',
  rf: 'russia',
  holland: 'netherlands',
  brasil: 'brazil',
  deutschland: 'germany',
  italia: 'italy',
  nippon: 'japan',
  nipon: 'japan',
  espana: 'spain',
  turkiye: 'turkey',
  indonesia: 'indonesia',
  id: 'indonesia',
  malaysia: 'malaysia',
  my: 'malaysia',
  singapore: 'singapore',
  sg: 'singapore',
  thailand: 'thailand',
  th: 'thailand',
  philippines: 'philippines',
  ph: 'philippines',
  vietnam: 'vietnam',
  vn: 'vietnam',
  australia: 'australia',
  au: 'australia',
  'new zealand': 'new zealand',
  nz: 'new zealand',
  canada: 'canada',
  ca: 'canada',
  mexico: 'mexico',
  mx: 'mexico',
  france: 'france',
  fr: 'france',
  belgium: 'belgium',
  be: 'belgium',
  india: 'india',
  in: 'india',
  pakistan: 'pakistan',
  pk: 'pakistan',
  bangladesh: 'bangladesh',
  bd: 'bangladesh',
  'sri lanka': 'sri lanka',
  lk: 'sri lanka',
  egypt: 'egypt',
  eg: 'egypt',
  'south africa': 'south africa',
  za: 'south africa',
  nigeria: 'nigeria',
  ng: 'nigeria',
  kenya: 'kenya',
  ke: 'kenya',
  argentina: 'argentina',
  ar: 'argentina',
  chile: 'chile',
  cl: 'chile',
  peru: 'peru',
  pe: 'peru',
  colombia: 'colombia',
  co: 'colombia',
  panama: 'panama',
  pa: 'panama',
  'saudi arabia': 'saudi arabia',
  sa: 'saudi arabia',
  iran: 'iran',
  ir: 'iran',
  iraq: 'iraq',
  iq: 'iraq',
}

function expandAliases(country: string): string {
  const lower = country.toLowerCase()
  return COUNTRY_ALIASES[lower] ?? ''
}

/** Pre-built search targets for all ports — builds once. */
const searchTargets = PORTS.map((port) => {
  const alias = expandAliases(port.country)
  const searchText = [port.name, port.country, alias, port.unlocode ?? '', port.countryCode]
    .filter(Boolean)
    .join(' ')
  return { port, searchText }
})

export interface PortSearchResult {
  port: Port
  nameHtml: string
  countryHtml: string
  score: number
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function searchPorts(query: string): PortSearchResult[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  return fuzzysort
    .go(trimmed, searchTargets, {
      key: 'searchText',
      limit: MAX_RESULTS * 3,
      threshold: -10000,
    })
    .map((r) => {
      const port = r.obj.port
      const sizeBoost = SIZE_BOOST[port.size] ?? 1
      const commodityBoost = (port.commodities?.length ?? 0) > 0 ? 1.3 : 1
      return {
        port,
        nameHtml: r.highlight('<b>', '</b>'),
        countryHtml: escapeHtml(port.country),
        score: r.score * sizeBoost * commodityBoost,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
}

export function suggestCommonDestinations(originId: string | null): Port[] {
  if (!originId) return []
  const origin = PORTS.find((p) => p.id === originId)
  if (!origin || !origin.connections || origin.connections.length === 0) return []
  const out: Port[] = []
  for (const id of origin.connections) {
    if (out.length >= 6) break
    const p = PORTS.find((x) => x.id === id)
    if (p && p.id !== originId) out.push(p)
  }
  return out
}

const HUB_ORIGINS = [
  'shanghai',
  'singapore-sg',
  'rotterdam',
  'busan',
  'hong-kong',
  'antwerpen',
  'hamburg',
  'los-angeles',
  'dubai-jebel-ali',
  'new-york',
  'tokyo',
  'port-klang',
  'mumbai',
  'le-havre',
]

const RECENT_KEY = 'searoute-recent-origins'

function readRecentOrigins(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const ids: unknown = JSON.parse(raw)
    if (!Array.isArray(ids)) return []
    return ids.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export function writeRecentOrigin(portId: string): void {
  const ids = [portId, ...readRecentOrigins().filter((id) => id !== portId)].slice(0, 5)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids))
  } catch {
    /* storage full — non-critical */
  }
}

export function suggestOrigins(): Port[] {
  const recent = readRecentOrigins()
  const allCandidates = [...new Set(['panjang', ...recent, ...HUB_ORIGINS])]
  const out: Port[] = []
  for (const id of allCandidates) {
    if (out.length >= 8) break
    const p = PORTS.find((x) => x.id === id)
    if (p) out.push(p)
  }
  return out
}
