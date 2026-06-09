/**
 * Port dataset structural validator.
 * Run: npx tsx src/data/validate-ports.ts
 */

import { PORTS } from './ports'
import { PORT_REGIONS } from '../types/port'

let failed = false
function fail(msg: string): void {
  console.error(`  ✗ ${msg}`)
  failed = true
}

const VALID_SIZES = new Set(['Major', 'Intermediate', 'Minor', 'Small'])
const VALID_REGIONS = new Set(PORT_REGIONS)
const VALID_RESTRICTIONS = new Set(['tide', 'swell', 'ice', 'other'])
const VALID_TYPES = new Set(['container', 'bulk', 'tanker', 'roro', 'general'])

console.log(`\nValidating ${PORTS.length} ports...\n`)

// --- Required fields ---
for (const p of PORTS) {
  const id = p.id ?? '(missing)'

  if (!p.id || typeof p.id !== 'string') fail(`${id}: missing or invalid id`)
  if (!p.name || typeof p.name !== 'string') fail(`${id}: missing or invalid name`)
  if (!p.country || typeof p.country !== 'string') fail(`${id}: missing or invalid country`)
  if (!p.countryCode || typeof p.countryCode !== 'string' || p.countryCode.length !== 2)
    fail(`${id}: missing or invalid countryCode (${p.countryCode})`)

  if (typeof p.lat !== 'number' || p.lat < -90 || p.lat > 90)
    fail(`${id}: lat out of range (${p.lat})`)
  if (typeof p.lng !== 'number' || p.lng < -180 || p.lng > 180)
    fail(`${id}: lng out of range (${p.lng})`)

  if (!p.region || !VALID_REGIONS.has(p.region)) fail(`${id}: invalid region "${p.region}"`)
  if (!p.size || !VALID_SIZES.has(p.size)) fail(`${id}: invalid size "${p.size}"`)

  if (!p.depths || typeof p.depths !== 'object') fail(`${id}: missing depths object`)
  else {
    if (p.depths.channel != null && (typeof p.depths.channel !== 'number' || p.depths.channel <= 0))
      fail(`${id}: invalid channel depth`)
    if (
      p.depths.anchorage != null &&
      (typeof p.depths.anchorage !== 'number' || p.depths.anchorage <= 0)
    )
      fail(`${id}: invalid anchorage depth`)
    if (
      p.depths.cargoPier != null &&
      (typeof p.depths.cargoPier !== 'number' || p.depths.cargoPier <= 0)
    )
      fail(`${id}: invalid cargoPier depth`)
  }

  if (p.unlocode && !/^[A-Z]{2}[A-Z0-9]{3}$/.test(p.unlocode))
    fail(`${id}: invalid unlocode format "${p.unlocode}"`)

  if (p.restrictions) {
    for (const r of p.restrictions) {
      if (!VALID_RESTRICTIONS.has(r)) fail(`${id}: unknown restriction "${r}"`)
    }
  }

  if (p.type && !VALID_TYPES.has(p.type)) fail(`${id}: unknown type "${p.type}"`)
}

// --- Duplicate IDs ---
const seen = new Map<string, number>()
for (const p of PORTS) {
  const count = seen.get(p.id) ?? 0
  seen.set(p.id, count + 1)
}
for (const [id, count] of seen) {
  if (count > 1) fail(`Duplicate id "${id}" (${count} occurrences)`)
}

// --- Size distribution ---
const sizeCounts: Record<string, number> = {}
for (const p of PORTS) {
  sizeCounts[p.size] = (sizeCounts[p.size] ?? 0) + 1
}
console.log('\n  Size distribution:')
for (const s of ['Major', 'Intermediate', 'Minor', 'Small']) {
  console.log(`    ${s}: ${sizeCounts[s] ?? 0}`)
}

// --- Region distribution ---
const regionCounts: Record<string, number> = {}
for (const p of PORTS) {
  regionCounts[p.region] = (regionCounts[p.region] ?? 0) + 1
}
console.log('\n  Region distribution:')
for (const r of PORT_REGIONS) {
  const c = regionCounts[r] ?? 0
  const bar = '█'.repeat(Math.round(c / 5))
  console.log(`    ${r}: ${c} ${bar}`)
}

// --- UN/LOCODE coverage ---
const withLocode = PORTS.filter((p) => p.unlocode).length
console.log(
  `\n  UN/LOCODE coverage: ${withLocode}/${PORTS.length} (${((withLocode / PORTS.length) * 100).toFixed(1)}%)`,
)

// --- Final ---
if (failed) {
  console.error('\nValidation FAILED.\n')
  process.exit(1)
}
console.log(`\n✓ All ${PORTS.length} ports valid.\n`)
