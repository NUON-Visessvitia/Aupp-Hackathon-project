// Seeds server/parts.db from real listings scraped from two Cambodia PC
// retailers — https://www.ultragearcomputer.com and https://tkcomputerkh.com
// — run with `npm run seed`. This is a point-in-time snapshot (scraped
// 2026-09-18), not a live feed; re-scrape and update the *_LISTINGS arrays
// below if it goes stale. Every part below is a real, currently-listed
// product with a real price from at least one of the two sites; a handful
// of models are genuinely carried by both, and those keep two `sources`
// entries so the UI can show the real price range between them instead of
// inventing one.

import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'parts.db')

function hasRgb(...fields) {
  return fields.some((f) => typeof f === 'string' && /rgb/i.test(f))
}

/** Average of the per-retailer prices, rounded to whole dollars — the single canonical `price` used everywhere else in the app (budget math, percentile-based bottleneck checks, sorting). `sources` keeps the individual numbers for showing a real range. */
function averagePrice(sources) {
  return Math.round(sources.reduce((sum, s) => sum + s.price, 0) / sources.length)
}

function formatCapacity(gb) {
  if (!gb) return '—'
  return gb >= 1000 ? `${gb / 1000} TB` : `${gb} GB`
}

// ── CPU ──────────────────────────────────────────────────────────────────
const CPU_LISTINGS = [
  { name: 'Intel Core Ultra 5 245KF 14 cores 14 threads 5.2GHZ', socket: 'LGA1851', platform: 'Intel', cores: 14, threads: 14, boost: 5.2, tdp: 125, arch: 'Arrow Lake', sources: [{ site: 'Ultragear', price: 209 }, { site: 'TK Computer', price: 229 }] },
  { name: 'INTEL CORE ULTRA 5 225F 10 cores 10 threads 4.9GHZ', socket: 'LGA1851', platform: 'Intel', cores: 10, threads: 10, boost: 4.9, tdp: 65, arch: 'Arrow Lake', sources: [{ site: 'Ultragear', price: 159 }, { site: 'TK Computer', price: 159 }] },
  { name: 'AMD RYZEN 9 7900x 12 cores 20 threads 5.6GHZ', socket: 'AM5', platform: 'AMD', cores: 12, threads: 20, boost: 5.6, tdp: 170, arch: 'Zen 4', sources: [{ site: 'Ultragear', price: 275 }, { site: 'TK Computer', price: 329 }] },
  { name: 'Intel Core i7 12700KF 12 cores 20 threads 5.2GHz', socket: 'LGA1700', platform: 'Intel', cores: 12, threads: 20, boost: 5.2, tdp: 125, arch: 'Alder Lake', sources: [{ site: 'Ultragear', price: 195 }, { site: 'TK Computer', price: 279 }] },
  { name: 'Intel Core i5 14600K 14 cores 20 threads 5.3GHZ', socket: 'LGA1700', platform: 'Intel', cores: 14, threads: 20, boost: 5.3, tdp: null, arch: null, sources: [{ site: 'Ultragear', price: 195 }] },
  { name: 'INTEL CORE ULTRA 7 265KF 20 cores 20 threads 5.5GHZ', socket: 'LGA1851', platform: 'Intel', cores: 20, threads: 20, boost: 5.5, tdp: 125, arch: 'Arrow Lake', sources: [{ site: 'Ultragear', price: 285 }, { site: 'TK Computer', price: 299 }] },
  { name: 'INTEL CORE ULTRA 9 285K 24 cores 24 threads 5.7GHZ', socket: 'LGA1851', platform: 'Intel', cores: 24, threads: 24, boost: 5.7, tdp: 125, arch: 'Arrow Lake', sources: [{ site: 'Ultragear', price: 535 }, { site: 'TK Computer', price: 599 }] },
  { name: 'INTEL CORE ULTRA 7 265K 20 cores 20 threads 5.5GHZ', socket: 'LGA1851', platform: 'Intel', cores: 20, threads: 20, boost: 5.5, tdp: 125, arch: 'Arrow Lake', sources: [{ site: 'Ultragear', price: 295 }, { site: 'TK Computer', price: 319 }] },
  { name: 'INTEL CORE I9 14900K 24 cores 32 threads 6.0GHZ', socket: 'LGA1700', platform: 'Intel', cores: 24, threads: 32, boost: 6, tdp: null, arch: null, sources: [{ site: 'Ultragear', price: 425 }] },
  { name: 'INTEL CORE I9 14900F 24 cores 32 threads 5.8GHZ', socket: 'LGA1700', platform: 'Intel', cores: 24, threads: 32, boost: 5.8, tdp: null, arch: null, sources: [{ site: 'Ultragear', price: 395 }] },
  { name: 'AMD RYZEN 9 9900x3D 12 cores 24 threads 5.5GHZ', socket: 'AM5', platform: 'AMD', cores: 12, threads: 24, boost: 5.5, tdp: 120, arch: 'Zen 5', sources: [{ site: 'Ultragear', price: 450 }, { site: 'TK Computer', price: 549 }] },
  { name: 'AMD RYZEN 9 9950x3D 16 cores 32 threads 5.7GHZ', socket: 'AM5', platform: 'AMD', cores: 16, threads: 32, boost: 5.7, tdp: 170, arch: 'Zen 5', sources: [{ site: 'Ultragear', price: 599 }, { site: 'TK Computer', price: 699 }] },
  { name: 'AMD RYZEN 9 9950x 16 cores 32 threads 5.7GHZ', socket: 'AM5', platform: 'AMD', cores: 16, threads: 32, boost: 5.7, tdp: 170, arch: 'Zen 5', sources: [{ site: 'Ultragear', price: 469 }, { site: 'TK Computer', price: 539 }] },
  { name: 'AMD RYZEN 7 9800x3D 8 cores 16 threads 5.2GHZ', socket: 'AM5', platform: 'AMD', cores: 8, threads: 16, boost: 5.2, tdp: 120, arch: 'Zen 5', sources: [{ site: 'Ultragear', price: 389 }, { site: 'TK Computer', price: 479 }] },
  { name: 'AMD RYZEN 7 7800x3D 8 cores 16 threads 5.0GHZ', socket: 'AM5', platform: 'AMD', cores: 8, threads: 16, boost: 5, tdp: 120, arch: 'Zen 4', sources: [{ site: 'Ultragear', price: 309 }, { site: 'TK Computer', price: 349 }] },
  { name: 'AMD RYZEN 7 9700X 8 cores 16 threads 5.2GHZ', socket: 'AM5', platform: 'AMD', cores: 8, threads: 16, boost: 5.2, tdp: 65, arch: 'Zen 5', sources: [{ site: 'Ultragear', price: 249 }, { site: 'TK Computer', price: 289 }] },
  { name: 'INTEL CORE I7 14700K 20 cores 28 threads 5.6GHZ', socket: 'LGA1700', platform: 'Intel', cores: 20, threads: 28, boost: 5.6, tdp: null, arch: null, sources: [{ site: 'Ultragear', price: 295 }] },
  { name: 'INTEL CORE I7 14700KF 20 cores 28 threads 5.6GHZ', socket: 'LGA1700', platform: 'Intel', cores: 20, threads: 28, boost: 5.6, tdp: 125, arch: 'Raptor Lake Refresh', sources: [{ site: 'Ultragear', price: 295 }, { site: 'TK Computer', price: 349 }] },
  { name: 'INTEL CORE I7 14700F 20 cores 28 threads 5.4GHZ', socket: 'LGA1700', platform: 'Intel', cores: 20, threads: 28, boost: 5.4, tdp: 65, arch: 'Raptor Lake Refresh', sources: [{ site: 'Ultragear', price: 265 }, { site: 'TK Computer', price: 329 }] },
  { name: 'INTEL CORE I7 13700KF 16 cores 24 threads 5.4GHZ', socket: 'LGA1700', platform: 'Intel', cores: 16, threads: 24, boost: 5.4, tdp: 125, arch: 'Raptor Lake', sources: [{ site: 'Ultragear', price: 245 }, { site: 'TK Computer', price: 319 }] },
  { name: 'INTEL CORE I5 14600KF 14 cores 20 threads 5.2GHZ', socket: 'LGA1700', platform: 'Intel', cores: 14, threads: 20, boost: 5.2, tdp: 125, arch: 'Raptor Lake Refresh', sources: [{ site: 'Ultragear', price: 189 }, { site: 'TK Computer', price: 249 }] },
  { name: 'INTEL CORE I5 14400F 10 cores 16 threads 4.7GHZ', socket: 'LGA1700', platform: 'Intel', cores: 10, threads: 16, boost: 4.7, tdp: 65, arch: 'Raptor Lake Refresh', sources: [{ site: 'Ultragear', price: 165 }, { site: 'TK Computer', price: 199 }] },
  { name: 'INTEL CORE I5 12400F 6 cores 12 threads 4.4GHZ', socket: 'LGA1700', platform: 'Intel', cores: 6, threads: 12, boost: 4.4, tdp: 65, arch: 'Alder Lake', sources: [{ site: 'Ultragear', price: 115 }, { site: 'TK Computer', price: 149 }] },
  { name: 'INTEL CORE I3 12100F 4 cores 8 threads 4.4GHZ', socket: 'LGA1700', platform: 'Intel', cores: 4, threads: 8, boost: 4.4, tdp: 58, arch: 'Alder Lake', sources: [{ site: 'Ultragear', price: 75 }, { site: 'TK Computer', price: 109 }] },
  { name: 'AMD Ryzen 5 5500', socket: 'AM4', platform: 'AMD', cores: 6, threads: 12, boost: 4.2, tdp: 65, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 119 }] },
  { name: 'AMD Ryzen 5 5500X3D', socket: 'AM4', platform: 'AMD', cores: 6, threads: 12, boost: 4, tdp: 65, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 229 }] },
  { name: 'AMD Ryzen 5 5600X', socket: 'AM4', platform: 'AMD', cores: 6, threads: 12, boost: 4.6, tdp: 65, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'AMD Ryzen 7 5700X', socket: 'AM4', platform: 'AMD', cores: 8, threads: 16, boost: 4.6, tdp: 65, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'AMD Ryzen 7 5700X3D', socket: 'AM4', platform: 'AMD', cores: 8, threads: 16, boost: 4.1, tdp: 105, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 319 }] },
  { name: 'AMD Ryzen 7 5800X', socket: 'AM4', platform: 'AMD', cores: 8, threads: 16, boost: 4.7, tdp: 105, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 229 }] },
  { name: 'AMD Ryzen 7 5800X3D', socket: 'AM4', platform: 'AMD', cores: 8, threads: 16, boost: 4.5, tdp: 105, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 479 }] },
  { name: 'AMD Ryzen 9 5900X', socket: 'AM4', platform: 'AMD', cores: 12, threads: 24, boost: 4.8, tdp: 105, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'AMD Ryzen 9 5950X', socket: 'AM4', platform: 'AMD', cores: 16, threads: 32, boost: 4.9, tdp: 105, arch: 'Zen 3', sources: [{ site: 'TK Computer', price: 399 }] },
  { name: 'AMD Ryzen 5 7500F', socket: 'AM5', platform: 'AMD', cores: 6, threads: 12, boost: 5, tdp: 65, arch: 'Zen 4', sources: [{ site: 'TK Computer', price: 169 }] },
  { name: 'AMD Ryzen 5 7600', socket: 'AM5', platform: 'AMD', cores: 6, threads: 12, boost: 5.1, tdp: 65, arch: 'Zen 4', sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'AMD Ryzen 7 7700', socket: 'AM5', platform: 'AMD', cores: 8, threads: 16, boost: 5.3, tdp: 65, arch: 'Zen 4', sources: [{ site: 'TK Computer', price: 239 }] },
  { name: 'AMD Ryzen 9 7950X', socket: 'AM5', platform: 'AMD', cores: 16, threads: 32, boost: 5.7, tdp: 170, arch: 'Zen 4', sources: [{ site: 'TK Computer', price: 429 }] },
  { name: 'AMD Ryzen 9 7950X3D', socket: 'AM5', platform: 'AMD', cores: 16, threads: 32, boost: 5.7, tdp: 120, arch: 'Zen 4', sources: [{ site: 'TK Computer', price: 499 }] },
  { name: 'AMD Ryzen 5 9600X', socket: 'AM5', platform: 'AMD', cores: 6, threads: 12, boost: 5.4, tdp: 65, arch: 'Zen 5', sources: [{ site: 'TK Computer', price: 229 }] },
  { name: 'AMD Ryzen 7 9850X3D', socket: 'AM5', platform: 'AMD', cores: 8, threads: 16, boost: 5.3, tdp: 120, arch: 'Zen 5', sources: [{ site: 'TK Computer', price: 529 }] },
  { name: 'AMD Ryzen 9 9900X', socket: 'AM5', platform: 'AMD', cores: 12, threads: 24, boost: 5.6, tdp: 120, arch: 'Zen 5', sources: [{ site: 'TK Computer', price: 399 }] },
  { name: 'Intel Core i3 12100', socket: 'LGA1700', platform: 'Intel', cores: 4, threads: 8, boost: 4.3, tdp: 60, arch: 'Alder Lake', sources: [{ site: 'TK Computer', price: 119 }] },
  { name: 'Intel Core i5 12400', socket: 'LGA1700', platform: 'Intel', cores: 6, threads: 12, boost: 4.4, tdp: 65, arch: 'Alder Lake', sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'Intel Core i5 12600KF', socket: 'LGA1700', platform: 'Intel', cores: 10, threads: 16, boost: 4.9, tdp: 125, arch: 'Alder Lake', sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'Intel Core i5 13400F', socket: 'LGA1700', platform: 'Intel', cores: 10, threads: 16, boost: 4.6, tdp: 65, arch: 'Raptor Lake', sources: [{ site: 'TK Computer', price: 169 }] },
  { name: 'Intel Core i5 14400', socket: 'LGA1700', platform: 'Intel', cores: 10, threads: 16, boost: 4.7, tdp: 65, arch: 'Raptor Lake Refresh', sources: [{ site: 'TK Computer', price: 219 }] },
  { name: 'Intel Core i7 12700', socket: 'LGA1700', platform: 'Intel', cores: 12, threads: 20, boost: 4.9, tdp: 65, arch: 'Alder Lake', sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'Intel Core i7 13700F', socket: 'LGA1700', platform: 'Intel', cores: 16, threads: 24, boost: 5.2, tdp: 65, arch: 'Raptor Lake', sources: [{ site: 'TK Computer', price: 289 }] },
  { name: 'Intel Core i9 12900KF', socket: 'LGA1700', platform: 'Intel', cores: 16, threads: 24, boost: 5.2, tdp: 125, arch: 'Alder Lake', sources: [{ site: 'TK Computer', price: 349 }] },
  { name: 'Intel Core i9 13900KF', socket: 'LGA1700', platform: 'Intel', cores: 24, threads: 32, boost: 5.8, tdp: 125, arch: 'Raptor Lake', sources: [{ site: 'TK Computer', price: 399 }] },
  { name: 'Intel Core i9 14900KF', socket: 'LGA1700', platform: 'Intel', cores: 24, threads: 32, boost: 6, tdp: 125, arch: 'Raptor Lake Refresh', sources: [{ site: 'TK Computer', price: 479 }] },
  { name: 'Intel Core i9 14900KS', socket: 'LGA1700', platform: 'Intel', cores: 24, threads: 32, boost: 6.2, tdp: 150, arch: 'Raptor Lake Refresh', sources: [{ site: 'TK Computer', price: 519 }] },
  { name: 'Intel Ultra 5 245K', socket: 'LGA1851', platform: 'Intel', cores: 14, threads: 14, boost: 5.2, tdp: 125, arch: 'Arrow Lake', sources: [{ site: 'TK Computer', price: 249 }] },
]

