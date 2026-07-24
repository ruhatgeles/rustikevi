import { Link, createFileRoute } from '@tanstack/react-router'
import { Truck, PackageCheck, Ruler, Handshake, ArrowRight, QrCode } from 'lucide-react'
import products from '@/data/products'
import { ProductCard } from '@/components/ProductCard'
import { CatalogQRCode } from '@/components/CatalogQRCode'
import { buildWhatsAppLink, defaultWhatsAppMessage } from '@/lib/site-config'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Rustik Evi | Perde Aksesuarı Toptan Satış' },
      {
        name: 'description',
        content:
          'Rustik Evi, doğal malzemelerle üretilen perde aksesuarları toptan satış. Jüt kordon, ahşap halka, saçak, braçöl. 23 ilde teslimat.',
      },
    ],
  }),
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
  const featured = products.slice(0, 3)

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="texture-grain relative bg-[var(--color-espresso-deep)] pb-24 pt-20 text-[var(--color-cream)] sm:pt-28">
        <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[var(--color-brass)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-[var(--color-wood)]/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-brass)]/40 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-[var(--color-brass-bright)]">
              Toptan Perde Aksesuarı
            </span>
            <h1 className="mt-6 font-display text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              Vitrininize <span className="text-[var(--color-brass-bright)]">rustik</span>{' '}
              dokunuşlar katan perde aksesuarları.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--color-cream)]/70 sm:text-lg">
              Rustik Evi, Türkiye'nin dört bir yanındaki perde mağazalarına jüt ve deri
              detaylı perde aksesuarlarını toptan olarak ulaştırıyor.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href={buildWhatsAppLink(defaultWhatsAppMessage)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/20 transition-transform hover:-translate-y-0.5"
              >
                <WhatsAppIcon size={20} />
                WhatsApp'tan Sipariş Ver
              </a>
              <Link
                to="/katalog"
                className="flex items-center gap-2 rounded-full border border-[var(--color-cream)]/25 px-6 py-3.5 text-sm font-semibold text-[var(--color-cream)] transition-colors hover:border-[var(--color-brass-bright)] hover:text-[var(--color-brass-bright)]"
              >
                Dijital Kataloğu Aç
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-14 grid grid-cols-3 gap-6 border-t border-[var(--color-cream)]/10 pt-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-2xl text-[var(--color-brass-bright)] sm:text-3xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs leading-tight text-[var(--color-cream)]/55">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms]">
            <div className="absolute -inset-3 rounded-[2rem] border border-[var(--color-brass)]/20" />
            <div className="grid grid-cols-2 gap-4 rounded-[1.75rem] bg-[var(--color-cream)]/5 p-4">
              <div className="col-span-2 aspect-[16/10] animate-drift rounded-2xl bg-[linear-gradient(150deg,#c9a876,#6d4527)]" />
              <div className="aspect-square rounded-2xl bg-[linear-gradient(150deg,#8a5a3a,#3a2a1c)]" />
              <div className="aspect-square animate-drift rounded-2xl bg-[linear-gradient(150deg,#d8c6a3,#a9825a)] [animation-delay:1.2s]" />
            </div>
          </div>
        </div>
      </section>

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
