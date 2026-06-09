import { seaRoute, NoRouteError, SnapFailedError, type SeaRouteFeature } from '@/lib/searoute'
import type { Passage } from 'searoute-ts'
import { detectTransitPorts } from '@/features/map/lib/transit-detection'
import { PORTS } from '@/data/ports'
import type { Port } from '@/types/port'

/**
 * Curated route alternatives.
 *
 * The library's `seaRouteAlternatives` uses a "canal permutation"
 * that silently drops infeasible variants. For a Bangkok → Rotterdam
 * route the only viable permutations are the Malacca baseline and
 * the Sunda/Lombok detour — Suez is required to reach Rotterdam from
 * the Indian Ocean, so "no-suez" is impossible and gets dropped,
 * leaving the user with just two options and no obvious way to ask
 * for a Cape detour.
 *
 * We build the alternatives ourselves by calling `seaRoute` in
 * parallel with explicit `restrictions` arrays, labeling each
 * variant ourselves and dropping the ones that throw.
 *
 * The Cape option is hidden behind `includeLongAlternatives` — the
 * Cape detour adds ~30% / 7+ days to Asia↔Europe routes. We don't
 * want it as a default, but it should be available for users who
 * specifically want it (e.g. simulating a Suez closure).
 */

export type CuratedVariantKey = 'baseline' | 'sunda' | 'cape' | 'panama'

export interface CuratedAlternative {
  key: CuratedVariantKey
  label: string
  route: SeaRouteFeature
  distanceNm: number
  alongRoutePorts: Port[]
}

interface VariantSpec {
  key: CuratedVariantKey
  label: string
  restrictions: Passage[]
}

function hasPassage(route: SeaRouteFeature, passage: Passage): boolean {
  return (route.properties.passages ?? []).includes(passage)
}

function baselineLabel(route: SeaRouteFeature): string {
  if (hasPassage(route, 'malacca')) return 'Via Malacca'
  if (hasPassage(route, 'suez')) return 'Via Suez Canal'
  if (hasPassage(route, 'panama')) return 'Via Panama Canal'
  if (hasPassage(route, 'gibraltar')) return 'Via Gibraltar'
  return 'Baseline'
}

function panamaDetourLabel(route: SeaRouteFeature): string {
  if (hasPassage(route, 'cape_horn')) return 'Via Cape Horn'
  if (hasPassage(route, 'magellan')) return 'Via Strait of Magellan'
  return 'Avoid Panama'
}

function sundaDetourLabel(route: SeaRouteFeature): string {
  if (hasPassage(route, 'sunda')) return 'Via Sunda / Lombok'
  return 'Avoid Malacca'
}

export interface CuratedOptions {
  origin: [number, number]
  destination: [number, number]
  includeLongAlternatives?: boolean
  continentRings?: readonly (readonly [number, number][])[] | null
}

interface VariantSuccess {
  spec: VariantSpec
  route: SeaRouteFeature
}

interface VariantFailure {
  spec: VariantSpec
  reason: 'no-route' | 'snap-failed' | 'error'
  message: string
}

type VariantResult = VariantSuccess | VariantFailure

function isSuccess(r: VariantResult): r is VariantSuccess {
  return 'route' in r
}

async function tryVariant(
  spec: VariantSpec,
  origin: [number, number],
  destination: [number, number],
): Promise<VariantResult> {
  try {
    const route = await seaRoute(origin, destination, {
      restrictions: spec.restrictions,
      // Ask the library to fill `properties.passages` so the
      // UI can show which named passages the route traverses.
      returnPassages: true,
    })
    return { spec, route }
  } catch (err: unknown) {
    if (err instanceof NoRouteError) {
      return {
        spec,
        reason: 'no-route',
        message: 'No maritime route through those passages.',
      }
    }
    if (err instanceof SnapFailedError) {
      return {
        spec,
        reason: 'snap-failed',
        message: 'One of the ports is too far from the maritime network.',
      }
    }
    return {
      spec,
      reason: 'error',
      message: err instanceof Error ? err.message : 'Route computation failed.',
    }
  }
}

/**
 * Compute curated alternatives for a single origin/destination.
 *
 * We compute the unrestricted baseline first, inspect which named
 * passages it actually uses, then only try *relevant* detours. That
 * avoids obviously meaningless work like trying a Panama detour on a
 * Bangkok → Rotterdam route. Returned order is semantic, not sorted:
 * baseline first, then the shorter/nearer detours, then the long
 * emergency option (Cape) when requested.
 */
export async function computeCuratedAlternatives(
  options: CuratedOptions,
): Promise<CuratedAlternative[]> {
  const { origin, destination, includeLongAlternatives = false, continentRings } = options

  let baseline: SeaRouteFeature
  try {
    baseline = await seaRoute(origin, destination, { returnPassages: true })
  } catch {
    return []
  }

  const out: CuratedAlternative[] = [
    {
      key: 'baseline',
      label: baselineLabel(baseline),
      route: baseline,
      distanceNm: baseline.properties.length,
      alongRoutePorts: detectTransitPorts(baseline, PORTS, undefined, continentRings),
    },
  ]

  const specs: VariantSpec[] = []
  if (hasPassage(baseline, 'malacca')) {
    specs.push({ key: 'sunda', label: 'Via Sunda / Lombok', restrictions: ['malacca'] })
  }
  if (hasPassage(baseline, 'panama')) {
    specs.push({ key: 'panama', label: 'Avoid Panama', restrictions: ['panama'] })
  }
  if (
    includeLongAlternatives &&
    (hasPassage(baseline, 'suez') || hasPassage(baseline, 'babelmandeb'))
  ) {
    specs.push({
      key: 'cape',
      label: 'Via Cape of Good Hope',
      restrictions: ['suez', 'babelmandeb'],
    })
  }

  const results = await Promise.all(specs.map((s) => tryVariant(s, origin, destination)))
  for (const r of results) {
    if (!isSuccess(r)) continue
    const label =
      r.spec.key === 'panama'
        ? panamaDetourLabel(r.route)
        : r.spec.key === 'sunda'
          ? sundaDetourLabel(r.route)
          : r.spec.label
    out.push({
      key: r.spec.key,
      label,
      route: r.route,
      distanceNm: r.route.properties.length,
      alongRoutePorts: detectTransitPorts(r.route, PORTS, undefined, continentRings),
    })
  }
  return out
}