function buildCpuRows() {
  return CPU_LISTINGS.map((c) => ({
    category: 'CPU',
    name: c.name.replace(/\s+/g, ' ').trim(),
    price: averagePrice(c.sources),
    platform: c.platform,
    socket: c.socket,
    specs: [
      ['Cores', String(c.cores)],
      ['Base Clock', '—'],
      ['Boost Clock', `${c.boost} GHz`],
      ['TDP', c.tdp ? `${c.tdp} W` : '—'],
      ['Architecture', c.arch ?? '—'],
    ],
    tags: hasRgb(c.name) ? ['rgb'] : [],
    sources: c.sources,
  }))
}

// ── Motherboard ──────────────────────────────────────────────────────────
const MOTHERBOARD_LISTINGS = [
  // `ddr: null` below means the listing itself didn't state a memory type —
  // left unconstrained rather than guessed, except the one H610 board: H610
  // is Intel's entry-level 12th/13th-gen chipset and, unlike B760/Z790 (which
  // genuinely ship as both DDR4 and DDR5), practically never shipped as DDR5.
  { name: 'ASROCK B850 STEEL LEGEND WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 229 }] },
  { name: 'ASROCK X870 PRO A WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 215 }] },
  { name: 'ASROCK X870E TACHI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 485 }] },
  { name: 'ASROCK B860M STEEL LEGEND WIFI LGA 1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 189 }] },
  { name: 'ASROCK B860 STEEL LEGEND WIFI LGA 1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 235 }] },
  { name: 'ASROCK B860 LIGHTNING WIFI LGA 1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 245 }] },
  { name: 'ASROCK Z890 STEEL LEGEND WIFI LGA 1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 299 }] },
  { name: 'ASROCK H810M-X WIFI LGA 1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 95 }] },
  { name: 'ASROCK H810M-H LGA 1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 85 }] },
  { name: 'GIGABYTE B650M GAMING PLUS WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 145 }] },
  { name: 'ASUS PRIME H610M-K D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 79 }] },
  { name: 'ASUS ROG Crosshair X870E HERO AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 689 }] },
  { name: 'ASUS ROG STRIX X870E-H GAMING WIFI 7 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 459 }] },
  { name: 'B850 MAX GAMING WIFI W AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 219 }] },
  { name: 'ASUS B850M-AYW WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 175 }] },
  { name: 'ROG CROSSHAIR X870E APEX GAMING AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 2, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 699 }] },
  { name: 'ASUS ROG STRIX X870-F GAMING WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 469 }] },
  { name: 'ASUS TUF GAMING X870 PLUS WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 359 }] },
  { name: 'ASUS TUF GAMING B760M PLUS WIFI ll D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 139 }] },
  { name: 'ASUS ROG STRIX B850-G GAMING WIFI D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 249 }] },
  { name: 'ASUS TUF GAMING B850-E WIFI D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 219 }] },
  { name: 'MSI PRO H610M-G WIFI LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 89 }] },
  { name: 'MSI B760M GAMING PLUS WIFI D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 139 }] },
  { name: 'ASUS X870 MAX GAMING WIFI 7 WHITE D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: 'White', sources: [{ site: 'Ultragear', price: 239 }] },
  { name: 'ASUS TUF GAMING B850 PLUS WIFI D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 239 }] },
  { name: 'ASUS B760M-AYW WIFI D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 115 }] },
  { name: 'MSI PRO X870-P WIFI D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 249 }] },
  { name: 'ASUS PRIME B850M-A WIFI D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 189 }] },
  { name: 'ASUS ROG STRIX B850-F GAMING WIFI D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 315 }] },
  { name: 'ASUS ROG STRIX B850-A GAMING WIFI D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 275 }] },
  { name: 'ASUS TUF GAMING B850M-PLUS WIFI D5 AM5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 219 }] },
  { name: 'ASUS ROG STRIX Z890-F GAMING WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 465 }] },
  { name: 'ASUS ROG STRIX Z890-A GAMING WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 385 }] },
  { name: 'ASUS TUF GAMING Z890-PLUS WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 289 }] },
  { name: 'ASUS Z890 AYW GAMING WIFI W LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 239 }] },
  { name: 'ASUS PRIME Z890-P WIFI-CSM LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 235 }] },
  { name: 'ROG STRIX B860-F GAMING WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 279 }] },
  { name: 'ROG STRIX B860-A GAMING WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 259 }] },
  { name: 'TUF GAMING B860M-PLUS WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 219 }] },
  { name: 'PRIME B860M-A WIFI-CSM LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 165 }] },
  { name: 'B860M AYW GAMING WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 149 }] },
  { name: 'MSI MAG Z890 TOMAHAWK WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 365 }] },
  { name: 'MSI Z890 GAMING PLUS WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 315 }] },
  { name: 'MSI PRO Z890-P WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 289 }] },
  { name: 'MAG B860 TOMAHAWK WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 255 }] },
  { name: 'B860M GAMING PLUS WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 209 }] },
  { name: 'PRO B860M-A WIFI LGA1851', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 195 }] },
  { name: 'ROG STRIX X870-A GAMING WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 435 }] },
  { name: 'TUF GAMING X870-PLUS WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 400 }] },
  { name: 'B760M-AYW WIFI D4 LGA1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR4', color: null, sources: [{ site: 'Ultragear', price: 110 }] },
  { name: 'ASUS PRIME X870-P WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 245 }] },
  { name: 'MSI TOMAHAWK B850 MAX WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 245 }] },
  { name: 'ASUS PRIME B650M-A WIFI AM5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 185 }] },
  { name: 'ASUS PRIME Z790-P WIFI D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 189 }] },
  { name: 'GIGABYTE Z790 EAGLE AX LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 185 }] },
  { name: 'GIGABYTE B760M GAMING X AX LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR4', color: null, sources: [{ site: 'Ultragear', price: 165 }] },
  { name: 'ASUS ROG STRIX B760-F GAMING WIFI D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 189 }] },
  { name: 'ASUS ROG STRIX B760-A GAMING WIFI D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 179 }] },
  { name: 'ASUS TUF GAMING B760 PLUS WIFI D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 165 }] },
  { name: 'ASUS PRIME H610M-E LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR4', color: null, sources: [{ site: 'Ultragear', price: 79 }] },
  { name: 'GIGABYTE B760M DS3H AX LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR4', color: null, sources: [{ site: 'Ultragear', price: 125 }] },
  { name: 'ASUS PRIME B760M-A WIFI D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 125 }] },
  { name: 'MSI PRO B760M-A WIFI D5 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR5', color: null, sources: [{ site: 'Ultragear', price: 125 }] },
  { name: 'MSI PRO B760M-A WIFI D4 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR4', color: null, sources: [{ site: 'Ultragear', price: 129 }] },
  { name: 'GIGABYTE H610M-H V3 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 2, ddr: 'DDR4', color: null, sources: [{ site: 'Ultragear', price: 69 }] },
  { name: 'MSI PRO H610M-S WIFI D4 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR4', color: null, sources: [{ site: 'Ultragear', price: 79 }] },
  { name: 'GIGABYTE B760M GAMING PLUS WIFI D4 LGA 1700', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: 4, ddr: 'DDR4', color: null, sources: [{ site: 'Ultragear', price: 115 }] },
  { name: 'ASRock H610M-H2/M.2', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 75 }] },
  { name: 'ASRock B760M Steel Legend WiFi', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: null, color: null, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'ASRock B760M WIFI Pro RS D4', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'ASRock Z790I Lightning WIFI D5 - Phantom Gaming', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 329 }] },
  { name: 'ASRock B650M PG Lightning WiFi', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'ASRock B850 Challenger WiFi White', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: 'White', sources: [{ site: 'TK Computer', price: 209 }] },
  { name: 'ASRock B850 Pro-A WiFi', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'ASRock B850 Riptide Wifi D5 - Phantom Gaming', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 269 }] },
  { name: 'ASRock B850-X Wifi D5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'ASRock B850I Lightning Wifi D5 - Phantom Gaming', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'ASRock B850M Steel Legend Wifi D5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 229 }] },
  { name: 'ASRock X870 Pro RS Wifi D5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 269 }] },
  { name: 'ASRock X870 Steel Legend WIFI D5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'ASRock X870 Taichi Creator WIFI D5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 429 }] },
  { name: 'ASRock X870E Nova WIFI D5 - Phantom Gaming', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 429 }] },
  { name: 'Asus TUF GAMING Z890-PLUS WIFI', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 319 }] },
  { name: 'Asus B760M AYW WIFI D5', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 129 }] },
  { name: 'Asus B860M AYW Gaming WIFI D5', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'Asus PRIME A520M-R', socket: 'AM4', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 75 }] },
  { name: 'Asus PRIME H610M-K D4', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'Asus TUF GAMING B550M-PLUS WIFI II', socket: 'AM4', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'Asus TUF GAMING B760-PLUS WIFI', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: null, color: null, sources: [{ site: 'TK Computer', price: 179 }] },
  { name: 'Asus TUF GAMING B760M-PLUS WIFI II', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: null, color: null, sources: [{ site: 'TK Computer', price: 169 }] },
  { name: 'Asus TUF GAMING B850M-PLUS WIFI', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 219 }] },
  { name: 'Asus TUF GAMING B860M-PLUS WIFI', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 229 }] },
  { name: 'Asus TX GAMING B860M WIFI', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 189 }] },
  { name: 'Gigabyte B550M AORUS ELITE AX', socket: 'AM4', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'Gigabyte B550M GAMING X WIFI6', socket: 'AM4', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'Gigabyte B550M K', socket: 'AM4', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 109 }] },
  { name: 'Gigabyte B650M AORUS ELITE AX', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'Gigabyte B650M AORUS ELITE AX ICE', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: 'White', sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'Gigabyte B650M Gaming Wifi', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'Gigabyte B850 AORUS ELITE WIFI7', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 279 }] },
  { name: 'Gigabyte B850 AORUS ELITE WIFI7 ICE', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: 'White', sources: [{ site: 'TK Computer', price: 279 }] },
  { name: 'Gigabyte B850M AORUS ELITE WIFI6E', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'Gigabyte B850M AORUS ELITE WIFI6E ICE', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: 'White', sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'Gigabyte X870 AORUS ELITE WIFI7', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 319 }] },
  { name: 'Gigabyte X870 AORUS ELITE WIFI7 ICE', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: 'White', sources: [{ site: 'TK Computer', price: 319 }] },
  { name: 'Gigabyte X870 EAGLE WIFI 7', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 269 }] },
  { name: 'Gigabyte X870 GAMING WIFI6', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'Gigabyte X870E AORUS ELITE WIFI7', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 349 }] },
  { name: 'Gigabyte X870E AORUS PRO ICE', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: 'White', sources: [{ site: 'TK Computer', price: 349 }] },
  { name: 'MSI B650M BOMBER WIFI', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'MSI B650M Gaming Plus WIFI', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 179 }] },
  { name: 'MSI B650M Gaming WIFI D5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'MSI B760M Gaming Plus WIFI D5', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 179 }] },
  { name: 'MSI B760M bomber Wifi DDR4', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 125 }] },
  { name: 'MSI B850M GAMING PRO WIFI6E', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 189 }] },
  { name: 'MSI B860M GAMING PLUS WIFI', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 189 }] },
  { name: 'MSI MAG B650M Mortar WIFI D5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'MSI MAG B850M Mortar WIFI D5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 239 }] },
  { name: 'MSI MAG B860M MORTAR WIFI D5', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 219 }] },
  { name: 'MSI MAG Z790 TOMAHAWK MAX WIFI', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: null, color: null, sources: [{ site: 'TK Computer', price: 279 }] },
  { name: 'MSI MAG Z890 TOMAHAWK WIFI', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'MSI MPG B760M EDGE TI WIFI DDR5', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'MSI MPG X870E CARBON WIFI', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 499 }] },
  { name: 'MSI PRO B840M-B', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 119 }] },
  { name: 'MSI PRO B860M-B WIFI', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'MSI PRO H810M-B', socket: 'LGA1851', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 115 }] },
  { name: 'MSI Pro A620M-E D5', socket: 'AM5', platform: 'AMD', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'MSI Pro H610M-S DDR4', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'MSI Pro H610M-S Wifi DDR4', socket: 'LGA1700', platform: 'Intel', formFactor: 'Micro ATX', memorySlots: null, ddr: 'DDR4', color: null, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'MSI X670E Gaming Plus WIFI D5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'MSI X870 GAMING PLUS WIFI D5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'MSI X870E GAMING PLUS WIFI DDR5', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 329 }] },
  { name: 'MSI Z790 Gaming Plus Wifi DD5', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 259 }] },
  { name: 'MSI Z890 GAMING PLUS WIFI', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 289 }] },
  { name: 'ROG CROSSHAIR X870E HERO', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 749 }] },
  { name: 'ROG STRIX B760-A GAMING WIFI D5', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 209 }] },
  { name: 'ROG STRIX B760-F GAMING WIFI', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: null, color: null, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'ROG STRIX B760-G GAMING WIFI D5', socket: 'LGA1700', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'ROG STRIX B850-A GAMING WIFI', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'ROG STRIX B850-G GAMING WIFI S', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'ROG STRIX B860-A GAMING WIFI S', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 289 }] },
  { name: 'ROG STRIX B860-F GAMING WIFI', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 319 }] },
  { name: 'ROG STRIX B860-G GAMING WIFI S', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 239 }] },
  { name: 'ROG STRIX MAXIMUS Z890 APEX', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 569 }] },
  { name: 'ROG STRIX MAXIMUS Z890 HERO', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 619 }] },
  { name: 'ROG STRIX X870E-H GAMING WIFI7', socket: 'AM5', platform: 'AMD', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 455 }] },
  { name: 'ROG STRIX Z890-H GAMING WIFI S', socket: 'LGA1851', platform: 'Intel', formFactor: 'ATX', memorySlots: null, ddr: 'DDR5', color: null, sources: [{ site: 'TK Computer', price: 399 }] },
]

