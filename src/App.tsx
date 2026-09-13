import { useEffect, useRef, useState } from 'react'
import { COMPONENT_CATALOG, COMPONENT_CATEGORIES, type ComponentProduct } from './data/products'
import CustomPCBuilder from './CustomPCBuilder'
import { IconArrowRight, OutlineButton, ProductModal } from './Shared'

// ── Icons ─────────────────────────────────────────────────────────────────────

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
)

const IconBag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <line x1="3" x2="21" y1="6" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)

const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconChevronDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

// ── Data ──────────────────────────────────────────────────────────────────────

const NAV_LINKS: { label: string; items: string[] | null }[] = [
  { label: "Gaming PCs", items: null },
  { label: "Components", items: COMPONENT_CATEGORIES },
  { label: "Peripherals", items: ["Keyboards", "Mice", "Monitors", "Headsets"] },
  { label: "News", items: null },
]

const FINISHES = [
  {
    id: "white",
    label: "All-White",
    swatch: "#F0F0F0",
    ring: "#C8C8C8",
    img: "https://images.unsplash.com/photo-1718777025831-5cb28feb8518?w=1400&h=900&fit=crop&auto=format",
  },
  {
    id: "black",
    label: "All-Black",
    swatch: "#1C1C1C",
    ring: "#1C1C1C",
    img: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1400&h=900&fit=crop&auto=format",
  },
  {
    id: "navy",
    label: "Midnight Navy",
    swatch: "#1C3056",
    ring: "#1C3056",
    img: "https://images.unsplash.com/photo-1745789888513-e9b4a2e1be6f?w=1400&h=900&fit=crop&auto=format",
  },
  {
    id: "silver",
    label: "Brushed Silver",
    swatch: "#B0B0B0",
    ring: "#909090",
    img: "https://images.unsplash.com/photo-1653506999232-a08ffe53a67f?w=1400&h=900&fit=crop&auto=format",
  },
]

// ── Components ─────────────────────────────────────────────────────────────────

