import { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'
import {
  ClipboardList,
  Factory,
  Wrench,
  PackageCheck,
  Truck,
  CheckCircle,
  GripVertical,
  X,
  Package,
  ArrowLeftRight,
} from 'lucide-react'
import ExchangeModal from '../components/ExchangeModal'

interface OrderItem {
  id: string
  orderId: string
  productName: string
  quantity: number
  unitPrice: number | null
  itemStatus: string
  specifications: string | null
  isExchanged: boolean
  exchangeNote: string | null
}

interface Order {
  id: string
  orderNumber: string
  customerId: string
  status: string
  totalAmount: number | null
  notes: string | null
  trackingNumber: string | null
  createdAt: string
  updatedAt: string
  customerName?: string
  customerPhone?: string
  customerCity?: string
  items?: OrderItem[]
}

interface KanbanItem extends OrderItem {
  orderNumber: string
  customerName: string
  customerCity: string
}

const COLUMNS = [
  {
    key: 'pending',
    label: 'Beklemede',
    icon: ClipboardList,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  {
    key: 'confirmed',
    label: 'Onaylandı',
    icon: ClipboardList,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    key: 'atelier',
    label: 'Atölye',
    icon: Wrench,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  {
    key: 'in_production',
    label: 'Üretim',
    icon: Factory,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    key: 'ready',
    label: 'Hazır',
    icon: PackageCheck,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    key: 'shipped',
    label: 'Kargo',
    icon: Truck,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    key: 'delivered',
    label: 'Teslim',
    icon: CheckCircle,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
]

const ITEM_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_production: 'bg-yellow-100 text-yellow-700',
  atelier: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-gray-200 text-gray-800',
  returned: 'bg-red-100 text-red-700',
  exchanged: 'bg-pink-100 text-pink-700',
}

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  in_production: 'Üretimde',
  atelier: 'Atölyede',
  ready: 'Hazır',
  shipped: 'Kargoda',
  delivered: 'Teslim',
  returned: 'İade',
  exchanged: 'Değişim',
}

export default function Status() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [exchangeLoading, setExchangeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragItem = useRef<string | null>(null)

  const loadOrders = async () => {
    try {
      const result = await api.request<{ data: Order[] }>('/api/orders?limit=200')
      setOrders(result.data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Siparişler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadOrderDetail = async (id: string) => {
    setLoadingDetail(true)
    try {
      const order = await api.request<Order>(`/api/orders/${id}`)
      setSelectedOrder(order)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Sipariş detayı yüklenemedi')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleItemStatusChange = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      await api.request(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      })
      setError(null)
      if (selectedOrder?.id === orderId) loadOrderDetail(orderId)
      loadOrders()
    } catch (err: any) {
      setError(err.message || 'Durum güncellenemedi')
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
      setError(null)
      loadOrderDetail(selectedOrder.id)
    } catch (err: any) {
      setError(err.message || 'Not eklenemedi')
    }
  }

  const handleExchange = async (data: {
    oldItems: Array<{ orderItemId: string; quantity: number; note?: string }>
    newItems: Array<{ productName: string; quantity: number; unitPrice?: number; specifications?: string }>
    note?: string
  }) => {
    if (!selectedOrder) return
    setExchangeLoading(true)
    try {
      await api.request(`/api/orders/${selectedOrder.id}/exchange`, {
        method: 'POST',
        body: data,
      })
      setShowExchangeModal(false)
      setError(null)
      loadOrderDetail(selectedOrder.id)
      loadOrders()
    } catch (err: any) {
      setError(err.message || 'Değişim işlemi başarısız')
    } finally {
      setExchangeLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedOrder(null)
    setNewNote('')
  }

  // Tüm siparişlerden kalemleri düzleştir
  const getAllItems = (): KanbanItem[] => {
    const items: KanbanItem[] = []
    for (const order of orders) {
      if (order.items) {
        for (const item of order.items) {
          items.push({
            ...item,
            orderNumber: order.orderNumber,
            customerName: order.customerName || '',
            customerCity: order.customerCity || '',
          })
        }
      }
    }
    return items
  }

  const allItems = getAllItems()

  // Sütuna göre kalemleri grupla
  const getColumnItems = (columnKey: string): KanbanItem[] => {
    return allItems.filter((item) => item.itemStatus === columnKey)
  }

  // Sürükle-bırak
  const handleDragStart = (itemId: string) => {
    dragItem.current = itemId
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (columnKey: string) => {
    if (!dragItem.current) return

    // Kalemi bul
    const item = allItems.find((i) => i.id === dragItem.current)
    if (!item || item.itemStatus === columnKey) {
      dragItem.current = null
      return
    }

    // Durum güncelle
    await handleItemStatusChange(item.orderId, item.id, columnKey)
    dragItem.current = null
  }

  const formatPrice = (amount: number | null) => {
    if (!amount) return null
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100)
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-[var(--color-espresso)] sm:text-2xl">Durum</h1>
        <p className="mt-1 text-xs text-[var(--color-ink)]/50 sm:text-sm">
          Ürünleri sürükle-bırak ile durumlandırın
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-4 sm:gap-3">
          {COLUMNS.map((col) => {
            const Icon = col.icon
            const columnItems = getColumnItems(col.key)
            return (
              <div
                key={col.key}
                className={`min-w-[200px] w-[200px] flex-shrink-0 rounded-xl border sm:min-w-[220px] sm:w-[220px] ${col.borderColor} bg-white/50`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.key)}
              >
                {/* Kolon başlığı */}
                <div
                  className={`flex items-center gap-2 rounded-t-xl ${col.bgColor} px-2.5 py-2 border-b sm:px-3 sm:py-2.5 ${col.borderColor}`}
                >
                  <Icon size={14} className={`${col.color} sm:hidden`} />
                  <Icon size={16} className={`${col.color} hidden sm:block`} />
                  <span className={`text-[11px] font-semibold sm:text-xs ${col.color}`}>{col.label}</span>
                  <span
                    className={`ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${col.bgColor} ${col.color}`}
                  >
                    {columnItems.length}
                  </span>
                </div>

                {/* Ürün kartları */}
                <div className="min-h-[120px] space-y-2 p-2 sm:min-h-[150px]">
                  {columnItems.length === 0 ? (
                    <div className="flex h-16 items-center justify-center text-[10px] text-[var(--color-ink)]/30">
                      Ürün yok
                    </div>
                  ) : (
                    columnItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(item.id)}
                        onClick={() => loadOrderDetail(item.orderId)}
                        className={`cursor-grab rounded-lg border p-2 shadow-sm transition-all hover:shadow-md active:cursor-grabbing sm:p-2.5 ${
                          selectedOrder?.id === item.orderId
                            ? 'border-[var(--color-brass)] ring-1 ring-[var(--color-brass)]'
                            : 'border-[var(--color-cream-deep)]'
                        }`}
                      >
                        {/* Ürün adı */}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[var(--color-espresso)] truncate max-w-[130px] sm:text-xs sm:max-w-[150px]">
                            {item.productName}
                          </span>
                          <GripVertical size={10} className="text-[var(--color-ink)]/20 flex-shrink-0" />
                        </div>

                        {/* Miktar */}
                        <div className="mt-1 text-[10px] text-[var(--color-ink)]/60 sm:text-[11px]">
                          {item.quantity} adet
                          {item.unitPrice && ` · ${formatPrice(item.unitPrice)}`}
                        </div>

                        {/* Sipariş bilgisi */}
                        <div className="mt-1.5 flex items-center justify-between border-t border-[var(--color-cream-deep)] pt-1.5">
                          <span className="font-mono text-[10px] text-[var(--color-wood-dark)]">
                            {item.orderNumber}
                          </span>
                          <span className="text-[10px] text-[var(--color-ink)]/40 truncate max-w-[70px] sm:max-w-[80px]">
                            {item.customerName}
                          </span>
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

      {/* Detay Paneli */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/20" onClick={closeDetail}>
          <div
            className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingDetail ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
              </div>
            ) : (
              <div className="p-4 sm:p-5">
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
                  <button
                    onClick={closeDetail}
                    className="text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Müşteri */}
                {selectedOrder.customerName && (
                  <div className="mb-4 rounded-lg bg-[var(--color-cream)]/50 p-3">
                    <div className="text-sm font-semibold">{selectedOrder.customerName}</div>
                    <div className="mt-1 text-xs text-[var(--color-ink)]/60">
                      {selectedOrder.customerPhone}
                      {selectedOrder.customerCity && ` · ${selectedOrder.customerCity}`}
                    </div>
                  </div>
                )}

                {/* Kargo takip numarası */}
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium">Kargo Takip Numarası</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedOrder.trackingNumber || ''}
                      onChange={(e) => {
                        setSelectedOrder({ ...selectedOrder, trackingNumber: e.target.value })
                      }}
                      placeholder="Takip numarası girin..."
                      className="flex-1 rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
                    />
                    <button
                      onClick={async () => {
                        if (selectedOrder.trackingNumber) {
                          try {
                            await api.request(`/api/orders/${selectedOrder.id}/tracking`, {
                              method: 'PATCH',
                              body: { trackingNumber: selectedOrder.trackingNumber },
                            })
                            loadOrders()
                          } catch {}
                        }
                      }}
                      className="rounded-lg bg-[var(--color-wood)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-wood-dark)]"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>

                {/* Ürünler */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">Ürünler</label>
                    {selectedOrder.status === 'delivered' && (
                      <button
                        onClick={() => setShowExchangeModal(true)}
                        className="flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 hover:bg-pink-100"
                      >
                        <ArrowLeftRight size={12} />
                        Değişim Yap
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 ${
                          item.isExchanged
                            ? 'border-pink-200 bg-pink-50'
                            : item.itemStatus === 'returned'
                              ? 'border-red-200 bg-red-50'
                              : 'border-[var(--color-cream-deep)]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {item.productName}
                              {item.isExchanged && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-medium text-pink-700">
                                  Değişim
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-[var(--color-ink)]/50">
                              {item.quantity} adet
                              {item.unitPrice && ` · ${formatPrice(item.unitPrice)}`}
                            </div>
                            {item.exchangeNote && (
                              <div className="mt-1 text-xs text-pink-600">Not: {item.exchangeNote}</div>
                            )}
                          </div>
                          <select
                            value={item.itemStatus}
                            onChange={(e) =>
                              handleItemStatusChange(selectedOrder.id, item.id, e.target.value)
                            }
                            className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                              ITEM_STATUS_COLORS[item.itemStatus] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <option value="pending">Beklemede</option>
                            <option value="confirmed">Onaylandı</option>
                            <option value="atelier">Atölyede</option>
                            <option value="in_production">Üretimde</option>
                            <option value="ready">Hazır</option>
                            <option value="shipped">Kargoda</option>
                            <option value="delivered">Teslim</option>
                            <option value="returned">İade</option>
                            <option value="exchanged">Değişim</option>
                          </select>
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

                {/* Notlar */}
                {selectedOrder.notes && (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium">Müşteri Notu</label>
                    <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                      {selectedOrder.notes}
                    </div>
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exchange Modal */}
      {selectedOrder && (
        <ExchangeModal
          open={showExchangeModal}
          orderItems={selectedOrder.items || []}
          orderNumber={selectedOrder.orderNumber}
          onConfirm={handleExchange}
          onCancel={() => setShowExchangeModal(false)}
          loading={exchangeLoading}
        />
      )}
    </div>
  )
}
