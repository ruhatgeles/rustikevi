import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Ana Sayfa' },
  { to: '/urunlerimiz', label: 'Ürünlerimiz' },
  { to: '/hakkinda', label: 'Hakkında' },
  { to: '/iletisim', label: 'İletişim' },
] as const

export function Header() {
  const [open, setOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-cream-deep)] bg-[var(--color-linen)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" className="group flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Rustik Evi"
            className="h-10 w-10 shrink-0 transition-transform duration-500 group-hover:rotate-12"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl tracking-wide text-[var(--color-espresso)]">
              Rustik Evi
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-wood)]">
              Toptan Perde Aksesuarı
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`relative pb-1 text-sm font-medium tracking-wide transition-colors ${
                pathname === item.to
                  ? 'text-[var(--color-wood-dark)]'
                  : 'text-[var(--color-ink)]/70 hover:text-[var(--color-wood-dark)]'
              }`}
            >
              {item.label}
              {pathname === item.to && (
                <span className="absolute -bottom-0.5 left-0 h-[2px] w-full bg-[var(--color-brass)]" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            to="/iletisim"
            className="rounded-full bg-[var(--color-wood-dark)] px-5 py-2.5 text-sm font-semibold text-[var(--color-linen)] shadow-sm transition-all hover:bg-[var(--color-espresso)] hover:shadow-md"
          >
            Toptan Sipariş Ver
          </Link>
        </div>

        <button
          aria-label="Menüyü aç"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-espresso)] transition-colors active:bg-[var(--color-cream-deep)] md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-[var(--color-cream-deep)] bg-[var(--color-linen)] px-5 pb-5 pt-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                pathname === item.to
                  ? 'bg-[var(--color-cream-deep)] text-[var(--color-wood-dark)]'
                  : 'text-[var(--color-ink)]/80'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/iletisim"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-[var(--color-wood-dark)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--color-linen)]"
          >
            Toptan Sipariş Ver
          </Link>
        </nav>
      )}
    </header>
  )
}