function Divider() {
  return <hr className="border-0 border-t border-[#E8E8E8]" />
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function NavPopover({
  id,
  openId,
  onToggle,
  buttonClassName,
  buttonContent,
  panelClassName = "",
  align = "left",
  ariaLabel,
  children,
}: {
  id: string
  openId: string | null
  onToggle: (id: string) => void
  buttonClassName: string
  buttonContent: React.ReactNode
  panelClassName?: string
  align?: "left" | "right"
  ariaLabel?: string
  children: React.ReactNode
}) {
  const isOpen = openId === id

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={ariaLabel}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      <div
        role="menu"
        className={`absolute z-50 top-full ${align === "right" ? "right-0" : "left-0"} mt-3 origin-top max-w-[calc(100vw-4rem)] transition-all duration-150 ease-out ${isOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
          } ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  )
}

function Nav({
  activeComponentFilter,
  onSelectComponentFilter,
  onOpenCustomPC,
  onNavigateHome,
}: {
  activeComponentFilter: string | null
  onSelectComponentFilter: (category: string) => void
  onOpenCustomPC: () => void
  onNavigateHome: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenId(null)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null)
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id))

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E8E8E8]"
    >
      <div className="max-w-[1320px] mx-auto px-8 h-[56px] flex items-center justify-between">
        <button
          onClick={onNavigateHome}
          className="text-[15px] font-bold tracking-[-0.02em] select-none"
        >
          forge.
        </button>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) =>
            link.items ? (
              <NavPopover
                key={link.label}
                id={link.label}
                openId={openId}
                onToggle={toggle}
                buttonClassName={`flex items-center gap-[5px] text-[13px] transition-colors duration-150 ${openId === link.label ? "text-[#0A0A0A]" : "text-[#555555] hover:text-[#0A0A0A]"
                  }`}
                buttonContent={
                  <>
                    {link.label}
                    <span
                      className={`transition-transform duration-200 ${openId === link.label ? "rotate-180" : ""}`}
                    >
                      <IconChevronDown />
                    </span>
                  </>
                }
                panelClassName="min-w-[200px] bg-white border border-[#E8E8E8] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.08)] py-2"
              >
                {link.items.map((item) => {
                  const isComponents = link.label === "Components"
                  const isActive = isComponents && activeComponentFilter === item
                  return (
                    <button
                      key={item}
                      onClick={() => {
                        if (isComponents) {
                          onSelectComponentFilter(item)
                        }
                        setOpenId(null)
                      }}
                      className={`w-full text-left px-4 py-2 text-[13px] transition-colors duration-150 ${isActive
                        ? "text-[#0A0A0A] font-medium bg-[#F4F4F4]"
                        : "text-[#555555] hover:text-[#0A0A0A] hover:bg-[#F8F8F8]"
                        }`}
                    >
                      {item}
                    </button>
                  )
                })}
              </NavPopover>
            ) : (
              <button
                key={link.label}
                onClick={link.label === "Gaming PCs" ? onOpenCustomPC : undefined}
                className="text-[13px] text-[#555555] hover:text-[#0A0A0A] transition-colors duration-150"
              >
                {link.label}
              </button>
            ),
          )}
        </div>

        <div className="flex items-center gap-[18px] text-[#1A1A1A]">
          <NavPopover
            id="search"
            openId={openId}
            onToggle={toggle}
            align="right"
            ariaLabel="Search"
            buttonClassName="hover:opacity-40 transition-opacity"
            buttonContent={<IconSearch />}
            panelClassName="w-[260px] bg-white border border-[#E8E8E8] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.08)] p-3"
          >
            <div className="flex items-center gap-2 border border-[#E8E8E8] rounded-full px-3 py-2">
              <IconSearch />
              <input
                type="text"
                placeholder="Search products…"
                className="flex-1 min-w-0 text-[13px] outline-none placeholder:text-[#BBBBBB]"
              />
            </div>
          </NavPopover>

          <NavPopover
            id="cart"
            openId={openId}
            onToggle={toggle}
            align="right"
            ariaLabel="Cart"
            buttonClassName="hover:opacity-40 transition-opacity"
            buttonContent={<IconBag />}
            panelClassName="w-[240px] bg-white border border-[#E8E8E8] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.08)] p-5 text-center"
          >
            <p className="text-[13px] text-[#888888] mb-4">Your cart is empty.</p>
            <button
              onClick={() => setOpenId(null)}
              className="text-[12px] font-medium text-[#0A0A0A] underline underline-offset-2"
            >
              Start building
            </button>
          </NavPopover>

          <NavPopover
            id="account"
            openId={openId}
            onToggle={toggle}
            align="right"
            ariaLabel="Account"
            buttonClassName="hover:opacity-40 transition-opacity"
            buttonContent={<IconUser />}
            panelClassName="w-[200px] bg-white border border-[#E8E8E8] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.08)] py-2"
          >
            <button
              onClick={() => setOpenId(null)}
              className="w-full text-left px-4 py-2 text-[13px] text-[#555555] hover:text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => setOpenId(null)}
              className="w-full text-left px-4 py-2 text-[13px] text-[#555555] hover:text-[#0A0A0A] hover:bg-[#F8F8F8] transition-colors"
            >
              Create account
            </button>
          </NavPopover>

          <span className="text-[#DDDDDD] select-none hidden md:block">|</span>
          <span className="text-[13px] text-[#555555] hidden md:block">EN</span>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="pt-[56px] bg-white">
      {/* Headline block */}
      <div className="text-center pt-[88px] pb-16 px-8">
        <p className="text-[11px] tracking-[0.12em] uppercase text-[#AAAAAA] mb-6">
          New — Q9 Series
        </p>
        <h1 className="text-[64px] md:text-[82px] lg:text-[100px] font-bold tracking-[-0.035em] leading-[0.92] text-[#0A0A0A] mb-8">
          Find the right specs<br />tailored to your needs.
        </h1>
        <p className="text-[14px] text-[#888888] max-w-[400px] mx-auto leading-[1.7] mb-11">
          Crisp airflow, a uniquely angled 120 mm air duct fan for dedicated GPU cooling,
          and optimized cable management make this case ideal for powerful, compact builds.
        </p>
        <OutlineButton>Explore</OutlineButton>
      </div>

      {/* Hero image — full-bleed photo + navy accent column */}
      <div className="flex h-[460px] md:h-[580px] lg:h-[660px]">
        <div className="flex-1 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1751170890353-5b0e1766fbeb?w=1600&h=800&fit=crop&auto=format&crop=center"
            alt="Q9 Series case — precision-perforated aluminum top panel macro detail"
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="w-[20%] md:w-[24%] bg-[#12244A] flex-shrink-0 relative overflow-hidden">
          {/* Subtle grain texture on the navy block */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
              backgroundSize: "128px",
            }}
          />
        </div>
      </div>
    </section>
  )
}

// ── Meet the Series ───────────────────────────────────────────────────────────

function MeetTheSeriesSection() {
  return (
    <section className="py-28 px-8">
      <div className="max-w-[1320px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start gap-6 mb-20">
          <h2 className="text-[38px] md:text-[52px] font-bold tracking-[-0.025em] leading-[1.02] flex-1 max-w-[480px]">
            Meet the Q9 Series.
          </h2>
          <p className="text-[14px] text-[#888888] max-w-[320px] leading-[1.7] flex-shrink-0 md:pt-2">
            The Q9 keeps things clean and simple while supporting powerful builds.
            Two versions are available — the Q9 Flow and the Q9 Elite.
          </p>
        </div>

        <Divider />

        {/* Comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16 pt-16">
          {/* Q9 Flow */}
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-[20px] font-semibold tracking-[-0.01em] mb-3">Q9 Flow</h3>
              <p className="text-[13px] text-[#888888] leading-[1.7] max-w-[380px]">
                The Q9 Flow features a perforated top panel, room for up to 10 fans,
                and multiple radiator mounting options for increased cooling performance
                under demanding workloads.
              </p>
            </div>
            <div className="bg-[#F4F4F4] overflow-hidden flex-1 min-h-[380px]">
              <img
                src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&h=1000&fit=crop&auto=format&crop=center"
                alt="Q9 Flow — white aluminum with perforated top panel and fan array"
                className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
            </div>
            <OutlineButton className="self-start">
              Learn more <IconArrowRight />
            </OutlineButton>
          </div>

          {/* Q9 Elite — offset downward for staggered rhythm */}
          <div className="flex flex-col gap-6 md:mt-20">
            <div>
              <h3 className="text-[20px] font-semibold tracking-[-0.01em] mb-3">Q9 Elite</h3>
              <p className="text-[13px] text-[#888888] leading-[1.7] max-w-[380px]">
                The Q9 Elite features a tempered glass top panel with a uniquely clear
                radiator mounting bracket and a built-in RGB Fan Controller for enhanced
                lighting customization.
              </p>
            </div>
            <div className="bg-[#F4F4F4] overflow-hidden flex-1 min-h-[380px]">
              <img
                src="https://images.unsplash.com/photo-1760631731124-69d85bdd195d?w=800&h=1000&fit=crop&auto=format&crop=center"
                alt="Q9 Elite — glass side panel with liquid cooling and ARGB lighting"
                className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700 ease-out"
              />
            </div>
            <OutlineButton className="self-start">
              Learn more <IconArrowRight />
            </OutlineButton>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Suit Your Space ───────────────────────────────────────────────────────────

function SuitYourSpaceSection() {
  const [active, setActive] = useState("white")
  const current = FINISHES.find((f) => f.id === active)!

  return (
    <section className="py-24 border-t border-[#E8E8E8]">
      <div className="max-w-[1320px] mx-auto px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-[38px] md:text-[52px] font-bold tracking-[-0.025em] leading-[1.02] mb-4">
            Suit Your Space.
          </h2>
          <p className="text-[14px] text-[#888888] max-w-[360px] mx-auto leading-[1.7]">
            The Q9 Flow and Elite are available in four distinct colorways.
            Find the finish that defines your build.
          </p>
        </div>

        {/* Swatch row */}
        <div className="flex justify-center items-center gap-7 mb-12">
          {FINISHES.map((f) => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className="flex flex-col items-center gap-2.5 group"
              aria-label={`Select ${f.label} finish`}
            >
              <div
                className="w-8 h-8 rounded-full transition-transform duration-200 group-hover:scale-110"
                style={{
                  backgroundColor: f.swatch,
                  boxShadow:
                    active === f.id
                      ? `0 0 0 1px #ffffff, 0 0 0 2.5px ${f.ring}`
                      : `0 0 0 1px ${f.ring}40`,
                  transform: active === f.id ? "scale(1.12)" : undefined,
                }}
              />
              <span
                className={`text-[11px] tracking-[0.03em] transition-colors duration-150 ${active === f.id ? "text-[#0A0A0A] font-medium" : "text-[#BBBBBB]"
                  }`}
              >
                {f.label}
              </span>
            </button>
          ))}
        </div>

        {/* Case preview */}
        <div className="max-w-[960px] mx-auto overflow-hidden bg-[#F4F4F4]">
          <img
            src={current.img}
            alt={`Q9 Series in ${current.label}`}
            className="w-full aspect-[16/10] object-cover transition-opacity duration-300"
          />
        </div>

        <p className="text-center mt-5 text-[12px] text-[#BBBBBB] tracking-[0.04em]">
          {current.label} — Available for Q9 Flow and Q9 Elite
        </p>
      </div>
    </section>
  )
}

