import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'
import { getCandidates, getCandidatesSpread, getPartsByIds, getAlternatives, getPricePercentile } from './db.js'
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
        'Catalog ids for the recommended build, one per decided category. Leave empty while still asking clarifying questions.',
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
  },
  required: ['reply', 'picks', 'budget', 'platform', 'tag', 'resolution'],
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
If the user's latest message is a QUESTION about this current build (e.g. "does this cause a bottleneck", "is this good for X", "what do you think") rather than a request to change something, return the EXACT SAME ids as the current build in "picks" — do not silently swap any part, even if you'd have picked differently yourself. Only change the specific part(s) the user explicitly asks to change, keeping every other category identical to the current build.`
    : ''

  const systemInstruction = `You are the build assistant for a PC parts store's "Custom PC Builder" chat.
Recommend a complete build using ONLY parts from the catalog below, referenced by their exact "id" — never invent parts, names, or specs.
A complete build has exactly one pick from each of these categories: ${BUILD_CATEGORIES.join(', ')}.
The CPU and Motherboard you pick must have matching "socket" values.
Ask a short clarifying question (and return an empty "picks" array) if the user hasn't given you enough to work with yet — a budget and a use case (e.g. gaming resolution, streaming, editing) is enough to proceed.
Once you have enough information, always return a full set of picks (one id per category) in the same response as your reply — don't describe the build in prose without also returning the picks.
Keep replies short (2-4 sentences), friendly, and specific about why the parts fit the stated budget and use case — cite at least one concrete spec from the catalog that matters for that use case (e.g. core count and RAM for video editing/rendering, VRAM and clock speed for gaming, upload-friendly cooling and storage speed for streaming), not just generic praise like "powerful" or "great performance."
Do NOT name a specific CPU or GPU model in your reply text (e.g. don't write "the Core Ultra 9 285K" or "the RTX 5090") — only describe them generically ("the processor", "the graphics card"). The exact part names are shown separately in the UI and will be appended automatically; naming one yourself risks describing a different part than the one you actually picked.${currentBuildNote}

Also read the user's budget, platform preference, aesthetic/acoustic tag, and target resolution out of the conversation so far, and return them in "budget"/"platform"/"tag"/"resolution" — interpret natural, flexible phrasing generously (e.g. "no budget"/"money is no object" → a generous but sensible figure like 3500; budget-conscious framing with no number → a modest default like 1200; budget 0 only if the conversation gives no signal at all about spending).

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

    let picks = getPartsByIds(parsed.picks ?? [])

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
    // renders once picks are non-empty.
    for (const category of BUILD_CATEGORIES) {
      if (picks.some((p) => p.category === category)) continue
      const fallback = candidates.find((c) => c.category === category)
      if (fallback) picks.push(fallback)
    }

    const bottleneck = picks.length ? detectBottleneck(picks, resolution) : null

    // The model's free-text reply is instructed not to name specific
    // CPU/GPU models (see system prompt) since that's proven unreliable —
    // append the real names here instead, guaranteed to match what's
    // actually in `picks` rather than whatever the model imagined.
    let reply = parsed.reply
    if (picks.length) {
      const cpu = picks.find((p) => p.category === 'CPU')
      const gpu = picks.find((p) => p.category === 'GPU')
      if (cpu && gpu) reply += ` This build pairs the ${cpu.name} with the ${gpu.name}.`
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
