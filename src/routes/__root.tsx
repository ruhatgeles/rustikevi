import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton'

import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Rustik Evi | Perde Aksesuarı Toptan Satış',
      },
      {
        name: 'description',
        content:
          'Rustik Evi, Türkiye genelindeki perde mağazaları ve dekorasyon noktaları için perde aksesuarı toptan tedarikçisidir. Dijital kataloğumuzu inceleyin, WhatsApp üzerinden hızlı sipariş oluşturun.',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppFloatingButton />
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-32 text-center">
      <span className="font-display text-6xl text-[var(--color-wood)]">404</span>
      <h1 className="mt-4 font-display text-2xl text-[var(--color-espresso)]">
        Aradığınız sayfa bulunamadı
      </h1>
      <p className="mt-2 text-[var(--color-ink)]/60">
        Bağlantı hatalı olabilir. Ana sayfaya dönerek ürünlerimize göz atabilirsiniz.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--color-wood-dark)] px-6 py-3 text-sm font-semibold text-[var(--color-linen)] transition-colors hover:bg-[var(--color-espresso)]"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  )
}