// ── Simplified Building ───────────────────────────────────────────────────────

function FeatureRow({
  index,
  label,
  title,
  body,
  imgSrc,
  imgAlt,
  reverse = false,
}: {
  index: string
  label: string
  title: React.ReactNode
  body: string
  imgSrc: string
  imgAlt: string
  reverse?: boolean
}) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center ${reverse ? "" : ""
        }`}
    >
      <div className={reverse ? "md:order-last" : ""}>
        <p className="text-[11px] tracking-[0.1em] uppercase text-[#BBBBBB] mb-4">
          {index} — {label}
        </p>
        <h3 className="text-[30px] md:text-[38px] font-bold tracking-[-0.02em] leading-[1.08] mb-6">
          {title}
        </h3>
        <p className="text-[14px] text-[#888888] leading-[1.7] max-w-[380px]">{body}</p>
      </div>
      <div className={`overflow-hidden bg-[#F4F4F4] ${reverse ? "md:order-first" : ""}`}>
        <img
          src={imgSrc}
          alt={imgAlt}
          className="w-full aspect-[4/3] object-cover hover:scale-[1.04] transition-transform duration-700 ease-out"
        />
      </div>
    </div>
  )
}

function SimplifiedBuildingSection() {
  return (
    <section className="py-28 border-t border-[#E8E8E8]">
      <div className="max-w-[1320px] mx-auto px-8">
        {/* Section header — large editorial headline */}
        <div className="flex flex-col md:flex-row md:items-end gap-6 mb-28">
          <h2 className="text-[52px] md:text-[72px] lg:text-[88px] font-bold tracking-[-0.035em] leading-[0.92] flex-1">
            Simplified<br />Building.
          </h2>
          <p className="text-[14px] text-[#888888] max-w-[280px] leading-[1.7] flex-shrink-0 md:pb-2">
            The Q9 is easy to build in, with cable routing, a unique SSD hinge,
            and a dual-chamber design with plenty of space for premium components.
          </p>
        </div>

        <div className="flex flex-col gap-28">
          <FeatureRow
            index="01"
            label="Design"
            title={<>Dual-Chamber<br />Design.</>}
            body="Utilizing a dual-chamber design, the Q9 separates the aesthetically pleasing components from the wires and cables that can clutter a build — keeping things clean and cool by allowing more airflow options."
            imgSrc="https://images.unsplash.com/photo-1642736670762-dd634932a212?w=1000&h=750&fit=crop&auto=format"
            imgAlt="Q9 dual-chamber interior showing clean cable management behind the motherboard tray"
          />
          <FeatureRow
            index="02"
            label="Space"
            title={<>Space for Powerful<br />Components.</>}
            body="The Q9 has plenty of space for premium components, numerous radiator mounting options, and support for up to 420 mm liquid cooling radiators. Build without compromise, and without cramped hands."
            imgSrc="https://images.unsplash.com/photo-1692049065982-fc40fa2d4403?w=1000&h=750&fit=crop&auto=format"
            imgAlt="High-end liquid cooling system and triple-fan radiator mounted inside the Q9 chassis"
            reverse
          />
          <FeatureRow
            index="03"
            label="Airflow"
            title={<>Engineered for<br />Airflow.</>}
            body="Perforated steel mesh panels on the top and front allow for unrestricted airflow. Pair with up to 10 x 120 mm fans or a triple 360 mm radiator for thermally demanding configurations."
            imgSrc="https://images.unsplash.com/photo-1730854476533-dfc3db0af80c?w=1000&h=750&fit=crop&auto=format"
            imgAlt="Close-up of precision-perforated mesh panel and fan blade illuminated in blue"
          />
        </div>
      </div>
    </section>
  )
}

