import { Link, createFileRoute } from '@tanstack/react-router'
import { Truck, PackageCheck, Ruler, Handshake, ArrowRight, QrCode } from 'lucide-react'
import { getFeaturedProducts } from '@/lib/products'
import { ProductCard } from '@/components/ProductCard'
import { CatalogQRCode } from '@/components/CatalogQRCode'
import { StoryCircles } from '@/components/StoryCircles'
import { defaultWhatsAppMessage, useWhatsAppLink } from '@/lib/site-config'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

export const Route = createFileRoute('/')({
  head: () => ({
    links: [{ rel: 'canonical', href: 'https://rustikevi.com' }],
    meta: [
      { property: 'og:url', content: 'https://rustikevi.com' },
      { title: 'Rustik Evi | Perde Aksesuarı Toptan Satış' },
      {
        name: 'description',
        content:
          'Rustik Evi, doğal malzemelerle üretilen perde aksesuarları toptan satış. Jüt kordon, ahşap halka, saçak, braçöl. 23 ilde teslimat.',
      },
    ],
  }),
  loader: async () => await getFeaturedProducts(),
  component: HomePage,
})

const stats = [
  { value: '23', label: 'İl genelinde toptan sevkiyat ağı' },
  { value: '180+', label: 'Perde mağazası ortağımız' },
  { value: '7 yıl', label: 'Toptan üretim tecrübesi' },
]

const highlights = [
  {
    icon: Ruler,
    title: 'Özel Kesim & Desen',
    text: 'Toptan siparişlerde metraj, en ve desen tercihine göre üretim esnekliği sunuyoruz.',
  },
  {
    icon: PackageCheck,
    title: 'Parti Bazlı Kalite Kontrol',
    text: 'Her üretim partisi paketlenmeden önce doku, renk ve dikiş kontrolünden geçer.',
  },
  {
    icon: Truck,
    title: 'Türkiye Geneli Sevkiyat',
    text: 'Anlaşmalı kargo ve nakliye ortaklarımızla 81 ile düzenli sevkiyat yapıyoruz.',
  },
  {
    icon: Handshake,
    title: 'Esnek Toptan Koşulları',
    text: 'Sipariş hacmine göre kademeli fiyatlandırma ve vadeli ödeme seçenekleri sunuyoruz.',
  },
]

function HomePage() {
  const featured = Route.useLoaderData()
  const buildWhatsAppLink = useWhatsAppLink()

  return (
    <div className="overflow-hidden">
      {/* HERO — tam genişlik kapak fotoğrafı */}
      <section className="relative isolate overflow-hidden bg-[var(--color-espresso-deep)] text-[var(--color-cream)]">
        <img
          src="/img/hero-cover-1600.webp"
          srcSet="/img/hero-cover-900.webp 900w, /img/hero-cover-1600.webp 1600w"
          sizes="100vw"
          alt=""
          aria-hidden="true"
          width={1600}
          height={902}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[70%_50%] sm:object-center"
        />
        {/* Okunabilirlik için sol taraftan koyulaşan örtü */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(42,29,19,0.55)_0%,rgba(42,29,19,0.85)_60%,rgba(42,29,19,0.96)_100%)] lg:bg-[linear-gradient(90deg,rgba(42,29,19,0.96)_0%,rgba(42,29,19,0.86)_38%,rgba(42,29,19,0.35)_70%,rgba(42,29,19,0.1)_100%)]" />

        <div className="mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 lg:min-h-[86vh] lg:justify-center lg:pb-24">
          <div className="max-w-xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brass-bright)]/50 bg-[var(--color-espresso-deep)]/40 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--color-brass-bright)] backdrop-blur-sm">
              Toptan Perde Aksesuarı
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.08] sm:text-5xl lg:text-[4.25rem]">
              Vitrininize <em className="not-italic text-[var(--color-brass-bright)]">rustik</em>{' '}
              dokunuşlar katan perde aksesuarları.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--color-cream)]/80 sm:text-lg">
              Rustik Evi, Türkiye'nin dört bir yanındaki perde mağazalarına jüt ve deri
              detaylı perde aksesuarlarını toptan olarak ulaştırıyor.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={buildWhatsAppLink(defaultWhatsAppMessage)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-full bg-[var(--color-whatsapp)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/30 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-whatsapp-hover)]"
              >
                <WhatsAppIcon size={20} />
                WhatsApp'tan Sipariş Ver
              </a>
              <Link
                to="/katalog"
                className="flex items-center gap-2 rounded-full border border-[var(--color-cream)]/40 bg-[var(--color-espresso-deep)]/30 px-6 py-3.5 text-sm font-semibold text-[var(--color-cream)] backdrop-blur-sm transition-colors hover:border-[var(--color-brass-bright)] hover:text-[var(--color-brass-bright)]"
              >
                Dijital Kataloğu Aç
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* İstatistik şeridi */}
        <div className="border-t border-[var(--color-cream)]/10 bg-[var(--color-espresso-deep)]/80 backdrop-blur-sm">
          <dl className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-[var(--color-cream)]/10 px-5 sm:px-8">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col px-3 py-6 text-center sm:px-6 sm:text-left">
                <dt className="order-2 mt-1 text-xs leading-tight text-[var(--color-cream)]/70 sm:text-sm">
                  {stat.label}
                </dt>
                <dd className="font-display text-2xl text-[var(--color-brass-bright)] sm:text-3xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* KOLEKSİYON HİKAYELERİ */}
      <StoryCircles />

      {/* HIGHLIGHTS */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-6 md:grid-cols-4">
          {highlights.map((item, i) => (
            <div
              key={item.title}
              className="animate-fade-up rounded-2xl border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/40 p-6"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <item.icon className="text-[var(--color-wood-dark)]" size={26} strokeWidth={1.6} />
              <h3 className="mt-4 font-display text-lg text-[var(--color-espresso)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]/60">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="bg-[var(--color-cream)]/50 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-wood)]">
                Seçili Ürünler
              </span>
              <h2 className="mt-2 font-display text-3xl text-[var(--color-espresso)] sm:text-4xl">
                Koleksiyondan öne çıkanlar
              </h2>
            </div>
            <Link
              to="/urunlerimiz"
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-wood-dark)] hover:underline"
            >
              Tüm ürünleri gör
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* DIGITAL CATALOG CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-10 rounded-3xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-8 shadow-sm sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="flex w-fit items-center gap-2 rounded-full bg-[var(--color-cream-deep)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-wood-dark)]">
              <QrCode size={14} /> Dijital Katalog
            </span>
            <h2 className="mt-4 font-display text-3xl text-[var(--color-espresso)] sm:text-4xl">
              QR kodu okutun, kataloğumuz cebinizde olsun
            </h2>
            <p className="mt-3 max-w-xl text-[var(--color-ink)]/65">
              Mağazanızda veya fuar standımızda müşterilerinizle paylaşmak için QR kodu
              kullanabilir, ya da aşağıdaki butondan doğrudan kataloğu açabilirsiniz. Tüm
              ürün görselleri, minimum sipariş adetleri ve açıklamalar tek sayfada.
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
