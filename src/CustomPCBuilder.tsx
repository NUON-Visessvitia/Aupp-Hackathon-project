import { useEffect, useRef, useState } from 'react'
import { OutlineButton, ProductModal, IconArrowRight } from './Shared'
import { recommendBuild, type Recommendation } from './lib/recommend'
import type { ComponentProduct } from './data/products'

type ChatMessage = { role: 'user' | 'assistant'; text: string }

const GREETING =
  "Hi! Tell me your budget and what you'll mainly use this PC for — gaming resolution, streaming, editing — and I'll put together a recommended build from our catalog."

const SUGGESTIONS = [
  '1440p gaming, budget $1500',
  '4K gaming, budget $3500',
  'Budget 1080p build under $800',
  'Streaming and gaming rig, $2500',
]

const FALLBACK_REPLY =
  "Sorry, I couldn't quite parse that — try mentioning a budget (like \"$1500\") and what you'll use it for, e.g. \"1440p gaming under $1800\"."

export default function CustomPCBuilder({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: GREETING }])
  const [input, setInput] = useState('')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ComponentProduct | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function handleSend(rawText: string) {
    const text = rawText.trim()
    if (!text) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')

    let reply: string
    try {
      const result = recommendBuild(text)
      setRecommendation(result)
      reply = result.summary
    } catch {
      reply = FALLBACK_REPLY
    }

    setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
  }

  return (
    <main className="pt-[56px] min-h-screen">
      <div className="max-w-[1320px] mx-auto px-8 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13px] text-[#888888] hover:text-[#0A0A0A] transition-colors mb-8"
        >
          <span className="rotate-180 inline-block">
            <IconArrowRight />
          </span>
          Back to forge.
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
          <div className="border border-[#E8E8E8] rounded-2xl flex flex-col h-[560px]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] text-[13px] leading-[1.6] px-4 py-3 rounded-2xl ${
                    m.role === 'user'
                      ? 'self-end bg-[#0A0A0A] text-white rounded-br-sm'
                      : 'self-start bg-[#F4F4F4] text-[#0A0A0A] rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="border-t border-[#E8E8E8] p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-[#E8E8E8] text-[#555555] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
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
                  type="text"
                  placeholder="e.g. 1440p gaming build under $1800"
                  className="flex-1 min-w-0 text-[13px] border border-[#E8E8E8] rounded-full px-4 py-2.5 outline-none focus:border-[#0A0A0A] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="text-[13px] font-medium px-5 py-2.5 rounded-full bg-[#0A0A0A] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Recommendation panel */}
          <div>
            {!recommendation ? (
              <div className="h-full min-h-[300px] border border-dashed border-[#E8E8E8] rounded-2xl flex items-center justify-center text-center px-8">
                <p className="text-[13px] text-[#BBBBBB] max-w-[280px]">
                  Your recommended build will show up here once you tell the assistant what you're
                  looking for.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline justify-between mb-6">
                  <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Recommended Build</h2>
                  <p className="text-[20px] font-bold">${recommendation.total.toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-3">
                  {recommendation.picks.map((item) => (
                    <button
                      key={item.category}
                      type="button"
                      onClick={() => setSelectedProduct(item)}
                      className="flex items-center gap-4 border border-[#E8E8E8] rounded-xl p-3 text-left hover:border-[#0A0A0A] transition-colors group"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F4F4F4] flex-shrink-0">
                        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#BBBBBB] tracking-[0.04em] mb-0.5">
                          {item.category}
                        </p>
                        <p className="text-[13px] font-medium truncate group-hover:opacity-60 transition-opacity">
                          {item.name}
                        </p>
                      </div>
                      <p className="text-[13px] font-medium whitespace-nowrap">{item.price}</p>
                    </button>
                  ))}
                </div>
                <OutlineButton className="mt-8">Add Build to Cart</OutlineButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </main>
  )
}
