import { MapPin } from 'lucide-react'
import { siteConfig } from '@/lib/site-config'

export function TopBar() {
  return (
    <div className="bg-[var(--color-espresso-deep)] px-5 py-2 text-[var(--color-cream)]/75 sm:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs">
        <MapPin size={13} className="shrink-0 text-[var(--color-brass-bright)]" />
        <span className="truncate">{siteConfig.shortAddress}</span>
      </div>
    </div>
  )
}
