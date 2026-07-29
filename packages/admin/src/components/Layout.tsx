import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useDebug } from '../lib/debug'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  KeyRound,
  LogOut,
  Package,
  ShoppingCart,
  Bug,
  BarChart3,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'viewer'] },
  { to: '/status', label: 'Durum', icon: BarChart3, roles: ['admin', 'manager'] },
  { to: '/orders', label: 'Siparişler', icon: ShoppingCart, roles: ['admin', 'manager'] },
  { to: '/products', label: 'Ürünler', icon: Package, roles: ['admin', 'manager'] },
  { to: '/customers', label: 'Müşteriler', icon: Users, roles: ['admin', 'manager'] },
  { to: '/content', label: 'İçerik', icon: FileText, roles: ['admin', 'manager'] },
  { to: '/users', label: 'Kullanıcılar', icon: UserPlus, roles: ['admin'] },
  { to: '/invite-codes', label: 'Davet Kodları', icon: KeyRound, roles: ['admin'] },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { debugMode, toggleDebug, isAdmin } = useDebug()
  const location = useLocation()

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(user?.role || '')
  )

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-[var(--color-cream-deep)] bg-white">
        <div className="flex items-center gap-3 border-b border-[var(--color-cream-deep)] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-wood)] text-sm font-bold text-white">
            RE
          </div>
          <div>
            <p className="font-semibold text-[var(--color-espresso)]">Rustik Evi</p>
            <p className="text-xs text-[var(--color-ink)]/50">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          {filteredNav.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-wood)]/10 text-[var(--color-wood-dark)]'
                    : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)]'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--color-cream-deep)] p-4">
          {/* Debug Toggle - Sadece admin kullanıcılar görebilir */}
          {isAdmin && (
            <button
              onClick={toggleDebug}
              className={`mb-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                debugMode
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-[var(--color-ink)]/40 hover:bg-[var(--color-cream)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Bug size={16} />
                Debug Modu
              </span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  debugMode ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    debugMode ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>
          )}

          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-cream-deep)] text-xs font-bold text-[var(--color-wood-dark)]">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-[var(--color-ink)]/50">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut size={16} />
            Çıkış
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[var(--color-linen)] p-8">
        {children}
      </main>
    </div>
  )
}
