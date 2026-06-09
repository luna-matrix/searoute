#!/usr/bin/env tsx
/**
 * Port dataset generator — World Port Index + UN/LOCODE → ports.ts
 *
 * Usage:  npx tsx src/data/generate-ports.ts
 *
 * Downloads WPI shapefile from HDX, cross-references with
 * UN/LOCODE CSV, classifies by size, assigns maritime regions,
 * and writes `src/data/ports.ts`.
 *
 * Run via:  npm run generate:ports
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { open } from 'shapefile'
import { regionForLatLng } from './maritime-regions'
import type { PortSize, PortType, PortRestriction } from '../types/port'

const WPI_URL =
  'https://data.humdata.org/dataset/3f976f27-2566-4ea7-b29e-7fc6ebc90aab/resource/060abaf3-8c9f-4df4-b7e3-5335a15c6247/download/world_port_index.zip'

const UNLOCODE_URL = 'https://raw.githubusercontent.com/datasets/un-locode/main/data/code-list.csv'

const TMP = path.join(process.cwd(), 'node_modules/.cache/searoute-gen')
const OUT = path.join(process.cwd(), 'src/data/ports.ts')

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function toNumber(v: unknown, fallback?: number): number | undefined {
  if (v === null || v === undefined) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Convert UPPERCASE_WPI names to Title Case.
 * Preserves hyphens: "SENDAI-SHIOGAMA" → "Sendai-Shiogama".
 * Handles apostrophes: "CÔTE D'IVOIRE" → "Côte d'Ivoire".
 */
