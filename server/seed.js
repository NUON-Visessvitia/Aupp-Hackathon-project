// Seeds server/parts.db from the real PCPartPicker scrape at
// https://github.com/docyx/pc-part-dataset — run with `npm run seed`.
// Restricted to modern sockets (AM4, AM5, LGA1700, LGA1851) so every CPU
// candidate has a compatible motherboard actually present in the pool.

import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'parts.db')

const RAW_BASE = 'https://raw.githubusercontent.com/docyx/pc-part-dataset/main/data/json'
const MODERN_SOCKETS = new Set(['AM4', 'AM5', 'LGA1700', 'LGA1851'])

// That dataset's prices are frozen at its last real update (July 2025) — the
// repo has seen no data refresh since. To keep recommendations from quoting
// visibly stale numbers, this scales each category's raw price by a
// multiplier calibrated against real September 2026 prices (web search,
// spot-checked against specific products where possible):
//   - RAM: the dataset's ADATA XPG Lancer 32GB DDR5-6000 is $135 baseline;
//     that same kit is $404.99 now (mlq.ai, Amazon listings) — ~3.0x.
//   - Storage: 2TB NVMe averages ~$270-330 now (cheapestssd.com) vs our
//     ~$90-120 baseline — ~2.5x, NAND shortage.
//   - GPU: RTX 5070 is ~$850-960 now vs its $549 MSRP-era baseline
//     (Tom's Hardware) — ~1.4x.
//   - CPU: Ryzen 7 7800X3D is $324-365 now (wccftech), matching our $340
//     baseline almost exactly — ~1.0x, essentially unchanged.
//   - Motherboard: MSI B650 Tomahawk WIFI baseline matches its current
//     ~$190 price almost exactly at 1.05x — confirmed, no change needed.
//   - Cooling: ARCTIC Liquid Freezer III Pro 360 ($89.24 @ 1.05x vs $89.99
//     real) and Corsair Nautilus 360 RS ($110.24 vs $109.99 real) both land
//     almost exactly on real prices at 1.05x — confirmed.
//   - Power Supply: Corsair RM850e lands at $129.59 @ 1.08x, real listings
//     range $119-155 depending on retailer/color — within range, confirmed.
//   - PC Case: NZXT H6 Flow was $94.47 @ 1.05x vs its real $79.99 — cases
//     actually got a bit *cheaper* since mid-2025 (commoditized, no
//     shortage pressure), so this one needs a small markdown, not a markup.
// Still estimates, not a live feed — update as better information becomes
// available.
const PRICE_MULTIPLIER = {
  CPU: 1.0,
  Motherboard: 1.05,
  GPU: 1.4,
  RAM: 3.0,
  'PC Case': 0.9,
  Cooling: 1.05,
  Storage: 2.5,
  'Power Supply': 1.08,
}

const CPU_SOCKET_BY_ARCH = {
  'Zen 5': 'AM5',
  'Zen 4': 'AM5',
  'Zen 3': 'AM4',
  'Arrow Lake': 'LGA1851',
  'Raptor Lake Refresh': 'LGA1700',
  'Raptor Lake': 'LGA1700',
  'Alder Lake': 'LGA1700',
}

async function fetchJson(name) {
  const res = await fetch(`${RAW_BASE}/${name}.json`)
  if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`)
  return res.json()
}

function hasPrice(row) {
  return typeof row.price === 'number' && row.price > 0
}

/** Dedupe by case-insensitive name within a category, keeping the cheapest listing. */
function dedupeByName(rows) {
  const byName = new Map()
  for (const row of rows) {
    const key = row.name.toLowerCase()
    const existing = byName.get(key)
    if (!existing || row.price < existing.price) byName.set(key, row)
  }
  return [...byName.values()]
}

/** Same as dedupeByName, but keyed on name+capacity — storage reuses the same product name across capacities (e.g. "Crucial P3 Plus" 1TB and 2TB), which plain name-dedupe would wrongly collapse into one. */
function dedupeByNameAndCapacity(rows) {
  const byKey = new Map()
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}::${row.capacity}`
    const existing = byKey.get(key)
    if (!existing || row.price < existing.price) byKey.set(key, row)
  }
  return [...byKey.values()]
}

function hasRgb(...fields) {
  return fields.some((f) => typeof f === 'string' && /rgb/i.test(f))
}