function buildMotherboardRows() {
  return MOTHERBOARD_LISTINGS.map((m) => ({
    category: 'Motherboard',
    name: m.name,
    price: averagePrice(m.sources),
    platform: m.platform,
    socket: m.socket,
    specs: [
      ['Socket', m.socket],
      ['Form Factor', m.formFactor],
      ['Max Memory', '—'],
      ['Memory Slots', m.memorySlots != null ? String(m.memorySlots) : '—'],
      ['Memory Type', m.ddr ?? '—'],
      ['Color', m.color ?? '—'],
    ],
    tags: hasRgb(m.name, m.color ?? '') ? ['rgb'] : [],
    sources: m.sources,
  }))
}

// ── GPU ──────────────────────────────────────────────────────────────────
const GPU_LISTINGS = [
  { name: 'MSI GAMING TRIO RTX 5070 12GB GDDR7', chipset: 'GeForce RTX 5070', vram: 12, sources: [{ site: 'Ultragear', price: 799 }] },
  { name: 'GIGABYTE WINFORCE OC RTX 3050 6GB GDDR6', chipset: 'GeForce RTX 3050', vram: 6, sources: [{ site: 'Ultragear', price: 235 }] },
  { name: 'MSI VENTUS 2x OC RTX 3050 6GB GDDR6', chipset: 'GeForce RTX 3050', vram: 6, sources: [{ site: 'Ultragear', price: 235 }] },
  { name: 'ASRock Intel Arc B580 Challenger 12GB OC', chipset: 'Arc B580', vram: 12, sources: [{ site: 'TK Computer', price: 369 }] },
  { name: 'ASRock Intel Arc B580 Steel Legend 12GB OC', chipset: 'Arc B580', vram: 12, sources: [{ site: 'TK Computer', price: 389 }] },
  { name: 'ASRock Radeon RX 9060 XT Challenger 8GB OC', chipset: 'Radeon RX 9060 XT', vram: 8, sources: [{ site: 'TK Computer', price: 379 }] },
  { name: 'ASRock Radeon RX 9060 XT Steel Legend 8GB OC', chipset: 'Radeon RX 9060 XT', vram: 8, sources: [{ site: 'TK Computer', price: 399 }] },
  { name: 'ASRock Radeon RX 9070 Challenger 16GB', chipset: 'Radeon RX 9070', vram: 16, sources: [{ site: 'TK Computer', price: 779 }] },
  { name: 'ASRock Radeon RX 9070 XT Steel Legend 16GB', chipset: 'Radeon RX 9070 XT', vram: 16, sources: [{ site: 'TK Computer', price: 879 }] },
  { name: 'ASRock Radeon RX 9070 XT Steel Legend Dark 16GB', chipset: 'Radeon RX 9070 XT', vram: 16, sources: [{ site: 'TK Computer', price: 949 }] },
  { name: 'ASRock Radeon RX 9070 XT Taichi 16GB OC', chipset: 'Radeon RX 9070 XT', vram: 16, sources: [{ site: 'TK Computer', price: 929 }] },
  { name: 'Asus ATS RX 7650 GRE O8G', chipset: 'Radeon RX 7650 GRE', vram: 8, sources: [{ site: 'TK Computer', price: 389 }] },
  { name: 'Asus Dual GeForce RTX 5060 8GB GDDR7', chipset: 'GeForce RTX 5060', vram: 8, sources: [{ site: 'TK Computer', price: 499 }] },
  { name: 'Asus Dual GeForce RTX 5060 Ti 16GB GDDR7', chipset: 'GeForce RTX 5060 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 749 }] },
  { name: 'Asus Dual GeForce RTX 5060 Ti 8GB GDDR7', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 569 }] },
  { name: 'Asus Dual Radeon RX9060 XT 16G GDDR6', chipset: 'Radeon RX 9060 XT', vram: 16, sources: [{ site: 'TK Computer', price: 549 }] },
  { name: 'Asus Dual Radeon RX9060 XT 8G GDDR6', chipset: 'Radeon RX 9060 XT', vram: 8, sources: [{ site: 'TK Computer', price: 419 }] },
  { name: 'Asus PRIME GeForce RTX 5060 Ti 16GB GDDR7', chipset: 'GeForce RTX 5060 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 779 }] },
  { name: 'Asus PRIME GeForce RTX 5080 16GB GDDR7 OC Edition', chipset: 'GeForce RTX 5080', vram: 16, sources: [{ site: 'TK Computer', price: 1549 }] },
  { name: 'Asus Prime RTX 5070Ti OC 16GB', chipset: 'GeForce RTX 5070 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 1199 }] },
  { name: 'Asus Prime Radeon RX 9060 XT 16GB GDDR6', chipset: 'Radeon RX 9060 XT', vram: 16, sources: [{ site: 'TK Computer', price: 569 }] },
  { name: 'Asus Prime Radeon RX 9060 XT 8GB GDDR6', chipset: 'Radeon RX 9060 XT', vram: 8, sources: [{ site: 'TK Computer', price: 439 }] },
  { name: 'Asus Prime Radeon RX 9070 OC Edition 16GB GDDR6', chipset: 'Radeon RX 9070', vram: 16, sources: [{ site: 'TK Computer', price: 799 }] },
  { name: 'Asus Prime Radeon RX 9070 XT 16GB GDDR6 OC Edition', chipset: 'Radeon RX 9070 XT', vram: 16, sources: [{ site: 'TK Computer', price: 949 }] },
  { name: 'Asus Radeon RX 9070 GRE Megalodon OC 12G GDDR6', chipset: 'Radeon RX 9070 GRE', vram: 12, sources: [{ site: 'TK Computer', price: 729 }] },
  { name: 'Gigabyte AORUS Master GeForce RTX 5070 Ti OC 16G', chipset: 'GeForce RTX 5070 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 1299 }] },
  { name: 'Gigabyte AORUS Master GeForce RTX 5080 OC 16G', chipset: 'GeForce RTX 5080', vram: 16, sources: [{ site: 'TK Computer', price: 1999 }] },
  { name: 'Gigabyte AORUS Radeon RX 9070 XT ELITE 16G', chipset: 'Radeon RX 9070 XT', vram: 16, sources: [{ site: 'TK Computer', price: 999 }] },
  { name: 'Gigabyte GeForce RTX 5060 AERO OC 8G', chipset: 'GeForce RTX 5060', vram: 8, sources: [{ site: 'TK Computer', price: 539 }] },
  { name: 'Gigabyte GeForce RTX 5060 Ti AERO OC 16G', chipset: 'GeForce RTX 5060 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 799 }] },
  { name: 'Gigabyte GeForce RTX 5060 Ti AERO OC 8G', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 599 }] },
  { name: 'Gigabyte GeForce RTX 5060 Ti WINDFORCE OC 16G', chipset: 'GeForce RTX 5060 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 739 }] },
  { name: 'Gigabyte GeForce RTX 5060 Ti WINDFORCE OC 8G', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 559 }] },
  { name: 'Gigabyte GeForce RTX 5070 AERO OC 12G', chipset: 'GeForce RTX 5070', vram: 12, sources: [{ site: 'TK Computer', price: 999 }] },
  { name: 'Gigabyte GeForce RTX 5070 Ti AERO OC 16G', chipset: 'GeForce RTX 5070 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 1299 }] },
  { name: 'Gigabyte GeForce RTX 5070 WINDFORCE OC SFF 12G', chipset: 'GeForce RTX 5070', vram: 12, sources: [{ site: 'TK Computer', price: 899 }] },
  { name: 'Gigabyte GeForce RTX 5080 AERO OC SFF 16G', chipset: 'GeForce RTX 5080', vram: 16, sources: [{ site: 'TK Computer', price: 1999 }] },
  { name: 'Gigabyte Radeon RX 9060 XT GAMING OC 16G', chipset: 'Radeon RX 9060 XT', vram: 16, sources: [{ site: 'TK Computer', price: 549 }] },
  { name: 'Gigabyte Radeon RX 9060 XT GAMING OC 8G', chipset: 'Radeon RX 9060 XT', vram: 8, sources: [{ site: 'TK Computer', price: 429 }] },
  { name: 'Gigabyte Radeon RX 9070 GAMING OC 16G', chipset: 'Radeon RX 9070', vram: 16, sources: [{ site: 'TK Computer', price: 799 }] },
  { name: 'Gigabyte Radeon RX 9070 GRE GAMING OC 12G', chipset: 'Radeon RX 9070 GRE', vram: 12, sources: [{ site: 'TK Computer', price: 699 }] },
  { name: 'Gigabyte Radeon RX 9070 XT GAMING OC 16G', chipset: 'Radeon RX 9070 XT', vram: 16, sources: [{ site: 'TK Computer', price: 949 }] },
  { name: 'Inno3D GeForce RTX 3060 12GB Twin X2', chipset: 'GeForce RTX 3060', vram: 12, sources: [{ site: 'TK Computer', price: 419 }] },
  { name: 'Inno3D GeForce RTX 5050 8GB Twin X2', chipset: 'GeForce RTX 5050', vram: 8, sources: [{ site: 'TK Computer', price: 399 }] },
  { name: 'Inno3D GeForce RTX 5060 8GB Twin X2', chipset: 'GeForce RTX 5060', vram: 8, sources: [{ site: 'TK Computer', price: 449 }] },
  { name: 'Inno3D GeForce RTX 5060 Ti 16GB Twin X2', chipset: 'GeForce RTX 5060 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 699 }] },
  { name: 'Inno3D GeForce RTX 5060 Ti 16GB Twin X2', chipset: 'GeForce RTX 5060 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 719 }] },
  { name: 'Inno3D GeForce RTX 5060 Ti 8GB Twin X2', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 519 }] },
  { name: 'Inno3D GeForce RTX 5060 Ti 8GB Twin X2', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 539 }] },
  { name: 'Inno3D GeForce RTX 5070 12GB Twin X2', chipset: 'GeForce RTX 5070', vram: 12, sources: [{ site: 'TK Computer', price: 799 }] },
  { name: 'Inno3D GeForce RTX 5070 12GB X3', chipset: 'GeForce RTX 5070', vram: 12, sources: [{ site: 'TK Computer', price: 829 }] },
  { name: 'Inno3D GeForce RTX 5070 Ti 16GB X3', chipset: 'GeForce RTX 5070 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 1099 }] },
  { name: 'Inno3D GeForce RTX 5080 16GB X3', chipset: 'GeForce RTX 5080', vram: 16, sources: [{ site: 'TK Computer', price: 1449 }] },
  { name: 'Inno3D GeForce RTX 5080 16GB X3', chipset: 'GeForce RTX 5080', vram: 16, sources: [{ site: 'TK Computer', price: 1469 }] },
  { name: 'MSI GeForce RTX 3050 VENTUS 2X 6G OC', chipset: 'GeForce RTX 3050', vram: 6, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'MSI GeForce RTX 5060 8G VENTUS 2X OC', chipset: 'GeForce RTX 5060', vram: 8, sources: [{ site: 'TK Computer', price: 489 }] },
  { name: 'MSI GeForce RTX 5060 Ti 16G VENTUS 2X PLUS', chipset: 'GeForce RTX 5060 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 749 }] },
  { name: 'MSI GeForce RTX 5060 Ti 8G GAMING OC', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 589 }] },
  { name: 'MSI GeForce RTX 5060 Ti 8G VENTUS 2X', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 569 }] },
  { name: 'MSI GeForce RTX 5060 Ti 8G VENTUS 3X OC', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 589 }] },
  { name: 'MSI GeForce RTX 5070 12G INSPIRE 3X OC', chipset: 'GeForce RTX 5070', vram: 12, sources: [{ site: 'TK Computer', price: 899 }] },
  { name: 'MSI GeForce RTX 5070 Ti 16G VENTUS 3X OC', chipset: 'GeForce RTX 5070 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 1199 }] },
  { name: 'MSI GeForce RTX 5080 16G VENTUS 3X OC', chipset: 'GeForce RTX 5080', vram: 16, sources: [{ site: 'TK Computer', price: 1539 }] },
  { name: 'Manli GeForce RTX 5050 Nebula 8G GDDR6', chipset: 'GeForce RTX 5050', vram: 8, sources: [{ site: 'TK Computer', price: 399 }] },
  { name: 'Manli GeForce RTX 5060Ti Nebula 8G GDDR7', chipset: 'GeForce RTX 5060 Ti', vram: 8, sources: [{ site: 'TK Computer', price: 519 }] },
  { name: 'ROG (Republic of Gamers) Astral GeForce RTX 5080 16GB GDDR7', chipset: 'GeForce RTX 5080', vram: 16, sources: [{ site: 'TK Computer', price: 1999 }] },
  { name: 'ROG (Republic of Gamers) Astral GeForce RTX 5090 32GB GDDR7 OC Edition', chipset: 'GeForce RTX 5090', vram: 32, sources: [{ site: 'TK Computer', price: 6499 }] },
  { name: 'ROG (Republic of Gamers) ROG Strix GeForce RTX 5070 Ti 16GB GDDR7 OC Edition', chipset: 'GeForce RTX 5070 Ti', vram: 16, sources: [{ site: 'TK Computer', price: 1449 }] },
  { name: 'ROG (Republic of Gamers) Strix GeForce RTX 5070 12GB GDDR7 OC Edition', chipset: 'GeForce RTX 5070', vram: 12, sources: [{ site: 'TK Computer', price: 1049 }] },
]

