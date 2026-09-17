import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'
import {
  getCandidates,
  getCandidatesSpread,
  getPartsByIds,
  getAlternatives,
  getPricePercentile,
  getRamByDdrGeneration,
  getCheapestInCategory,
  applyBrandPreference,
} from './db.js'
import { estimateFps } from './benchmarks.js'

const app = express()
app.use(cors())
app.use(express.json())

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

app.get('/api/parts/alternatives', (req, res) => {
  const { category, excludeId, near, socket, query, limit } = req.query

  if (!category || !excludeId || !near) {
    return res.status(400).json({ error: 'category, excludeId, and near are required' })
  }

  const alternatives = getAlternatives({
    category: String(category),
    excludeId: Number(excludeId),
    near: Number(near),
    socket: socket ? String(socket) : undefined,
    query: query ? String(query) : undefined,
    limit: limit ? Number(limit) : query ? 30 : undefined,
  })

  res.json({ alternatives })
})

// Pure deterministic math (see detectBottleneck below) — no LLM call needed,
// so the frontend can re-check this instantly after every manual swap
// instead of only getting a verdict when the chat happens to run.
app.get('/api/bottleneck', (req, res) => {
  const { cpuId, gpuId, resolution } = req.query

  if (!cpuId || !gpuId) {
    return res.status(400).json({ error: 'cpuId and gpuId are required' })
  }

  // getPartsByIds doesn't guarantee its result order matches the input ids
  // (SQL's IN clause isn't ordered) — match back up by id explicitly.
  const parts = getPartsByIds([Number(cpuId), Number(gpuId)])
  const cpu = parts.find((p) => p.id === Number(cpuId))
  const gpu = parts.find((p) => p.id === Number(gpuId))
  if (!cpu || !gpu) return res.status(404).json({ error: 'part not found' })

  const bottleneck = detectBottleneck([cpu, gpu], resolution ? String(resolution) : null)
  res.json({ bottleneck })
})

// Also pure deterministic lookup — no LLM call, so this can run automatically
// after every swap. See server/benchmarks.js for the curated data and why a
// real per-GPU-per-game database isn't available for the whole catalog.
app.get('/api/fps-estimate', (req, res) => {
  const { cpuId, gpuId, resolution } = req.query

  if (!cpuId || !gpuId) {
    return res.status(400).json({ error: 'cpuId and gpuId are required' })
  }

  const parts = getPartsByIds([Number(cpuId), Number(gpuId)])
  const cpu = parts.find((p) => p.id === Number(cpuId))
  const gpu = parts.find((p) => p.id === Number(gpuId))
  if (!cpu || !gpu) return res.status(404).json({ error: 'part not found' })

  const resolutionStr = resolution ? String(resolution) : null
  const gpuChipset = gpu.specs.find(([label]) => label === 'Chipset')?.[1]
  const gpuPercentile = getPricePercentile('GPU', Number(gpu.price.replace(/[^0-9.]/g, '')))
  const isCpuBound = detectBottleneck([cpu, gpu], resolutionStr)?.category === 'CPU'

  const estimates = estimateFps({
    gpuChipset,
    gpuPercentile,
    resolution: resolutionStr ?? '1440p',
    isCpuBound,
  })

  res.json({ estimates, resolution: resolutionStr })
})

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const stream = await genAI.models.generateContentStream({
      model: 'gemini-3.5-flash-lite',
      contents,
    })

    for await (const chunk of stream) {
      const text = chunk.text
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error(err)
    res.write(`data: ${JSON.stringify({ error: 'Something went wrong' })}\n\n`)
    res.end()
  }
})

const BUILD_CATEGORIES = ['PC Case', 'Motherboard', 'CPU', 'GPU', 'RAM', 'Cooling', 'Storage', 'Power Supply']

// Combines what used to be two separate schemas/calls (extract intent, then
// pick parts) into one — the model both reads budget/platform/tag/resolution
// out of the conversation AND picks parts in the same response, since the
// candidate catalog is now budget-agnostic (see getCandidatesSpread) and no
// longer needs the budget known in advance to build.
const BUILD_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Conversational reply shown to the user in the chat panel.',
    },
    picks: {
      type: 'array',
      description:
        'Catalog ids for the recommended build, one id per category still needed (see ownedCategories) — never include an id for a category the user already owns. Leave empty while still asking clarifying questions.',
      items: { type: 'integer' },
    },
    budget: {
      type: 'integer',
      description:
        'The user\'s stated or implied budget in whole US dollars for the ENTIRE PC build, pulled from anywhere in the conversation so far. Always give your best numeric estimate, even for vague or indirect phrasing: "no budget", "money is no object", "whatever it costs" → a generous but sensible figure like 3500; "best value"/budget-conscious framing with no number → a modest default like 1200. Use 0 only if the conversation genuinely gives no signal about spending at all.',
    },
    platform: {
      type: 'string',
      enum: ['AMD', 'Intel', 'none'],
      description: 'CPU/motherboard platform preference, or "none" if unspecified.',
    },
    tag: {
      type: 'string',
      enum: ['rgb', 'quiet', 'compact', 'none'],
      description: 'A stated aesthetic, acoustic, or form-factor preference, or "none".',
    },
    resolution: {
      type: 'string',
      enum: ['1080p', '1440p', '4K', 'none'],
      description: 'Target gaming resolution, or "none" if unspecified.',
    },
    useCase: {
      type: 'string',
      enum: ['gaming', 'editing', 'programming', 'streaming', 'general', 'none'],
      description:
        'The primary thing this PC is for, or "none" if the conversation hasn\'t said. "editing" covers video/photo editing and rendering; "programming" covers software development; "general" is everyday/office use with no specific demanding task.',
    },
    ownedCategories: {
      type: 'array',
      description:
        'Categories the user has said they already own and do NOT want recommended/purchased (e.g. "I already have a case and PSU" -> ["PC Case", "Power Supply"]). Leave empty if nothing was mentioned as already owned.',
      items: { type: 'string', enum: BUILD_CATEGORIES },
    },
    preferredBrand: {
      type: 'string',
      description:
        'A brand the user asked to favor (e.g. "I prefer ASUS", "get me a Corsair PSU if you can"), or "none" if unstated. A single brand name, not a sentence.',
    },
    excludedBrand: {
      type: 'string',
      description:
        'A brand the user asked to avoid (e.g. "no EVGA", "stay away from Gigabyte"), or "none" if unstated. A single brand name, not a sentence.',
    },
  },
  required: [
    'reply',
    'picks',
    'budget',
    'platform',
    'tag',
    'resolution',
    'useCase',
    'ownedCategories',
    'preferredBrand',
    'excludedBrand',
  ],
}

