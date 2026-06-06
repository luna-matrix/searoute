import fuzzysort from 'fuzzysort'
import { PORTS } from '@/data/ports'
import type { Port } from '@/types/port'

/**
 * Fuzzy port search powered by fuzzysort (fzf-style ranking, 3 KB
 * gzip, built-in HTML highlighting). We score against name first,
 * then country, then UN/LOCODE — so "sha" matches Shanghai by name,
 * "japan" matches Japanese ports by country, and "CNSHA" still
 * finds Shanghai by its LOCODE.
 *
 * `threshold: -10000` keeps any non-empty match (fuzzysort's default
 * is stricter; we want loose prefix + subsequence matching for a
 * search-by-feel experience).
 */

const MAX_RESULTS = 8

const KEYS: Array<keyof Port> = ['name', 'country', 'unlocode']

/**
 * Structural type for what we read from a fuzzysort Result. The
 * full type lives in fuzzysort's `declare namespace` and isn't
 * easily re-imported via modern ESM, so we declare the two
 * methods we actually call.
 */
type FuzzysortHighlightResult = {
  highlight: (open: string, close: string) => string
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

function highlightOrEscape(result: unknown, fallback: string): string {
  const r = result as FuzzysortHighlightResult | null | undefined
  if (!r) return escapeHtml(fallback)
  return r.highlight('<b>', '</b>')
}

export function searchPorts(query: string): PortSearchResult[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  return fuzzysort
    .go(trimmed, PORTS, {
      keys: KEYS,
      limit: MAX_RESULTS,
      threshold: -10000,
    })
    .map((r) => ({
      port: r.obj as Port,
      nameHtml: highlightOrEscape(r[0], r.obj.name),
      countryHtml: highlightOrEscape(r[1], r.obj.country),
      score: r.score,
    }))
}
