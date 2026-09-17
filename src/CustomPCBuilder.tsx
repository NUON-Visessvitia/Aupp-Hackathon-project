import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { jsPDF } from 'jspdf'
import { OutlineButton, ProductModal, IconArrowRight } from './Shared'

/** Three pulsing dots for the "assistant is thinking" bubble — a small, obvious signal of life instead of a static "Thinking…" line. */
function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#BBBBBB]"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  )
}

const IconSwap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
)

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
)

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

const IconWarning = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.29 3.86-8.18 14.18A2 2 0 0 0 3.86 21h16.28a2 2 0 0 0 1.75-2.96L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" x2="12" y1="9" y2="13" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
  </svg>
)

const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
)

type ChatMessage = { role: 'user' | 'assistant'; text: string }

type BuilderCategory =
  | 'PC Case'
  | 'Motherboard'
  | 'CPU'
  | 'GPU'
  | 'RAM'
  | 'Cooling'
  | 'Storage'
  | 'Power Supply'

export type BuilderPart = {
  id: number
  name: string
  category: BuilderCategory
  price: string
  specs: [string, string][]
  platform?: 'AMD' | 'Intel'
  socket?: string
  tags?: string[]
}

type Bottleneck = { category: 'CPU' | 'GPU'; message: string }

type FpsEstimate = { game: string; fps: number; approximate: boolean }

type Recommendation = {
  picks: BuilderPart[]
  total: number
  bottleneck: Bottleneck | null
  budget: number | null
  resolution: string | null
  fpsEstimates: FpsEstimate[] | null
}

// A build rarely lands exactly on budget once real component prices are
// summed — 10% headroom before it's flagged as "over," not just "not exact."
const OVER_BUDGET_TOLERANCE = 1.1

const GREETING =
  "Hi! Tell me your budget and what you'll mainly use this PC for — gaming resolution, streaming, editing — and I'll put together a recommended build from our catalog."

const SUGGESTIONS = [
  '1440p gaming, budget $1500',
  '4K gaming, budget $3500',
  'Budget 1080p build under $800',
  'Streaming and gaming rig, $2500',
]

const ERROR_REPLY =
  "Sorry, something went wrong reaching the build assistant. Mind trying that again?"

function parsePrice(price: string): number {
  return Number(price.replace(/[^0-9.]/g, ''))
}

/** Pure deterministic math server-side — no LLM call, so this can run after every swap instead of only when a chat message happens to touch the build. */
async function fetchBottleneck(
  picks: BuilderPart[],
  resolution: string | null,
): Promise<Bottleneck | null> {
  const cpu = picks.find((p) => p.category === 'CPU')
  const gpu = picks.find((p) => p.category === 'GPU')
  if (!cpu || !gpu) return null

  const params = new URLSearchParams({ cpuId: String(cpu.id), gpuId: String(gpu.id) })
  if (resolution) params.set('resolution', resolution)

  try {
    const res = await fetch(`/api/bottleneck?${params}`)
    if (!res.ok) return null
    const data: { bottleneck: Bottleneck | null } = await res.json()
    return data.bottleneck
  } catch {
    return null
  }
}

/** Same reasoning as fetchBottleneck — pure server-side lookup, no LLM call, safe to re-run after every CPU/GPU swap. */
async function fetchFpsEstimates(
  picks: BuilderPart[],
  resolution: string | null,
): Promise<FpsEstimate[] | null> {
  const cpu = picks.find((p) => p.category === 'CPU')
  const gpu = picks.find((p) => p.category === 'GPU')
  if (!cpu || !gpu) return null

  const params = new URLSearchParams({ cpuId: String(cpu.id), gpuId: String(gpu.id) })
  if (resolution) params.set('resolution', resolution)

  try {
    const res = await fetch(`/api/fps-estimate?${params}`)
    if (!res.ok) return null
    const data: { estimates: FpsEstimate[] } = await res.json()
    return data.estimates
  } catch {
    return null
  }
}