function buildGpuRows() {
  return GPU_LISTINGS.map((g) => ({
    category: 'GPU',
    name: g.name,
    price: averagePrice(g.sources),
    platform: null,
    socket: null,
    specs: [
      ['Chipset', g.chipset],
      ['Memory', `${g.vram} GB`],
      ['Boost Clock', '—'],
      ['Length', '—'],
      ['Color', '—'],
    ],
    tags: hasRgb(g.name) ? ['rgb'] : [],
    sources: g.sources,
  }))
}

// ── RAM ──────────────────────────────────────────────────────────────────
const RAM_LISTINGS = [
  { name: 'TEAM GROUP T-FORCE DELTA 6400MHZ 64GB (32GBx2) DDR5 RGB', ddr: 'DDR5', speed: 6400, moduleCount: 2, moduleSize: 32, sources: [{ site: 'Ultragear', price: 649 }] },
  { name: 'Crucial PRO D5 6000MHz 32GB (16GBx2) DDR5 HeatSink', ddr: 'DDR5', speed: 6000, moduleCount: 2, moduleSize: 16, sources: [{ site: 'Ultragear', price: 389 }] },
  { name: 'G-SKILL TRIDENT Z5 RGB 6000MHZ 32GB (16GBx2) DDR5 RGB', ddr: 'DDR5', speed: 6000, moduleCount: 2, moduleSize: 16, sources: [{ site: 'Ultragear', price: 399 }] },
  { name: 'CORSAIR VENGEANCE RGB 6000MHZ 32GB (16GBx2) DDR5 RGB', ddr: 'DDR5', speed: 6000, moduleCount: 2, moduleSize: 16, sources: [{ site: 'Ultragear', price: 399 }] },
  { name: 'SSTC 3200MHZ 16GB DDR4 with HeatSink', ddr: 'DDR4', speed: 3200, moduleCount: 1, moduleSize: 16, sources: [{ site: 'Ultragear', price: 95 }] },
  { name: 'Corsair Vengeance RGB 16GB (16GB x 1) DDR5 DRAM 6000MT/s', ddr: 'DDR5', speed: 6000, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'Corsair VENGEANCE RGB 32GB (1x32GB) DDR5 DRAM 6000MT/s', ddr: 'DDR5', speed: 6000, moduleCount: 1, moduleSize: 32, sources: [{ site: 'TK Computer', price: 519 }] },
  { name: 'Corsair VENGEANCE RGB 16GB (1x16GB) DDR5 DRAM 6000MT/s', ddr: 'DDR5', speed: 6000, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'Corsair VENGEANCE RGB 32GB (1x32GB) DDR5 DRAM 6000MT/s (2)', ddr: 'DDR5', speed: 6000, moduleCount: 1, moduleSize: 32, sources: [{ site: 'TK Computer', price: 519 }] },
  { name: 'Corsair VENGEANCE RGB Pro 16GB (1x16GB) DDR4 DRAM 3200MT/s', ddr: 'DDR4', speed: 3200, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'Corsair VENGEANCE RGB Pro 16GB (1x16GB) DDR4 DRAM 3200MT/s (2)', ddr: 'DDR4', speed: 3200, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'Corsair DOMINATOR PLATINUM RGB 32GB (1x32GB) DDR5 DRAM 5600MT/s', ddr: 'DDR5', speed: 5600, moduleCount: 1, moduleSize: 32, sources: [{ site: 'TK Computer', price: 559 }] },
  { name: 'G.Skill Trident Z Neo RGB 16GB (1 x 16GB) DDR4 DRAM 3600Hz', ddr: 'DDR4', speed: 3600, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 179 }] },
  { name: 'G.Skill Trident Z4 RGB 16GB (1 x 16GB) DDR4 DRAM 3200Hz', ddr: 'DDR4', speed: 3200, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'G.Skill Trident Z4 RGB 32GB (1 x 32GB) DDR4 DRAM 3200Hz', ddr: 'DDR4', speed: 3200, moduleCount: 1, moduleSize: 32, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'G.Skill Trident Z4 RGB 32GB (1 x 32GB) DDR4 DRAM 3600Hz', ddr: 'DDR4', speed: 3600, moduleCount: 1, moduleSize: 32, sources: [{ site: 'TK Computer', price: 355 }] },
  { name: 'G.Skill Trident Z5 RGB 16GB (1 x 16GB) DDR5 DRAM 6000Hz', ddr: 'DDR5', speed: 6000, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'G.Skill Trident Z5 RGB 32GB (1 x 32GB) DDR5 DRAM 6000Hz', ddr: 'DDR5', speed: 6000, moduleCount: 1, moduleSize: 32, sources: [{ site: 'TK Computer', price: 519 }] },
  { name: 'G.Skill Trident Z5 RGB 48GB (1 x 48GB) DDR5 DRAM 6400Hz', ddr: 'DDR5', speed: 6400, moduleCount: 1, moduleSize: 48, sources: [{ site: 'TK Computer', price: 699 }] },
  { name: 'G.Skill Trident Z5 Royal Gold RGB 16GB (1 x 16GB) DDR5 DRAM 6400Hz', ddr: 'DDR5', speed: 6400, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 289 }] },
  { name: 'G.Skill Trident Z5 Royal Gold RGB 32GB (1 x 32GB) DDR5 DRAM 6000Hz', ddr: 'DDR5', speed: 6000, moduleCount: 1, moduleSize: 32, sources: [{ site: 'TK Computer', price: 579 }] },
  { name: 'G.Skill Trident Z5 Royal Silver RGB 16GB (1 x 16GB) DDR5 DRAM 6400Hz', ddr: 'DDR5', speed: 6400, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 269 }] },
  { name: 'G.Skill Trident Z5 Royal Silver RGB 32GB (1 x 32GB) DDR5 DRAM 6400Hz', ddr: 'DDR5', speed: 6400, moduleCount: 1, moduleSize: 32, sources: [{ site: 'TK Computer', price: 549 }] },
  { name: 'Lexar Thor RGB 16GB (16GB x 1) DDR5 DRAM 6000MT/s', ddr: 'DDR5', speed: 6000, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 229 }] },
  { name: 'Puskill DDR4 RGB 8G 3200 Mhz (8G x 1)', ddr: 'DDR4', speed: 3200, moduleCount: 1, moduleSize: 8, sources: [{ site: 'TK Computer', price: 69 }] },
  { name: 'Puskill DDR4 RGB 16G 3200 Mhz (16G x 1)', ddr: 'DDR4', speed: 3200, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'Puskill DDR5 RGB 16G 5600 Mhz (16G x 1)', ddr: 'DDR5', speed: 5600, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 219 }] },
  { name: 'ROG Asgard x ROG Strix Bragi RGB 16GB (1 x 16GB) DDR4 DRAM 3600Hz', ddr: 'DDR4', speed: 3600, moduleCount: 1, moduleSize: 16, sources: [{ site: 'TK Computer', price: 149 }] },
]

