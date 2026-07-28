import { useEffect, useState, useRef } from 'react'
import { api } from '../lib/api'
import {
  Clock,
  Package,
  Truck,
  CheckCircle,
  MessageSquare,
  XCircle,
  StickyNote,
  Loader2,
  GripVertical,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────

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
  currency: string
  notes: string | null
  internalNotes: string | null
  source: string
  isArchived: boolean
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

// ── Config ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: 'Beklemede', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  quoted: { label: 'Teklif Verildi', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: MessageSquare },
  confirmed: { label: 'Onaylandı', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  in_production: { label: 'Üretimde', color: 'text-purple-700', bgColor: 'bg-purple-50', icon: Package },
  shipped: { label: 'Kargoya Verildi', color: 'text-indigo-700', bgColor: 'bg-indigo-50', icon: Truck },
  delivered: { label: 'Teslim Edildi', color: 'text-green-800', bgColor: 'bg-green-100', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  returned: { label: 'İade Edildi', color: 'text-orange-700', bgColor: 'bg-orange-50', icon: XCircle },
}

const ITEM_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Beklemede', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  in_stock: { label: 'Stokta', color: 'text-green-700', bgColor: 'bg-green-100' },
  out_of_stock: { label: 'Stok Yok', color: 'text-red-700', bgColor: 'bg-red-100' },
  in_production: { label: 'Üretimde', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  ready: { label: 'Hazır', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  shipped: { label: 'Kargoda', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  delivered: { label: 'Teslim Edildi', color: 'text-green-800', bgColor: 'bg-green-100' },
  returned: { label: 'İade', color: 'text-orange-700', bgColor: 'bg-orange-100' },
}

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['quoted', 'confirmed', 'cancelled'],
  quoted: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
}

const VALID_ITEM_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_stock', 'out_of_stock', 'in_production', 'ready'],
  in_stock: ['ready', 'shipped'],
  out_of_stock: ['in_production', 'ready'],
  in_production: ['ready', 'out_of_stock'],
  ready: ['shipped'],
  shipped: ['delivered'],
  delivered: ['returned'],
  returned: [],
}

// Kanban columns: status → order statuses that belong in this column
const COLUMN_ORDER_STATUSES: Record<string, string[]> = {
  pending: ['pending', 'quoted', 'confirmed'],
  in_production: ['in_production'],
  shipped: ['shipped'],
  delivered: ['delivered'],
}

const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Beklemede', color: 'border-t-yellow-400' },
  { key: 'in_production', label: 'Üretimde', color: 'border-t-purple-400' },
  { key: 'shipped', label: 'Kargoya Verildi', color: 'border-t-indigo-400' },
  { key: 'delivered', label: 'Teslim Edildi', color: 'border-t-green-400' },
]

// Reverse map: for each target column, which source statuses can be dragged there
const VALID_SOURCES_FOR_COLUMN: Record<string, string[]> = {
  pending: ['in_production', 'shipped', 'delivered'],
  in_production: ['pending', 'quoted', 'confirmed', 'shipped', 'delivered'],
  shipped: ['pending', 'quoted', 'confirmed', 'in_production', 'delivered'],
  delivered: ['pending', 'quoted', 'confirmed', 'in_production', 'shipped'],
}

function canDragToColumn(orderStatus: string, targetColumn: string): boolean {
  // Already in this column
  if (COLUMN_ORDER_STATUSES[targetColumn]?.includes(orderStatus)) return false

  // Check if order's current status is a valid source for target column
  const validSources = VALID_SOURCES_FOR_COLUMN[targetColumn]
  if (!validSources?.includes(orderStatus)) return false

  // Check if the actual status transition is valid (forward or reverse)
  // Build allowed target statuses from the column
  const targetStatuses = COLUMN_ORDER_STATUSES[targetColumn] || []

  // Check each possible target status to see if the transition is valid
  // We allow the transition if:
  // 1. It's a forward transition (in VALID_ORDER_TRANSITIONS), OR
  // 2. It's a reverse transition (the target status can transition TO the current status)
  for (const targetStatus of targetStatuses) {
    // Forward: current → target
    if (VALID_ORDER_TRANSITIONS[orderStatus]?.includes(targetStatus)) return true
    // Reverse: target → current (means going backward is valid)
    if (VALID_ORDER_TRANSITIONS[targetStatus]?.includes(orderStatus)) return true
  }

  return false
}

function getDefaultTargetStatus(orderStatus: string, targetColumn: string): string {
  const columnStatuses = COLUMN_ORDER_STATUSES[targetColumn] || []
  // For "pending" column, use the first valid status
  if (targetColumn === 'pending') {
    // If coming from production/shipped/delivered, put back to pending
    if (['in_production', 'shipped', 'delivered'].includes(orderStatus)) return 'pending'
    return 'pending'
  }
  return columnStatuses[0] || targetColumn
}

function formatPrice(amount: number | null) {
  if (!amount) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100)
}

