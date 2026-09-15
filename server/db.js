import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { existsSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'parts.db')

if (!existsSync(DB_PATH)) {
  throw new Error(`${DB_PATH} not found — run "npm run seed" first.`)
}

const db = new Database(DB_PATH, { readonly: true })

function rowToPart(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: `$${Math.round(row.price)}`,
    platform: row.platform ?? undefined,
    socket: row.socket ?? undefined,
    specs: JSON.parse(row.specs),
    tags: JSON.parse(row.tags),
  }
}

const byPriceStmt = db.prepare(
  'SELECT * FROM parts WHERE category = ? ORDER BY ABS(price - ?) ASC LIMIT ?',
)
const byPricePlatformStmt = db.prepare(
  'SELECT * FROM parts WHERE category = ? AND platform = ? ORDER BY ABS(price - ?) ASC LIMIT ?',
)
const byPriceTagStmt = db.prepare(
  "SELECT * FROM parts WHERE category = ? AND tags LIKE '%' || ? || '%' ORDER BY ABS(price - ?) ASC LIMIT ?",
)
const motherboardsBySocketsStmt = (count) =>
  db.prepare(
    `SELECT * FROM parts WHERE category = 'Motherboard' AND socket IN (${Array(count).fill('?').join(',')}) ORDER BY ABS(price - ?) ASC LIMIT ?`,
  )
const byIdsStmt = (count) =>
  db.prepare(`SELECT * FROM parts WHERE id IN (${Array(count).fill('?').join(',')})`)

/** Tag filter is best-effort — falls back to unfiltered price ranking if nothing in this category carries the tag (e.g. "quiet" RAM doesn't exist). */
function byPriceMaybeTag(category, tag, target, perCategory) {
  if (tag) {
    const tagged = byPriceTagStmt.all(category, tag, target, perCategory)
    if (tagged.length) return tagged
  }
  return byPriceStmt.all(category, target, perCategory)
}

/**
 * Builds a candidate shortlist per category for the LLM to choose from —
 * price-proximity ranked, optionally platform/tag filtered. Motherboards are
 * constrained to sockets actually present among the CPU shortlist so a
 * compatible pair always exists in what's sent to the model.
 */
export function getCandidates({ budget, platform, tag, perCategory = 15 }) {
  const cpuTarget = budget * 0.18
  const cpuRows = platform
    ? byPricePlatformStmt.all('CPU', platform, cpuTarget, perCategory)
    : byPriceStmt.all('CPU', cpuTarget, perCategory)

  const sockets = [...new Set(cpuRows.map((r) => r.socket).filter(Boolean))]
  const moboTarget = budget * 0.12
  const moboRows = sockets.length
    ? motherboardsBySocketsStmt(sockets.length).all(...sockets, moboTarget, perCategory)
    : byPriceStmt.all('Motherboard', moboTarget, perCategory)

  const gpuRows = byPriceStmt.all('GPU', budget * 0.32, perCategory)
  const ramRows = byPriceMaybeTag('RAM', tag, budget * 0.08, perCategory)
  const caseRows = byPriceMaybeTag('PC Case', tag, budget * 0.09, perCategory)
  const coolingRows = byPriceMaybeTag('Cooling', tag, budget * 0.07, perCategory)
  const storageRows = byPriceStmt.all('Storage', budget * 0.06, perCategory)
  const psuRows = byPriceStmt.all('Power Supply', budget * 0.08, perCategory)

  return [
    ...cpuRows,
    ...moboRows,
    ...gpuRows,
    ...ramRows,
    ...caseRows,
    ...coolingRows,
    ...storageRows,
    ...psuRows,
  ].map(rowToPart)
}

const byCategoryOrderedStmt = db.prepare('SELECT * FROM parts WHERE category = ? ORDER BY price ASC')
const motherboardsBySocketsOrderedStmt = (count) =>
  db.prepare(
    `SELECT * FROM parts WHERE category = 'Motherboard' AND socket IN (${Array(count).fill('?').join(',')}) ORDER BY price ASC`,
  )

/** Evenly-spaced picks across an already price-sorted array, so a fixed-size shortlist still spans the full cheap-to-expensive range instead of clustering near one end. */
function spreadSample(rows, count) {
  if (rows.length <= count) return rows
  const step = rows.length / count
  const out = []
  for (let i = 0; i < count; i++) out.push(rows[Math.floor(i * step)])
  return out
}