// ── Discover Favorites ────────────────────────────────────────────────────────

function DiscoverFavoritesSection({
  filter,
  onClearFilter,
}: {
  filter: string | null
  onClearFilter: () => void
}) {
  const items = filter
    ? COMPONENT_CATALOG.filter((item) => item.category === filter)
    : COMPONENT_CATALOG.filter((item) => item.featured)

  const [selected, setSelected] = useState<ComponentProduct | null>(null)

  return (
    <section id="favorites" className="py-24 border-t border-[#E8E8E8] scroll-mt-[56px]">
      <div className="max-w-[1320px] mx-auto px-8">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-16 flex-wrap gap-y-4">
          <div>
            <h2 className="text-[34px] md:text-[48px] font-bold tracking-[-0.025em] leading-[1.04]">
              {filter ? filter : "Discover our favorites."}
            </h2>
            {filter && (
              <button
                onClick={onClearFilter}
                className="mt-3 text-[12px] text-[#888888] hover:text-[#0A0A0A] transition-colors underline underline-offset-2"
              >
                Clear filter
              </button>
            )}
          </div>
          {!filter && (
            <button className="hidden md:flex items-center gap-2 text-[13px] text-[#888888] hover:text-[#0A0A0A] transition-colors group">
              View all
              <span className="group-hover:translate-x-1 transition-transform duration-150 inline-block">
                <IconArrowRight />
              </span>
            </button>
          )}
        </div>

        {/* Product grid */}
        {items.length === 0 ? (
          <p className="text-[13px] text-[#888888]">No products in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                className="group cursor-pointer text-left w-full"
              >
                <div className="overflow-hidden bg-[#F4F4F4] mb-4">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full aspect-[4/3] object-cover group-hover:scale-[1.05] transition-transform duration-500 ease-out"
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-[#BBBBBB] tracking-[0.04em] mb-[3px]">
                      {item.category}
                    </p>
                    <p className="text-[15px] font-semibold tracking-[-0.01em] group-hover:opacity-60 transition-opacity">
                      {item.name}
                    </p>
                  </div>
                  <p className="text-[14px] font-medium text-[#0A0A0A] whitespace-nowrap pt-[18px]">
                    {item.price}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mobile "View all" */}
        {!filter && (
          <div className="mt-12 flex justify-center md:hidden">
            <OutlineButton>View all</OutlineButton>
          </div>
        )}
      </div>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

// ── Banner CTA ────────────────────────────────────────────────────────────────

function BannerCTA() {
  return (
    <section className="bg-[#12244A] py-28 px-8">
      <div className="max-w-[1320px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div>
          <p className="text-[11px] tracking-[0.12em] uppercase text-[#5B7BAF] mb-4">
            Build configurator
          </p>
          <h2 className="text-[38px] md:text-[54px] font-bold tracking-[-0.03em] leading-[0.98] text-white">
            Start your build.<br />Your way.
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
          <OutlineButton dark>Build Now</OutlineButton>
          <button className="inline-flex items-center gap-2 text-[13px] font-medium text-[#5B7BAF] hover:text-white transition-colors px-2">
            Browse pre-builds <IconArrowRight />
          </button>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    { title: "Products", links: ["Gaming PCs", "Cases", "Components", "Peripherals", "Accessories"] },
    { title: "Support", links: ["Build Guide", "Compatibility", "Warranty", "Returns", "Contact"] },
    { title: "Company", links: ["About Forge", "News", "Careers", "Press", "Partners"] },
    { title: "Legal", links: ["Privacy Policy", "Terms of Use", "Cookie Settings", "Sitemap"] },
  ]

  return (
    <footer className="border-t border-[#E8E8E8] py-16 px-8">
      <div className="max-w-[1320px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-14 mb-16">
          {/* Brand */}
          <div className="flex-shrink-0">
            <p className="text-[16px] font-bold tracking-[-0.02em] mb-4">forge.</p>
            <p className="text-[13px] text-[#999999] max-w-[200px] leading-[1.65]">
              Precision-engineered PC cases and hardware for builders who refuse to compromise.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {cols.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#0A0A0A] mb-4">
                  {col.title}
                </p>
                <div className="flex flex-col gap-[10px]">
                  {col.links.map((link) => (
                    <button
                      key={link}
                      className="text-[13px] text-[#999999] hover:text-[#0A0A0A] transition-colors text-left"
                    >
                      {link}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[12px] text-[#BBBBBB]">
            © 2026 Forge Hardware Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Instagram", "X / Twitter", "YouTube", "Discord"].map((s) => (
              <button
                key={s}
                className="text-[12px] text-[#BBBBBB] hover:text-[#0A0A0A] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<"home" | "custom-pc">("home")
  const [componentFilter, setComponentFilter] = useState<string | null>(null)

  useEffect(() => {
    if (view === "home" && componentFilter) {
      document.getElementById("favorites")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [view, componentFilter])

  return (
    <div className="bg-white text-[#0A0A0A] font-sans min-h-screen">
      <Nav
        activeComponentFilter={componentFilter}
        onSelectComponentFilter={(category) => {
          setView("home")
          setComponentFilter(category)
        }}
        onOpenCustomPC={() => setView("custom-pc")}
        onNavigateHome={() => setView("home")}
      />
      {view === "custom-pc" ? (
        <CustomPCBuilder onBack={() => setView("home")} />
      ) : (
        <main>
          <HeroSection />
          <MeetTheSeriesSection />
          <SuitYourSpaceSection />
          <SimplifiedBuildingSection />
          <DiscoverFavoritesSection filter={componentFilter} onClearFilter={() => setComponentFilter(null)} />
          <BannerCTA />
        </main>
      )}
      <Footer />
    </div>
  )
}
