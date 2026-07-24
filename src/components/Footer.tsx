import { Link } from '@tanstack/react-router'
import { Instagram, Facebook, MapPin, Mail, Phone, Clock } from 'lucide-react'
import { siteConfig, buildWhatsAppLink, defaultWhatsAppMessage } from '@/lib/site-config'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

export function Footer() {
  return (
    <footer className="texture-grain relative overflow-hidden bg-[var(--color-espresso-deep)] text-[var(--color-cream)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Rustik Evi" className="h-10 w-10 shrink-0" />
            <span className="font-display text-xl">Rustik Evi</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--color-cream)]/70">
            Türkiye genelindeki perde mağazalarına ve dekorasyon noktalarına
            perde aksesuarı toptan tedariki sağlıyoruz.
            Her parti, atölyemizde özenle hazırlanır.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href={siteConfig.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-cream)]/20 transition-colors hover:border-[var(--color-brass)] hover:text-[var(--color-brass-bright)]"
            >
              <Instagram size={18} />
            </a>
            <a
              href={siteConfig.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-cream)]/20 transition-colors hover:border-[var(--color-brass)] hover:text-[var(--color-brass-bright)]"
            >
              <Facebook size={18} />
            </a>
            <a
              href={buildWhatsAppLink(defaultWhatsAppMessage)}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp Sipariş Hattı"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3fae5b]/50 text-[#3fae5b] transition-colors hover:border-[#3fae5b] hover:bg-[#3fae5b]/10"
            >
              <WhatsAppIcon size={18} />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-[var(--color-brass-bright)]">
            Sayfalar
          </h3>
          <nav className="mt-4 flex flex-col gap-2.5 text-sm text-[var(--color-cream)]/75">
            <Link to="/" className="w-fit hover:text-[var(--color-cream)]">Ana Sayfa</Link>
            <Link to="/urunlerimiz" className="w-fit hover:text-[var(--color-cream)]">Ürünlerimiz</Link>
            <Link to="/katalog" className="w-fit hover:text-[var(--color-cream)]">Dijital Katalog</Link>
            <Link to="/hakkinda" className="w-fit hover:text-[var(--color-cream)]">Hakkında</Link>
            <Link to="/iletisim" className="w-fit hover:text-[var(--color-cream)]">İletişim</Link>
          </nav>
        </div>

        <div>
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-[var(--color-brass-bright)]">
            İletişim
          </h3>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-[var(--color-cream)]/75">
            <li className="flex items-start gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--color-brass-bright)]" />
              {siteConfig.address}
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={16} className="shrink-0 text-[var(--color-brass-bright)]" />
              {siteConfig.phoneDisplay}
            </li>
            <li className="flex items-center gap-2.5">
              <Mail size={16} className="shrink-0 text-[var(--color-brass-bright)]" />
              {siteConfig.email}
            </li>
            <li className="flex items-center gap-2.5">
              <Clock size={16} className="shrink-0 text-[var(--color-brass-bright)]" />
              {siteConfig.workingHours}
            </li>
          </ul>
        </div>
      </div>

      <div className="thread-divider mx-5 sm:mx-8" />

      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-[var(--color-cream)]/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© 2026 {siteConfig.legalName}. Tüm hakları saklıdır.</span>
        <span>Bu bir tanıtım web sitesidir · Toptan satış için iletişime geçiniz</span>
      </div>
    </footer>
  )
}