// How big a gap in price-percentile-within-category (0-1) between the CPU
// and GPU picks counts as a "bottleneck" worth flagging, per resolution.
// CPU headroom matters far more at 1080p (GPU-light, CPU-bound) than at 4K
// (GPU-bound regardless of CPU) — narrower gaps trigger the warning at lower
// resolutions.
const BOTTLENECK_THRESHOLD = { '1080p': 0.25, '1440p': 0.35, '4K': 0.5 }

function parsePriceNum(price) {
  return Number(price.replace(/[^0-9.]/g, ''))
}

// A cheap, local stand-in for full intent extraction — only used to decide
// how to SHAPE the candidate catalog (proportionally around a budget vs.
// spread across the whole range), never as the authoritative budget shown to
// the user. Requires an adjacent "$" so it doesn't false-match resolution
// figures like "4K" or "1440p gaming" as a dollar amount.
function roughBudgetGuess(messages) {
  const text = messages.map((m) => m.content).join(' ')
  const pattern = /\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k)?|(\d[\d,]*(?:\.\d+)?)\s?(k)?\s?\$/gi
  let best = null
  for (const m of text.matchAll(pattern)) {
    const raw = m[1] ?? m[3]
    const hasK = Boolean(m[2] ?? m[4])
    let num = Number(raw.replace(/,/g, ''))
    if (hasK) num *= 1000
    if (Number.isFinite(num) && num >= 100 && num <= 20000) {
      if (best === null || num > best) best = num
    }
  }
  return best
}

/**
 * Approximates a CPU/GPU tier mismatch using each part's price-percentile
 * within its own category as a stand-in for performance tier — there's no
 * real benchmark data behind this, just the reasonable assumption that
 * pricier parts within a generation tend to be faster ones. Good enough to
 * catch an obvious budget-CPU/flagship-GPU (or reverse) pairing; not a
 * substitute for an actual bottleneck calculator.
 *
 * Returns { category, message } where `category` is the part HOLDING BACK
 * the other one (so the UI can badge that specific row), or null if the two
 * are reasonably matched.
 */
function detectBottleneck(picks, resolution) {
  const cpu = picks.find((p) => p.category === 'CPU')
  const gpu = picks.find((p) => p.category === 'GPU')
  if (!cpu || !gpu) return null

  const cpuPct = getPricePercentile('CPU', parsePriceNum(cpu.price))
  const gpuPct = getPricePercentile('GPU', parsePriceNum(gpu.price))
  const threshold = BOTTLENECK_THRESHOLD[resolution] ?? 0.35
  const gap = gpuPct - cpuPct
  const resLabel = resolution ? ` at ${resolution}` : ''

  if (gap > threshold) {
    return {
      category: 'CPU',
      message: `The GPU is a noticeably higher tier than the CPU${resLabel} — the CPU may hold it back somewhat.`,
    }
  }
  if (-gap > threshold) {
    return {
      category: 'GPU',
      message: `The CPU is a noticeably higher tier than the GPU${resLabel} — you may be leaving GPU performance on the table.`,
    }
  }
  return null
}

// Fallback DDR generation per socket, used only when a motherboard's own
// "Memory Type" spec isn't available (see requiredRamGeneration below).
// LGA1700 boards genuinely exist in both DDR4 and DDR5 variants, so that
// socket is deliberately left out here — without a real per-board answer,
// not enforcing a constraint is safer than enforcing a wrong one.
const RAM_DDR_BY_SOCKET = { AM4: 'DDR4', AM5: 'DDR5', LGA1851: 'DDR5' }

function ramDdrGeneration(ramPart) {
  const speed = ramPart.specs.find(([label]) => label === 'Speed')?.[1]
  return speed?.match(/^DDR\d/)?.[0] ?? null
}

function moboDdrGeneration(moboPart) {
  const stated = moboPart.specs.find(([label]) => label === 'Memory Type')?.[1]
  return stated === 'DDR4' || stated === 'DDR5' ? stated : null
}

/**
 * Most motherboards in the catalog now carry their own real "Memory Type"
 * spec (see MOTHERBOARD_LISTINGS in seed.js — sourced straight from each
 * listing's stated DDR4/DDR5 variant, not inferred), which is a strictly
 * better source of truth than the socket-based guess: it's what finally
 * makes LGA1700 boards checkable at all, since that socket alone doesn't
 * determine DDR generation. Only falls back to the socket map for the
 * handful of boards whose listing didn't state a memory type.
 */
function requiredRamGeneration(moboPick) {
  if (!moboPick) return null
  const stated = moboPick.specs.find(([label]) => label === 'Memory Type')?.[1]
  if (stated === 'DDR4' || stated === 'DDR5') return stated
  return RAM_DDR_BY_SOCKET[moboPick.socket] ?? null
}

/**
 * The model occasionally pairs RAM of the wrong DDR generation with the
 * chosen platform (e.g. DDR4 RAM with an AM5 build) — not a "maybe" either,
 * same reasoning as the CPU/Motherboard socket fix above.
 */
