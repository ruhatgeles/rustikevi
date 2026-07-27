import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Printer, ArrowLeft } from 'lucide-react'
import { getProducts } from '@/lib/products'
import { categories } from '@/data/products'
import { siteConfig, buildWhatsAppLink } from '@/lib/site-config'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

export const Route = createFileRoute('/katalog')({
  head: () => ({
    meta: [
      { title: 'Dijital Katalog | Rustik Evi' },
      {
        name: 'description',
        content:
          'Rustik Evi toptan kataloğu. Tüm perde aksesuarlarını inceleyin, WhatsApp ile fiyat sorun. Yazdırılabilir dijital katalog.',
      },
    ],
  }),
  loader: async () => await getProducts(),
  component: CatalogPage,
})

function CatalogPage() {
  const allProducts = Route.useLoaderData()
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('Tümü')

  const filtered = useMemo(
    () =>
      activeCategory === 'Tümü'
        ? allProducts
        : allProducts.filter((p) => p.category === activeCategory),
    [activeCategory, allProducts],
  )

  return (
    <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-wood-dark)] hover:underline"
        >
          <ArrowLeft size={15} />
          Ana Sayfaya Dön
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full border border-[var(--color-cream-deep)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]/70 transition-colors hover:border-[var(--color-wood)]"
        >
          <Printer size={16} />
          Yazdır / PDF Kaydet
        </button>
      </div>

      <div className="mt-8 rounded-3xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-6 sm:p-10 print:border-none print:p-0">
        <div className="flex flex-col items-center gap-2 border-b border-[var(--color-cream-deep)] pb-8 text-center">
          <img src="/logo.png" alt="Rustik Evi" className="h-14 w-14 shrink-0" />
          <h1 className="font-display text-3xl text-[var(--color-espresso)] sm:text-4xl">
            Rustik Evi Toptan Kataloğu
          </h1>
          <p className="max-w-lg text-sm text-[var(--color-ink)]/60">
            Perde aksesuarları · 2026 sezonu
          </p>
          <p className="text-xs text-[var(--color-ink)]/50">
            {siteConfig.phoneDisplay} · {siteConfig.email}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5 print:hidden">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'border-[var(--color-wood-dark)] bg-[var(--color-wood-dark)] text-[var(--color-linen)]'
                  : 'border-[var(--color-cream-deep)] text-[var(--color-ink)]/70 hover:border-[var(--color-wood)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-8">
          {filtered.map((product) => (
            <div
              key={product.id}
              className="grid gap-5 border-b border-[var(--color-cream-deep)] pb-8 last:border-none sm:grid-cols-[160px_1fr]"
            >
              <div
                className="aspect-[4/3] w-full rounded-xl sm:h-full sm:aspect-auto"
                style={{
                  background: `linear-gradient(155deg, ${product.swatches[0][0]}, ${product.swatches[0][1]})`,
                }}
              />
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-wood)]">
                  {product.category}
                </span>
                <h2 className="mt-1 font-display text-xl text-[var(--color-espresso)]">
                  {product.name}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink)]/65">
                  {product.description}
                </p>
                <p className="mt-2 text-xs font-semibold text-[var(--color-wood-dark)]">
                  Minimum Sipariş: {product.moq}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl bg-[var(--color-cream)]/60 p-8 text-center print:hidden">
          <p className="max-w-md text-sm text-[var(--color-ink)]/65">
            Fiyat listesi ve numune talebi için WhatsApp sipariş hattımızdan bize
            ulaşabilirsiniz.
          </p>
          <a
            href={buildWhatsAppLink(
              'Merhaba Rustik Evi, dijital kataloğunuzu inceledim, fiyat listesi almak istiyorum.',
            )}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <WhatsAppIcon size={19} />
            WhatsApp'tan Fiyat Sor
          </a>
        </div>
      </div>
    </div>
  )
}