function buildRamRows() {
  return RAM_LISTINGS.map((r) => ({
    category: 'RAM',
    name: r.name,
    price: averagePrice(r.sources),
    platform: null,
    socket: null,
    specs: [
      ['Speed', `${r.ddr}-${r.speed}`],
      ['Configuration', `${r.moduleCount} x ${r.moduleSize} GB`],
      ['CAS Latency', '—'],
      ['Color', '—'],
    ],
    tags: hasRgb(r.name) ? ['rgb'] : [],
    sources: r.sources,
  }))
}

// ── Storage ──────────────────────────────────────────────────────────────
const STORAGE_LISTINGS = [
  { name: 'TEAMGROUP MP44Q 2TB NVME GEN4 (7000MB/s)', type: 'SSD', capacityGB: 2000, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 269 }] },
  { name: 'KINGSTON NV3 2TB NVME GEN4 (6000MB/s)', type: 'SSD', capacityGB: 2000, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 269 }, { site: 'TK Computer', price: 249 }] },
  { name: 'WD BLACK SN850x 1TB NVME GEN4 (7300MB/s)', type: 'SSD', capacityGB: 1000, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 175 }] },
  { name: 'SAMSUNG 9100 PRO 2TB NVME GEN5 (14,500MB/s,New Tray)', type: 'SSD', capacityGB: 2000, interface: 'M.2 PCIe 5.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 369 }] },
  { name: 'CRUCIAL T705 2TB NVME GEN5 (14,500MB/s)', type: 'SSD', capacityGB: 2000, interface: 'M.2 PCIe 5.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 269 }] },
  { name: 'SAMSUNG 990 PRO 1TB NVME GEN4 (NEW TRAY,7450MB/s)', type: 'SSD', capacityGB: 1000, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 199 }, { site: 'TK Computer', price: 229 }] },
  { name: 'SAMSUNG 990 PRO 2TB NVME GEN4 (7450MB/s,Tray)', type: 'SSD', capacityGB: 2000, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 299 }, { site: 'TK Computer', price: 349 }] },
  { name: 'SAMSUNG 990 EVO PLUS 1TB NVME GEN4 (New Tray,7250MB/s)', type: 'SSD', capacityGB: 1000, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 175 }, { site: 'TK Computer', price: 219 }] },
  { name: 'M.2 ORIGINAL TRAY 512GB GEN4', type: 'SSD', capacityGB: 512, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 70 }] },
  { name: 'M.2 ORIGINAL TRAY 256GB GEN4', type: 'SSD', capacityGB: 256, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'Ultragear', price: 29 }] },
  { name: 'Crucial P3 Plus 2TB', type: 'SSD', capacityGB: 2000, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 259 }] },
  { name: 'Crucial P3 Plus 500GB', type: 'SSD', capacityGB: 500, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 119 }] },
  { name: 'Kingston NV3 PCIe 4.0 NVMe 1TB', type: 'SSD', capacityGB: 1000, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'Patriot P300 1TB', type: 'SSD', capacityGB: 1000, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'Patriot P300 2TB', type: 'SSD', capacityGB: 2000, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 239 }] },
  { name: 'Patriot P300 512GB', type: 'SSD', capacityGB: 512, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Samsung 980 500GB', type: 'SSD', capacityGB: 500, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 129 }] },
  { name: 'Samsung 980 1TB', type: 'SSD', capacityGB: 1000, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 219 }] },
  { name: 'Samsung 980 Pro 500GB', type: 'SSD', capacityGB: 500, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'Samsung 990 EVO Plus 2TB', type: 'SSD', capacityGB: 2000, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 319 }] },
  { name: 'Samsung 990 Pro 4TB', type: 'SSD', capacityGB: 4000, interface: 'M.2 PCIe X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 629 }] },
  { name: 'Vaseky V900 PCIe 3.0 NVMe 512GB', type: 'SSD', capacityGB: 512, interface: 'M.2 PCIe 3.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Vaseky V970 PCIe 4.0 NVMe 1TB', type: 'SSD', capacityGB: 1000, interface: 'M.2 PCIe 4.0 X4', formFactor: 'M.2-2280', sources: [{ site: 'TK Computer', price: 149 }] },
  // WD Purple is Western Digital's surveillance/DVR line (built for
  // continuous CCTV recording, not desktop use) — real product, wrong
  // context, so it's deliberately left out rather than recommended as if it
  // were a normal desktop drive.
]