function fixRamGeneration(picks, candidates) {
  const moboPick = picks.find((p) => p.category === 'Motherboard')
  const requiredGen = requiredRamGeneration(moboPick)
  if (!requiredGen) return picks

  const ramPickIdx = picks.findIndex((p) => p.category === 'RAM')
  if (ramPickIdx < 0) return picks
  const ramPick = picks[ramPickIdx]
  if (ramDdrGeneration(ramPick) === requiredGen) return picks

  const fixedRam =
    candidates.find((c) => c.category === 'RAM' && ramDdrGeneration(c) === requiredGen) ??
    getRamByDdrGeneration({
      ddrGeneration: requiredGen,
      near: parsePriceNum(ramPick.price),
      excludeId: ramPick.id,
      limit: 1,
    })[0]

  if (!fixedRam) return picks
  const fixed = [...picks]
  fixed[ramPickIdx] = fixedRam
  return fixed
}

/**
 * Best-effort deterministic correction for a detected CPU/GPU bottleneck —
 * the system prompt already asks the model to avoid this, but instructing
 * an LLM isn't a guarantee, and the existing bottleneck check was purely
 * advisory (a badge in the UI) with nothing actually preventing the mismatch.
 * Only ever upgrades the weaker part (never downgrades the stronger one,
 * which would change the build's intended performance tier), and only from
 * the shortlist already sent to the model so it stays plausible for the
 * budget. Skipped if the fix would blow past budget too — enforceBudget runs
 * afterward and would otherwise just undo it.
 */
function fixBottleneck(picks, candidates, resolution, budget) {
  const bottleneck = picks.length ? detectBottleneck(picks, resolution) : null
  if (!bottleneck) return { picks, bottleneck }

  const weakCategory = bottleneck.category
  const strongCategory = weakCategory === 'CPU' ? 'GPU' : 'CPU'
  const weakIdx = picks.findIndex((p) => p.category === weakCategory)
  const weakPick = picks[weakIdx]
  const strongPick = picks.find((p) => p.category === strongCategory)
  if (!weakPick || !strongPick) return { picks, bottleneck }

  const strongPct = getPricePercentile(strongCategory, parsePriceNum(strongPick.price))
  const weakPrice = parsePriceNum(weakPick.price)

  let options = candidates.filter((c) => c.category === weakCategory && parsePriceNum(c.price) > weakPrice)
  if (weakCategory === 'CPU') {
    const moboPick = picks.find((p) => p.category === 'Motherboard')
    if (moboPick) options = options.filter((c) => c.socket === moboPick.socket)
  }

  let best = null
  let bestDiff = Infinity
  for (const option of options) {
    const pct = getPricePercentile(weakCategory, parsePriceNum(option.price))
    const diff = Math.abs(pct - strongPct)
    if (diff < bestDiff) {
      bestDiff = diff
      best = option
    }
  }
  if (!best) return { picks, bottleneck }

  const total = picks.reduce((sum, p) => sum + parsePriceNum(p.price), 0)
  const delta = parsePriceNum(best.price) - weakPrice
  if (budget && total + delta > budget * 1.15) return { picks, bottleneck }

  const fixedPicks = [...picks]
  fixedPicks[weakIdx] = best
  return { picks: fixedPicks, bottleneck: detectBottleneck(fixedPicks, resolution) }
}

// Categories ordered from least to most impactful to downgrade — cosmetic/
// peripheral parts first, CPU/GPU (the parts the user's stated use case
// actually depends on) only as a last resort.
const BUDGET_DOWNGRADE_ORDER = [
  'Cooling',
  'PC Case',
  'Storage',
  'Power Supply',
  'RAM',
  'Motherboard',
  'CPU',
  'GPU',
]

// Same per-category proportions getCandidates shapes the shortlist around
// (see server/db.js) — reused here only as a floor, so a downgrade never
// guts one category to whatever's globally cheapest (e.g. a $10 cooler)
// while others go untouched. Cutting to half of a category's fair share is
// still a real cut; going further than that starts to look less like "a
// cheaper build" and more like a mismatched one (a $700 GPU next to a $20
// SSD). If respecting this floor isn't enough to close the whole gap, the
// build is left a bit over budget rather than forced into that mismatch —
// the UI's own "over budget" banner already flags that honestly.
const BUDGET_SHARE = {
  CPU: 0.18,
  Motherboard: 0.12,
  GPU: 0.32,
  RAM: 0.08,
  'PC Case': 0.09,
  Cooling: 0.07,
  Storage: 0.06,
  'Power Supply': 0.08,
}

// Same tolerance the frontend uses to decide whether to show the "over
// budget" warning — no point enforcing a tighter number here than what's
// actually flagged as a problem on screen.
const BUDGET_TOLERANCE = 1.1

/**
 * From a pool of cheaper-than-current options, picks the mildest cut that's
 * actually enough to bring the running total within tolerance on its own —
 * not automatically the single cheapest option available, which would
 * needlessly gut a category (e.g. swapping in a $10 cooler when a $50 one
 * would already have closed the gap) and produce a lopsided-looking build
 * even though the final total is technically in budget. Falls back to the
 * cheapest option in the pool only when nothing in it is enough alone.
 */
function pickSufficientCut(options, currentPrice, runningTotal, budget) {
  if (!options.length) return null
  const sorted = [...options].sort((a, b) => parsePriceNum(b.price) - parsePriceNum(a.price))
  for (const opt of sorted) {
    const newTotal = runningTotal - currentPrice + parsePriceNum(opt.price)
    if (newTotal <= budget * BUDGET_TOLERANCE) return opt
  }
  return sorted[sorted.length - 1]
}

/**
 * The model reads a budget out of the conversation but nothing previously
 * checked its own picks against it — candidates are only shaped to cluster
 * *near* the budget's per-category proportions, not capped by it, so the
 * model was free to combine several candidates that individually looked
 * reasonable into a total well over what the user asked to spend. Downgrades
 * one category at a time, cheapest-impact first, stopping as soon as the
 * total is back within tolerance. The candidate shortlist alone is shaped
 * around a rough LOCAL budget guess (see roughBudgetGuess) and can be too
 * thin to find a good cut, so it's always widened with real DB alternatives
 * before picking.
 */
