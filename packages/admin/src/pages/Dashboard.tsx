import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Users, FileText, KeyRound, UserCheck, ShoppingCart, Clock, Package } from 'lucide-react'

interface Stats {
  users: number
  customers: number
  content: number
  inviteCodes: number
  orders: number
  pendingOrders: number
}

interface RecentOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number | null
  createdAt: string
  customerName: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  quoted: 'Teklif Verildi',
  confirmed: 'Onaylandı',
  in_production: 'Üretimde',
  shipped: 'Kargoya Verildi',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  quoted: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-green-50 text-green-700',
  in_production: 'bg-purple-50 text-purple-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-50 text-red-700',
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Paralel istekler, hata olsa bile devam et
        const [usersResult, customersResult, contentResult, orderStatsResult] = await Promise.allSettled([
          api.request<{ total: number }>('/api/users?limit=1'),
          api.request<{ total: number }>('/api/customers?limit=1'),
          api.request<any[]>('/api/content'),
          api.request<{
            total: number
            byStatus: Record<string, number>
            recentOrders: RecentOrder[]
          }>('/api/orders/stats'),
        ])

        const users = usersResult.status === 'fulfilled' ? usersResult.value : { total: 0 }
        const customers = customersResult.status === 'fulfilled' ? customersResult.value : { total: 0 }
        const content = contentResult.status === 'fulfilled' ? contentResult.value : []
        const orderStats = orderStatsResult.status === 'fulfilled' ? orderStatsResult.value : { total: 0, byStatus: {}, recentOrders: [] }

        setStats({
          users: users.total,
          customers: customers.total,
          content: content.length,
          inviteCodes: 0,
          orders: orderStats.total,
          pendingOrders: orderStats.byStatus?.pending || 0,
        })
        setRecentOrders(orderStats.recentOrders || [])
      } catch {
        setStats({ users: 0, customers: 0, content: 0, inviteCodes: 0, orders: 0, pendingOrders: 0 })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
      </div>
    )
  }

  const cards = [
    {
      label: 'Toplam Sipariş',
      value: stats?.orders || 0,
      icon: ShoppingCart,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Bekleyen Sipariş',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
    },
    { label: 'Müşteriler', value: stats?.customers || 0, icon: UserCheck, color: 'bg-green-50 text-green-600' },
    { label: 'Kullanıcılar', value: stats?.users || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
  ]

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-[var(--color-espresso)] sm:mb-6 sm:text-2xl">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-3 sm:p-5"
            >
              <div className="mb-2 flex items-center justify-between sm:mb-3">
                <span className="text-xs text-[var(--color-ink)]/50 sm:text-sm">{card.label}</span>
                <div className={`rounded-lg p-1.5 sm:p-2 ${card.color}`}>
                  <Icon size={16} className="sm:hidden" />
                  <Icon size={18} className="hidden sm:block" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[var(--color-espresso)] sm:text-3xl">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="mt-6 sm:mt-8">
          <h2 className="mb-3 text-base font-semibold text-[var(--color-espresso)] sm:mb-4 sm:text-lg">
            Son Siparişler
          </h2>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-[var(--color-cream-deep)] bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Sipariş No</th>
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[var(--color-cream-deep)] last:border-0"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-[var(--color-wood-dark)]">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink)]/50">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-2 md:hidden">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-[var(--color-wood-dark)]">
                    {order.orderNumber}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[var(--color-ink)]/50">
                  <span>{order.customerName}</span>
                  <span>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