function buildStorageRows() {
  return STORAGE_LISTINGS.map((s) => ({
    category: 'Storage',
    name: s.name,
    price: averagePrice(s.sources),
    platform: null,
    socket: null,
    specs: [
      ['Type', s.type],
      ['Capacity', formatCapacity(s.capacityGB)],
      ['Interface', s.interface],
      ['Form Factor', s.formFactor],
    ],
    tags: [],
    sources: s.sources,
  }))
}

// ── PC Case ──────────────────────────────────────────────────────────────
const CASE_LISTINGS = [
  { name: 'Segotep Knight W2 Case Black', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 19 }] },
  { name: 'MIK ANGKOR OS1', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 24 }] },
  { name: 'SAMA05', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 36 }] },
  { name: 'SAMA X7 Glass Gaming Case White', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 37 }] },
  { name: 'XIGMATEK DUO X 3F E-ATX Black', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 45 }] },
  { name: 'SAMA GZS', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 47 }] },
  { name: 'Montech X2 Mesh', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 49 }] },
  { name: 'Wjcoolman CANOPY MINI', type: 'Mini Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 50 }] },
  { name: 'SAMA IM01 PC CASE WHITE', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 51 }] },
  { name: 'MIK MORAX 3FA Case Black', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 52 }] },
  { name: 'WJCOOLMAM WENJIE Plus Black', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 55 }] },
  { name: 'Jungle Leopard MS-01 White', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 55 }] },
  { name: 'JUNGLE LEOPARD AX-01 BLACK', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 55 }] },
  { name: 'Jungle Leopard AS1 Gaming Case White', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 57 }] },
  { name: 'Thermaltake K36 ARGB Gaming case White', type: 'Mid Tower', color: 'White', rgb: true, sources: [{ site: 'Ultragear', price: 59 }] },
  { name: 'Antec DP501 White', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 60 }] },
  { name: 'WJ COOLMOON Skyrim S3 Plus-BLACK', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 62 }] },
  { name: 'MIN PRO-BLACK', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 63 }] },
  { name: 'WJ COOLMOON BOUNDARY V2 (Black/WHITE)', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 65 }] },
  { name: 'MSI MAG FORGE 120A AIRFLOW', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 65 }] },
  { name: 'JONSBO D41 MESH WHITE', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 67 }] },
  { name: 'WJCOOLMAN ROBIN PRO-WHITE', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 70 }] },
  { name: 'SAMA Neview 2851A White', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 74 }] },
  { name: 'Montech XR', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 75 }] },
  { name: 'JONSBO Z20 Pink/White', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 79 }] },
  { name: 'JONSBO Z20 Black', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 79 }] },
  { name: 'JUNGLE LEOPARD AC-02 Black', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 79 }] },
  { name: 'SAMA V PLAY GAMING CASE LCD Screen White', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 84 }] },
  { name: 'WJCOOLMAN K21-YG GAMING CASE BLACK/WHITE', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 86 }] },
  { name: 'JONSBO D401 BLACK', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 89 }] },
  { name: 'Montech Sky Two', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 99 }] },
  { name: 'MSI MAG PANO M100R PZ', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 109 }] },
  { name: 'Montech Heritage White Eco-Leather Finish', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 115 }] },
  { name: 'Montech KING 65 PRO', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 120 }] },
  { name: 'Lian Li O11 Vision Compact PC', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 129 }] },
  { name: 'JONSBO TK-2 Black', type: 'Mid Tower', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 139 }] },
  { name: 'Montech KING 95', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 160 }] },
  { name: 'MONECH KING 95 White', type: 'Mid Tower', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 170 }] },
  { name: 'iCUE 5000X RGB Tempered Glass', type: 'Mid Tower', color: null, rgb: true, sources: [{ site: 'Ultragear', price: 225 }] },
  { name: 'JONSBO BO400', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 255 }] },
  { name: 'Sama A1 (Premium Office Case)', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 25 }] },
  { name: 'Sama H3', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 39 }] },
  { name: 'Sama H3 Ultra (Curved)', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 39 }] },
  { name: 'Sama H6', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 45 }] },
  { name: 'Sama Ruix Cube Mini', type: 'Mini Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 45 }] },
  { name: 'Sama Sama Light ATX', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 45 }] },
  { name: 'Jonsbo DS8', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 49 }] },
  { name: 'MSI PAG Shield 200L', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 49 }] },
  { name: 'Sama Air - Sakura Hitomi', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 55 }] },
  { name: 'Sama Flow - Hazune Miku Pink', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 55 }] },
  { name: 'Jonsbo D31 STD', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 59 }] },
  { name: 'MSI PAG PANO M110L', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 59 }] },
  { name: 'Sama IM01', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 59 }] },
  { name: 'Jonsbo D31 Mesh', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 65 }] },
  { name: 'Sama Megaview Pro', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 65 }] },
  { name: 'Sama Mess Ultra', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 65 }] },
  { name: 'Sama Ruix Canival', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 65 }] },
  { name: 'Gigabyte C102 Glass', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 69 }] },
  { name: 'MSI PAG PANO M100L', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 69 }] },
  { name: 'Sama Ruix Top Plus Mini', type: 'Mini Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 69 }] },
  { name: 'Asus A21', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'Asus SI-A01', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'MSI PAG PANO M100L PZ', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'Jonsbo D200', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Sama Ruix Aerospace Ultra', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Sama Ruix Top Plus', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Jonsbo Z20', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Jonsbo D41 STD - Screen Edition', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 105 }] },
  { name: 'Jonsbo D300', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 109 }] },
  { name: 'Jonsbo D31 Mesh - Screen Edtion', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 109 }] },
  { name: 'Jonsbo D41 Mesh - Screen Edition', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 109 }] },
  { name: 'MSI MAG PANO M100L PZ', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 109 }] },
  { name: 'Thermalright TL-M10 Vision', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 109 }] },
  { name: 'Jonsbo TK-1', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 129 }] },
  { name: 'Jonsbo TK-0', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'LIAN LI MR O11 VISION', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'Thermalright A70', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'NZXT H6 Flow RGB', type: 'Mid Tower', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'Jonsbo TK-4', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 169 }] },
  { name: 'Thermalright A70 VISION', type: 'Mid Tower', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 199 }] },
]

