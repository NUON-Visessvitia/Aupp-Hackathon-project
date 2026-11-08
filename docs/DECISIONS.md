# Decision Log

The main technical decisions behind Komponent, in the style of architecture decision records. Each cites the commit where it can be checked; see the [project history](PROJECT_HISTORY.md) for the full timeline.

**Sources.** Context and reasoning come from commit messages, code comments and diffs. Where an alternative was actually built and later replaced, the entry says so. Reasoning that wasn't written down at the time is marked *inferred*.

| # | Decision | Status |
|---|---|---|
| 1 | [Verify LLM output in code](#1-verify-llm-output-in-code-rather-than-trusting-the-prompt) | Active |
| 2 | [Separate the Express app from its listener](#2-separate-the-express-app-from-its-listener) | Active |
| 3 | [Use better-sqlite3](#3-use-better-sqlite3-instead-of-nodesqlite) | Active |
| 4 | [Commit the generated database](#4-commit-the-generated-database) | Active |
| 5 | [Use a plain function filename](#5-use-a-plain-function-filename-and-an-explicit-rewrite) | Active |
| 6 | [One model call per message](#6-combine-intent-extraction-and-part-selection-into-one-model-call) | Active |
| 7 | [Local budget guess for shortlists](#7-use-a-local-budget-guess-only-to-shape-the-shortlist) | Active |
| 8 | [Keep product names out of model text](#8-keep-specific-product-names-out-of-model-written-text) | Active |
| 9 | [Price percentile as performance proxy](#9-use-price-percentile-as-a-performance-proxy-with-limits) | Active, known limitation |
| 10 | [Budget enforcement rules](#10-enforce-budget-by-ordered-limited-downgrades) | Active |
| 11 | [Don't guess unknown compatibility](#11-leave-unknown-compatibility-unconstrained) | Active, refined |
| 12 | [Search grounding only for reports](#12-use-search-grounding-only-for-on-demand-reports) | Active |
| 13 | [Curated FPS anchors](#13-estimate-fps-from-curated-anchors) | Active, known limitation |
| 14 | [Real local listings](#14-replace-the-global-dataset-with-real-local-listings) | Active, replaced earlier approach |

---

## 1. Verify LLM output in code rather than trusting the prompt

**Context.** The system prompt told the model to match sockets, use the right memory, balance CPU and GPU, respect the budget and pick only from the shortlist. It still occasionally returned incompatible builds, duplicate categories and ids that weren't on the shortlist.

**Decision.** Treat the model's picks as a proposal. A fixed pipeline then discards off-list ids, removes duplicates, fills gaps, and corrects socket, memory, balance and budget. Anything that doesn't need judgment, such as the bottleneck check and FPS lookup, doesn't call the model at all.

**Alternative.** Keep strengthening the prompt. The prompt already contained these rules when the failures occurred.

**Consequences.** A CPU and motherboard mismatch can't reach the user when a compatible replacement exists. The cost is more application code and rules that need maintaining. Instant, model-free checks also make it practical to re-evaluate after each swap.

**Evidence.** `bc9665b`, `9e433a8`, `3b20a85`; `server/app.js`

## 2. Separate the Express app from its listener

**Context.** Local development needs a long-running server. Vercel needs an exported handler and never calls `listen`.

**Decision.** `server/app.js` defines and exports the app. `server/index.js` and `api/index.js` are thin entry points for each environment.

**Consequences.** One set of routes runs everywhere, with no separate serverless version to keep in sync.

**Evidence.** `102939b`

## 3. Use better-sqlite3 instead of node:sqlite

**Context.** The first version used Node's built-in `node:sqlite`, which was new, experimental and not reliably available on Vercel's managed runtime.

**Decision.** Switch to `better-sqlite3`, a widely used native module that Vercel can build.

**Alternative.** `node:sqlite` was built first and replaced.

**Consequences.** Reliable deployment, at the cost of a native dependency.

**Evidence.** `102939b`

## 4. Commit the generated database

**Context.** Generated files normally stay out of git, but Vercel builds directly from the repository. With `parts.db` ignored, the file didn't exist in the build, and every request failed with `FUNCTION_INVOCATION_FAILED`.

**Decision.** Commit the database and open it read-only at runtime.

**Alternative.** A hosted database. *Inferred* as unnecessary here, because the catalog is small (about 1.2 MB) and never changes while serving requests.

**Consequences.** No database service to run or pay for, and queries are local. Catalog updates require a new commit and deployment, and each update adds a binary file to git history.

**Evidence.** `8b2ae9d`

## 5. Use a plain function filename and an explicit rewrite

**Context.** Vercel's `functions` keys are matched as glob patterns. The square brackets in `api/[...slug].js` were interpreted as a character class, so `includeFiles` silently matched nothing.

**Decision.** Name the function `api/index.js` and route to it with a `/api/:path*` rewrite. Express does its own routing from the original URL.

**Alternative.** The bracket catch-all convention was built first and replaced.

**Consequences.** Configuration now applies predictably, and a code comment records why the convention isn't used.

**Evidence.** `65c1d4d`

## 6. Combine intent extraction and part selection into one model call

**Context.** Each message originally took two calls: one to read the budget and preferences, then a second to choose parts from a shortlist built around that budget.

**Decision.** Use one structured response containing the reply, picks and all extracted fields.

**Alternative.** The two-call design was built first and replaced.

**Consequences.** Half the model calls per message. Lower latency and cost are *inferred* as the goal. It also created a problem, because the budget is no longer known when the shortlist is built. See decision 7.

**Evidence.** `dfbfd04`

## 7. Use a local budget guess only to shape the shortlist

**Context.** An evenly spread shortlist produced mismatched builds such as a $74 CPU with a $965 GPU.

**Decision.** Run a small local parser before the model call to find a dollar amount, and use it to center each category's shortlist on a share of the budget (32% GPU, 18% CPU, and so on). It requires a `$` next to the number, so "4K" and "1440p" aren't read as money. The budget shown to the user still comes from the model. With no dollar amount, the even spread is used.

**Consequences.** This restores sensible pairings while keeping the single call. Regex is acceptable here because a wrong guess only affects which parts are offered. The model and the budget guard still see the real budget.

**Evidence.** `e985b38`

## 8. Keep specific product names out of model-written text

**Context.** A chat reply could name a part that differs from what's actually in the build, or describe an upgrade that doesn't exist at that price.

**Decision.** The prompt forbids naming specific CPU and GPU models. Code appends the true names from the final build, along with computed trade-off scenarios.

**Consequences.** The explanation always matches the build shown, even after later correction steps replace a part.

**Evidence.** `bc9665b`, `5a1db71`

## 9. Use price percentile as a performance proxy, with limits

**Context.** Detecting CPU and GPU imbalance needs a performance measure, but no benchmark data covers the whole catalog.

**Decision.** Compare each part's price percentile within its category, with stricter thresholds where CPUs matter more: a gap of 0.25 at 1080p, 0.35 at 1440p and 0.5 at 4K. Because price doesn't always reflect performance, `isRealUpgrade` requires a recommended upgrade not to reduce VRAM or core count, and GPUs must remain in the same family with no lower model number.

**Consequences.** Simple, instant and available for every part. It is a heuristic and is described as one: suitable for catching an obvious mismatch, not for measuring a bottleneck precisely.

**Evidence.** `bc9665b`, `5a1db71`

## 10. Enforce budget by ordered, limited downgrades

**Context.** Shortlists cluster near the budget but don't cap it, so several reasonable parts can add up to too much.

**Decision.** Allow 10% over budget, matching the interface's warning. Beyond that, downgrade in this order: cooling, case, storage, power supply, RAM, motherboard, CPU, GPU. Choose the mildest cut that closes the gap. Never go below half of a category's normal budget share, and preserve socket and memory compatibility.

**Alternative.** The first version downgraded to the cheapest compatible option, which could gut one category unnecessarily. It was refined in `3b20a85`.

**Consequences.** Performance parts are protected. If the floors can't close the gap, the build stays slightly over budget and the interface says so, which was judged better than a $700 GPU next to a $20 SSD.

**Evidence.** `9e433a8`, `3b20a85`

## 11. Leave unknown compatibility unconstrained

**Context.** Memory type can be derived from most sockets, but LGA1700 boards exist in both DDR4 and DDR5 versions, and the original dataset didn't say which.

**Decision.** Don't enforce a rule without the data to support it: a wrong constraint is worse than none. Once real listings provided each board's memory type, use that first and fall back to the socket only when it's missing.

**Consequences.** LGA1700 was initially unchecked, which was an accepted gap. Real listing data closed it for boards that state their memory type.

**Evidence.** `9e433a8`, `3b20a85`

## 12. Use search grounding only for on-demand reports

**Context.** Search grounding gives current information, but it has a smaller quota and can't be combined with JSON schema output.

**Decision.** Don't use it in chat, where structured output is essential and calls are frequent. Use it for the report, which is requested deliberately and is free text. If grounding fails, fall back to an ungrounded call and return `grounded: false`.

**Consequences.** Reports still work when the quota runs out. The prompt asks the model to say when it relied on general knowledge rather than something it found.

**Evidence.** `48151ae`

## 13. Estimate FPS from curated anchors

**Context.** No available database covers every GPU against every game.

**Decision.** Hand-curate 10 anchor GPUs across 5 games and 3 resolutions from published benchmarks, and label in the source which values are sourced and which are interpolated. Other GPUs use the nearest anchor by price tier and are flagged `approximate`. CPU-limited builds get a 15% reduction in the three esports titles, where the CPU matters most.

**Consequences.** Useful guidance without a benchmark service. These are estimates, not measurements, and the anchors need updating as new hardware appears.

**Evidence.** `bc9665b`; `server/benchmarks.js`

## 14. Replace the global dataset with real local listings

**Context.** The original catalog had 6,170 entries from a global dataset whose prices stopped updating in July 2025, adjusted by per-category multipliers. It was large, but its prices were estimates and didn't reflect what a buyer in Cambodia would pay.

**Decision.** Rebuild the catalog from real listings at two Cambodian retailers, keeping each retailer's price. The average is the single price used for budget math, and the interface shows the true range where they differ.

**Alternative.** The global dataset with multipliers was built first and replaced.

**Consequences.** The catalog shrank to 533 parts, but every entry is a real listing with a real local price, and listings added useful data such as memory type. It remains a snapshot from 2026-09-18 that must be refreshed by re-scraping.

**Evidence.** `bc9665b` (original approach), `3b20a85` (replacement)