function enforceBudget(picks, candidates, budget) {
  if (!budget) return picks

  const result = [...picks]
  let total = result.reduce((sum, p) => sum + parsePriceNum(p.price), 0)
  if (total <= budget * BUDGET_TOLERANCE) return result

  for (const category of BUDGET_DOWNGRADE_ORDER) {
    if (total <= budget * BUDGET_TOLERANCE) break
    const idx = result.findIndex((p) => p.category === category)
    if (idx < 0) continue
    const current = result[idx]
    const currentPrice = parsePriceNum(current.price)
    const mobo = result.find((p) => p.category === 'Motherboard')
    const cpu = result.find((p) => p.category === 'CPU')
    const socketConstraint =
      category === 'CPU' ? mobo?.socket : category === 'Motherboard' ? cpu?.socket : undefined
    const requiredRamGen = category === 'RAM' ? requiredRamGeneration(mobo) : null

    // Same socket isn't sufficient on its own for a Motherboard downgrade —
    // LGA1700 boards exist in both DDR4 and DDR5 variants, so swapping to a
    // cheaper same-socket board could silently strand whatever RAM was
    // already fixed to match the current one. Only exclude a candidate when
    // its own memory type is KNOWN and different; boards with no stated type
    // stay eligible, same "don't guess" stance as requiredRamGeneration.
    const currentRamPick = category === 'Motherboard' ? result.find((p) => p.category === 'RAM') : null
    const currentRamGen = currentRamPick ? ramDdrGeneration(currentRamPick) : null

    let pool = candidates.filter((c) => c.category === category)
    pool =
      category === 'RAM' && requiredRamGen
        ? pool.concat(getRamByDdrGeneration({ ddrGeneration: requiredRamGen, near: 0, excludeId: current.id, limit: 8 }))
        : pool.concat(getCheapestInCategory({ category, socket: socketConstraint, limit: 8 }))

    const floor = budget * (BUDGET_SHARE[category] ?? 0) * 0.5
    let options = pool.filter((c) => parsePriceNum(c.price) < currentPrice && parsePriceNum(c.price) >= floor)
    if (socketConstraint) options = options.filter((c) => c.socket === socketConstraint)
    if (requiredRamGen) options = options.filter((c) => ramDdrGeneration(c) === requiredRamGen)
    if (currentRamGen) {
      options = options.filter((c) => {
        const moboGen = moboDdrGeneration(c)
        return !moboGen || moboGen === currentRamGen
      })
    }

    const chosen = pickSufficientCut(options, currentPrice, total, budget)
    if (!chosen) continue
    total += parsePriceNum(chosen.price) - currentPrice
    result[idx] = chosen
  }

  return result
}

function specNumber(part, label) {
  const raw = part.specs.find(([l]) => l === label)?.[1]
  const num = raw != null ? Number.parseFloat(String(raw)) : NaN
  return Number.isFinite(num) ? num : null
}

function pickClosestToTarget(options, targetPrice) {
  if (!options.length) return null
  return options.reduce((best, c) =>
    Math.abs(parsePriceNum(c.price) - targetPrice) < Math.abs(parsePriceNum(best.price) - targetPrice) ? c : best,
  )
}

// Price-within-category is only a rough performance-tier proxy (see
// detectBottleneck) — reliable enough to catch an obviously lopsided CPU/GPU
// pairing, but not reliable enough to trust blindly when picking a specific
// "upgrade" to recommend by name: this catalog spans many GPU/CPU
// generations, and an older or oddly-priced part can cost slightly more than
// a newer one while actually being worse. Requiring the primary spec
// (VRAM for GPU, cores for CPU) not to regress catches that — a candidate
// that's pricier but has LESS VRAM/fewer cores is a real part, just not a
// real upgrade, so it shouldn't be recommended as one.
function isRealUpgrade(category, current, candidate) {
  if (category === 'GPU') {
    // Also stay within the same chipset family (GeForce/Radeon/Arc/...) —
    // the catalog mixes consumer gaming cards with workstation/professional
    // ones (Quadro, RTX "Ada Generation", FirePro, ...) that can cost more
    // and even carry more VRAM while performing worse for gaming, since
    // that VRAM isn't paired with gaming-oriented core counts or clocks.
    const curChipset = current.specs.find(([l]) => l === 'Chipset')?.[1]
    const newChipset = candidate.specs.find(([l]) => l === 'Chipset')?.[1]
    const curFamily = curChipset?.split(' ')[0]
    const newFamily = newChipset?.split(' ')[0]
    if (curFamily && newFamily && curFamily !== newFamily) return false

    // Same-family model number (e.g. "RTX 5070" -> 5070) as a stand-in for
    // generation/tier — even within one family this catalog's frozen-then-
    // rescaled pricing (see PRICE_MULTIPLIER in seed.js) doesn't reliably
    // rank a newer card above an older one on price alone, so an older,
    // lower-numbered card can cost more than a newer, higher-numbered one.
    const curModel = Number(curChipset?.match(/\d{3,4}/)?.[0])
    const newModel = Number(newChipset?.match(/\d{3,4}/)?.[0])
    if (Number.isFinite(curModel) && Number.isFinite(newModel) && newModel < curModel) return false

    const curVram = specNumber(current, 'Memory')
    const newVram = specNumber(candidate, 'Memory')
    if (curVram != null && newVram != null) return newVram >= curVram
  }
  if (category === 'CPU') {
    const curCores = specNumber(current, 'Cores')
    const newCores = specNumber(candidate, 'Cores')
    if (curCores != null && newCores != null) return newCores >= curCores
  }
  return true
}