function buildCaseRows() {
  return CASE_LISTINGS.map((c) => {
    const tags = []
    if (c.rgb) tags.push('rgb')
    if (c.type === 'Mini Tower') tags.push('compact')
    return {
      category: 'PC Case',
      name: c.name,
      price: averagePrice(c.sources),
      platform: null,
      socket: null,
      specs: [
        ['Type', c.type],
        ['Side Panel', '—'],
        ['External Volume', '—'],
        ['Color', c.color ?? '—'],
      ],
      tags,
      sources: c.sources,
    }
  })
}

// ── Cooling ──────────────────────────────────────────────────────────────
const COOLING_LISTINGS = [
  { name: 'CPU COOLER JONSBO CR1200', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 10 }] },
  { name: 'CPU COOLER Jungle Leopard A200PLUS 2 heat pipe', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 10 }] },
  { name: 'CPU COOLER jungle Leopard S40 120mm fan 4 heat pipe', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 15 }] },
  { name: 'Jungle Leopard K400 PRO RGB 12cm (DUAL FANS)', color: null, rgb: true, sources: [{ site: 'Ultragear', price: 19 }] },
  { name: 'CPU COOLER Jonsbo CR-1000 EVO ARGB White', color: 'White', rgb: true, sources: [{ site: 'Ultragear', price: 20 }] },
  { name: 'CPU COOLER Jungle Leopard KF400', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 25 }] },
  { name: 'CPU COOLER Jonsbo PISA A5 Grey', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 29 }] },
  { name: 'CPU COOLER Jungle Leopard KF401 CPU Temperature Digit', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 29 }] },
  { name: 'CPU COOLER Jungle Leopard KF620-DGT', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 38 }] },
  { name: 'CPU COOLER RT500 Digital ARGB Black', color: 'Black', rgb: true, sources: [{ site: 'Ultragear', price: 39 }] },
  { name: 'CPU COOLER Jonsbo CR-1100 gray', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 48 }] },
  { name: 'CPU COOLER RT620 Digital ARGB Black', color: 'Black', rgb: true, sources: [{ site: 'Ultragear', price: 55 }] },
  { name: 'Liquid Cooler BAZER 240 ARGB WHITE', color: 'White', rgb: true, sources: [{ site: 'Ultragear', price: 56 }] },
  { name: 'Liquid Cooler Jonsbo TW7-240', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 59 }] },
  { name: 'Liquid Cooler Jungle Leopard AstroBeat 240 White', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 59 }] },
  { name: 'Liquid Cooler Jonsbo TW7-360', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 67 }] },
  { name: 'Liquid Cooler JONSBO TW6 360 ARGB WHITE', color: 'White', rgb: true, sources: [{ site: 'Ultragear', price: 68 }] },
  { name: 'Liquid Cooler Jungle Leopard AstroBeat 360 Black Digital', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 69 }] },
  { name: 'Liquid Cooler Jungle Leopard Astroshell 240 LCD Black - Custom LCD (Image and Video)', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 70 }] },
  { name: 'Liquid Cooler Jungle Leopard AstroBeat 360 White Digital', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 74 }] },
  { name: 'Liquid Cooler Jungle Leopard Astroshell 360 LCD Black - Custom LCD (Image and Video)', color: 'Black', rgb: false, sources: [{ site: 'Ultragear', price: 80 }] },
  { name: 'LIQUID COOLER JUNGLE LEOPARD PROFLOW 360SE 360mm LCD', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 85 }] },
  { name: 'Liquid Cooler JUNGLE LEOPARD PRO FLOW 240 240mm ARGB LCD SCREEN 5.5" (WHITE)', color: 'White', rgb: true, sources: [{ site: 'Ultragear', price: 85 }] },
  { name: 'LIQUID COOLER JUNGLE LEOPARD ASTROSHELL V2 360 360mm WHITE (Support GIF Image)', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 85 }] },
  { name: 'Liquid Cooler JUNGLE LEOPARD PRO FLOW 360 360mm ARGB LCD SCREEN 5.5"', color: null, rgb: true, sources: [{ site: 'Ultragear', price: 95 }] },
  { name: 'Liquid Cooler ASUS PRIME LC 360 ARGB 360mm ARGB SYNC', color: null, rgb: true, sources: [{ site: 'Ultragear', price: 95 }] },
  { name: 'Jungle Leopard ULTRAFLOW 360 7" Screen (360 Degree Rotate)', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 109 }] },
  { name: 'THERMALRIGTH Hyper Vision 360 ARGB LCD WHITE', color: 'White', rgb: true, sources: [{ site: 'Ultragear', price: 129 }] },
  { name: 'LIQUID COOLER THERMALRIGHT Trofeo Vision 360 ARGB LCD SCREEN (WHITE)', color: 'White', rgb: true, sources: [{ site: 'Ultragear', price: 129 }] },
  { name: 'Liquid Cooler ASUS PRIME LC 360 ARGB LCD 360mm ARGB SYNC', color: null, rgb: true, sources: [{ site: 'Ultragear', price: 129 }] },
  { name: 'LIQUID COOLER THERMALRIGHT LEVITA VISION 360 ARGB (Curved,OLED)', color: null, rgb: true, sources: [{ site: 'Ultragear', price: 175 }] },
  { name: 'Liquid Cooler JUNGLE LEOPARD CHILL ARC CA360 360mm CURVED AMOLED (White)', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 179 }] },
  { name: 'LIQUID COOLER THERMALRIGHT WONDER VISION 360 360mm (AMOLED,WHITE)', color: 'White', rgb: false, sources: [{ site: 'Ultragear', price: 185 }] },
  { name: 'LIQUID COOLER TRYX Holographic Visual-Effect COOLER 360', color: null, rgb: false, sources: [{ site: 'Ultragear', price: 195 }] },
  { name: 'Liquid Cooler TRYX PANORAMA ARGB 360 SE 360mm CURVED SCREEN', color: null, rgb: true, sources: [{ site: 'Ultragear', price: 269 }] },
  { name: 'Jonsbo CR-1200E RGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 15 }] },
  { name: 'Jonsbo CR-1000 EVO', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 20 }] },
  { name: 'Jonsbo CR-1000 V2 Pro', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 25 }] },
  { name: 'MSI MAG COREFROZR AA13', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 29 }] },
  { name: 'Thermalright Aqua Elite 240', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 49 }] },
  { name: 'Thermalright Peerless Assassin 120 Digital ARGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 49 }] },
  { name: 'Thermalright Aqua Elite 360', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 59 }] },
  { name: 'Thermalright Frozen Infinity 240', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 59 }] },
  { name: 'Thermalright Frozen Infinity 360', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 69 }] },
  { name: 'Thermalright Frozen Notte 240', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 69 }] },
  { name: 'MSI MAG Coreliquid E240', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 75 }] },
  { name: 'MSI MAG Coreliquid A13 240', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'Thermalright Frozen Warframe 240', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'Jonsbo TH360', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Thermalright Frozen Magic 360 Digital ARGB V2', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Thermalright Frozen Warframe 360 SE', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Sama SM240LD AIO LCD', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Thermalright Core Matrix 360 Vision ARGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Thermalright Grand Vision 240', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Thermalright Peerless Vision 240 ARGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Sama SM360LD AIO LCD', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 119 }] },
  { name: 'Thermalright Hyper Vision 360 UB ARGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 119 }] },
  { name: 'Thermalright Mjolnir Vision 360', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 119 }] },
  { name: 'Thermalright Trofeo Vision 360', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 129 }] },
  { name: 'Thermalright Frozen Vision 240', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'NZXT Kraken X53 RGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'Thermalright Frozen Vision 360', color: null, rgb: false, sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'NZXT Kraken 240 RGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 179 }] },
  { name: 'NZXT Kraken X73 RGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'Thermalright Levita Vision 360 ARGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'Thermalright Wonder Vision 360 UB ARGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'NZXT Kraken 360 RGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 219 }] },
  { name: 'NZXT Kraken Elite 240 RGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 259 }] },
  { name: 'NZXT Kraken Z73 RGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 279 }] },
  { name: 'NZXT Kraken Elite 360 RGB', color: null, rgb: true, sources: [{ site: 'TK Computer', price: 299 }] },
]

function buildCoolingRows() {
  return COOLING_LISTINGS.map((c) => ({
    category: 'Cooling',
    name: c.name,
    price: averagePrice(c.sources),
    platform: null,
    socket: null,
    specs: [
      ['Fan Speed', '—'],
      ['Noise Level', '—'],
      ['Color', c.color ?? '—'],
    ],
    tags: c.rgb ? ['rgb'] : [],
    sources: c.sources,
  }))
}

// ── Power Supply ─────────────────────────────────────────────────────────
const PSU_LISTINGS = [
  { name: 'MSI MAG A600DN 600W 80+ White', wattage: 600, efficiency: null, modular: null, color: 'White', sources: [{ site: 'Ultragear', price: 39 }, { site: 'TK Computer', price: 49 }] },
  { name: 'MSI MAG A650BNL 650W 80+ Bronze', wattage: 650, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'Ultragear', price: 55 }, { site: 'TK Computer', price: 59 }] },
  { name: 'MSI MAG A750GL 750W 80+ Gold', wattage: 750, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'Ultragear', price: 95 }, { site: 'TK Computer', price: 99 }] },
  { name: 'MSI MAG A850GL 850W 80+ Gold', wattage: 850, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'Ultragear', price: 115 }, { site: 'TK Computer', price: 119 }] },
  { name: 'MSI MAG A1000GL PCIe5 1000W 80+ Gold', wattage: 1000, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'Ultragear', price: 159 }, { site: 'TK Computer', price: 159 }] },
  { name: 'ASUS TUF GAMING EVO 850W 80+ Gold', wattage: 850, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'Ultragear', price: 139 }] },
  { name: 'ASUS TUF GAMING 1000W 80+ Gold', wattage: 1000, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'Ultragear', price: 169 }] },
  { name: 'MSI MAG A850GL 850W 80+ Gold White', wattage: 850, efficiency: 'Gold', modular: null, color: 'White', sources: [{ site: 'Ultragear', price: 125 }] },
  { name: 'FSP VITA 850GM 850W 80+ Gold White', wattage: 850, efficiency: 'Gold', modular: 'Full', color: 'White', sources: [{ site: 'Ultragear', price: 119 }] },
  { name: 'GIGABYTE UD1000GM 1000W 80+ Gold', wattage: 1000, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'Ultragear', price: 139 }] },
  { name: 'ADATA XPG KYBER 850W 80+ Gold', wattage: 850, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'Ultragear', price: 85 }] },
  { name: 'ADATA XPG KYBER 750W 80+ Gold', wattage: 750, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'Ultragear', price: 75 }] },
  { name: 'ANTEC CSK850 PRO EC 850W 80+ Bronze', wattage: 850, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'Ultragear', price: 75 }] },
  { name: 'ANTEC CSK750DC White EC 750W 80+ Bronze', wattage: 750, efficiency: 'Bronze', modular: null, color: 'White', sources: [{ site: 'Ultragear', price: 62 }] },
  { name: 'ANTEC CSK750DC EC 750W 80+ Bronze', wattage: 750, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'Ultragear', price: 59 }] },
  { name: 'FSP 550 550W 80+ Bronze', wattage: 550, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'Ultragear', price: 43 }] },
  { name: 'FSP 650 650W 80+ Bronze', wattage: 650, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'Ultragear', price: 48 }] },
  { name: 'FSP VITA 750BD 750W 80+ Bronze', wattage: 750, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'Ultragear', price: 65 }] },
  { name: 'FSP VITA 850GD 850W 80+ Gold', wattage: 850, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'Ultragear', price: 95 }] },
  { name: 'FSP VITA 1000GM 1000W 80+ Gold', wattage: 1000, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'Ultragear', price: 139 }] },
  { name: 'FSP HPT2 1650M 1650W 80+ Platinum', wattage: 1650, efficiency: 'Platinum', modular: 'Full', color: null, sources: [{ site: 'Ultragear', price: 299 }] },
  { name: 'ANTEC CSK1000 PRO EC 1000W 80+ Bronze', wattage: 1000, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'Ultragear', price: 79 }] },
  { name: 'ANTEC NE750G M 750W 80+ Gold', wattage: 750, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'Ultragear', price: 89 }] },
  { name: 'ANTEC Zen 750 EC 750W', wattage: 750, efficiency: null, modular: null, color: null, sources: [{ site: 'Ultragear', price: 45 }] },
  { name: 'ANTEC ATOM B650 650W 80+ Bronze', wattage: 650, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'Ultragear', price: 45 }] },
  { name: 'ANTEC ZEN 650 EC 650W', wattage: 650, efficiency: null, modular: null, color: null, sources: [{ site: 'Ultragear', price: 38 }] },
  { name: 'ANTEC ZEN 500 EC 500W', wattage: 500, efficiency: null, modular: null, color: null, sources: [{ site: 'Ultragear', price: 29 }] },
  { name: 'Black Diamond 1000W 80+ Gold', wattage: 1000, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'Ultragear', price: 89 }] },
  { name: 'Asus Prime 750W 80+ Bronze', wattage: 750, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Asus TUF 750B', wattage: 750, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Corsair CX650', wattage: 650, efficiency: null, modular: null, color: null, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'Corsair CX750', wattage: 750, efficiency: null, modular: null, color: null, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Corsair RM1000e 2023', wattage: 1000, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 219 }] },
  { name: 'Corsair RM750e 2023', wattage: 750, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'Corsair RM850e 2023', wattage: 850, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 169 }] },
  { name: 'MSI MAG A1250GL', wattage: 1250, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 209 }] },
  { name: 'MSI PAG B750N-H', wattage: 750, efficiency: null, modular: null, color: null, sources: [{ site: 'TK Computer', price: 69 }] },
  { name: 'MSI PAG B850N-H', wattage: 850, efficiency: null, modular: null, color: null, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'MSI PAG G750N', wattage: 750, efficiency: null, modular: null, color: null, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'ROG LOKI SFX-L 1000W Platinum', wattage: 1000, efficiency: 'Platinum', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'ROG LOKI SFX-L 850W Platinum Black Edition', wattage: 850, efficiency: 'Platinum', modular: 'Full', color: 'Black', sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'ROG LOKI SFX-L 850W Platinum White Edition', wattage: 850, efficiency: 'Platinum', modular: 'Full', color: 'White', sources: [{ site: 'TK Computer', price: 259 }] },
  { name: 'ROG STRIX 1000W Platinum', wattage: 1000, efficiency: 'Platinum', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'ROG STRIX 750W Gold Aura Edition', wattage: 750, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 169 }] },
  { name: 'ROG STRIX 850W Gold Aura Edition', wattage: 850, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 199 }] },
  { name: 'ROG STRIX 1200W Platinum', wattage: 1200, efficiency: 'Platinum', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 329 }] },
  { name: 'ROG STRIX LOKI SFX-L 850W Platinum', wattage: 850, efficiency: 'Platinum', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'ROG THOR 850W Platinum', wattage: 850, efficiency: 'Platinum', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 249 }] },
  { name: 'Sama Ruix GF850 80+ Gold', wattage: 850, efficiency: 'Gold', modular: 'Full', color: null, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Sama Ruix GX850 80+ Bronze', wattage: 850, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'TK Computer', price: 79 }] },
  { name: 'Sama Zumax 80+ Bronze 650W', wattage: 650, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'TK Computer', price: 39 }] },
  { name: 'Sama Zumax 80+ Bronze 750W', wattage: 750, efficiency: 'Bronze', modular: null, color: null, sources: [{ site: 'TK Computer', price: 49 }] },
  { name: 'Sama Zumax 80+ Gold 850W', wattage: 850, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Thermalright TR-KG750 80+ Gold 750W', wattage: 750, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'TK Computer', price: 89 }] },
  { name: 'Thermalright TR-KG850 80+ Gold 850W', wattage: 850, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Thermalright TR-SP1000 80+ Platinum 1000W', wattage: 1000, efficiency: 'Platinum', modular: null, color: null, sources: [{ site: 'TK Computer', price: 139 }] },
  { name: 'Thermalright TR-SP750 80+ Platinum 750W', wattage: 750, efficiency: 'Platinum', modular: null, color: null, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Thermalright TR-SP850 80+ Platinum 850W', wattage: 850, efficiency: 'Platinum', modular: null, color: null, sources: [{ site: 'TK Computer', price: 119 }] },
  { name: 'Thermalright TR-TG1200 80+ Gold 1200W', wattage: 1200, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'TK Computer', price: 159 }] },
  { name: 'Thermalright TR-TG1650 80+ Gold 1650W', wattage: 1650, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'TK Computer', price: 299 }] },
  { name: 'Thermalright TR-TGFX1000 80+ Gold SFX 1000W', wattage: 1000, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'TK Computer', price: 149 }] },
  { name: 'Thermalright TR-TGFX750 80+ Gold SFX 750W', wattage: 750, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'TK Computer', price: 99 }] },
  { name: 'Thermalright TR-TGFX850 80+ Gold SFX 850W', wattage: 850, efficiency: 'Gold', modular: null, color: null, sources: [{ site: 'TK Computer', price: 119 }] },
]

