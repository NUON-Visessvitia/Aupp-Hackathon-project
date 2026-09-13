// Curated FPS anchors from real published benchmarks (web research, Sept
// 2026) — there's no benchmark database covering every one of the ~600 GPUs
// in the catalog against every game, so (same approach as the price
// multipliers in seed.js) a handful of real anchor GPUs are hand-sourced and
// anything else is estimated from the nearest one. Settings baseline: High/
// Ultra preset, native resolution, ray tracing + DLSS/FSR off, unless the
// title has no such option (the esports titles below are effectively always
// GPU-uncapped at these settings). Numbers directly from a cited benchmark
// are "sourced"; numbers not directly found are interpolated between the
// nearest sourced anchors for that game (documented inline) — both are
// estimates, not measurements of this exact system.
//
// Sources: EveZone/TechPowerUp/GamersNexus/HowManyFPS/Notebookcheck/
// TechSpot/Tom's Hardware benchmark roundups and pc-builds.com FPS data,
// cross-checked against each other. Skipped low-effort "FPS calculator"
// sites where a number looked implausible against other sources.

export const FPS_BENCHMARKS = {
  'GeForce RTX 5090': {
    'Cyberpunk 2077': { '1080p': 165, '1440p': 127, '4K': 98 }, // sourced (EveZone/TechPowerUp)
    'Counter-Strike 2': { '1080p': 700, '1440p': 634, '4K': 430 }, // sourced
    Valorant: { '1080p': 380, '1440p': 320, '4K': 280 }, // sourced (4K figure), 1080p/1440p interpolated
    Fortnite: { '1080p': 430, '1440p': 380, '4K': 310 }, // sourced (4K), rest interpolated
    'GTA Online': { '1080p': 320, '1440p': 230, '4K': 150 }, // interpolated above RTX 5070 Ti anchor
  },
  'GeForce RTX 5080': {
    'Cyberpunk 2077': { '1080p': 145, '1440p': 109, '4K': 77 }, // sourced (GamersNexus/EveZone)
    'Counter-Strike 2': { '1080p': 450, '1440p': 384, '4K': 215 }, // sourced (1440p/4K)
    Valorant: { '1080p': 360, '1440p': 300, '4K': 260 }, // interpolated (reported faster than RTX 4090/4080S)
    Fortnite: { '1080p': 330, '1440p': 290, '4K': 235 }, // interpolated from 5090 gap (~43% avg uplift 5090 over 5080)
    'GTA Online': { '1080p': 290, '1440p': 205, '4K': 130 }, // interpolated
  },
  'GeForce RTX 5070 Ti': {
    'Cyberpunk 2077': { '1080p': 165, '1440p': 110, '4K': 78 }, // sourced (EveZone)
    'Counter-Strike 2': { '1080p': 380, '1440p': 320, '4K': 180 }, // interpolated between 5080/5070
    Valorant: { '1080p': 340, '1440p': 280, '4K': 220 }, // interpolated
    Fortnite: { '1080p': 260, '1440p': 200, '4K': 140 }, // interpolated between 5080/5070
    'GTA Online': { '1080p': 248, '1440p': 167, '4K': 96 }, // sourced (dropreference/gamegpu roundup)
  },
  'GeForce RTX 5070': {
    'Cyberpunk 2077': { '1080p': 145, '1440p': 95, '4K': 62 }, // interpolated between 5070 Ti/5060 Ti
    'Counter-Strike 2': { '1080p': 320, '1440p': 270, '4K': 150 }, // interpolated
    Valorant: { '1080p': 320, '1440p': 260, '4K': 200 }, // interpolated
    Fortnite: { '1080p': 210, '1440p': 160, '4K': 110 }, // sourced (techbenchpro range midpoint)
    'GTA Online': { '1080p': 220, '1440p': 150, '4K': 85 }, // interpolated
  },
  'GeForce RTX 5060 Ti': {
    'Cyberpunk 2077': { '1080p': 105, '1440p': 85, '4K': 58 }, // sourced (Hyper Cyber)
    'Counter-Strike 2': { '1080p': 260, '1440p': 210, '4K': 115 }, // interpolated
    Valorant: { '1080p': 300, '1440p': 240, '4K': 180 }, // interpolated
    Fortnite: { '1080p': 190, '1440p': 145, '4K': 95 }, // interpolated between 5070/5060
    'GTA Online': { '1080p': 170, '1440p': 115, '4K': 65 }, // interpolated
  },
  'GeForce RTX 5060': {
    'Cyberpunk 2077': { '1080p': 90, '1440p': 70, '4K': 48 }, // interpolated below 5060 Ti
    'Counter-Strike 2': { '1080p': 220, '1440p': 175, '4K': 95 }, // interpolated
    Valorant: { '1080p': 280, '1440p': 220, '4K': 160 }, // interpolated
    Fortnite: { '1080p': 188, '1440p': 140, '4K': 90 }, // sourced (HowManyFPS, w/ i5-14400F)
    'GTA Online': { '1080p': 150, '1440p': 100, '4K': 58 }, // interpolated
  },
  'Radeon RX 9070 XT': {
    'Cyberpunk 2077': { '1080p': 140, '1440p': 101, '4K': 60 }, // sourced (Notebookcheck/EveZone)
    'Counter-Strike 2': { '1080p': 370, '1440p': 310, '4K': 175 }, // interpolated, tier-matched to RTX 5070 Ti
    Valorant: { '1080p': 330, '1440p': 270, '4K': 210 }, // interpolated
    Fortnite: { '1080p': 250, '1440p': 195, '4K': 135 }, // interpolated
    'GTA Online': { '1080p': 240, '1440p': 160, '4K': 92 }, // interpolated
  },
  'Radeon RX 9060 XT': {
    'Cyberpunk 2077': { '1080p': 95, '1440p': 75, '4K': 50 }, // interpolated, tier-matched to RTX 5060/5060 Ti
    'Counter-Strike 2': { '1080p': 230, '1440p': 185, '4K': 100 }, // interpolated
    Valorant: { '1080p': 290, '1440p': 230, '4K': 170 }, // interpolated
    Fortnite: { '1080p': 185, '1440p': 140, '4K': 90 }, // interpolated
    'GTA Online': { '1080p': 165, '1440p': 112, '4K': 63 }, // interpolated
  },
  'GeForce RTX 3060': {
    'Cyberpunk 2077': { '1080p': 60, '1440p': 40, '4K': 22 }, // sourced 1080p (GPUCheck), rest interpolated
    'Counter-Strike 2': { '1080p': 90, '1440p': 65, '4K': 38 }, // adjusted from a sourced Ultra-preset figure to this table's High-preset baseline
    Valorant: { '1080p': 275, '1440p': 180, '4K': 110 }, // sourced (EveZone range midpoint)
    Fortnite: { '1080p': 146, '1440p': 93, '4K': 55 }, // sourced (pc-builds.com, w/ Ryzen 5 5500)
    'GTA Online': { '1080p': 126, '1440p': 85, '4K': 49 }, // sourced (dropreference/gamegpu, w/ Ryzen 5 5500)
  },
  'GeForce GTX 1660 SUPER': {
    'Cyberpunk 2077': { '1080p': 45, '1440p': 30, '4K': 16 }, // sourced 1080p (close variant GTX 1660 Ti), rest interpolated
    'Counter-Strike 2': { '1080p': 70, '1440p': 50, '4K': 28 }, // interpolated below RTX 3060
    Valorant: { '1080p': 200, '1440p': 140, '4K': 80 }, // interpolated
    Fortnite: { '1080p': 95, '1440p': 65, '4K': 35 }, // interpolated
    'GTA Online': { '1080p': 97, '1440p': 65, '4K': 38 }, // sourced (dropreference/gamegpu, w/ Ryzen 5 5500)
  },
}

