import { buildWhatsAppLink, defaultWhatsAppMessage } from '@/lib/site-config'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

export function WhatsAppFloatingButton() {
  return (
    <a
      href={buildWhatsAppLink(defaultWhatsAppMessage)}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp üzerinden hızlı sipariş oluştur"
      className="group fixed bottom-6 right-5 z-50 flex items-center gap-3 rounded-full bg-[#25D366] py-3 pl-4 pr-4 text-white shadow-[0_8px_24px_rgba(37,211,102,0.45)] transition-all duration-300 hover:pr-5 sm:bottom-8 sm:right-8"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366]/50 [animation-duration:2.5s]" />
      <WhatsAppIcon size={26} />
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[160px] sm:inline-block">
        Hızlı Sipariş Ver
      </span>
    </a>
  )
}