/** The report is plain text with "## Section Title" headers — not real markdown, just enough structure to split into readable sections. Shared by the on-screen renderer and the PDF export so both agree on what a "section" is. */
function parseReportSections(text: string): { title: string; body: string }[] {
  return text
    .split(/\n(?=##\s)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((section) => {
      const [titleLine, ...rest] = section.replace(/^##\s*/, '').split('\n')
      return { title: titleLine.trim(), body: rest.join('\n').trim() }
    })
}

function renderReport(text: string) {
  return parseReportSections(text).map((section, i) => {
    return (
      <div key={i} className="mb-6 last:mb-0">
        <h3 className="text-[14px] font-semibold mb-2 pb-2 border-b border-[#E8E8E8]">
          {section.title}
        </h3>
        {section.body.split(/\n\n+/).map((para, j) => (
          <p key={j} className="text-[13px] text-[#555555] leading-[1.7] mb-2 last:mb-0">
            {para.trim()}
          </p>
        ))}
      </div>
    )
  })
}

function downloadReportPdf(reportText: string, picks: BuilderPart[], total: number) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - margin * 2
  let y = margin

  function ensureSpace(lineHeight: number) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Custom PC Build Report', margin, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(130)
  doc.text(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }), margin, y)
  y += 28
  doc.setTextColor(0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Build Summary', margin, y)
  y += 18

  doc.setFontSize(10)
  for (const p of picks) {
    const nameLines = doc.splitTextToSize(p.name, maxWidth - 180) as string[]
    const rowHeight = Math.max(16, nameLines.length * 12)
    ensureSpace(rowHeight)
    doc.setFont('helvetica', 'normal')
    doc.text(p.category, margin, y)
    doc.text(nameLines, margin + 100, y)
    doc.text(p.price, pageWidth - margin, y, { align: 'right' })
    y += rowHeight
  }
  y += 6
  ensureSpace(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Total', margin, y)
  doc.text(`$${total.toLocaleString()}`, pageWidth - margin, y, { align: 'right' })
  y += 32

  for (const section of parseReportSections(reportText)) {
    ensureSpace(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(section.title, margin, y)
    y += 18

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    for (const para of section.body.split(/\n\n+/)) {
      const lines = doc.splitTextToSize(para.trim(), maxWidth) as string[]
      for (const line of lines) {
        ensureSpace(14)
        doc.text(line, margin, y)
        y += 14
      }
      y += 8
    }
    y += 6
  }

  doc.save('pc-build-report.pdf')
}

export default function CustomPCBuilder({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: GREETING }])
  const [input, setInput] = useState('')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<BuilderPart | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [swapOpenFor, setSwapOpenFor] = useState<number | null>(null)
  const [swapQuery, setSwapQuery] = useState('')
  const [swapOptions, setSwapOptions] = useState<BuilderPart[]>([])
  const [swapLoading, setSwapLoading] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportText, setReportText] = useState<string | null>(null)
  const [reportGrounded, setReportGrounded] = useState(false)
  const [reportError, setReportError] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const swapRequestId = useRef(0)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading])

  // Debounced: fires immediately (0ms) when a new item's swap panel opens
  // (query is reset to ''), and after a short pause while typing a search.
  useEffect(() => {
    if (swapOpenFor === null || !recommendation) return
    const item = recommendation.picks[swapOpenFor]
    const requestId = ++swapRequestId.current
    setSwapLoading(true)

    const timeout = setTimeout(async () => {
      const params = new URLSearchParams({
        category: item.category,
        excludeId: String(item.id),
        near: String(parsePrice(item.price)),
      })
      if (swapQuery) params.set('query', swapQuery)
      if (item.category === 'CPU' || item.category === 'Motherboard') {
        const other = recommendation.picks.find((p) =>
          item.category === 'CPU' ? p.category === 'Motherboard' : p.category === 'CPU',
        )
        if (other?.socket) params.set('socket', other.socket)
      }

      try {
        const res = await fetch(`/api/parts/alternatives?${params}`)
        if (!res.ok) throw new Error('alternatives request failed')
        const data: { alternatives: BuilderPart[] } = await res.json()
        if (requestId === swapRequestId.current) setSwapOptions(data.alternatives)
      } catch {
        if (requestId === swapRequestId.current) setSwapOptions([])
      } finally {
        if (requestId === swapRequestId.current) setSwapLoading(false)
      }
    }, swapQuery ? 300 : 0)

    return () => clearTimeout(timeout)
    // recommendation is intentionally excluded — only swapOpenFor/swapQuery should retrigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapOpenFor, swapQuery])

  async function handleSend(rawText: string) {
    const text = rawText.trim()
    if (!text || isLoading) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text }]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/build-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.text })),
          // So a follow-up question ("does this cause a bottleneck?") can be
          // answered about the build actually on screen — including any
          // manual swaps — instead of silently generating a new one.
          currentPicks: recommendation?.picks.map((p) => p.id) ?? [],
        }),
      })

      if (!res.ok) throw new Error('build-chat request failed')
      const data: {
        reply: string
        picks: BuilderPart[]
        bottleneck: Bottleneck | null
        budget: number | null
        resolution: string | null
      } = await res.json()

      if (data.picks?.length) {
        const total = data.picks.reduce((sum, p) => sum + parsePrice(p.price), 0)
        const fpsEstimates = await fetchFpsEstimates(data.picks, data.resolution ?? null)
        setRecommendation({
          picks: data.picks,
          total,
          bottleneck: data.bottleneck ?? null,
          budget: data.budget ?? null,
          resolution: data.resolution ?? null,
          fpsEstimates,
        })
        setSwapOpenFor(null)
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: ERROR_REPLY }])
    } finally {
      setIsLoading(false)
    }
  }

  function handleSwapClick(index: number) {
    if (swapOpenFor === index) {
      setSwapOpenFor(null)
      return
    }
    setSwapOpenFor(index)
    setSwapQuery('')
    setSwapOptions([])
  }

  async function handleSelectAlternative(index: number, alt: BuilderPart) {
    if (!recommendation) return
    const picks = [...recommendation.picks]
    picks[index] = alt

    // Swapping the CPU or Motherboard to a different platform (e.g. AMD to
    // Intel) leaves the other half of the pair incompatible — auto-swap it
    // to the closest-priced match on the new socket so the build stays
    // buildable instead of silently pairing mismatched parts.
    if ((alt.category === 'CPU' || alt.category === 'Motherboard') && alt.socket) {
      const counterpartCategory = alt.category === 'CPU' ? 'Motherboard' : 'CPU'
      const counterpartIndex = picks.findIndex((p) => p.category === counterpartCategory)
      const counterpart = counterpartIndex >= 0 ? picks[counterpartIndex] : null

      if (counterpart && counterpart.socket !== alt.socket) {
        try {
          const params = new URLSearchParams({
            category: counterpartCategory,
            excludeId: String(counterpart.id),
            near: String(parsePrice(counterpart.price)),
            socket: alt.socket,
            limit: '1',
          })
          const res = await fetch(`/api/parts/alternatives?${params}`)
          if (res.ok) {
            const data: { alternatives: BuilderPart[] } = await res.json()
            if (data.alternatives[0]) picks[counterpartIndex] = data.alternatives[0]
          }
        } catch {
          // Leave the counterpart as-is if the re-pair lookup fails — better
          // to keep the user's selection and an obvious mismatch than lose it.
        }
      }
    }

    const total = picks.reduce((sum, p) => sum + parsePrice(p.price), 0)
    // Re-check immediately rather than just clearing the old verdict — this
    // is what makes the badge/FPS numbers update automatically on every swap
    // without needing to ask the assistant about it.
    const touchedPerformance = alt.category === 'CPU' || alt.category === 'GPU'
    const bottleneck = touchedPerformance
      ? await fetchBottleneck(picks, recommendation.resolution)
      : recommendation.bottleneck
    const fpsEstimates = touchedPerformance
      ? await fetchFpsEstimates(picks, recommendation.resolution)
      : recommendation.fpsEstimates
    setRecommendation({
      picks,
      total,
      bottleneck,
      budget: recommendation.budget,
      resolution: recommendation.resolution,
      fpsEstimates,
    })
    setSwapOpenFor(null)
    setSwapQuery('')
  }

  async function handleGenerateReport() {
    if (!recommendation || reportLoading) return
    setReportOpen(true)
    setReportLoading(true)
    setReportError(false)
    setReportText(null)

    try {
      const res = await fetch('/api/build-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks: recommendation.picks.map((p) => p.id) }),
      })
      if (!res.ok) throw new Error('build-report request failed')
      const data: { report: string; grounded: boolean } = await res.json()
      setReportText(data.report)
      setReportGrounded(data.grounded)
    } catch {
      setReportError(true)
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <main className="pt-[56px] min-h-screen">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13px] text-[#888888] hover:text-[#0A0A0A] transition-colors mb-8"
        >
          <span className="rotate-180 inline-block">
            <IconArrowRight />
          </span>
          Back to Komponent
        </button>

        <h1 className="text-[38px] md:text-[52px] font-bold tracking-[-0.025em] leading-[1.02] mb-3">
          Custom PC Builder.
        </h1>
        <p className="text-[14px] text-[#888888] max-w-[560px] leading-[1.7] mb-12">
          Chat with the build assistant about your budget, target resolution, and how you'll use the
          PC — it'll recommend real, compatible parts from our catalog.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-10">
          {/* Chat panel */}
          <div className="border-2 border-[#0A0A0A] rounded-2xl flex flex-col h-[560px] shadow-[0_16px_50px_-16px_rgba(0,0,0,0.25)] bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E8E8E8] bg-[#0A0A0A] text-white flex-shrink-0">
              <span className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center flex-shrink-0">
                <IconChat />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-tight">Build Assistant</p>
                <p className="text-[11px] text-[#BBBBBB] flex items-center gap-1.5 leading-tight mt-0.5">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  Online — ask anything PC related
                </p>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`max-w-[85%] text-[13px] leading-[1.6] px-4 py-3 rounded-2xl whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'self-end bg-[#0A0A0A] text-white rounded-br-sm'
                      : 'self-start bg-[#F4F4F4] text-[#0A0A0A] rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </motion.div>
              ))}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="self-start bg-[#F4F4F4] text-[13px] px-4 py-3 rounded-2xl rounded-bl-sm"
                  >
                    <TypingDots />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t border-[#E8E8E8] p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSend(s)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-[#E8E8E8] text-[#555555] hover:border-[#0A0A0A] hover:text-[#0A0A0A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend(input)
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  type="text"
                  placeholder="e.g. 1440p gaming build under $1800"
                  className="flex-1 min-w-0 text-[13px] border border-[#E8E8E8] rounded-full px-4 py-2.5 outline-none focus:border-[#0A0A0A] disabled:opacity-50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="text-[13px] font-medium px-5 py-2.5 rounded-full bg-[#0A0A0A] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Recommendation panel */}
          <div>
            <AnimatePresence mode="wait">
            {!recommendation ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[300px] border border-dashed border-[#E8E8E8] rounded-2xl flex items-center justify-center text-center px-5 sm:px-8"
              >
                <p className="text-[13px] text-[#BBBBBB] max-w-[280px]">
                  Your recommended build will show up here once you tell the assistant what you're
                  looking for.
                </p>
              </motion.div>
            ) : (
              <motion.div key="build" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                <div className="flex items-baseline justify-between mb-6">
                  <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Recommended Build</h2>
                  <motion.p
                    key={recommendation.total}
                    initial={{ opacity: 0.4 }}
                    animate={{ opacity: 1 }}
                    className="text-[20px] font-bold"
                  >
                    ${recommendation.total.toLocaleString()}
                  </motion.p>
                </div>

                <AnimatePresence>
                  {recommendation.budget != null &&
                    recommendation.total > recommendation.budget * OVER_BUDGET_TOLERANCE && (
                      <motion.div
                        key="over-budget"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="mb-4 flex items-start gap-2 rounded-xl border border-[#E8A5A5] bg-[#FEF1F1] px-4 py-3 overflow-hidden"
                      >
                        <span className="text-[#C23A3A] flex-shrink-0 mt-0.5">
                          <IconWarning />
                        </span>
                        <p className="text-[12px] text-[#8F2E2E] leading-[1.5]">
                          <span className="font-semibold">Over budget — </span>
                          This build is ${(recommendation.total - recommendation.budget).toLocaleString()} over
                          your ${recommendation.budget.toLocaleString()} budget.
                        </p>
                      </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                  {recommendation.bottleneck && (
                    <motion.div
                      key="bottleneck"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="mb-4 flex items-start gap-2 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] px-4 py-3 overflow-hidden"
                    >
                      <span className="text-[#EA580C] flex-shrink-0 mt-0.5">
                        <IconWarning />
                      </span>
                      <p className="text-[12px] text-[#9A3412] leading-[1.5]">
                        <span className="font-semibold">Possible bottleneck — </span>
                        {recommendation.bottleneck.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {recommendation.fpsEstimates && recommendation.fpsEstimates.length > 0 && (
                  <div className="mb-6 border border-[#E8E8E8] rounded-xl p-4">
                    <div className="flex items-baseline justify-between mb-3">
                      <p className="text-[13px] font-semibold">Estimated FPS</p>
                      {recommendation.resolution && (
                        <p className="text-[11px] text-[#BBBBBB]">at {recommendation.resolution}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {recommendation.fpsEstimates.map((e) => (
                        <div key={e.game} className="flex items-center justify-between text-[13px]">
                          <span className="text-[#555555]">{e.game}</span>
                          <span className="font-medium">
                            {e.approximate ? '~' : ''}
                            {e.fps} FPS
                          </span>
                        </div>
                      ))}
                    </div>
                    {recommendation.fpsEstimates.some((e) => e.approximate) && (
                      <p className="text-[11px] text-[#BBBBBB] mt-3">
                        ~ estimated from a similar-tier GPU, not this exact model.
                      </p>
                    )}
                    <p className="text-[11px] text-[#BBBBBB] mt-1">
                      Approximate, based on published benchmarks — not measured on this exact system.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {recommendation.picks.map((item, i) => (
                    <motion.div
                      key={item.category}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="flex items-center gap-2 border border-[#E8E8E8] rounded-xl p-3 group">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(item)}
                          className="flex items-center gap-4 flex-1 min-w-0 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-[#BBBBBB] tracking-[0.04em] mb-0.5 flex items-center gap-1">
                              {item.category}
                              {recommendation.bottleneck?.category === item.category && (
                                <span
                                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#F97316] text-white flex-shrink-0"
                                  title={recommendation.bottleneck.message}
                                >
                                  <IconWarning size={10} />
                                </span>
                              )}
                            </p>
                            <p className="text-[13px] font-medium truncate group-hover:opacity-60 transition-opacity">
                              {item.name}
                            </p>
                          </div>
                          <p className="text-[13px] font-medium whitespace-nowrap">{item.price}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwapClick(i)}
                          aria-label={`Swap ${item.category}`}
                          className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
                            swapOpenFor === i
                              ? 'bg-[#0A0A0A] text-white'
                              : 'text-[#BBBBBB] hover:text-[#0A0A0A] hover:bg-[#F4F4F4]'
                          }`}
                        >
                          <IconSwap />
                        </button>
                      </div>

                      <AnimatePresence>
                      {swapOpenFor === i && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="mt-2 border border-[#E8E8E8] rounded-xl overflow-hidden"
                        >
                          <div className="flex items-center gap-2 border-b border-[#E8E8E8] px-3 py-2 bg-[#FAFAFA]">
                            <span className="text-[#BBBBBB] flex-shrink-0">
                              <IconSearch />
                            </span>
                            <input
                              autoFocus
                              value={swapQuery}
                              onChange={(e) => setSwapQuery(e.target.value)}
                              type="text"
                              placeholder={`Search ${item.category.toLowerCase()}…`}
                              className="flex-1 min-w-0 text-[13px] outline-none bg-transparent placeholder:text-[#BBBBBB]"
                            />
                            {swapQuery && (
                              <button
                                type="button"
                                onClick={() => setSwapQuery('')}
                                aria-label="Clear search"
                                className="text-[#BBBBBB] hover:text-[#0A0A0A] transition-colors flex-shrink-0"
                              >
                                <IconClose />
                              </button>
                            )}
                          </div>

                          {!swapQuery && !swapLoading && swapOptions.length > 0 && (
                            <p className="text-[11px] text-[#BBBBBB] px-3 pt-2">
                              Showing closest by price — search to browse the full catalog.
                            </p>
                          )}

                          <div className="flex flex-col gap-1 p-2 max-h-[240px] overflow-y-auto">
                            {swapLoading ? (
                              <p className="text-[12px] text-[#BBBBBB] px-2 py-2">
                                {swapQuery ? 'Searching…' : 'Loading alternatives…'}
                              </p>
                            ) : swapOptions.length === 0 ? (
                              <p className="text-[12px] text-[#BBBBBB] px-2 py-2">
                                {swapQuery
                                  ? `No ${item.category} matches "${swapQuery}".`
                                  : `No other ${item.category} options found.`}
                              </p>
                            ) : (
                              swapOptions.map((alt) => (
                                <button
                                  key={alt.id}
                                  type="button"
                                  onClick={() => handleSelectAlternative(i, alt)}
                                  className="flex items-center gap-3 text-left px-2 py-2 rounded-lg hover:bg-[#F4F4F4] transition-colors"
                                >
                                  <p className="flex-1 min-w-0 text-[12px] font-medium truncate">{alt.name}</p>
                                  <p className="text-[12px] font-medium whitespace-nowrap">{alt.price}</p>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
                <OutlineButton className="mt-8" onClick={handleGenerateReport} disabled={reportLoading}>
                  {reportLoading ? 'Generating report…' : 'Report'}
                </OutlineButton>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <ProductModal key="product-modal" product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportOpen && (
        <motion.div
          key="report-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
          onClick={() => setReportOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Build report"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white w-full max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Build Report</h2>
                {!reportLoading && reportText && (
                  <p className="text-[11px] text-[#BBBBBB] mt-1">
                    {reportGrounded
                      ? 'Reliability notes grounded in live web search where possible.'
                      : "Live search wasn't available for this report — reliability notes reflect general model knowledge, not a live lookup."}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                {!reportLoading && !reportError && reportText && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadReportPdf(reportText, recommendation?.picks ?? [], recommendation?.total ?? 0)
                    }
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#0A0A0A] hover:opacity-60 transition-opacity"
                  >
                    <IconDownload />
                    Download PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  aria-label="Close"
                  className="text-[#BBBBBB] hover:text-[#0A0A0A] transition-colors"
                >
                  <IconClose />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {reportLoading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <TypingDots />
                  <p className="text-[13px] text-[#888888]">Researching each part — this can take a moment…</p>
                </motion.div>
              ) : reportError ? (
                <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] text-[#888888]">
                  Sorry, something went wrong generating the report. Mind trying again?
                </motion.p>
              ) : (
                <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {reportText && renderReport(reportText)}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