export const BENCHMARK_GAMES = ['Cyberpunk 2077', 'Counter-Strike 2', 'Valorant', 'Fortnite', 'GTA Online']

// Esports/live-service titles are the ones actually sensitive to CPU — a
// CPU-bound pairing (per detectBottleneck) gets a flat FPS haircut applied
// only to these, since Cyberpunk 2077/GTA Online at these settings are
// overwhelmingly GPU-bound regardless of CPU tier.
const CPU_SENSITIVE_GAMES = new Set(['Counter-Strike 2', 'Valorant', 'Fortnite'])
const CPU_BOUND_PENALTY = 0.85

// Rough relative tier position (0=cheapest/weakest, 1=priciest/strongest)
// for the anchor set itself — approximated from real-world street pricing at
// the time these anchors were curated (not queried live). Used to find the
// nearest anchor when the actual picked GPU isn't one of them, by comparing
// against that GPU's own price-percentile within the full GPU category.
const ANCHOR_TIER_ORDER = {
  'GeForce GTX 1660 SUPER': 0.05,
  'GeForce RTX 3060': 0.15,
  'Radeon RX 9060 XT': 0.3,
  'GeForce RTX 5060': 0.32,
  'GeForce RTX 5060 Ti': 0.4,
  'GeForce RTX 5070': 0.55,
  'Radeon RX 9070 XT': 0.62,
  'GeForce RTX 5070 Ti': 0.7,
  'GeForce RTX 5080': 0.85,
  'GeForce RTX 5090': 1.0,
}

// The raw "Chipset" spec often carries a trailing memory-size suffix (e.g.
// "GeForce RTX 3060 12GB", "GeForce RTX 3080 10GB LHR") that the anchor keys
// above don't have — strip it before comparing, or an exact-anchor GPU would
// wrongly fall through to the nearest-tier estimate every time.
function normalizeChipset(chipset) {
  return chipset?.replace(/\s*\d+\s*GB(\s+LHR)?$/i, '').trim() ?? null
}

function nearestAnchorByTier(percentile) {
  let closest = null
  let closestDist = Infinity
  for (const [name, tier] of Object.entries(ANCHOR_TIER_ORDER)) {
    const dist = Math.abs(tier - percentile)
    if (dist < closestDist) {
      closestDist = dist
      closest = name
    }
  }
  return closest
}

/**
 * Estimates FPS across the curated game list for a given CPU/GPU pair.
 * `gpuChipset` is the exact "Chipset" spec value (e.g. "GeForce RTX 5090").
 * `gpuPercentile` is the GPU's own price-percentile within its category
 * (from `db.js`'s `getPricePercentile('GPU', price)`), used to find the
 * nearest anchor by tier when there's no exact chipset match. `isCpuBound`
 * should be true when `detectBottleneck` already flagged this pair as
 * CPU-limited, to apply the esports-title penalty.
 */
export function estimateFps({ gpuChipset, gpuPercentile, resolution, isCpuBound }) {
  const normalized = normalizeChipset(gpuChipset)
  const anchorName = FPS_BENCHMARKS[normalized] ? normalized : nearestAnchorByTier(gpuPercentile)
  const approximate = anchorName !== normalized

  const table = FPS_BENCHMARKS[anchorName]
  if (!table) return []

  return BENCHMARK_GAMES.map((game) => {
    const byRes = table[game]
    let fps = byRes?.[resolution] ?? byRes?.['1440p'] ?? null
    if (fps != null && isCpuBound && CPU_SENSITIVE_GAMES.has(game)) {
      fps = Math.round(fps * CPU_BOUND_PENALTY)
    }
    return { game, fps, approximate }
  }).filter((e) => e.fps != null)
}