async function buildCpuRows() {
  const raw = dedupeByName((await fetchJson('cpu')).filter(hasPrice))
  const rows = []
  for (const c of raw) {
    const socket = CPU_SOCKET_BY_ARCH[c.microarchitecture]
    if (!socket) continue
    const platform = socket.startsWith('AM') ? 'AMD' : 'Intel'
    rows.push({
      category: 'CPU',
      name: c.name,
      price: c.price,
      platform,
      socket,
      specs: [
        ['Cores', String(c.core_count ?? '—')],
        ['Base Clock', c.core_clock ? `${c.core_clock} GHz` : '—'],
        ['Boost Clock', c.boost_clock ? `${c.boost_clock} GHz` : '—'],
        ['TDP', c.tdp ? `${c.tdp} W` : '—'],
        ['Architecture', c.microarchitecture ?? '—'],
      ],
      tags: hasRgb(c.name) ? ['rgb'] : [],
    })
  }
  return rows
}

async function buildMotherboardRows() {
  const raw = dedupeByName(
    (await fetchJson('motherboard')).filter((m) => hasPrice(m) && MODERN_SOCKETS.has(m.socket)),
  )
  return raw.map((m) => ({
    category: 'Motherboard',
    name: m.name,
    price: m.price,
    platform: m.socket.startsWith('AM') ? 'AMD' : 'Intel',
    socket: m.socket,
    specs: [
      ['Socket', m.socket],
      ['Form Factor', m.form_factor ?? '—'],
      ['Max Memory', m.max_memory ? `${m.max_memory} GB` : '—'],
      ['Memory Slots', String(m.memory_slots ?? '—')],
      ['Color', m.color ?? '—'],
    ],
    tags: hasRgb(m.name, m.color) ? ['rgb'] : [],
  }))
}

/** Strips a trailing memory-size suffix from a chipset string, e.g. "GeForce RTX 3060 12GB" -> "GeForce RTX 3060", so it can be compared against/prefixed onto the AIB partner's product name. */
function chipsetCore(chipset) {
  return chipset.replace(/\s*\d+\s*GB$/i, '').trim()
}

async function buildGpuRows() {
  const raw = dedupeByName((await fetchJson('video-card')).filter(hasPrice))
  return raw.map((g) => {
    // The AIB partner's own product name (e.g. "PNY VERTO", "Yeston Sakura")
    // often doesn't mention the actual chipset at all — lead with the
    // well-known chipset name so "RTX 5090" is recognizable at a glance,
    // unless the partner name already includes it.
    const core = g.chipset ? chipsetCore(g.chipset) : null
    const name = core && !g.name.toLowerCase().includes(core.toLowerCase()) ? `${core} (${g.name})` : g.name
    return {
      category: 'GPU',
      name,
      price: g.price,
      platform: null,
      socket: null,
      specs: [
        ['Chipset', g.chipset ?? '—'],
        ['Memory', g.memory ? `${g.memory} GB` : '—'],
        ['Boost Clock', g.boost_clock ? `${g.boost_clock} MHz` : '—'],
        ['Length', g.length ? `${g.length} mm` : '—'],
        ['Color', g.color ?? '—'],
      ],
      tags: hasRgb(g.name, g.color) ? ['rgb'] : [],
    }
  })
}

async function buildRamRows() {
  const raw = dedupeByName((await fetchJson('memory')).filter(hasPrice))
  return raw.map((r) => {
    const [ddrGen, mhz] = Array.isArray(r.speed) ? r.speed : [null, null]
    const [moduleCount, moduleSize] = Array.isArray(r.modules) ? r.modules : [null, null]
    // The dataset's name already carries total capacity ("Corsair Vengeance
    // RGB 32 GB") but not the module breakdown — append it so "32GB" vs
    // "16GBx2 = 32GB" is visible without opening the detail modal.
    const name = moduleCount && moduleSize ? `${r.name} (${moduleSize}x${moduleCount})` : r.name
    return {
      category: 'RAM',
      name,
      price: r.price,
      platform: null,
      socket: null,
      specs: [
        ['Speed', ddrGen && mhz ? `DDR${ddrGen}-${mhz}` : '—'],
        ['Configuration', moduleCount && moduleSize ? `${moduleCount} x ${moduleSize} GB` : '—'],
        ['CAS Latency', r.cas_latency ? `CL${r.cas_latency}` : '—'],
        ['Color', r.color ?? '—'],
      ],
      tags: hasRgb(r.name, r.color) ? ['rgb'] : [],
    }
  })
}

async function buildCaseRows() {
  const raw = dedupeByName((await fetchJson('case')).filter(hasPrice))
  return raw.map((c) => {
    const tags = []
    if (hasRgb(c.name, c.color)) tags.push('rgb')
    if (c.external_volume && c.external_volume < 35) tags.push('compact')
    if (/mini/i.test(c.type ?? '')) tags.push('compact')
    return {
      category: 'PC Case',
      name: c.name,
      price: c.price,
      platform: null,
      socket: null,
      specs: [
        ['Type', c.type ?? '—'],
        ['Side Panel', c.side_panel ?? '—'],
        ['External Volume', c.external_volume ? `${c.external_volume} L` : '—'],
        ['Color', c.color ?? '—'],
      ],
      tags,
    }
  })
}

