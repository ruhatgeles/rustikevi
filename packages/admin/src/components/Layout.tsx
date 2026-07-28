import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  LogOut,
  UserCircle,
  Key,
  Bug,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useDebug } from '../lib/debug'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/durum', icon: BarChart3, label: 'Durum' },
  { to: '/siparisler', icon: ShoppingCart, label: 'Siparişler' },
  { to: '/urunler', icon: Package, label: 'Ürünler' },
  { to: '/musteriler', icon: Users, label: 'Müşteriler' },
  { to: '/icerik', icon: FileText, label: 'İçerik' },
  { to: '/kullanicilar', icon: UserCircle, label: 'Kullanıcılar' },
  { to: '/davet-kodlari', icon: Key, label: 'Davet Kodları' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { debugMode, toggleDebug } = useDebug()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(collapsed))
  }, [collapsed])

  const handleLogout = () => {
    logout()
    navigate('/giris')
  }

  return (
    <div className="flex h-screen bg-[var(--color-cream)]">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-[var(--color-cream-deep)] bg-white transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Logo + Toggle */}
        <div className={`flex h-16 items-center border-b border-[var(--color-cream-deep)] ${collapsed ? 'justify-center' : 'justify-between px-4'}`}>
          {!collapsed && (
            <div>
              <h1 className="font-display text-lg font-bold text-[var(--color-espresso)]">Rustik Evi</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-brass)]">Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
            title={collapsed ? 'Genişlet' : 'Daralt'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--color-cream)] text-[var(--color-wood-dark)]'
                        : 'text-[var(--color-ink)]/60 hover:bg-[var(--color-cream)]/50 hover:text-[var(--color-ink)]'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info + Debug Toggle */}
        <div className="border-t border-[var(--color-cream-deep)] p-2">
          {/* Debug Mode Toggle */}
          <div
            className={`mb-2 flex items-center rounded-lg px-3 py-2 ${
              debugMode ? 'bg-orange-50' : ''
            } ${collapsed ? 'justify-center' : 'gap-2'}`}
            title={collapsed ? `Debug Modu: ${debugMode ? 'Açık' : 'Kapalı'}` : undefined}
          >
            <Bug size={16} className={debugMode ? 'text-orange-600' : 'text-[var(--color-ink)]/30'} />
            {!collapsed && (
              <>
                <span className={`flex-1 text-xs font-medium ${debugMode ? 'text-orange-700' : 'text-[var(--color-ink)]/40'}`}>
                  Debug Modu
                </span>
                <button
                  onClick={toggleDebug}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    debugMode ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      debugMode ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </>
            )}
            {collapsed && (
              <button
                onClick={toggleDebug}
                className="absolute inset-0"
                aria-label="Toggle debug"
              />
            )}
          </div>

          {/* User */}
          <div className={`mb-2 ${collapsed ? 'px-0' : 'px-3'}`}>
            {!collapsed ? (
              <div className="truncate text-xs text-[var(--color-ink)]/50">
                {user?.name || user?.email}
                <span className="ml-1 rounded bg-[var(--color-cream-deep)] px-1 py-0.5 text-[10px] uppercase">
                  {user?.role}
                </span>
              </div>
            ) : (
              <div className="flex justify-center" title={user?.name || user?.email}>
                <UserCircle size={16} className="text-[var(--color-ink)]/40" />
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Çıkış' : undefined}
          >
            <LogOut size={16} />
            {!collapsed && <span>Çıkış</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