// ── Component ──────────────────────────────────────────

export default function Status() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [newNote, setNewNote] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const dragItem = useRef<string | null>(null)
  const dragOverColumn = useRef<string | null>(null)

  // Load orders
  const loadOrders = async () => {
    try {
      const result = await api.request<{ data: Order[] }>('/api/orders?limit=100')
      setOrders(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  // Load order detail
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

  // Update order status
  const handleStatusChange = async (orderId: string, newStatus: string, note?: string) => {
    setUpdatingStatus(orderId)
    try {
      await api.request(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status: newStatus, note },
      })
      if (selectedOrder?.id === orderId) loadOrderDetail(orderId)
      await loadOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingStatus(null)
    }
  }

  // Update item status
  const handleItemStatusChange = async (orderId: string, itemId: string, newStatus: string) => {
    try {
      await api.request(`/api/orders/${orderId}/items/${itemId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      })
      if (selectedOrder?.id === orderId) loadOrderDetail(orderId)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Add note
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
  }

  // ── Drag Handlers ──────────────────────────────────

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    dragItem.current = orderId
    e.dataTransfer.effectAllowed = 'move'
    // Add visual feedback
    const el = e.currentTarget as HTMLElement
    setTimeout(() => el.classList.add('opacity-40'), 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.classList.remove('opacity-40')
    dragItem.current = null
    dragOverColumn.current = null
    // Remove all drag-over highlights
    document.querySelectorAll('[data-drag-over]').forEach((el) => {
      el.removeAttribute('data-drag-over')
      el.classList.remove('ring-2', 'ring-[var(--color-brass)]', 'bg-[var(--color-brass)]/5')
    })
  }

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverColumn.current = columnKey
    const el = e.currentTarget as HTMLElement
    el.setAttribute('data-drag-over', 'true')
    el.classList.add('ring-2', 'ring-[var(--color-brass)]', 'bg-[var(--color-brass)]/5')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.removeAttribute('data-drag-over')
    el.classList.remove('ring-2', 'ring-[var(--color-brass)]', 'bg-[var(--color-brass)]/5')
  }

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.removeAttribute('data-drag-over')
    el.classList.remove('ring-2', 'ring-[var(--color-brass)]', 'bg-[var(--color-brass)]/5')

    const orderId = dragItem.current
    if (!orderId) return

    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    if (!canDragToColumn(order.status, targetColumn)) {
      dragItem.current = null
      return
    }

    const newStatus = getDefaultTargetStatus(order.status, targetColumn)
    dragItem.current = null

    await handleStatusChange(orderId, newStatus)
  }

  // Group orders by column
  const getColumnOrders = (columnKey: string) => {
    const validStatuses = COLUMN_ORDER_STATUSES[columnKey] || []
    return orders.filter((o) => validStatuses.includes(o.status))
  }

  // ── Render ──────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-espresso)]">Durum</h1>
        <p className="mt-1 text-sm text-[var(--color-ink)]/50">
          Siparişleri sürükleyerek durum değiştirin
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {KANBAN_COLUMNS.map((col) => {
            const columnOrders = getColumnOrders(col.key)
            const ColumnIcon = STATUS_CONFIG[col.key]?.icon || Clock
            return (
              <div
                key={col.key}
                className={`min-w-[300px] flex-1 rounded-xl border border-t-4 bg-[var(--color-cream)]/30 ${col.color} transition-all`}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-cream-deep)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ColumnIcon size={16} className="text-[var(--color-ink)]/40" />
                    <span className="text-sm font-semibold text-[var(--color-espresso)]">{col.label}</span>
                  </div>
                  <span className="rounded-full bg-[var(--color-cream-deep)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink)]/50">
                    {columnOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 p-3">
                  {columnOrders.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--color-cream-deep)] p-4 text-center text-xs text-[var(--color-ink)]/30">
                      Sipariş yok
                    </div>
                  ) : (
                    columnOrders.map((order) => {
                      const isDragging = dragItem.current === order.id
                      return (
                        <div
                          key={order.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, order.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => loadOrderDetail(order.id)}
                          className={`cursor-grab rounded-lg border border-[var(--color-cream-deep)] bg-white p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
                            isDragging ? 'opacity-40' : ''
                          } ${selectedOrder?.id === order.id ? 'ring-2 ring-[var(--color-brass)]' : ''}`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold text-[var(--color-wood-dark)]">
                              {order.orderNumber}
                            </span>
                            <GripVertical size={14} className="text-[var(--color-ink)]/20" />
                          </div>
                          <div className="mb-1 text-sm font-medium text-[var(--color-espresso)]">
                            {order.customerName}
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--color-ink)]/40">
                            <span>{order.customerCity || '-'}</span>
                            <span>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                          {/* Sub-status badges for pending column */}
                          {col.key === 'pending' && order.status !== 'pending' && (
                            <div className="mt-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CONFIG[order.status]?.bgColor} ${STATUS_CONFIG[order.status]?.color}`}>
                                {STATUS_CONFIG[order.status]?.label}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Order Detail Side Panel */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={closeDetail} />
          <div className="relative w-full max-w-lg overflow-y-auto border-l border-[var(--color-cream-deep)] bg-white shadow-xl">
            {loadingDetail ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[var(--color-wood)]" />
              </div>
            ) : (
              <div className="p-5">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between border-b border-[var(--color-cream-deep)] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-[var(--color-wood-dark)]">
                        {selectedOrder.orderNumber}
                      </span>
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[selectedOrder.status]?.bgColor} ${STATUS_CONFIG[selectedOrder.status]?.color}`}>
                        {STATUS_CONFIG[selectedOrder.status]?.label}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-ink)]/50">
                      {new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <button onClick={closeDetail} className="text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]">
                    ✕
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

                {/* Status Buttons */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">Durum Değiştir</label>
                  <div className="flex flex-wrap gap-2">
                    {(VALID_ORDER_TRANSITIONS[selectedOrder.status] || []).map((s) => {
                      const config = STATUS_CONFIG[s]
                      if (!config) return null
                      const Icon = config.icon
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(selectedOrder.id, s)}
                          disabled={updatingStatus === selectedOrder.id}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${config.bgColor} ${config.color} border-transparent hover:ring-1 hover:ring-current disabled:opacity-50`}
                        >
                          <Icon size={14} />
                          {config.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Items */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">Ürünler</label>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => {
                      const itemConfig = ITEM_STATUS_CONFIG[item.itemStatus] || ITEM_STATUS_CONFIG.pending
                      return (
                        <div key={item.id} className="rounded-lg border border-[var(--color-cream-deep)] p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{item.productName}</div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${itemConfig.bgColor} ${itemConfig.color}`}>
                              {itemConfig.label}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[var(--color-ink)]/50">{item.quantity} adet</div>
                          {/* Item status buttons */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(VALID_ITEM_TRANSITIONS[item.itemStatus] || []).map((s) => {
                              const sc = ITEM_STATUS_CONFIG[s]
                              return (
                                <button
                                  key={s}
                                  onClick={() => handleItemStatusChange(selectedOrder.id, item.id, s)}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.bgColor} ${sc.color} hover:ring-1 hover:ring-current`}
                                >
                                  {sc.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
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
                    <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">{selectedOrder.notes}</div>
                  </div>
                )}

                {/* Add Note */}
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
                      <StickyNote size={14} />
                    </button>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Geçmiş</label>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedOrder.activities?.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          activity.type === 'status_change' ? 'bg-blue-500' :
                          activity.type === 'note_added' ? 'bg-yellow-500' :
                          activity.type === 'item_status_change' ? 'bg-purple-500' :
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