function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/(?:^|[-\s'’])[a-z]/g, (ch) => ch.toUpperCase())
}

/**
 * ISO 3166-1 alpha-2 → full country name.
 */
const CODE_TO_COUNTRY: Record<string, string> = {
  AE: 'United Arab Emirates',
  AG: 'Antigua and Barbuda',
  AL: 'Albania',
  AO: 'Angola',
  AQ: 'Antarctica',
  AR: 'Argentina',
  AS: 'American Samoa',
  AU: 'Australia',
  AW: 'Aruba',
  BB: 'Barbados',
  BD: 'Bangladesh',
  BE: 'Belgium',
  BG: 'Bulgaria',
  BH: 'Bahrain',
  BJ: 'Benin',
  BM: 'Bermuda',
  BN: 'Brunei',
  BQ: 'Caribbean Netherlands',
  BR: 'Brazil',
  BS: 'Bahamas',
  BZ: 'Belize',
  CA: 'Canada',
  CD: 'DR Congo',
  CG: 'Congo',
  CI: "Côte d'Ivoire",
  CL: 'Chile',
  CM: 'Cameroon',
  CN: 'China',
  CO: 'Colombia',
  CR: 'Costa Rica',
  CU: 'Cuba',
  CV: 'Cape Verde',
  CW: 'Curaçao',
  CX: 'Christmas Island',
  CY: 'Cyprus',
  DE: 'Germany',
  DJ: 'Djibouti',
  DK: 'Denmark',
  DM: 'Dominica',
  DO: 'Dominican Republic',
  DZ: 'Algeria',
  EC: 'Ecuador',
  EE: 'Estonia',
  EG: 'Egypt',
  ER: 'Eritrea',
  ES: 'Spain',
  ET: 'Ethiopia',
  FI: 'Finland',
  FJ: 'Fiji',
  FK: 'Falkland Islands',
  FM: 'Micronesia',
  FR: 'France',
  GA: 'Gabon',
  GB: 'United Kingdom',
  GD: 'Grenada',
  GE: 'Georgia',
  GF: 'French Guiana',
  GH: 'Ghana',
  GI: 'Gibraltar',
  GL: 'Greenland',
  GM: 'Gambia',
  GN: 'Guinea',
  GP: 'Guadeloupe',
  GQ: 'Equatorial Guinea',
  GR: 'Greece',
  GS: 'South Georgia',
  GT: 'Guatemala',
  GU: 'Guam',
  GW: 'Guinea-Bissau',
  GY: 'Guyana',
  HK: 'Hong Kong',
  HN: 'Honduras',
  HR: 'Croatia',
  HT: 'Haiti',
  HU: 'Hungary',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  IN: 'India',
  IQ: 'Iraq',
  IR: 'Iran',
  IS: 'Iceland',
  IT: 'Italy',
  JM: 'Jamaica',
  JO: 'Jordan',
  JP: 'Japan',
  KE: 'Kenya',
  KG: 'Kyrgyzstan',
  KH: 'Cambodia',
  KI: 'Kiribati',
  KM: 'Comoros',
  KN: 'St. Kitts and Nevis',
  KP: 'North Korea',
  KR: 'South Korea',
  KW: 'Kuwait',
  KY: 'Cayman Islands',
  KZ: 'Kazakhstan',
  LB: 'Lebanon',
  LC: 'St. Lucia',
  LI: 'Liechtenstein',
  LK: 'Sri Lanka',
  LR: 'Liberia',
  LS: 'Lesotho',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  LY: 'Libya',
  MA: 'Morocco',
  MC: 'Monaco',
  MD: 'Moldova',
  ME: 'Montenegro',
  MG: 'Madagascar',
  MH: 'Marshall Islands',
  MK: 'North Macedonia',
  ML: 'Mali',
  MM: 'Myanmar',
  MN: 'Mongolia',
  MO: 'Macau',
  MP: 'Northern Mariana Islands',
  MQ: 'Martinique',
  MR: 'Mauritania',
  MS: 'Montserrat',
  MT: 'Malta',
  MU: 'Mauritius',
  MV: 'Maldives',
  MW: 'Malawi',
  MX: 'Mexico',
  MY: 'Malaysia',
  MZ: 'Mozambique',
  NA: 'Namibia',
  NC: 'New Caledonia',
  NE: 'Niger',
  NG: 'Nigeria',
  NI: 'Nicaragua',
  NL: 'Netherlands',
  NO: 'Norway',
  NP: 'Nepal',
  NR: 'Nauru',
  NZ: 'New Zealand',
  OM: 'Oman',
  PA: 'Panama',
  PE: 'Peru',
  PF: 'French Polynesia',
  PG: 'Papua New Guinea',
  PH: 'Philippines',
  PK: 'Pakistan',
  PL: 'Poland',
  PR: 'Puerto Rico',
  PT: 'Portugal',
  PW: 'Palau',
  PY: 'Paraguay',
  QA: 'Qatar',
  RE: 'Réunion',
  RO: 'Romania',
  RS: 'Serbia',
  RU: 'Russia',
  RW: 'Rwanda',
  SA: 'Saudi Arabia',
  SB: 'Solomon Islands',
  SC: 'Seychelles',
  SD: 'Sudan',
  SE: 'Sweden',
  SG: 'Singapore',
  SH: 'Saint Helena',
  SI: 'Slovenia',
  SK: 'Slovakia',
  SL: 'Sierra Leone',
  SN: 'Senegal',
  SO: 'Somalia',
  SR: 'Suriname',
  SS: 'South Sudan',
  ST: 'São Tomé and Príncipe',
  SV: 'El Salvador',
  SX: 'Sint Maarten',
  SY: 'Syria',
  SZ: 'Eswatini',
  TC: 'Turks and Caicos',
  TD: 'Chad',
  TG: 'Togo',
  TH: 'Thailand',
  TJ: 'Tajikistan',
  TL: 'Timor-Leste',
  TN: 'Tunisia',
  TO: 'Tonga',
  TR: 'Turkey',
  TT: 'Trinidad and Tobago',
  TV: 'Tuvalu',
  TW: 'Taiwan',
  TZ: 'Tanzania',
  UA: 'Ukraine',
  UG: 'Uganda',
  US: 'United States',
  UY: 'Uruguay',
  UZ: 'Uzbekistan',
  VC: 'St. Vincent',
  VE: 'Venezuela',
  VG: 'British Virgin Islands',
  VI: 'U.S. Virgin Islands',
  VN: 'Vietnam',
  VU: 'Vanuatu',
  WS: 'Samoa',
  YE: 'Yemen',
  YT: 'Mayotte',
  ZA: 'South Africa',
  ZM: 'Zambia',
  ZW: 'Zimbabwe',
}

function parseWpiLatLng(latRaw: unknown, lngRaw: unknown): [number, number] | null {
  const lat = toNumber(latRaw)
  const lng = toNumber(lngRaw)
  if (lat == null || lng == null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lng, lat]
}

/**
 * WPI depth codes → approximate metres (midpoint of range).
 * From NGA Publication 150 data dictionary.
 */
const DEPTH_CODE_MAP: Record<string, number> = {
  A: 0.8,
  B: 2.3,
  C: 3.8,
  D: 5.3,
  E: 6.8,
  F: 8.3,
  G: 10,
  H: 11.5,
  I: 13,
  J: 14.5,
  K: 16,
  L: 19,
}

function parseDepth(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined
  // Try numeric first
  const n = Number(v)
  if (Number.isFinite(n) && n > 0 && n < 200) return Math.round(n * 10) / 10
  // Try depth code
  const code = String(v).trim().toUpperCase()
  return DEPTH_CODE_MAP[code]
}

const HARBOR_SIZE_MAP: Record<string, PortSize> = {
  L: 'Major',
  M: 'Intermediate',
  S: 'Minor',
  V: 'Small',
  l: 'Major',
  m: 'Intermediate',
  s: 'Minor',
  v: 'Small',
}

const HARBOR_TYPE_MAP: Record<string, PortType> = {
  CN: 'container',
  CB: 'bulk',
  CR: 'tanker',
  RR: 'roro',
  GN: 'general',
}

function classifySize(raw: unknown): PortSize {
  const s = String(raw ?? '').trim()
  return HARBOR_SIZE_MAP[s] ?? (s ? 'Small' : 'Intermediate')
}

function classifyType(raw: unknown): PortType | undefined {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
  return HARBOR_TYPE_MAP[s]
}

function classifyRestrictions(props: Record<string, unknown>): PortRestriction[] {
  const r: PortRestriction[] = []
  if (String(props.ENTRY_TIDE ?? '').toUpperCase() === 'Y') r.push('tide')
  if (String(props.ENTRYSWELL ?? '').toUpperCase() === 'Y') r.push('swell')
  if (String(props.ENTRY_ICE ?? '').toUpperCase() === 'Y') r.push('ice')
  if (String(props.ENTRYOTHER ?? '').toUpperCase() === 'Y') r.push('other')
  return r
}

/* ------------------------------------------------------------------ */
/*  Main pipeline                                                     */
/* ------------------------------------------------------------------ */

/*  Main pipeline                                                     */
/* ------------------------------------------------------------------ */

async function main() {
  fs.mkdirSync(TMP, { recursive: true })

  // ---- 1. Download WPI shapefile ----
  const wpiZip = path.join(TMP, 'wpi.zip')
  if (!fs.existsSync(wpiZip)) {
    console.log('Downloading WPI shapefile...')
    const res = await fetch(WPI_URL)
    if (!res.ok) throw new Error(`WPI download failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(wpiZip, buf)
  }

  const wpiDir = path.join(TMP, 'wpi')
  if (!fs.existsSync(path.join(wpiDir, 'WPI.shp'))) {
    console.log('Extracting WPI shapefile...')
    fs.mkdirSync(wpiDir, { recursive: true })
    execSync(`unzip -o "${wpiZip}" -d "${wpiDir}"`, { stdio: 'pipe' })
  }

  // ---- 2. Download UN/LOCODE CSV ----
  const locodeCsv = path.join(TMP, 'code-list.csv')
  if (!fs.existsSync(locodeCsv)) {
    console.log('Downloading UN/LOCODE CSV...')
    const res = await fetch(UNLOCODE_URL)
    if (!res.ok) throw new Error(`UN/LOCODE download failed: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(locodeCsv, buf)
  }

  // ---- 3. Build UN/LOCODE lookup (port entries only, with coords) ----
  console.log('Parsing UN/LOCODE...')
  const locodeMap = new Map<
    string,
    { name: string; lat: number; lng: number; unlocode: string; subdivision?: string }
  >()
  const locodeRaw = fs.readFileSync(locodeCsv, 'utf8')
  const locodeLines = locodeRaw.split('\n')
  // Skip header line
  for (let i = 1; i < locodeLines.length; i++) {
    const line = locodeLines[i]!
    if (!line.trim()) continue
    // Manual CSV parse (avoid heavy dependency)
    const cols = parseCSVLine(line)
    if (cols.length < 12) continue
    const change = cols[0] ?? ''
    const country = cols[1] ?? ''
    const location = cols[2] ?? ''
    const name = cols[4] ?? cols[3] ?? ''
    const subdivision = cols[5] ?? undefined
    const status = cols[6] ?? ''
    const func = cols[7] ?? ''
    const coordsRaw = cols[10] ?? ''

    // Filter: skip deleted entries
    if (change === 'X') continue
    // Filter: must have port function code
    if (!func.includes('1')) continue
    // Filter: approved status
    if (!/^(AA|AC|AF|AI|AM|AS|RL|RN)/.test(status)) continue

    const coords = parseLocodeCoords(coordsRaw)
    if (!coords) continue

    const unlocode = `${country}${location}`.toUpperCase()
    locodeMap.set(unlocode, { name, lat: coords[1], lng: coords[0], unlocode, subdivision })
  }
  console.log(`  UN/LOCODE port entries with coords: ${locodeMap.size}`)

  // ---- 4. Parse WPI shapefile ----
  console.log('Parsing WPI shapefile...')
  const src = await open(path.join(wpiDir, 'WPI.shp'), path.join(wpiDir, 'WPI.dbf'))

  interface WpiPort {
    name: string
    country: string
    countryCode: string
    lat: number
    lng: number
    size: PortSize
    region: string
    type?: PortType
    restrictions: PortRestriction[]
    depths: { channel?: number; anchorage?: number; cargoPier?: number }
    unlocode?: string
    subdivision?: string
  }

  const wpiPorts: WpiPort[] = []
  let wpiTotal = 0
  let wpiSkipped = 0

  while (true) {
    const result = await src.read()
    if (result.done) break
    wpiTotal++
    const p = result.value.properties as Record<string, unknown>

    const name = normalizeName(String(p.PORT_NAME ?? '').trim())
    if (!name) {
      wpiSkipped++
      continue
    }

    const coords = parseWpiLatLng(p.LATITUDE, p.LONGITUDE)
    if (!coords) {
      wpiSkipped++
      continue
    }

    const countryCode = String(p.COUNTRY ?? '').trim()
    const country = CODE_TO_COUNTRY[countryCode] ?? countryCode
    const size = classifySize(p.HARBORSIZE)
    if (size === 'Small') {
      wpiSkipped++
      continue
    }

    const region = regionForLatLng(coords[0], coords[1])
    const type = classifyType(p.HARBORTYPE)
    const restrictions = classifyRestrictions(p)

    const depths = {
      channel: parseDepth(p.CHAN_DEPTH),
      anchorage: parseDepth(p.ANCH_DEPTH),
      cargoPier: parseDepth(p.CARGODEPTH),
    }

    // Skip ports with no depth data at all
    if (!depths.channel && !depths.anchorage && !depths.cargoPier) {
      wpiSkipped++
      continue
    }

    wpiPorts.push({
      name,
      country,
      countryCode,
      lat: coords[1],
      lng: coords[0],
      size,
      region,
      type,
      restrictions,
      depths,
    })
  }
  console.log(`  WPI total: ${wpiTotal}, kept: ${wpiPorts.length}, skipped: ${wpiSkipped}`)

  // ---- 5. Cross-reference with UN/LOCODE ----
  console.log('Cross-referencing with UN/LOCODE...')
  let matched = 0
  const usedIds = new Set<string>()

  for (const wp of wpiPorts) {
    // Find nearest UN/LOCODE entry within ~0.5°
    let best: { unlocode: string; dist: number; subdivision?: string } | null = null
    for (const [code, entry] of locodeMap) {
      const d = Math.abs(wp.lat - entry.lat) + Math.abs(wp.lng - entry.lng)
      if (d < 0.5 && (!best || d < best.dist)) {
        best = { unlocode: code, dist: d, subdivision: entry.subdivision }
      }
    }
    if (best) {
      wp.unlocode = best.unlocode
      wp.subdivision = best.subdivision
      matched++
    }
  }
  console.log(`  UN/LOCODE matches: ${matched}/${wpiPorts.length}`)

  // ---- 6. Apply curated overrides ----
  const { buildOverrides } = await import('./port-overrides')
  const overrides = buildOverrides()
  const overrideMap = new Map(overrides.map((o) => [o.id, o]))

  // Apply commodity tags to existing ports
  for (const wp of wpiPorts) {
    const portId = slug(wp.name)
    const override = overrideMap.get(portId)
    if (override) {
      ;(wp as unknown as Record<string, unknown>).commodities = override.commodities
      ;(wp as unknown as Record<string, unknown>).connections = override.connections
      if (override.subdivision) wp.subdivision = override.subdivision
    }
  }

  // Add new ports from overrides
  for (const override of overrides) {
    if (!override.newPort) continue
    const np = override.newPort
    wpiPorts.push({
      name: np.name,
      country: np.country,
      countryCode: np.countryCode,
      lat: np.lat,
      lng: np.lng,
      size: np.size,
      region: np.region,
      type: np.type as PortType | undefined,
      restrictions: [],
      depths: np.depths ?? {},
      unlocode: np.unlocode,
      subdivision: np.subdivision,
    } as unknown as WpiPort)
    if (override.commodities) {
      ;(wpiPorts[wpiPorts.length - 1] as unknown as Record<string, unknown>).commodities =
        override.commodities
    }
    if (override.connections) {
      ;(wpiPorts[wpiPorts.length - 1] as unknown as Record<string, unknown>).connections =
        override.connections
    }
  }

  // ---- 7. Generate unique IDs ----
  const idCounts = new Map<string, number>()

  function uniqueId(port: WpiPort): string {
    let base = slug(port.name)
    // If name is very short, append country
    if (base.length < 3) base = slug(`${port.name}-${port.country}`)
    const count = idCounts.get(base) ?? 0
    idCounts.set(base, count + 1)
    if (count > 0) base = `${base}-${count}`
    return base
  }

  // ---- 7. Write ports.ts ----
  console.log(`Writing ${OUT}...`)
  const lines: string[] = [
    `import type { Port } from '@/types/port'`,
    '',
    '/**',
    ' * Maritime port dataset — generated from World Port Index (NGA Pub 150)',
    ' * and UN/LOCODE (UNECE).  See ATTRIBUTION.md for sources.',
    ` * Generated: ${new Date().toISOString().split('T')[0]}`,
    ` * ${wpiPorts.length} ports across maritime regions.`,
    ' */',
    'export const PORTS: Port[] = [',
  ]

  const indent = '  '
  for (const wp of wpiPorts) {
    const id = uniqueId(wp)
    if (usedIds.has(id)) continue
    usedIds.add(id)

    const entries: string[] = []
    entries.push(`${indent}{`)
    entries.push(`${indent}  id: '${id}',`)
    entries.push(`${indent}  name: '${escapeStr(wp.name)}',`)
    entries.push(`${indent}  country: '${escapeStr(wp.country)}',`)
    entries.push(`${indent}  countryCode: '${wp.countryCode}',`)
    entries.push(`${indent}  lat: ${wp.lat.toFixed(4)},`)
    entries.push(`${indent}  lng: ${wp.lng.toFixed(4)},`)
    entries.push(`${indent}  region: '${escapeStr(wp.region)}',`)
    entries.push(`${indent}  size: '${wp.size}',`)
    if (wp.unlocode) {
      entries.push(`${indent}  unlocode: '${wp.unlocode}',`)
    }
    if (wp.subdivision) {
      entries.push(`${indent}  subdivision: '${wp.subdivision}',`)
    }
    entries.push(`${indent}  depths: {`)
    if (wp.depths.channel != null) entries.push(`${indent}    channel: ${wp.depths.channel},`)
    if (wp.depths.anchorage != null) entries.push(`${indent}    anchorage: ${wp.depths.anchorage},`)
    if (wp.depths.cargoPier != null) entries.push(`${indent}    cargoPier: ${wp.depths.cargoPier},`)
    entries.push(`${indent}  },`)
    if (wp.type) entries.push(`${indent}  type: '${wp.type}',`)
    if (wp.restrictions.length > 0) {
      entries.push(`${indent}  restrictions: [${wp.restrictions.map((r) => `'${r}'`).join(', ')}],`)
    }
    const commodities = (wp as unknown as Record<string, unknown>).commodities as
      | string[]
      | undefined
    if (commodities && commodities.length > 0) {
      entries.push(`${indent}  commodities: [${commodities.map((c) => `'${c}'`).join(', ')}],`)
    }
    const connections = (wp as unknown as Record<string, unknown>).connections as
      | string[]
      | undefined
    if (connections && connections.length > 0) {
      entries.push(`${indent}  connections: [${connections.map((c) => `'${c}'`).join(', ')}],`)
    }
    entries.push(`${indent}} as Port,`)
    lines.push(entries.join('\n'))
  }

  lines.push(']')
  fs.writeFileSync(OUT, lines.join('\n') + '\n')
  console.log(`  Done: ${usedIds.size} ports written.`)
  console.log(`  Run: npm run validate:ports`)
}

function escapeStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseLocodeCoords(raw: string): [number, number] | null {
  const s = raw.trim()
  if (!s) return null
  // Format: "2529N 05308E" or "4230N 00131E"
  const m = s.match(/^(\d{2})(\d{2})([NS])\s+(\d{3})(\d{2})([EW])$/)
  if (!m) return null
  let lat = parseInt(m[1]!) + parseInt(m[2]!) / 60
  let lng = parseInt(m[4]!) + parseInt(m[5]!) / 60
  if (m[3] === 'S') lat = -lat
  if (m[6] === 'W') lng = -lng
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lng, lat]
}

main().catch((err) => {
  console.error('Generation failed:', err)
  process.exit(1)
})
