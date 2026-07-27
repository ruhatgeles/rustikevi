import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import {
  Plus,
  Search,
  X,
  Eye,
  ChevronRight,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'

interface OrderItem {
  id: string
  productId: number | null
  productName: string
  quantity: number
  unitPrice: number | null
  totalPrice: number | null
  specifications: string | null
}

interface OrderActivity {
  id: string
  type: string
  description: string
  metadata: Record<string, unknown>
  createdAt: string
  userName: string | null
}

interface Order {
  id: string
  orderNumber: string
  customerId: string
  status: string
  totalAmount: number | null
  currency: string
  notes: string | null
  internalNotes: string | null
  source: string
  createdAt: string
  updatedAt: string
  customerName?: string
  customerPhone?: string
  customerCity?: string
  items?: OrderItem[]
  activities?: OrderActivity[]
  customer?: {
    id: string
    businessName: string
    contactName: string
    phone: string
    email: string | null
    city: string | null
  }
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Beklemede',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    icon: Clock,
  },
  quoted: {
    label: 'Teklif Verildi',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    icon: MessageSquare,
  },
  confirmed: {
    label: 'Onaylandı',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    icon: CheckCircle,
  },
  in_production: {
    label: 'Üretimde',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    icon: Package,
  },
  shipped: {
    label: 'Kargoya Verildi',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    icon: Truck,
  },
  delivered: {
    label: 'Teslim Edildi',
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'İptal Edildi',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: XCircle,
  },
}

const STATUS_OPTIONS = [
  'pending',
  'quoted',
  'confirmed',
  'in_production',
  'shipped',
  'delivered',
  'cancelled',
]

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Telefon',
  website: 'Web Sitesi',
  'walk-in': 'Mağaza',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['quoted', 'confirmed', 'cancelled'],
  quoted: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

function formatPrice(amount: number | null, currency: string = 'TRY') {
  if (!amount) return '-'
  const lira = amount / 100
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency === 'TRY' ? 'TRY' : 'USD',
  }).format(lira)
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filterStatus) params.set('status', filterStatus)
      if (search) params.set('search', search)
      const result = await api.request<{ data: Order[] }>(`/api/orders?${params}`)
      setOrders(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [filterStatus])

  const loadOrderDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const order = await api.request<Order>(`/api/orders/${id}`)
      setSelectedOrder(order)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleStatusChange = async () => {
    if (!selectedOrder || !newStatus) return
    try {
      await api.request(`/api/orders/${selectedOrder.id}/status`, {
        method: 'PATCH',
        body: { status: newStatus, note: statusNote || undefined },
      })
      setNewStatus('')
      setStatusNote('')
      loadOrderDetail(selectedOrder.id)
      loadOrders()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleAddNote = async () => {
    if (!selectedOrder || !newNote.trim()) return
    try {
      await api.request(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        body: { internalNotes: newNote },
      })
      setNewNote('')
      loadOrderDetail(selectedOrder.id)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const closeDetail = () => {
    setSelectedOrder(null)
    setNewNote('')
    setNewStatus('')
    setStatusNote('')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-espresso)]">Siparişler</h1>
        <p className="mt-1 text-sm text-[var(--color-ink)]/50">
          Sipariş taleplerini yönetin, durum güncelleyin.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/40"
          />
          <input
            type="text"
            placeholder="Sipariş no, müşteri adı..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
            className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-white py-2 pl-9 pr-4 outline-none focus:border-[var(--color-brass)]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-[var(--color-cream-deep)] bg-white px-3 py-2 outline-none focus:border-[var(--color-brass)]"
        >
          <option value="">Tüm Durumlar</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Order List */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-8 text-center text-[var(--color-ink)]/40">
              Sipariş bulunamadı
            </div>
          ) : (
            orders.map((order) => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
              const Icon = config.icon
              const isSelected = selectedOrder?.id === order.id
              return (
                <button
                  key={order.id}
                  onClick={() => loadOrderDetail(order.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-[var(--color-brass)] bg-white shadow-sm'
                      : 'border-[var(--color-cream-deep)] bg-white hover:border-[var(--color-brass)]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-[var(--color-wood-dark)]">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.bgColor} ${config.color}`}
                      >
                        <Icon size={12} />
                        {config.label}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-[var(--color-ink)]/30" />
                  </div>
                  <div className="mt-2 text-sm font-medium">{order.customerName}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-[var(--color-ink)]/50">
                    <span>
                      {order.customerCity || '-'} · {SOURCE_LABELS[order.source] || order.source}
                    </span>
                    <span>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Order Detail */}
        <div>
          {!selectedOrder ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[var(--color-cream-deep)] bg-white text-[var(--color-ink)]/40">
              Sipariş detayı için listeden seçin
            </div>
          ) : loadingDetail ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[var(--color-cream-deep)] bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-5">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between border-b border-[var(--color-cream-deep)] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-[var(--color-wood-dark)]">
                      {selectedOrder.orderNumber}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_CONFIG[selectedOrder.status]?.bgColor
                      } ${STATUS_CONFIG[selectedOrder.status]?.color}`}
                    >
                      {STATUS_CONFIG[selectedOrder.status]?.label}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-ink)]/50">
                    {new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}
                  </div>
                </div>
                <button onClick={closeDetail} className="text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]">
                  <X size={18} />
                </button>
              </div>

              {/* Customer Info */}
              {selectedOrder.customer && (
                <div className="mb-4 rounded-lg bg-[var(--color-cream)]/50 p-3">
                  <div className="text-sm font-semibold">{selectedOrder.customer.businessName}</div>
                  <div className="mt-1 text-xs text-[var(--color-ink)]/60">
                    {selectedOrder.customer.contactName} · {selectedOrder.customer.phone}
                    {selectedOrder.customer.city && ` · ${selectedOrder.customer.city}`}
                  </div>
                </div>
              )}

              {/* Status Change */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Durum Değiştir</label>
                <div className="flex gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
                  >
                    <option value="">Yeni durum seçin</option>
                    {(VALID_TRANSITIONS[selectedOrder.status] || []).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleStatusChange}
                    disabled={!newStatus}
                    className="rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50"
                  >
                    Uygula
                  </button>
                </div>
                {newStatus && (
                  <input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Not (opsiyonel)"
                    className="mt-2 w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
                  />
                )}
              </div>

              {/* Items */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium">Ürünler</label>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-cream-deep)] p-3"
                    >
                      <div>
                        <div className="text-sm font-medium">{item.productName}</div>
                        <div className="text-xs text-[var(--color-ink)]/50">
                          {item.quantity} adet
                          {item.specifications && ` · ${item.specifications}`}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatPrice(item.totalPrice)}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedOrder.totalAmount && (
                  <div className="mt-2 flex justify-between border-t border-[var(--color-cream-deep)] pt-2 text-sm font-bold">
                    <span>Toplam</span>
                    <span>{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium">Müşteri Notu</label>
                  <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Dahili Not</label>
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Dahili not ekle..."
                    rows={2}
                    className="flex-1 rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="self-end rounded-lg bg-[var(--color-cream-deep)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-brass)]/20 disabled:opacity-50"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <label className="mb-2 block text-sm font-medium">Geçmiş</label>
                <div className="space-y-3">
                  {selectedOrder.activities?.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-wood)]" />
                      <div>
                        <div className="text-sm">{activity.description}</div>
                        <div className="text-xs text-[var(--color-ink)]/40">
                          {activity.userName && `${activity.userName} · `}
                          {new Date(activity.createdAt).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
