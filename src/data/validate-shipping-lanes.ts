/*
 * Structural validator for src/data/shipping-lanes.json.
 *
 * TypeScript types alone can't catch a malformed JSON (parse errors,
 * missing properties, wrong geometry types). This script verifies the
 * GeoJSON shape so bad data fails loudly in CI rather than silently
 * at render time in Phase 2.
 *
 * Run: npm run validate:data
 */
import type { Feature, FeatureCollection, LineString, Position } from 'geojson'
import { SHIPPING_LANES } from './shipping-lanes'

let failed = false
function fail(msg: string): void {
  console.error(`  ✗ ${msg}`)
  failed = true
}
function pass(msg: string): void {
  console.log(`  ✓ ${msg}`)
}

const collection: FeatureCollection<LineString> = SHIPPING_LANES as FeatureCollection<
  LineString,
  { name: string; type: string; importance: string }
>

console.log('Validating shipping-lanes.json…')

if (collection.type !== 'FeatureCollection') {
  fail(`top-level type is "${collection.type}", expected "FeatureCollection"`)
} else {
  pass('top-level is a FeatureCollection')
}

if (!Array.isArray(collection.features)) {
  fail('features is not an array')
} else {
  pass(`features is an array (${collection.features.length} features)`)
}

const seenNames = new Set<string>()
for (const [i, raw] of collection.features.entries()) {
  const feature = raw as Feature<LineString, { name: string; type: string; importance: string }>
  const label = `feature[${i}]`
  if (feature.type !== 'Feature') fail(`${label}: type is "${feature.type}", expected "Feature"`)
  if (!feature.properties?.name) fail(`${label}: missing properties.name`)
  else if (seenNames.has(feature.properties.name)) {
    fail(`${label}: duplicate name "${feature.properties.name}"`)
  } else {
    seenNames.add(feature.properties.name)
  }
  if (!feature.properties?.type) fail(`${label}: missing properties.type`)
  if (!feature.properties?.importance) fail(`${label}: missing properties.importance`)
  if (feature.geometry?.type !== 'LineString') {
    fail(`${label}: geometry.type is "${feature.geometry?.type}", expected "LineString"`)
    continue
  }
  const coords = feature.geometry.coordinates
  if (!Array.isArray(coords) || coords.length < 2) {
    fail(`${label}: coordinates must be an array of 2+ points`)
    continue
  }
  for (const [j, c] of coords.entries() as IterableIterator<[number, Position]>) {
    if (!Array.isArray(c) || c.length < 2) {
      fail(`${label}.coordinates[${j}]: not a [lng, lat] pair`)
      continue
    }
    const [lng, lat] = c as [number, number]
    if (lng < -180 || lng > 180) {
      fail(`${label}.coordinates[${j}]: lng ${lng} out of range [-180, 180]`)
    }
    if (lat < -90 || lat > 90) {
      fail(`${label}.coordinates[${j}]: lat ${lat} out of range [-90, 90]`)
    }
  }
}

if (failed) {
  console.error('\nValidation FAILED.')
  process.exit(1)
}

console.log(`\nAll ${collection.features.length} features valid.`)
