import { useEffect } from 'react'
import type { ComponentProduct } from './data/products'

// Small pieces shared between the main landing page (App.tsx) and the
// Custom PC Builder page. Kept in their own module so the two pages can
// import each other's neighbors without a circular App <-> CustomPCBuilder
// dependency.

export const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export function OutlineButton({
  children,
  className = "",
  dark = false,
}: {
  children: React.ReactNode
  className?: string
  dark?: boolean
}) {
  return (
    <button
      className={`inline-flex items-center gap-2 border text-[13px] font-medium px-8 py-[11px] rounded-full tracking-[0.015em] transition-all duration-200 ${
        dark
          ? "border-white text-white hover:bg-white hover:text-[#0A0A0A]"
          : "border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white"
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function ProductModal({ product, onClose }: { product: ComponentProduct; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div
        className="bg-white w-full max-w-[720px] max-h-[88vh] overflow-y-auto rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="bg-[#F4F4F4] aspect-[4/3] sm:aspect-auto overflow-hidden">
            <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="p-6 sm:p-8 flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-2">
              <p className="text-[11px] tracking-[0.08em] uppercase text-[#BBBBBB]">{product.category}</p>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-[#BBBBBB] hover:text-[#0A0A0A] transition-colors -mt-1 -mr-1"
              >
                <IconClose />
              </button>
            </div>
            <h3 className="text-[22px] sm:text-[24px] font-bold tracking-[-0.02em] mb-2 leading-tight">
              {product.name}
            </h3>
            <p className="text-[20px] font-medium mb-6">{product.price}</p>
            <div className="flex flex-col border-t border-[#E8E8E8]">
              {product.specs.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 py-3 border-b border-[#E8E8E8]"
                >
                  <span className="text-[12px] text-[#888888]">{label}</span>
                  <span className="text-[13px] font-medium text-[#0A0A0A] text-right">{value}</span>
                </div>
              ))}
            </div>
            <OutlineButton className="mt-8 self-start">Add to Build</OutlineButton>
          </div>
        </div>
      </div>
    </div>
  )
}
