import fuzzysort from 'fuzzysort'
import { PORTS } from '@/data/ports'
import type { Port } from '@/types/port'

/**
 * Fuzzy port search powered by fuzzysort (fzf-style ranking).
 *
 * Custom scoreFn weights port name matches at 3×, country at 1×,
 * UN/LOCODE at 2×, and boosts Major ports by 1.5×, Intermediate
 * by 1.2×.  This ensures major maritime hubs surface above small
 * fishing ports when the query is ambiguous.
 *
 * `threshold: -10000` keeps any non-empty match — we want loose
 * prefix + subsequence matching for a search-by-feel experience.
 */

const MAX_RESULTS = 12

const SIZE_BOOST: Record<string, number> = {
  Major: 1.5,
  Intermediate: 1.2,
  Minor: 1.0,
  Small: 0.8,
}

export interface PortSearchResult {
  port: Port
  /** Pre-rendered HTML with <b> tags around matched characters
   *  (fuzzysort.highlight escapes source text for us, so this is
   *  safe to render via dangerouslySetInnerHTML). */
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
    .go(trimmed, PORTS, {
      key: 'name',
      limit: MAX_RESULTS * 3,
      threshold: -10000,
    })
    .map((r) => {
      const port = r.obj
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

/**
 * Phase 5: "Common destinations" suggestions for a given origin.
 *
 * Resolves the origin's `connections` (a curated list of port ids
 * — common trade partners) to Port objects, in the order the
 * curator wrote them. If the origin has no connections, returns
 * an empty array (caller can fall back to the regular search).
 *
 * Limits to the first 6 partners so the suggestions section
 * stays scannable in the dropdown.
 */
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

/**
 * Suggested origin ports — home port, major global hubs, and
 * recently selected origins from localStorage.
 */
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
