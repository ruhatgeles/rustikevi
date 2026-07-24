import { createFileRoute } from '@tanstack/react-router'
import { MapPin, Mail, Phone, Clock, Instagram, Facebook } from 'lucide-react'
import { siteConfig, buildWhatsAppLink, defaultWhatsAppMessage } from '@/lib/site-config'
import { WhatsAppOrderForm } from '@/components/WhatsAppOrderForm'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

export const Route = createFileRoute('/iletisim')({
  component: ContactPage,
})

function ContactPage() {
  return (
    <div>
      <section className="texture-grain bg-[var(--color-espresso-deep)] px-5 py-16 text-[var(--color-cream)] sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brass-bright)]">
            Sipariş & İletişim
          </span>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">İletişim</h1>
          <p className="mt-4 max-w-2xl text-[var(--color-cream)]/70">
            Toptan sipariş taleplerinizi en hızlı şekilde WhatsApp sipariş hattımızdan
            alıyoruz. Aşağıdaki formu doldurmanız yeterli.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
          <div className="flex flex-col gap-8">
            <a
              href={buildWhatsAppLink(defaultWhatsAppMessage)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/10 p-5 transition-colors hover:bg-[#25D366]/15"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                <WhatsAppIcon size={24} />
              </span>
              <div>
                <div className="font-display text-lg text-[var(--color-espresso)]">
                  WhatsApp Sipariş Hattı
                </div>
                <div className="text-sm text-[var(--color-ink)]/60">
                  {siteConfig.phoneDisplay} · Anında yanıt
                </div>
              </div>
            </a>

            <div className="rounded-2xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-6">
              <h3 className="font-display text-lg text-[var(--color-espresso)]">
                İletişim Bilgileri
              </h3>
              <ul className="mt-4 flex flex-col gap-4 text-sm text-[var(--color-ink)]/70">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-[var(--color-wood-dark)]" />
                  {siteConfig.address}
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="shrink-0 text-[var(--color-wood-dark)]" />
                  {siteConfig.phoneDisplay}
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="shrink-0 text-[var(--color-wood-dark)]" />
                  {siteConfig.email}
                </li>
                <li className="flex items-center gap-3">
                  <Clock size={18} className="shrink-0 text-[var(--color-wood-dark)]" />
                  {siteConfig.workingHours}
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-6">
              <h3 className="font-display text-lg text-[var(--color-espresso)]">
                Sosyal Medya
              </h3>
              <p className="mt-1.5 text-sm text-[var(--color-ink)]/60">
                Yeni koleksiyonlarımızı ve toptan kampanyalarımızı takip edin.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href={siteConfig.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-cream-deep)] text-[var(--color-wood-dark)] transition-colors hover:border-[var(--color-brass)] hover:bg-[var(--color-cream-deep)]"
                >
                  <Instagram size={19} />
                </a>
                <a
                  href={siteConfig.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-cream-deep)] text-[var(--color-wood-dark)] transition-colors hover:border-[var(--color-brass)] hover:bg-[var(--color-cream-deep)]"
                >
                  <Facebook size={19} />
                </a>
                <a
                  href={buildWhatsAppLink(defaultWhatsAppMessage)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#25D366]/40 text-[#1f9c53] transition-colors hover:bg-[#25D366]/10"
                >
                  <WhatsAppIcon size={19} />
                </a>
              </div>
            </div>
          </div>

          <WhatsAppOrderForm />
        </div>
      </section>
    </div>
  )
}