function cpuUpgradeDetail(current, upgrade) {
  const curCores = specNumber(current, 'Cores')
  const upCores = specNumber(upgrade, 'Cores')
  if (curCores != null && upCores != null && upCores > curCores) {
    return `${upCores - curCores} more cores (${curCores} → ${upCores})`
  }
  const curBoost = specNumber(current, 'Boost Clock')
  const upBoost = specNumber(upgrade, 'Boost Clock')
  if (curBoost != null && upBoost != null && upBoost > curBoost) {
    return `a higher boost clock (${curBoost} → ${upBoost} GHz)`
  }
  return 'meaningfully faster single- and multi-core performance'
}

function gpuUpgradeDetail(current, upgrade) {
  const curVram = specNumber(current, 'Memory')
  const upVram = specNumber(upgrade, 'Memory')
  if (curVram != null && upVram != null && upVram > curVram) {
    return `${upVram - curVram} GB more VRAM (${curVram} → ${upVram} GB)`
  }
  return 'noticeably more graphics performance'
}

function storageCapacityGB(part) {
  const raw = part.specs.find(([l]) => l === 'Capacity')?.[1]
  const match = raw != null ? String(raw).match(/([\d.]+)\s*(TB|GB)/i) : null
  if (!match) return null
  const num = Number(match[1])
  return match[2].toUpperCase() === 'TB' ? num * 1000 : num
}

function findStorageUpgrade(currentStorage, candidates, budgetAvailable) {
  const curCapacity = storageCapacityGB(currentStorage)
  if (curCapacity == null) return null
  const currentType = currentStorage.specs.find(([l]) => l === 'Type')?.[1]
  const currentPrice = parsePriceNum(currentStorage.price)
  const options = candidates.filter((c) => {
    if (c.category !== 'Storage') return false
    // Same drive type only — more capacity on a slower type (e.g. swapping
    // an NVMe SSD for a bigger spinning HDD) isn't a real-world upgrade even
    // though the number on the box goes up.
    const type = c.specs.find(([l]) => l === 'Type')?.[1]
    if (currentType && type !== currentType) return false
    const cap = storageCapacityGB(c)
    if (cap == null || cap <= curCapacity) return false
    const delta = parsePriceNum(c.price) - currentPrice
    return delta > 0 && delta <= budgetAvailable
  })
  if (!options.length) return null
  return options.reduce((best, c) => (storageCapacityGB(c) > storageCapacityGB(best) ? c : best))
}

// How much percentile gap (see detectBottleneck) counts as a "leans one way"
// framing worth mentioning even when it's not big enough to cross the actual
// bottleneck threshold — smaller than BOTTLENECK_THRESHOLD on purpose, since
// this is a softer "something to know" note, not a warning badge.
const LEAN_THRESHOLD = 0.12

/**
 * Deterministic "what if" trade-off scenarios grounded in real catalog data
 * — computed here rather than left to the model for the same reason the
 * reply is forbidden from naming CPU/GPU models itself (see the system
 * prompt): an LLM asked to invent a plausible "$100 more gets you X"
 * suggestion has no guarantee the part it names is real, priced what it
 * says, or in the catalog at all. Only produced once a real build exists.
 */
function buildTradeOffs({ picks, candidates, resolution, useCase, bottleneck }) {
  const cpu = picks.find((p) => p.category === 'CPU')
  const gpu = picks.find((p) => p.category === 'GPU')
  if (!cpu || !gpu) return []

  const mobo = picks.find((p) => p.category === 'Motherboard')
  const cpuPct = getPricePercentile('CPU', parsePriceNum(cpu.price))
  const gpuPct = getPricePercentile('GPU', parsePriceNum(gpu.price))
  const tradeOffs = []

  // 1) Highest-impact upgrade for roughly $100-150 more, on whichever of
  // CPU/GPU matters more for the stated use case (or, absent a clear signal,
  // whichever currently has the lower relative tier and so more headroom).
  let leverCategory
  if (useCase === 'editing' || useCase === 'programming') leverCategory = 'CPU'
  else if (useCase === 'gaming' && resolution === '1080p') leverCategory = 'CPU'
  else if (useCase === 'gaming') leverCategory = 'GPU'
  else leverCategory = cpuPct <= gpuPct ? 'CPU' : 'GPU'

  const leverCurrent = leverCategory === 'CPU' ? cpu : gpu
  let upgradeOptions = candidates.filter(
    (c) =>
      c.category === leverCategory &&
      parsePriceNum(c.price) > parsePriceNum(leverCurrent.price) &&
      isRealUpgrade(leverCategory, leverCurrent, c),
  )
  if (leverCategory === 'CPU' && mobo) upgradeOptions = upgradeOptions.filter((c) => c.socket === mobo.socket)
  const upgrade = pickClosestToTarget(upgradeOptions, parsePriceNum(leverCurrent.price) + 120)
  if (upgrade) {
    const delta = Math.round(parsePriceNum(upgrade.price) - parsePriceNum(leverCurrent.price))
    const detail = leverCategory === 'CPU' ? cpuUpgradeDetail(leverCurrent, upgrade) : gpuUpgradeDetail(leverCurrent, upgrade)
    tradeOffs.push(
      `If your budget went up ~$${delta}, the highest-impact upgrade would be the ${upgrade.name} (${upgrade.price}) for the ${leverCategory} — ${detail}.`,
    )
  }

  // 2) Reallocate: drop a tier on the OTHER of CPU/GPU, see what it funds.
  const otherCategory = leverCategory === 'CPU' ? 'GPU' : 'CPU'
  const otherCurrent = otherCategory === 'CPU' ? cpu : gpu
  let downgradeOptions = candidates.filter(
    (c) => c.category === otherCategory && parsePriceNum(otherCurrent.price) - parsePriceNum(c.price) >= 40,
  )
  if (otherCategory === 'CPU' && mobo) downgradeOptions = downgradeOptions.filter((c) => c.socket === mobo.socket)
  const downgrade = downgradeOptions.length
    ? downgradeOptions.reduce((best, c) => (parsePriceNum(c.price) > parsePriceNum(best.price) ? c : best))
    : null
  if (downgrade) {
    const savings = Math.round(parsePriceNum(otherCurrent.price) - parsePriceNum(downgrade.price))
    const storage = picks.find((p) => p.category === 'Storage')
    const storageUpgrade = storage ? findStorageUpgrade(storage, candidates, savings) : null
    const funds = storageUpgrade
      ? `enough to move storage up to the ${storageUpgrade.name} (${storageUpgrade.price}) instead`
      : `about $${savings} of headroom to put toward any other part`
    tradeOffs.push(
      `If you dropped the ${otherCategory} to the ${downgrade.name} (${downgrade.price}), you'd free up ~$${savings} — ${funds}.`,
    )
  }

  // 3) CPU-bound vs GPU-bound framing — reuses the bottleneck verdict when
  // there's an active one, otherwise states a softer directional lean.
  if (bottleneck) {
    tradeOffs.push(
      bottleneck.category === 'CPU'
        ? `This build is CPU-bound for your use case — a beefier GPU wouldn't help much until the CPU also moves up a tier.`
        : `This build is GPU-bound for your use case — a faster CPU wouldn't help much until the GPU also moves up a tier.`,
    )
  } else {
    const gap = gpuPct - cpuPct
    if (gap > LEAN_THRESHOLD) {
      tradeOffs.push(`This build leans a bit GPU-heavy — the CPU has some headroom before it'd start limiting the GPU.`)
    } else if (-gap > LEAN_THRESHOLD) {
      tradeOffs.push(`This build leans a bit CPU-heavy — the GPU has some headroom before it'd start limiting the CPU.`)
    } else {
      tradeOffs.push(`CPU and GPU are well matched here — neither should meaningfully hold the other back.`)
    }
  }

  return tradeOffs.slice(0, 3)
}

