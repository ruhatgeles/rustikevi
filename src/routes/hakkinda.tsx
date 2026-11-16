import type React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Factory, Hammer, Users2, ArrowRight } from 'lucide-react'
import { getAboutHero, getAboutValues, getAboutTimeline, getAboutCta } from '@/lib/content'

const iconMap: Record<string, typeof Factory> = { Factory, Hammer, Users2 }

export const Route = createFileRoute('/hakkinda')({
  head: () => ({
    links: [{ rel: 'canonical', href: 'https://rustikevi.com/hakkinda' }],
    meta: [
      { property: 'og:url', content: 'https://rustikevi.com/hakkinda' },
      { title: 'Hakkında | Rustik Evi' },
      {
        name: 'description',
        content:
          'Rustik Evi hikayesi. El yapımı, doğal malzemelerle üretilen perde aksesuarları. 23 ilde toptan satış ağı.',
      },
    ],
  }),
  loader: async () => {
    const [hero, values, timeline, cta] = await Promise.all([
      getAboutHero(),
      getAboutValues(),
      getAboutTimeline(),
      getAboutCta(),
    ])
    return { hero, values, timeline, cta }
  },
  component: AboutPage,
})

// Fallback data
const fallbackHero = {
  badge: 'Hikayemiz',
  heading: 'Hakkında',
  description:
    "Rustik Evi, perde satışıyla başlayan bir aile işletmesi olarak Gaziantep'te yola çıktı; bugün kendi atölyesinde ürettiği perde aksesuarlarıyla Türkiye'nin dört bir yanındaki perde mağazalarının toptan tedarikçisi olmanın gururunu yaşıyor.",
}

const fallbackValues = [
  {
    icon: 'Factory',
    title: 'Kendi Atölyemizde Üretim',
    text: 'Ürünlerimizin tamamı hazır parça değil, kendi atölyemizde elle üretilen özgün tasarımlardır.',
  },
  {
    icon: 'Hammer',
    title: 'El İşçiliği',
    text: 'Aksesuarlarımızın büyük bölümü, yılların verdiği tecrübeyle çalışan ustalarımızın elinden çıkıyor.',
  },
  {
    icon: 'Users2',
    title: 'Toptan Ortaklık',
    text: 'Toptan müşterilerimizi sadece alıcı değil, uzun soluklu iş ortağı olarak görüyoruz.',
  },
]

const fallbackTimeline = [
  {
    year: '2019',
    title: 'Perde satışıyla başladı',
    text: "Gaziantep'te küçük bir perde mağazası olarak yola çıktık ve zamanla rustik perde aksesuarları üretimine yöneldik.",
  },
  {
    year: '2020',
    title: 'Perde aksesuarı üretimine geçiş',
    text: 'Deri detaylı halka ve kordon üretimini bünyemize katarak ürün yelpazemizi genişlettik.',
  },
  {
    year: '2023',
    title: '23 ilde toptan mağaza ağı',
    text: "Türkiye genelinde 180'in üzerinde perde mağazasına düzenli toptan sevkiyat yapmaya başladık.",
  },
  {
    year: '2026',
    title: 'Dijital katalog ve genişleme',
    text: 'Anlaşmalı mağazalarımızla daha hızlı iletişim kurmak için dijital kataloğumuzu ve WhatsApp sipariş hattımızı hayata geçirdik.',
  },
]

const fallbackCta = {
  heading: 'Toptan iş ortağımız olmak ister misiniz?',
  description:
    'Toptan iş birliği koşullarımız, güncel fiyat listemiz ve numune talepleriniz için bizimle iletişime geçin.',
  buttonText: 'İletişime Geç',
}

/** API'den gelen items dizisini doğrular; alanları string'e çevirir, bozuksa fallback döner. */
function toItems<K extends string>(
  raw: unknown,
  keys: readonly K[],
  fallback: Array<Record<K, string>>,
): Array<Record<K, string>> {
  if (!Array.isArray(raw)) return fallback
  const items = raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x))
    .map((x) => {
      const out = {} as Record<K, string>
      for (const k of keys) out[k] = x[k] == null ? '' : String(x[k])
      return out
    })
  return items.length > 0 ? items : fallback
}

/** Metadata nesnesindeki metin alanlarını doğrular; string olmayan/boş alan fallback'ten gelir. */
function toFields<T extends Record<string, string>>(raw: unknown, fallback: T): T {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback
  const src = raw as Record<string, unknown>
  const out = { ...fallback }
  for (const k of Object.keys(fallback) as Array<keyof T>) {
    const v = src[k as string]
    if (typeof v === 'string' && v.trim() !== '') out[k] = v as T[keyof T]
    else if (typeof v === 'number') out[k] = String(v) as T[keyof T]
  }
  return out
}

function AboutPage() {
  const { hero, values, timeline, cta } = Route.useLoaderData()

  const heroData = toFields(hero?.metadata, fallbackHero)
  // Admin editöründe 'items' string'e dönüşebilir → yalnızca geçerli dizi kabul edilir
  const valuesData = toItems(values?.metadata?.items, ['icon', 'title', 'text'], fallbackValues)
  const timelineData = toItems(
    timeline?.metadata?.items,
    ['year', 'title', 'text'],
    fallbackTimeline,
  )
  const ctaData = toFields(cta?.metadata, fallbackCta)

  return (
    <div>
      <section className="page-hero texture-grain px-5 py-16 text-[var(--color-cream)] sm:px-8 sm:py-24" style={{ '--page-hero-image': 'url(/img/hero-detail-chair.webp)' } as React.CSSProperties}>
        <div className="mx-auto max-w-7xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brass-bright)]">
            {heroData.badge}
          </span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">{heroData.heading}</h1>
          <p className="mt-4 max-w-2xl text-[var(--color-cream)]/70">{heroData.description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {valuesData.map((v, i) => {
            const Icon = iconMap[v.icon] || Factory
            return (
              <div
                key={`${v.title}-${i}`}
                className="rounded-2xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-6"
              >
                <Icon className="text-[var(--color-wood-dark)]" size={26} strokeWidth={1.6} />
                <h3 className="mt-4 font-display text-lg text-[var(--color-espresso)]">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]/60">
                  {v.text}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-[var(--color-cream)]/50 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-3xl text-[var(--color-espresso)] sm:text-4xl">
            Yolculuğumuz
          </h2>
          <div className="mt-10 flex flex-col gap-0">
            {timelineData.map((item, i) => (
              <div key={`${item.year}-${i}`} className="relative flex gap-6 pb-10 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-wood-dark)] text-xs font-bold text-[var(--color-linen)]">
                    {item.year.slice(-2)}
                  </span>
                  {i !== timelineData.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-[var(--color-cream-deep)]" />
                  )}
                </div>
                <div className="pt-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-wood)]">
                    {item.year}
                  </span>
                  <h3 className="mt-1 font-display text-xl text-[var(--color-espresso)]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--color-ink)]/60">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8">
        <h2 className="font-display text-3xl text-[var(--color-espresso)] sm:text-4xl">
          {ctaData.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[var(--color-ink)]/65">
          {ctaData.description}
        </p>
        <Link
          to="/iletisim"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-wood-dark)] px-6 py-3 text-sm font-semibold text-[var(--color-linen)] transition-colors hover:bg-[var(--color-espresso)]"
        >
          {ctaData.buttonText}
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  )
}
