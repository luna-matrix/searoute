import type {
  PointInput,
  SeaRouteAlternative,
  SeaRouteAlternativesOptions,
  SeaRouteFeature,
  SeaRouteOptions,
} from 'searoute-ts'

type SearouteModule = typeof import('searoute-ts')

let modulePromise: Promise<SearouteModule> | null = null

function loadModule(): Promise<SearouteModule> {
  modulePromise ??= import('searoute-ts')
  return modulePromise
}

export async function seaRoute(
  origin: PointInput,
  destination: PointInput,
  options?: SeaRouteOptions,
): Promise<SeaRouteFeature> {
  const { seaRoute: fn } = await loadModule()
  return fn(origin, destination, options)
}

export async function seaRouteMulti(
  points: PointInput[],
  options?: SeaRouteOptions,
): Promise<SeaRouteFeature> {
  const { seaRouteMulti: fn } = await loadModule()
  return fn(points, options)
}

export async function seaRouteAlternatives(
  origin: PointInput,
  destination: PointInput,
  options?: SeaRouteAlternativesOptions,
): Promise<SeaRouteAlternative[]> {
  const { seaRouteAlternatives: fn } = await loadModule()
  return fn(origin, destination, options)
}

export type {
  PointInput,
  SeaRouteAlternative,
  SeaRouteAlternativesOptions,
  SeaRouteFeature,
  SeaRouteOptions,
}

export { NoRouteError, SnapFailedError } from 'searoute-ts'
