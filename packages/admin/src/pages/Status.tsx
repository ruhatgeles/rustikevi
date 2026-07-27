import { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'
import { Clock, Package, Truck, CheckCircle, GripVertical, X, MessageSquare } from 'lucide-react'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  itemStatus: string
}

interface OrderActivity {
  id: string
  type: string
  description: string
  createdAt: string
  userName: string | null
}

interface Order {
  id: string
  orderNumber: string
  customerId: string
  status: string
  totalAmount: number | null
  notes: string | null
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
    city: string | null
  }
}

const COLUMNS = [
  { key: 'pending', label: 'Beklemede', icon: Clock, color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { key: 'in_production', label: 'Üretimde', icon: Package, color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { key: 'shipped', label: 'Kargoya Verildi', icon: Truck, color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  { key: 'delivered', label: 'Teslim Edildi', icon: CheckCircle, color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
]

// Sipariş bu durumdaysa ilgili kolona düşer
const STATUS_TO_COLUMN: Record<string, string> = {
  pending: 'pending',
  quoted: 'pending',
  confirmed: 'pending',
  in_production: 'in_production',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: '',  // gösterilmez
  returned: '',   // gösterilmez
}

export default function Status() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [newNote, setNewNote] = useState('')
  const dragItem = useRef<string | null>(null)

  const loadOrders = async () => {
    try {
      const result = await api.request<{ data: Order[] }>('/api/orders?limit=200')
      setOrders(result.data)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30000) // 30sn'de bir yenile
    return () => clearInterval(interval)
  }, [])

  const loadOrderDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const order = await api.request<Order>(`/api/orders/${id}`)
      setSelectedOrder(order)
    } catch {} finally {
      setLoadingDetail(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.request(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      })
      if (selectedOrder?.id === orderId) loadOrderDetail(orderId)
      loadOrders()
    } catch {}
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
    } catch {}
  }

  const closeDetail = () => {
    setSelectedOrder(null)
    setNewNote('')
  }

  // Kolona göre siparişleri grupla
  const getColumnOrders = (columnKey: string) => {
    return orders.filter((o) => STATUS_TO_COLUMN[o.status] === columnKey)
  }

  // Sürükle-bırak
  const handleDragStart = (orderId: string) => {
    dragItem.current = orderId
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (columnKey: string) => {
    if (!dragItem.current) return
    const order = orders.find((o) => o.id === dragItem.current)
    if (!order) return

    // Kolona göre hedef durum belirle
    const targetStatus: Record<string, string> = {
      pending: 'pending',
      in_production: 'in_production',
      shipped: 'shipped',
      delivered: 'delivered',
    }

    const newStatus = targetStatus[columnKey]
    if (newStatus && order.status !== newStatus) {
      await handleStatusChange(order.id, newStatus)
    }
    dragItem.current = null
  }

  const formatPrice = (amount: number | null) => {
    if (!amount) return null
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-espresso)]">Durum</h1>
        <p className="mt-1 text-sm text-[var(--color-ink)]/50">
          Siparişleri sürükle-bırak ile durumlandırın
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const Icon = col.icon
            const columnOrders = getColumnOrders(col.key)
            return (
              <div
                key={col.key}
                className={`min-w-[300px] flex-1 rounded-xl border ${col.borderColor} bg-white/50`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.key)}
              >
                {/* Kolon başlığı */}
                <div className={`flex items-center gap-2 rounded-t-xl ${col.bgColor} px-4 py-3 border-b ${col.borderColor}`}>
                  <Icon size={18} className={col.color} />
                  <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  <span className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${col.bgColor} ${col.color}`}>
                    {columnOrders.length}
                  </span>
                </div>

                {/* Sipariş kartları */}
                <div className="min-h-[200px] space-y-2 p-3">
                  {columnOrders.length === 0 ? (
                    <div className="flex h-20 items-center justify-center text-xs text-[var(--color-ink)]/30">
                      Sipariş yok
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={() => handleDragStart(order.id)}
                        onClick={() => loadOrderDetail(order.id)}
                        className={`cursor-grab rounded-lg border p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
                          selectedOrder?.id === order.id
                            ? 'border-[var(--color-brass)] ring-1 ring-[var(--color-brass)]'
                            : 'border-[var(--color-cream-deep)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-[var(--color-wood-dark)]">
                            {order.orderNumber}
                          </span>
                          <GripVertical size={12} className="text-[var(--color-ink)]/20" />
                        </div>
                        <div className="mt-1.5 text-sm font-medium">{order.customerName}</div>
                        <div className="mt-1 flex items-center justify-between text-xs text-[var(--color-ink)]/50">
                          <span>{order.customerCity}</span>
                          {order.totalAmount && (
                            <span className="font-semibold text-[var(--color-wood-dark)]">
                              {formatPrice(order.totalAmount)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detay Paneli (overlay) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/20" onClick={closeDetail}>
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDetail ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
              </div>
            ) : (
              <div className="p-5">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between border-b border-[var(--color-cream-deep)] pb-4">
                  <div>
                    <div className="font-mono text-lg font-bold text-[var(--color-wood-dark)]">
                      {selectedOrder.orderNumber}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-ink)]/50">
                      {new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <button onClick={closeDetail} className="text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]">
                    <X size={20} />
                  </button>
                </div>

                {/* Müşteri */}
                {selectedOrder.customer && (
                  <div className="mb-4 rounded-lg bg-[var(--color-cream)]/50 p-3">
                    <div className="text-sm font-semibold">{selectedOrder.customer.businessName}</div>
                    <div className="mt-1 text-xs text-[var(--color-ink)]/60">
                      {selectedOrder.customer.contactName} · {selectedOrder.customer.phone}
                      {selectedOrder.customer.city && ` · ${selectedOrder.customer.city}`}
                    </div>
                  </div>
                )}

                {/* Durum butonları */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">Durum Değiştir</label>
                  <div className="flex flex-wrap gap-2">
                    {COLUMNS.map((col) => {
                      const Icon = col.icon
                      const isActive = STATUS_TO_COLUMN[selectedOrder.status] === col.key
                      return (
                        <button
                          key={col.key}
                          onClick={() => handleStatusChange(selectedOrder.id, col.key === 'pending' ? 'pending' : col.key === 'in_production' ? 'in_production' : col.key)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? `${col.bgColor} ${col.color} border-current`
                              : 'border-[var(--color-cream-deep)] text-[var(--color-ink)]/50 hover:border-current hover:text-current'
                          }`}
                        >
                          <Icon size={14} />
                          {col.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Ürünler */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">Ürünler</label>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="rounded-lg border border-[var(--color-cream-deep)] p-3">
                        <div className="text-sm font-medium">{item.productName}</div>
                        <div className="text-xs text-[var(--color-ink)]/50">{item.quantity} adet</div>
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

                {/* Notlar */}
                {selectedOrder.notes && (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium">Müşteri Notu</label>
                    <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{selectedOrder.notes}</div>
                  </div>
                )}

                {/* Not ekle */}
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium">Not Ekle</label>
                  <div className="flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Not ekle..."
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

                {/* Geçmiş */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Geçmiş</label>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {selectedOrder.activities?.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          activity.type === 'status_change' ? 'bg-blue-500' :
                          activity.type === 'note_added' ? 'bg-yellow-500' :
                          'bg-[var(--color-wood)]'
                        }`} />
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
      )}
    </div>
  )
}