app.post('/api/build-chat', async (req, res) => {
  const { messages, currentPicks } = req.body

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }

  // The real budget still comes from the model's own extraction (see
  // BUILD_RESPONSE_SCHEMA) — that no longer happens in a separate call, so
  // it isn't known yet at this point. But a rough local guess is enough to
  // shape the catalog proportionally the way getCandidates always has
  // (~32% of budget on the GPU, ~18% on the CPU, etc.) instead of an
  // unweighted spread across the whole price range, which was producing
  // wildly mismatched pairs (e.g. a $74 CPU next to a $965 GPU) once nothing
  // nudged picks toward the stated budget. Falls back to the full spread
  // only when no dollar figure could be found at all (e.g. "money's no
  // object").
  const roughBudget = roughBudgetGuess(messages)
  const candidates = roughBudget
    ? getCandidates({ budget: roughBudget, perCategory: 20 })
    : getCandidatesSpread({ perCategory: 20 })

  // The build already on screen — including anything the user manually
  // swapped in via the UI, which won't necessarily be near the budget-driven
  // price target and so wouldn't otherwise appear in `candidates` at all.
  // Merged in so the model can actually reference/keep these ids when the
  // user is asking ABOUT the current build rather than requesting changes.
  const currentPicksResolved = Array.isArray(currentPicks) ? getPartsByIds(currentPicks) : []
  for (const pick of currentPicksResolved) {
    if (!candidates.some((c) => c.id === pick.id)) candidates.push(pick)
  }

  const currentBuildNote = currentPicksResolved.length
    ? `\n\nThe user's CURRENT build already has these parts picked (shown on screen right now):
${JSON.stringify(currentPicksResolved.map((p) => ({ id: p.id, category: p.category, name: p.name, price: p.price })))}
Only return the EXACT SAME ids as the current build, unchanged, when the user is purely asking you to EVALUATE or EXPLAIN it without asking for anything different — e.g. "does this cause a bottleneck", "is this good for streaming", "why did you pick this CPU", "what do you think". Do not silently swap any part on a turn like that, even if you'd have picked differently yourself.
Anything else — however it's phrased — is a change request and should recompute picks accordingly. This includes indirect or vague phrasing, not just literal "swap X for Y": spend more/less, "use the full budget," upgrade/downgrade, "I don't like this," "make it quieter," "no RGB," "more storage," "switch to Intel," "make it better," etc. A request naming one category (e.g. "get a better GPU") can still justify adjusting others too, not just that one category, if the budget or the change calls for it. When genuinely unsure whether something is an evaluation question or a change request, treat it as a change request — recomputing a build the user actually meant to just ask about is a much smaller miss than silently ignoring a real request.`
    : ''

  const systemInstruction = `You are the build assistant for a PC parts store's "Custom PC Builder" chat. You gather context through conversation, then recommend a complete, compatible build.

STEP 1 — Gather context. Before proposing a build, you need to know:
- Primary use case (gaming, video editing, programming, streaming, general use, ...)
- Budget for the whole build
- If gaming: target resolution/frame rate
- Any components the user already owns and doesn't want recommended (e.g. "I already have a case and PSU")
- Brand preferences or exclusions, if any
If the user hasn't given you enough to work with yet (at minimum a budget and a use case), ask a short, friendly clarifying question and return an empty "picks" array — do NOT guess a build out of a bare greeting or a single vague message. Re-derive all of this from the ENTIRE conversation so far on every turn, not just the latest message — a detail mentioned two messages ago (like an owned part or a brand preference) still applies until the user changes it.

Not every message is a build request, though. If the user asks a general PC question instead — "what's better, Intel or AMD for gaming", "do I actually need liquid cooling", "how much RAM do I need for video editing", "what's the difference between DDR4 and DDR5" — just answer it directly and conversationally from your own knowledge, and return an empty "picks" array. Don't force the conversation back toward "what's your budget?" when the user hasn't asked for a build and the question didn't need that to answer. If a build is already on screen and the question relates to it, ground the answer in those actual parts rather than generic advice.

STEP 2 — Recommend a build, once you have enough information. Rules for picks:
- Use ONLY parts from the catalog below, referenced by their exact "id" — never invent parts, names, or specs.
- Return exactly one pick per category from this list, EXCEPT any category the user already owns (see "ownedCategories" below — never return a pick for one of those): ${BUILD_CATEGORIES.join(', ')}.
- The CPU and Motherboard you pick must have matching "socket" values.
- Keep the CPU and GPU reasonably matched in performance tier for the stated use case — avoid pairing a budget-tier CPU with a high-end GPU (or the reverse) unless the user's budget genuinely can't do better, since a lopsided pairing leaves one part bottlenecking the other.
- If a preferred or excluded brand was stated, favor/avoid it among the catalog options actually available — never pick outside the catalog just to satisfy it, and never treat it as a hard blocker if nothing in a category matches.
- Always return the full set of picks (one id per still-needed category) in the same response as your reply — don't describe a build in prose without also returning the picks.

Keep "reply" short (2-4 sentences), friendly, and specific about why the parts fit the stated budget and use case — cite at least one concrete spec from the catalog that matters for that use case (e.g. core count and RAM for video editing/rendering, VRAM and clock speed for gaming, upload-friendly cooling and storage speed for streaming), not just generic praise like "powerful" or "great performance."
Do NOT name a specific CPU or GPU model in your reply text (e.g. don't write "the Core Ultra 9 285K" or "the RTX 5090") — only describe them generically ("the processor", "the graphics card"). The exact part names, the total cost, any compatibility notes, the bottleneck analysis, and trade-off/"what if" scenarios are all handled separately and appended automatically — do not attempt any of that yourself in "reply", and do not summarize specific reliability/review information about any part (a separate feature handles that, grounded in an actual search — don't guess at reputations here).${currentBuildNote}

Also read the user's budget, platform preference, aesthetic/acoustic tag, target resolution, use case, owned components, and brand preferences out of the conversation so far, and return them in "budget"/"platform"/"tag"/"resolution"/"useCase"/"ownedCategories"/"preferredBrand"/"excludedBrand" — interpret natural, flexible phrasing generously (e.g. "no budget"/"money is no object" → a generous but sensible figure like 3500; budget-conscious framing with no number → a modest default like 1200; budget 0 only if the conversation gives no signal at all about spending).

IMPORTANT: the catalog below is a shortlist from a much larger inventory, not the complete list of everything in stock — it may not include every specific named product. If the user asks about a specific product and it's not in the catalog, that almost always means it's real but just isn't in this shortlist — say so and quote what it would actually cost if you can tell from context, or suggest raising the budget. Never claim a well-known, real product is "out of stock," "unavailable," or "doesn't exist" just because it isn't in this shortlist.

Catalog:
${JSON.stringify(candidates)}`

  try {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const response = await genAI.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: BUILD_RESPONSE_SCHEMA,
      },
    })

    const parsed = JSON.parse(response.text)
    const budget = parsed.budget > 0 ? parsed.budget : null
    const resolution = parsed.resolution && parsed.resolution !== 'none' ? parsed.resolution : null
    const useCase = parsed.useCase && parsed.useCase !== 'none' ? parsed.useCase : null
    const preferredBrand = parsed.preferredBrand && parsed.preferredBrand !== 'none' ? parsed.preferredBrand : null
    const excludedBrand = parsed.excludedBrand && parsed.excludedBrand !== 'none' ? parsed.excludedBrand : null
    const ownedCategories = Array.isArray(parsed.ownedCategories)
      ? [...new Set(parsed.ownedCategories.filter((c) => BUILD_CATEGORIES.includes(c)))]
      : []
    const neededCategories = BUILD_CATEGORIES.filter((c) => !ownedCategories.includes(c))

    // Brand isn't known until this same response (it's extracted from the
    // conversation in the same call that produces picks), so it can't shape
    // the shortlist the way budget/platform do — instead it biases every
    // fallback/substitute pick the rest of this pipeline makes from here on.
    const shapedCandidates = applyBrandPreference(candidates, preferredBrand, excludedBrand)

    // The system prompt tells the model to pick only from the catalog it was
    // shown, but nothing was actually verifying that — the model has
    // returned real ids for real parts that were never in `candidates` at
    // all (id guessing/misremembering, not hallucination of a fake part,
    // but the effect is the same: an arbitrary, usually cheap, off-target
    // product slipping into a category that looked deliberately chosen).
    // Dropping non-candidate ids here turns that into a plain "missing
    // category," which the backfill step right below already resolves
    // correctly using the real shown shortlist.
    const candidateIds = new Set(candidates.map((c) => c.id))
    let picks = getPartsByIds(parsed.picks ?? [])
      .filter((p) => neededCategories.includes(p.category))
      .filter((p) => candidateIds.has(p.id))

    // The model has occasionally returned more than one id for the same
    // category (a duplicate/second-guessed pick) — keeping only the first
    // occurrence guarantees exactly one entry per category, so the total,
    // the bottleneck check, and the rendered list can never disagree with
    // each other about which part is actually in the build.
    const seenCategories = new Set()
    picks = picks.filter((p) => {
      if (seenCategories.has(p.category)) return false
      seenCategories.add(p.category)
      return true
    })

    // The model occasionally drops a category despite the instruction —
    // backfill from the same shortlist it was given so a full build always
    // renders once picks are non-empty. Only when picks are ALREADY
    // non-empty, though — an empty array is the model deliberately asking a
    // clarifying question instead of building yet (e.g. the user just said
    // "hi"), and backfilling every category from the shortlist in that case
    // would silently turn "I need more info" into a full random build.
    if (picks.length) {
      for (const category of neededCategories) {
        if (picks.some((p) => p.category === category)) continue
        const fallback = shapedCandidates.find((c) => c.category === category)
        if (fallback) picks.push(fallback)
      }
    }

    // The model occasionally ignores the matching-socket instruction and
    // names a CPU/Motherboard pair that can't physically go together — that's
    // not a "maybe," so fix it deterministically instead of trusting the
    // model to always get it right. Keep the CPU (the more use-case-driving
    // pick) and re-pair the motherboard, same approach the frontend already
    // uses when a manual swap breaks compatibility.
    const cpuPickIdx = picks.findIndex((p) => p.category === 'CPU')
    const moboPickIdx = picks.findIndex((p) => p.category === 'Motherboard')
    if (cpuPickIdx >= 0 && moboPickIdx >= 0) {
      const cpuPick = picks[cpuPickIdx]
      const moboPick = picks[moboPickIdx]
      if (cpuPick.socket && cpuPick.socket !== moboPick.socket) {
        const fixedMobo =
          shapedCandidates.find((c) => c.category === 'Motherboard' && c.socket === cpuPick.socket) ??
          getAlternatives({
            category: 'Motherboard',
            excludeId: moboPick.id,
            near: parsePriceNum(moboPick.price),
            socket: cpuPick.socket,
            limit: 1,
          })[0]
        if (fixedMobo) picks[moboPickIdx] = fixedMobo
      }
    }

    // Same "not a maybe" reasoning as the socket fix above, applied to the
    // other two ways a generated build has been coming out wrong: RAM of the
    // wrong DDR generation for the chosen platform, and a CPU/GPU pairing
    // lopsided enough to bottleneck one part. Order matters — bottleneck
    // correction runs before budget enforcement so a budget-driven downgrade
    // gets the final say on total cost, and enforceBudget's own socket/DDR
    // filters keep whatever these two already fixed intact.
    picks = fixRamGeneration(picks, shapedCandidates)
    ;({ picks } = fixBottleneck(picks, shapedCandidates, resolution, budget))
    picks = enforceBudget(picks, shapedCandidates, budget)

    const bottleneck = picks.length ? detectBottleneck(picks, resolution) : null
    const tradeOffs = picks.length
      ? buildTradeOffs({ picks, candidates: shapedCandidates, resolution, useCase, bottleneck })
      : []

    // The model's free-text reply is instructed not to name specific
    // CPU/GPU models (see system prompt) since that's proven unreliable —
    // append the real names here instead, guaranteed to match what's
    // actually in `picks` rather than whatever the model imagined. The
    // trade-off scenarios are appended the same way, for the same reason
    // (see buildTradeOffs).
    let reply = parsed.reply
    if (picks.length) {
      const cpu = picks.find((p) => p.category === 'CPU')
      const gpu = picks.find((p) => p.category === 'GPU')
      if (cpu && gpu) reply += ` This build pairs the ${cpu.name} with the ${gpu.name}.`
      if (tradeOffs.length) reply += `\n\n${tradeOffs.map((t) => `• ${t}`).join('\n')}`
    }

    res.json({ reply, picks, bottleneck, budget, resolution })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