function buildPowerSupplyRows() {
  return PSU_LISTINGS.map((p) => ({
    category: 'Power Supply',
    name: p.name,
    price: averagePrice(p.sources),
    platform: null,
    socket: null,
    specs: [
      ['Wattage', p.wattage ? `${p.wattage} W` : '—'],
      ['Efficiency', p.efficiency ? `80+ ${p.efficiency}` : '—'],
      ['Modular', p.modular ?? '—'],
      ['Color', p.color ?? '—'],
    ],
    tags: hasRgb(p.name, p.color ?? '') ? ['rgb'] : [],
    sources: p.sources,
  }))
}

function main() {
  const cpu = buildCpuRows()
  const motherboard = buildMotherboardRows()
  const gpu = buildGpuRows()
  const ram = buildRamRows()
  const pcCase = buildCaseRows()
  const cooling = buildCoolingRows()
  const storage = buildStorageRows()
  const powerSupply = buildPowerSupplyRows()

  const allRows = [...cpu, ...motherboard, ...gpu, ...ram, ...pcCase, ...cooling, ...storage, ...powerSupply]

  console.log(
    `CPU: ${cpu.length}, Motherboard: ${motherboard.length}, GPU: ${gpu.length}, RAM: ${ram.length}, PC Case: ${pcCase.length}, Cooling: ${cooling.length}, Storage: ${storage.length}, Power Supply: ${powerSupply.length} — total ${allRows.length}`,
  )

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
      tags TEXT NOT NULL,
      sources TEXT
    );
    CREATE INDEX idx_parts_category ON parts(category);
    CREATE INDEX idx_parts_socket ON parts(socket);
  `)

  const insert = db.prepare(
    'INSERT INTO parts (category, name, price, platform, socket, specs, tags, sources) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
      row.sources ? JSON.stringify(row.sources) : null,
    )
  }
  db.exec('COMMIT')
  db.close()

  console.log(`Seeded ${allRows.length} parts into ${DB_PATH}`)
}

main()