/** rpm/noise_level are either a single number or a [min, max] range in this dataset. */
function formatRange(value, unit) {
  if (value == null) return '—'
  if (Array.isArray(value)) return `${value[0]}–${value[1]} ${unit}`
  return `${value} ${unit}`
}

function rangeLow(value) {
  return Array.isArray(value) ? value[0] : value
}

async function buildCoolingRows() {
  const raw = dedupeByName((await fetchJson('cpu-cooler')).filter(hasPrice))
  return raw.map((c) => {
    const tags = []
    if (hasRgb(c.name, c.color)) tags.push('rgb')
    const lowestNoise = rangeLow(c.noise_level)
    if (typeof lowestNoise === 'number' && lowestNoise <= 22) tags.push('quiet')
    return {
      category: 'Cooling',
      name: c.name,
      price: c.price,
      platform: null,
      socket: null,
      specs: [
        ['Fan Speed', formatRange(c.rpm, 'RPM')],
        ['Noise Level', formatRange(c.noise_level, 'dB')],
        ['Color', c.color ?? '—'],
      ],
      tags,
    }
  })
}

function formatCapacity(gb) {
  if (!gb) return '—'
  return gb >= 1000 ? `${gb / 1000} TB` : `${gb} GB`
}

async function buildStorageRows() {
  const raw = dedupeByNameAndCapacity((await fetchJson('internal-hard-drive')).filter(hasPrice))
  return raw.map((s) => ({
    category: 'Storage',
    name: `${s.name} ${formatCapacity(s.capacity)}`,
    price: s.price,
    platform: null,
    socket: null,
    specs: [
      ['Type', s.type ?? '—'],
      ['Capacity', formatCapacity(s.capacity)],
      ['Interface', s.interface ?? '—'],
      ['Form Factor', s.form_factor ?? '—'],
    ],
    tags: [],
  }))
}

async function buildPowerSupplyRows() {
  const raw = dedupeByName((await fetchJson('power-supply')).filter(hasPrice))
  return raw.map((p) => ({
    category: 'Power Supply',
    name: p.name,
    price: p.price,
    platform: null,
    socket: null,
    specs: [
      ['Wattage', p.wattage ? `${p.wattage} W` : '—'],
      ['Efficiency', p.efficiency ? `80+ ${p.efficiency}` : '—'],
      ['Modular', p.modular ? String(p.modular) : 'No'],
      ['Color', p.color ?? '—'],
    ],
    tags: hasRgb(p.name, p.color) ? ['rgb'] : [],
  }))
}

async function main() {
  console.log('Fetching pc-part-dataset categories…')
  const [cpu, motherboard, gpu, ram, pcCase, cooling, storage, powerSupply] = await Promise.all([
    buildCpuRows(),
    buildMotherboardRows(),
    buildGpuRows(),
    buildRamRows(),
    buildCaseRows(),
    buildCoolingRows(),
    buildStorageRows(),
    buildPowerSupplyRows(),
  ])

  const allRows = [...cpu, ...motherboard, ...gpu, ...ram, ...pcCase, ...cooling, ...storage, ...powerSupply]
  for (const row of allRows) {
    row.price = row.price * (PRICE_MULTIPLIER[row.category] ?? 1)
  }

  console.log(
    `CPU: ${cpu.length}, Motherboard: ${motherboard.length}, GPU: ${gpu.length}, RAM: ${ram.length}, PC Case: ${pcCase.length}, Cooling: ${cooling.length}, Storage: ${storage.length}, Power Supply: ${powerSupply.length} — total ${allRows.length}`,
  )
  console.log('Applied 2025→2026 price estimate multipliers:', PRICE_MULTIPLIER)

  const db = new Database(DB_PATH)
  db.exec(`
    DROP TABLE IF EXISTS parts;
    CREATE TABLE parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      platform TEXT,
      socket TEXT,
      specs TEXT NOT NULL,
      tags TEXT NOT NULL
    );
    CREATE INDEX idx_parts_category ON parts(category);
    CREATE INDEX idx_parts_socket ON parts(socket);
  `)

  const insert = db.prepare(
    'INSERT INTO parts (category, name, price, platform, socket, specs, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  db.exec('BEGIN')
  for (const row of allRows) {
    insert.run(
      row.category,
      row.name,
      row.price,
      row.platform,
      row.socket,
      JSON.stringify(row.specs),
      JSON.stringify(row.tags),
    )
  }
  db.exec('COMMIT')
  db.close()

  console.log(`Seeded ${allRows.length} parts into ${DB_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
