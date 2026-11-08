# Project History

The complete record of Komponent's development: 20 commits between 13 and 18 September 2026, all times UTC+7. The project went from a browser-only prototype to a deployed AI advisor in just over four days.

**How to read this.** Each entry gives a descriptive title, the original commit message exactly as it appears in git, and an account of the change based on the diff. Several original messages are brief, so the title and description say what they actually contain. Git history itself has not been altered. Where the reason for a change wasn't recorded in a commit message or code comment, the entry marks it as *inferred*.

| Phase | Dates | Commits | Outcome |
|---|---|---|---|
| [1. Foundation](#phase-1-foundation) | 13 Sep | 1 | Storefront with a rule-based recommender |
| [2. AI backend](#phase-2-ai-backend) | 14 Sep | 1 | Real API, database and LLM |
| [3. Shipping to Vercel](#phase-3-shipping-to-vercel) | 14 Sep | 3 | Working serverless deployment |
| [4. Mobile and reports](#phase-4-mobile-and-reports) | 14–15 Sep | 4 | Responsive UI, AI report, PDF export |
| [5. Recommendation quality](#phase-5-recommendation-quality) | 15–17 Sep | 5 | Code-enforced correctness around the LLM |
| [6. Brand and local market](#phase-6-brand-and-local-market) | 17–18 Sep | 6 | Komponent brand, real Cambodian prices |

---

## Phase 1: Foundation

### 1. Build the storefront and a client-side recommender

`b650452` · 13 Sep 2026, 20:49 · 15 files, +4,985 · Original message: "1st Phase of Building"

Created the React, TypeScript and Vite application: the marketing storefront, a component catalog with product modals, and the first Custom PC Builder.

The first recommender was deliberately not an LLM. With no backend to hold an API key safely, `src/lib/recommend.ts` split the budget proportionally across categories and picked the closest-priced part, filtering for socket compatibility and keywords such as "quiet" or "RGB". The proportional-budget idea survives in the current system.

---

## Phase 2: AI backend

### 2. Add the Express API, SQLite catalog and Gemini chat

`bc9665b` · 14 Sep 2026, 01:00 · 13 files, +2,925 / −1,104 · Original message: "2nd phase of ai chatbot"

Replaced the client-side matcher with a real backend:

- **Catalog:** `server/seed.js` built a SQLite database from a public PCPartPicker dataset, restricted to modern sockets (AM4, AM5, LGA1700, LGA1851).
- **Price calibration:** that dataset's prices stopped updating in July 2025, so each category received a multiplier calibrated against September 2026 prices, such as 3.0× for RAM and 1.4× for GPUs.
- **LLM:** `/api/build-chat` sends Gemini a price-appropriate shortlist and requires structured JSON back. The model may only reference catalog ids.
- **Instant checks:** `/api/bottleneck` and `/api/fps-estimate` work without a model call, so they can run after each manual swap.
- **FPS data:** `server/benchmarks.js` holds benchmark anchors curated from published reviews.
- **Trust boundary:** the model's reply may not name specific CPUs or GPUs. Verified names are appended by code instead.

Removed `src/data/builderParts.ts` and `src/lib/recommend.ts`, now superseded.

---

## Phase 3: Shipping to Vercel

Three commits in 15 minutes, each fixing the failure revealed by the previous deployment.

### 3. Make the backend deployable as a serverless function

`102939b` · 14 Sep 2026, 01:09 · 8 files, +422 / −377

> Original message: "Make backend deployable on Vercel"

Moved the Express app into `server/app.js`, exported without a `listen` call, so a serverless function can run it directly while `server/index.js` stays as the local entry point. Replaced the experimental `node:sqlite` built-in with `better-sqlite3`, which is reliably available on Vercel's managed runtime. Added `vercel.json` to bundle the database with the function.

### 4. Commit the database so it exists at deploy time

`8b2ae9d` · 14 Sep 2026, 01:18 · 2 files, database added (1.2 MB)

> Original message: "Commit the seeded parts.db so it actually deploys"

Every request was failing with `FUNCTION_INVOCATION_FAILED`. Vercel builds from the git repository, so a gitignored file never reaches it, and `includeFiles` can only bundle a file that's present. `db.js` threw at import time as a result. The generated database is now committed.

### 5. Resolve the bracket-glob collision in Vercel config

`65c1d4d` · 14 Sep 2026, 01:24 · 3 files, +12 / −8

> Original message: "Fix includeFiles never applying due to bracket-glob collision"

Logs still showed the database missing after the previous fix. Keys in `vercel.json`'s `functions` block are glob patterns, so the literal brackets in `api/[...slug].js` were read as a character class and `includeFiles` silently matched nothing. Renamed the function to `api/index.js` and added an explicit `/api/:path*` rewrite.

---

## Phase 4: Mobile and reports

### 6. Make the site responsive

`2480a28` · 14 Sep 2026, 01:45 · 2 files, +92 / −14 · Original message: "frontend for mobile"

Added a mobile hamburger menu that closes on Escape and exposes the same navigation as desktop, with `aria-label` and `aria-expanded` set. Added smaller headline sizes and tighter side padding on small screens across every section.

### 7. Add an AI build report with live web research

`48151ae` · 14 Sep 2026, 21:58 · 3 files, +183 / −2 · Original message: "report ai"

Added `POST /api/build-report`, which writes a section on each part covering fit, real-world reliability, pros and cons. It uses Gemini's Google Search tool because reports are generated on request, so the extra cost is justified. Search grounding has a smaller quota, so the endpoint falls back to an ungrounded call and reports which one was used through a `grounded` flag.

### 8. Add PDF export and interface animation

`dde48d3` · 14 Sep 2026, 22:25 · 6 files, +691 / −140 · Original message: "ai report pdf + download"

Added report download with jsPDF, including a build summary table, a total and automatic pagination. One parser now serves both the on-screen report and the PDF, so the two can't disagree on sections. Added a "How It All Works Together" section that evaluates the parts as a system. Introduced Framer Motion for button, modal and message animation.

### 9. Redesign the chat panel

`94a388e` · 15 Sep 2026, 21:04 · 1 file, +23 / −1 · Original message: "chatbox ui"

Gave the assistant a clearly identifiable panel: dark header, chat icon, "Build Assistant" title, animated online indicator, stronger border and shadow.

---

## Phase 5: Recommendation quality

The system worked, but builds were sometimes wrong in ways a prompt couldn't reliably prevent. This phase moved correctness out of the prompt and into code.

### 10. Merge intent extraction and part selection into one model call

`dfbfd04` · 15 Sep 2026, 22:23 · 2 files, +73 / −74 · Original message: "fix for chatbot ui issue"

Previously each message took two Gemini calls: one to extract budget and preferences, another to choose parts. Merged them into a single structured response and added `getCandidatesSpread`, a shortlist sampled evenly across each category's price range, since the budget is no longer known before the call. Although the original message refers to the UI, the change is entirely in the backend. Reducing per-message latency and cost is *inferred* as the motivation.

### 11. Restore budget-aware shortlists

`e985b38` · 15 Sep 2026, 22:28 · 1 file, +37 / −6 · Original message: "correct pricing"

The previous change introduced a regression: with no budget guiding the shortlist, the model produced mismatched pairs such as a $74 CPU with a $965 GPU. Added `roughBudgetGuess`, a small local parser used only to shape the shortlist. The evenly sampled list remains the fallback when no dollar amount is present.

### 12. Add code-enforced compatibility, balance and budget guards

`9e433a8` · 17 Sep 2026, 18:40 · 2 files, +276 / −3 · Original message: "test ain tuning"

The most important commit for recommendation quality. Added four corrections that run after the model responds:

- CPU and motherboard socket mismatch is repaired.
- `fixRamGeneration` replaces RAM of the wrong DDR generation.
- `fixBottleneck` upgrades the weaker of a mismatched CPU and GPU when the budget allows.
- `enforceBudget` downgrades one category at a time, least important first.

Also filtered DDR2 and DDR3 kits out of RAM shortlists, since no socket in the catalog can use them.

### 13. Stop inventing a build when the assistant is only asking a question

`15bc0f7` · 17 Sep 2026, 20:47 · 1 file, +11 / −5 · Original message: "tuning"

Empty picks mean the model is deliberately asking for more information. The backfill step was treating that as "every category missing", which turned a simple "hi" into a random full build. Backfill now runs only when at least one part was picked.

### 14. Add owned parts, brand preferences and computed trade-offs

`5a1db71` · 17 Sep 2026, 22:02 · 3 files, +325 / −22 · Original message: "Site update"

The assistant now reads use case, already-owned categories, and preferred or excluded brands, and leaves owned categories out of the build. `applyBrandPreference` biases every substitute the code selects. `buildTradeOffs` adds upgrade, reallocation and CPU/GPU balance notes generated from catalog data, and `isRealUpgrade` prevents a pricier but worse part from being recommended as an upgrade.

---

## Phase 6: Brand and local market

### 15. Rename the product from forge. to Komponent

`f2ff212` · 17 Sep 2026, 22:08 · 3 files, +6 / −6 · Original message: "Polish"

Replaced the old name throughout the page title, navigation, footer and builder.

### 16. Add the logo mark and remove the Q9 cases

`3e12f6b` · 17 Sep 2026, 22:29 · 3 files, +14 / −35 · Original message: "removed q9"

Added `IconLogoMark`, an SVG sparkle that inherits the surrounding text color, to the navigation and footer. Removed the Q9 Elite and Q9 Flow cases from the storefront catalog.

### 17. Replace estimated prices with real Cambodian retailer listings

`3b20a85` · 18 Sep 2026, 00:55 · 6 files, +857 / −288 · Original message: "Local and accurate pricing"

The largest product change after the initial backend. Replaced the global dataset and its price multipliers with real listings from two retailers in Cambodia, reducing the catalog from 6,170 estimated entries to 533 actual listings.

- Per-retailer prices are stored, and the interface shows real ranges.
- Motherboards now carry their real memory type, which finally made LGA1700 boards checkable.
- `enforceBudget` gained per-category floors and now takes the mildest sufficient cut (`pickSufficientCut`).
- Ids the model returned from outside its shortlist are now discarded.
- The assistant can answer general PC questions without steering toward a build.

### 18. Rename the builder navigation link

`754bc99` · 18 Sep 2026, 02:16 · 1 file, +43 / −43 · Original message: "Komponent AI tab"

Changed the navigation label from "Gaming PCs" to "Komponent AI" and reformatted the mobile menu. The click handlers still compared against the old label, so the link stopped opening the builder.

### 19. Revert the label to restore navigation

`0e1bc36` · 18 Sep 2026, 02:29 · 1 file, +1 / −1 · Original message: "normal"

Returned the label to "Gaming PCs", making the link work again.

### 20. Complete the Komponent AI rename

`b73d6db` · 18 Sep 2026, 02:33 · 1 file, +4 / −4 · Original message: "Komponent UI"

Renamed the label and every place that depends on it: desktop handler, mobile handler and footer. The rename was now consistent and the link worked.