/**
 * Budget-agnostic candidate shortlist spanning the full price range per
 * category, unlike getCandidates above which needs the user's budget known
 * in advance to center each category's price target. This lets the
 * build-chat endpoint extract intent (budget, platform, ...) AND pick parts
 * in a single model call instead of two — the model reads the budget out of
 * the conversation itself and picks whichever spread-sampled parts actually
 * fit it. Motherboards are still constrained to sockets present among the
 * CPU catalog so a compatible pair always exists to choose from.
 */
export function getCandidatesSpread({ perCategory = 20 } = {}) {
  const cpuAll = byCategoryOrderedStmt.all('CPU')
  const cpuRows = spreadSample(cpuAll, perCategory)

  const sockets = [...new Set(cpuAll.map((r) => r.socket).filter(Boolean))]
  const moboAll = sockets.length
    ? motherboardsBySocketsOrderedStmt(sockets.length).all(...sockets)
    : byCategoryOrderedStmt.all('Motherboard')
  const moboRows = spreadSample(moboAll, perCategory)

  const gpuRows = spreadSample(byCategoryOrderedStmt.all('GPU'), perCategory)
  const ramRows = spreadSample(byCategoryOrderedStmt.all('RAM'), perCategory)
  const caseRows = spreadSample(byCategoryOrderedStmt.all('PC Case'), perCategory)
  const coolingRows = spreadSample(byCategoryOrderedStmt.all('Cooling'), perCategory)
  const storageRows = spreadSample(byCategoryOrderedStmt.all('Storage'), perCategory)
  const psuRows = spreadSample(byCategoryOrderedStmt.all('Power Supply'), perCategory)

  return [
    ...cpuRows,
    ...moboRows,
    ...gpuRows,
    ...ramRows,
    ...caseRows,
    ...coolingRows,
    ...storageRows,
    ...psuRows,
  ].map(rowToPart)
}

export function getPartsByIds(ids) {
  if (!ids.length) return []
  const rows = byIdsStmt(ids.length).all(...ids)
  return rows.map(rowToPart)
}

const alternativesStmt = db.prepare(
  'SELECT * FROM parts WHERE category = ? AND id != ? ORDER BY ABS(price - ?) ASC LIMIT ?',
)
const alternativesBySocketStmt = db.prepare(
  'SELECT * FROM parts WHERE category = ? AND socket = ? AND id != ? ORDER BY ABS(price - ?) ASC LIMIT ?',
)
const alternativesSearchStmt = db.prepare(
  "SELECT * FROM parts WHERE category = ? AND id != ? AND name LIKE '%' || ? || '%' ORDER BY price ASC LIMIT ?",
)

/**
 * Alternatives for swapping one picked part within its category. With no
 * `query`, price-proximity ranked near the current pick, `socket`-restricted
 * to stay compatible with the other half of a CPU/Motherboard pair — a
 * quick, always-safe default shortlist. With a `query`, a full name search
 * across the WHOLE category (not just that shortlist, and not socket-
 * restricted) so typing "i5" actually finds Intel chips even when the
 * current build is AMD — searching should show everything that exists;
 * compatibility is handled at selection time by re-pairing the other half
 * of the socket, not by hiding results here.
 */
export function getAlternatives({ category, excludeId, near, socket, query, limit = 12 }) {
  if (query) {
    return alternativesSearchStmt.all(category, excludeId, query, limit).map(rowToPart)
  }
  const rows = socket
    ? alternativesBySocketStmt.all(category, socket, excludeId, near, limit)
    : alternativesStmt.all(category, excludeId, near, limit)
  return rows.map(rowToPart)
}

const searchByNameStmt = db.prepare(
  "SELECT * FROM parts WHERE category = ? AND name LIKE '%' || ? || '%' ORDER BY price ASC LIMIT ?",
)

/** Name-substring search within a category, regardless of price — used to pull a specifically-named product (e.g. "RTX 5090") into the candidate list even when it's far outside the budget-driven price target. */
export function searchPartsByName({ category, query, limit = 5 }) {
  return searchByNameStmt.all(category, query, limit).map(rowToPart)
}

const percentileStmt = db.prepare(
  'SELECT CAST((SELECT COUNT(*) FROM parts WHERE category = ? AND price <= ?) AS REAL) / (SELECT COUNT(*) FROM parts WHERE category = ?) AS percentile',
)

/**
 * Where a price falls (0 = cheapest, 1 = priciest) among everything in its
 * own category — used as a rough performance-tier proxy for the bottleneck
 * check, since we have no real benchmark data. Within one generation, price
 * correlates reasonably well with performance; it's an approximation, not
 * a substitute for actual FPS/benchmark numbers.
 */
export function getPricePercentile(category, price) {
  return percentileStmt.get(category, price, category).percentile
}