/**
 * A deliberate, infrequent user action (button click, not per chat message)
 * — unlike the earlier decision to skip live price grounding on every build-
 * chat turn, the cost/rate-limit tradeoff is worth it here, so this one
 * actually uses Gemini's Google Search tool for real, current reliability/
 * reputation research instead of relying on the model's internal knowledge.
 * Search grounding can't be combined with responseSchema/JSON mode (the same
 * limitation hit earlier), so this returns free-form markdown-ish text
 * rather than structured JSON.
 */
app.post('/api/build-report', async (req, res) => {
  const { picks: pickIds } = req.body

  if (!Array.isArray(pickIds) || pickIds.length === 0) {
    return res.status(400).json({ error: 'picks must be a non-empty array of ids' })
  }

  const parts = getPartsByIds(pickIds)
  if (!parts.length) return res.status(404).json({ error: 'no matching parts found' })

  const partsSummary = parts.map((p) => ({
    category: p.category,
    name: p.name,
    price: p.price,
    specs: Object.fromEntries(p.specs),
  }))

  const systemInstruction = `You are writing a detailed report on a PC build for a customer who just had it recommended to them. For EACH part listed below, write a focused section covering:
1. Why it's a good fit for this build — reference its real specs given below, not invented ones.
2. Its brand/model's real-world reliability and reputation. Use web search to ground this in actual current information wherever you can (recent reviews, known failure-rate discussions, common praise/complaints). If you end up relying on general knowledge rather than something you actually found, say so plainly rather than presenting it as a verified fact.
3. Any notable pros or cons worth knowing before buying.

Keep each part's section to 3-5 sentences. Use a markdown header per part in the exact form "## Category — Part Name". Only reference specs from the data given below — never invent numbers.

After all the individual part sections, add ONE final section headed exactly "## How It All Works Together" (3-6 sentences) explaining how these SPECIFIC parts interact as a system, not just as a list — e.g. whether the CPU and GPU are reasonably balanced for each other at this build's likely resolution/use case, whether the PSU's wattage comfortably covers what the CPU+GPU actually draw, whether the RAM's speed/capacity suits the CPU platform, whether the cooler's capacity matches the CPU's TDP, and whether the case has the airflow/clearance these specific parts need. Call out any real synergy or genuine mismatch you notice between the actual named parts — don't just restate each part's own strengths again.

Build parts:
${JSON.stringify(partsSummary, null, 2)}`

  try {
    let response
    let grounded = true
    try {
      response = await genAI.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: 'Write the build report.' }] }],
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      })
    } catch (groundedErr) {
      // Google Search grounding has its own separate (and much smaller) free
      // quota from plain generateContent calls — when it's exhausted, fall
      // back to a plain, ungrounded call rather than failing the whole
      // report. The prompt already tells the model to flag anything it
      // states from general knowledge rather than a found source, so the
      // report is still honest about what it could and couldn't verify.
      console.error('Grounded report call failed, falling back to ungrounded:', groundedErr)
      grounded = false
      response = await genAI.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: 'Write the build report.' }] }],
        config: { systemInstruction },
      })
    }

    res.json({ report: response.text, grounded })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Something went wrong generating the report' })
  }
})

export default app
