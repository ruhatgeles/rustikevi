import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, QrCode } from 'lucide-react'
import { getProducts } from '@/lib/products'
import { categories } from '@/data/products'
import { ProductCard } from '@/components/ProductCard'
import { CatalogQRCode } from '@/components/CatalogQRCode'

export const Route = createFileRoute('/urunlerimiz')({
  head: () => ({
    meta: [
      { title: 'Ürünlerimiz | Rustik Evi' },
      {
        name: 'description',
        content:
          'Rustik perde aksesuarları kataloğu. Jüt kordon, ahşap halka, saçak, başlık, sarkıt, braçöl. Kategoriye göre filtreleyin, toptan sipariş verin.',
      },
    ],
  }),
  loader: async () => await getProducts(),
  component: ProductsPage,
})

function ProductsPage() {
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
    <div>
      <section className="texture-grain bg-[var(--color-espresso-deep)] px-5 py-16 text-[var(--color-cream)] sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brass-bright)]">
            Ürün Kataloğu
          </span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Ürünlerimiz</h1>
          <p className="mt-4 max-w-2xl text-[var(--color-cream)]/70">
            Jüt ve deri detaylı perde aksesuarlarımızdan oluşan toptan satış koleksiyonumuzu
            inceleyin. Fiyat ve minimum sipariş bilgisi için bize WhatsApp üzerinden
            ulaşabilirsiniz.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="flex flex-wrap gap-2.5">
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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="grid gap-10 rounded-3xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-8 shadow-sm sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="flex w-fit items-center gap-2 rounded-full bg-[var(--color-cream-deep)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-wood-dark)]">
              <QrCode size={14} /> Tüm Katalog
            </span>
            <h2 className="mt-4 font-display text-3xl text-[var(--color-espresso)] sm:text-4xl">
              Detaylı fiyat listesi için dijital kataloğu açın
            </h2>
            <p className="mt-3 max-w-xl text-[var(--color-ink)]/65">
              QR kodu okutarak veya butona tıklayarak, ürün görselleri, minimum sipariş
              adetleri ve teknik detayların yer aldığı dijital kataloğa ulaşabilirsiniz.
            </p>
            <Link
              to="/katalog"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-wood-dark)] px-6 py-3 text-sm font-semibold text-[var(--color-linen)] transition-colors hover:bg-[var(--color-espresso)]"
            >
              Kataloğu Görüntüle
              <ArrowRight size={16} />
            </Link>
          </div>
          <CatalogQRCode />
        </div>
      </section>
    </div>
  )
}
