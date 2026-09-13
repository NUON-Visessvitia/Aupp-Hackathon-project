// Simulated build-recommendation engine for the Custom PC chat assistant.
//
// This is a keyword/rules-based matcher against BUILDER_PARTS (a real,
// spec-and-price part pool — see src/data/builderParts.ts) — not a call to
// an actual LLM. There's no backend in this project to hold an API key
// safely, so this keeps the "AI" entirely client-side.
//
// Approach: split the stated budget proportionally across the six modeled
// categories, then for each category pick whichever real part's price is
// closest to its share — filtering first for compatibility (CPU/motherboard
// socket match) and stated preferences (quiet/RGB/compact keywords).

import { BUILDER_PARTS, type BuilderPart } from "../data/builderParts"

export type Recommendation = {
  picks: BuilderPart[]
  total: number
  summary: string
}

function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ""))
}

function detectBudget(text: string): number | null {
  // Explicit dollar amounts always win — checked before the bare "Nk" fallback
  // below so a resolution mention like "4K" can't be misread as a $4,000
  // budget when a real amount ("$3200") appears elsewhere in the message.
  const dollarK = text.match(/\$\s?(\d+(?:\.\d+)?)\s?k\b/i)
  if (dollarK) return Math.round(parseFloat(dollarK[1]) * 1000)

  const dollarPlain = text.match(/\$\s?(\d{3,6}(?:,\d{3})?)/)
  if (dollarPlain) return Number(dollarPlain[1].replace(/,/g, ""))

  // No "$" anywhere — fall back to a bare "Nk" mention, but exclude the
  // digits used by common resolution shorthand (1K/2K/4K/5K/8K) so a
  // dollar-less "4K gaming" doesn't get read as a $4,000 budget.
  const bareK = text.match(/\b(\d+(?:\.\d+)?)\s?k\b/i)
  if (bareK && !["1", "2", "4", "5", "8"].includes(bareK[1])) {
    return Math.round(parseFloat(bareK[1]) * 1000)
  }

  const plainMatch = text.match(/\b(\d{3,6})\b/)
  if (plainMatch) return Number(plainMatch[1])

  return null
}

function hasTag(item: BuilderPart, tag: string): boolean {
  return item.tags?.includes(tag) ?? false
}

/** The pool entry whose price is closest to the target allocation. */
function closestByPrice(pool: BuilderPart[], target: number): BuilderPart {
  return pool.reduce((best, item) =>
    Math.abs(parsePrice(item.price) - target) < Math.abs(parsePrice(best.price) - target) ? item : best,
  )
}

export function recommendBuild(message: string): Recommendation {
  const text = message.toLowerCase()

  const budget = detectBudget(text) ?? 1800

  const wants4K = /\b4k\b/.test(text)
  const wants1440 = /1440p/.test(text)
  const isCreator = /(stream|editing|edit|render|content creation|video)/.test(text)
  const wantsCompact = /(compact|small|space[- ]saving)/.test(text)
  const wantsQuiet = /(quiet|silent)/.test(text)
  const wantsRGB = /\brgb\b/.test(text)
  const platform: "AMD" | "Intel" = /\bintel\b/.test(text) ? "Intel" : "AMD"

  // Rough proportional split of a full-PC budget across the six categories
  // this catalog models (leaves implicit headroom for PSU/storage, which
  // aren't modeled here).
  const shares = { gpu: 0.35, cpu: 0.21, mobo: 0.13, ram: 0.09, cooling: 0.09, case: 0.13 }
  if (wants4K) {
    shares.gpu += 0.08
    shares.cooling -= 0.03
    shares.case -= 0.05
  }
  if (isCreator) {
    shares.cpu += 0.05
    shares.ram += 0.03
    shares.case -= 0.04
    shares.cooling -= 0.04
  }

  const cpuPool = BUILDER_PARTS.filter((p) => p.category === "CPU" && p.platform === platform)
  const cpu = closestByPrice(cpuPool, budget * shares.cpu)

  // Motherboard must match the chosen CPU's socket, not just its brand.
  const moboPool = BUILDER_PARTS.filter((p) => p.category === "Motherboard" && p.socket === cpu.socket)
  const mobo = closestByPrice(moboPool, budget * shares.mobo)

  const gpuPool = BUILDER_PARTS.filter((p) => p.category === "GPU")
  const gpu = closestByPrice(gpuPool, budget * shares.gpu)

  const ramPool = BUILDER_PARTS.filter((p) => p.category === "RAM")
  const ramFiltered = wantsRGB ? ramPool.filter((p) => hasTag(p, "rgb")) : ramPool
  const ram = closestByPrice(ramFiltered.length ? ramFiltered : ramPool, budget * shares.ram)

  const allCases = BUILDER_PARTS.filter((p) => p.category === "PC Case")
  let casePool = allCases
  if (wantsCompact) casePool = allCases.filter((p) => hasTag(p, "compact"))
  else if (wantsQuiet) casePool = allCases.filter((p) => hasTag(p, "quiet"))
  else if (wantsRGB) casePool = allCases.filter((p) => hasTag(p, "rgb"))
  const pcCase = closestByPrice(casePool.length ? casePool : allCases, budget * shares.case)

  const allCoolers = BUILDER_PARTS.filter((p) => p.category === "Cooling")
  let coolingPool = allCoolers
  if (wantsQuiet) coolingPool = allCoolers.filter((p) => hasTag(p, "quiet"))
  else if (wantsRGB) coolingPool = allCoolers.filter((p) => hasTag(p, "rgb"))
  const cooling = closestByPrice(coolingPool.length ? coolingPool : allCoolers, budget * shares.cooling)

  const picks = [pcCase, mobo, cpu, gpu, ram, cooling]
  const total = picks.reduce((sum, p) => sum + parsePrice(p.price), 0)

  const resDesc = wants4K ? "4K" : wants1440 ? "1440p" : "1080p"
  const useDesc = isCreator ? "gaming and content creation" : "gaming"

  let budgetNote = ""
  if (total > budget * 1.05) {
    budgetNote = ` — about $${Math.round(total - budget).toLocaleString()} over your $${budget.toLocaleString()} target`
  } else if (total < budget * 0.85) {
    budgetNote = ` — comfortably under your $${budget.toLocaleString()} budget, with room to upgrade`
  }

  const summary = `For ${useDesc} at ${resDesc} around a $${budget.toLocaleString()} budget, I'd pair the ${cpu.name} with the ${gpu.name} — that combo won't bottleneck at ${resDesc}. Total comes to $${total.toLocaleString()}${budgetNote}.`

  return { picks, total, summary }
}
