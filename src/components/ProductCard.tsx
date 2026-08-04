import { useRef, useState } from 'react'
import type { Product } from '@/data/products'

function ProductArt({ swatch }: { swatch: [string, string] }) {
  return (
    <div
      className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(155deg, ${swatch[0]} 0%, ${swatch[1]} 100%)`,
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-25"
        viewBox="0 0 200 150"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 40 Q 50 10 100 40 T 200 40" stroke="white" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M0 75 Q 50 45 100 75 T 200 75" stroke="white" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M0 110 Q 50 80 100 110 T 200 110" stroke="white" strokeWidth="2" fill="none" opacity="0.3" />
      </svg>
      <div className="absolute inset-0 texture-grain" />
    </div>
  )
}

function ImageCarousel({ swatches }: { swatches: Product['swatches'] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const ticking = useRef(false)

  const onScroll = () => {
    if (ticking.current) return
    ticking.current = true
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) {
        const index = Math.round(el.scrollLeft / el.clientWidth)
        setActive(index)
      }
      ticking.current = false
    })
  }

  const scrollTo = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory scroll-smooth overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {swatches.map((swatch, i) => (
          <div key={i} className="w-full shrink-0 snap-center p-3">
            <ProductArt swatch={swatch} />
          </div>
        ))}
      </div>

      {swatches.length > 1 && (
        <>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {swatches.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollTo(i) }}
                className={`h-1.5 rounded-full transition-all ${
                  active === i ? 'w-5 bg-[var(--color-wood-dark)]' : 'w-1.5 bg-[var(--color-ink)]/25'
                }`}
                aria-label={`Görsel ${i + 1}`}
              />
            ))}
          </div>

          {active > 0 && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollTo(active - 1) }}
              className="absolute left-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-ink)] shadow-sm backdrop-blur transition-opacity hover:bg-white"
              aria-label="Önceki görsel"
            >
              ‹
            </button>
          )}
          {active < swatches.length - 1 && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollTo(active + 1) }}
              className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-ink)] shadow-sm backdrop-blur transition-opacity hover:bg-white"
              aria-label="Sonraki görsel"
            >
              ›
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(58,42,28,0.25)]"
    >
      <ImageCarousel swatches={product.swatches} />
      <div className="flex flex-1 flex-col gap-2 px-5 pb-5 pt-1">
        <span className="w-fit rounded-full bg-[var(--color-cream-deep)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-wood-dark)]">
          {product.category}
        </span>
        <h3 className="font-display text-lg text-[var(--color-espresso)]">{product.name}</h3>
        <p className="flex-1 text-sm leading-relaxed text-[var(--color-ink)]/65">
          {product.shortDescription}
        </p>
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-wood)]">
          <span>Min. Sipariş: {product.moq}</span>
          <span className="font-semibold text-[var(--color-wood-dark)] group-hover:underline">
            Detay &rarr;
          </span>
        </div>
      </div>
    </div>
  )
}
