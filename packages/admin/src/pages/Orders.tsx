import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useDebug } from '../lib/debug'
import ConfirmModal from '../components/ConfirmModal'
import ProductSearch from '../components/ProductSearch'
import {
  Search,
  X,
  ChevronRight,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  MessageSquare,
  Bug,
  Loader2,
  Archive,
  ArchiveRestore,
  CheckSquare,
  Trash2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────

interface OrderItem {
  id: string
  productId: number | null
  productName: string
  quantity: number
  unitPrice: number | null
  totalPrice: number | null
  itemStatus: string
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

const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Clock }
> = {
  pending: { label: 'Beklemede', color: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Clock },
  quoted: { label: 'Teklif Verildi', color: 'text-blue-700', bgColor: 'bg-blue-50', icon: MessageSquare },
  confirmed: { label: 'Onaylandı', color: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle },
  in_production: { label: 'Üretimde', color: 'text-purple-700', bgColor: 'bg-purple-50', icon: Package },
  shipped: { label: 'Kargoya Verildi', color: 'text-indigo-700', bgColor: 'bg-indigo-50', icon: Truck },
  delivered: { label: 'Teslim Edildi', color: 'text-green-800', bgColor: 'bg-green-100', icon: CheckCircle },
  cancelled: { label: 'İptal Edildi', color: 'text-red-700', bgColor: 'bg-red-50', icon: XCircle },
  returned: { label: 'İade Edildi', color: 'text-orange-700', bgColor: 'bg-orange-50', icon: XCircle },
}

const ITEM_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
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

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Telefon',
  website: 'Web Sitesi',
  'walk-in': 'Mağaza',
}

function formatPrice(amount: number | null) {
  if (!amount) return '-'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100)
}

// ── Component ──────────────────────────────────────────

export default function Orders() {
  const { debugMode } = useDebug()
  const location = useLocation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [newNote, setNewNote] = useState('')
  const [creatingTest, setCreatingTest] = useState(false)
  const [uiMode, setUiMode] = useState<'classic' | 'ui2'>('classic')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Order creation
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderCustomerSearch, setOrderCustomerSearch] = useState('')
  const [orderCustomerResults, setOrderCustomerResults] = useState<any[]>([])
  const [orderCustomer, setOrderCustomer] = useState<any | null>(null)
  const [orderItems, setOrderItems] = useState([
    { productCode: '', productName: '', quantity: 1, unitPrice: '', specifications: '' },
  ])
  const [orderNotes, setOrderNotes] = useState('')
  const [orderSource, setOrderSource] = useState('phone')
  const [orderCreating, setOrderCreating] = useState(false)

  // Navigate from customer detail → auto-select order
  useEffect(() => {
    const orderId = (location.state as any)?.orderId
    if (orderId) {
      loadOrderDetail(orderId)
      // Clear state to prevent re-select on refresh
      window.history.replaceState({}, '')
    }
  }, [])

  // Load orders
  const loadOrders = async () => {
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filterStatus) params.set('status', filterStatus)
      if (search) params.set('search', search)
      if (showArchived) params.set('archived', 'true')
      const result = await api.request<{ data: Order[] }>(`/api/orders?${params}`)
      setOrders(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders()
      setSelectedOrders(new Set())
    }, 250)
    return () => clearTimeout(timer)
  }, [search, filterStatus, showArchived])

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
    try {
      await api.request(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: { status: newStatus, note },
      })
      if (selectedOrder?.id === orderId) loadOrderDetail(orderId)
      loadOrders()
    } catch (err: any) {
      setError(err.message)
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

  // Archive/unarchive
  const handleArchive = async (orderId: string, archive: boolean) => {
    try {
      await api.request(`/api/orders/${orderId}/${archive ? 'archive' : 'unarchive'}`, {
        method: 'POST',
      })
      setSelectedOrder(null)
      loadOrders()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Create test order
  const createTestOrder = async () => {
    setCreatingTest(true)
    setError('')
    try {
      const businessNames = ['Perde Dünyası', 'Ev Tekstil', 'Modern Perde', 'Zarif Ev', 'Lüks Perde', 'Royal Home']
      const contactNames = ['Ahmet Yılmaz', 'Mehmet Kaya', 'Ali Demir', 'Hasan Çelik', 'Fatma Şahin', 'Ayşe Öztürk']
      const cities = ['İstanbul', 'Ankara', 'İzmir', 'Gaziantep', 'Bursa', 'Antalya']
      const sources = ['whatsapp', 'phone', 'website', 'walk-in']
      const productNames = ['Jüt Kordon', 'Ahşap Halka', 'Keten Bağcık', 'Jüt Saçak', 'Kristal Sarkıt', 'Ahşap Braçol']

      const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

      const customer = await api.request<{ id: string }>('/api/customers', {
        method: 'POST',
        body: {
          businessName: rand(businessNames),
          contactName: rand(contactNames),
          phone: '05' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0'),
          city: rand(cities),
        },
      })

      const itemCount = Math.floor(Math.random() * 3) + 1
      const items = Array.from({ length: itemCount }, () => ({
        productName: rand(productNames),
        quantity: Math.floor(Math.random() * 500) + 50,
        unitPrice: Math.floor(Math.random() * 20000) + 5000,
      }))

      await api.request('/api/orders', {
        method: 'POST',
        body: { customerId: customer.id, items, source: rand(sources) },
      })

      loadOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreatingTest(false)
    }
  }

  // Selection handlers
  const toggleOrderSelection = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)))
    }
  }

  // Bulk actions
  const handleBulkArchive = async () => {
    if (selectedOrders.size === 0) return
    setBulkLoading(true)
    setError('')
    try {
      await api.request('/api/orders/bulk/archive', {
        method: 'POST',
        body: { ids: Array.from(selectedOrders) },
      })
      setSelectedOrders(new Set())
      setSelectedOrder(null)
      loadOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkUnarchive = async () => {
    if (selectedOrders.size === 0) return
    setBulkLoading(true)
    setError('')
    try {
      await api.request('/api/orders/bulk/unarchive', {
        method: 'POST',
        body: { ids: Array.from(selectedOrders) },
      })
      setSelectedOrders(new Set())
      setSelectedOrder(null)
      loadOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedOrders.size === 0) return
    setShowDeleteModal(true)
  }

  const handleBulkDeleteConfirm = async () => {
    setBulkLoading(true)
    setError('')
    try {
      await api.request('/api/orders/bulk/delete', {
        method: 'POST',
        body: { ids: Array.from(selectedOrders) },
      })
      setShowDeleteModal(false)
      setSelectedOrders(new Set())
      setSelectedOrder(null)
      loadOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const closeDetail = () => {
    setSelectedOrder(null)
    setNewNote('')
  }

  // Order creation
  const searchCustomers = async (query: string) => {
    if (query.length < 2) { setOrderCustomerResults([]); return }
    try {
      const result = await api.request<{ data: any[] }>(`/api/customers?search=${encodeURIComponent(query)}&limit=5`)
      setOrderCustomerResults(result.data)
    } catch { setOrderCustomerResults([]) }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (orderCustomerSearch && !orderCustomer) searchCustomers(orderCustomerSearch)
    }, 250)
    return () => clearTimeout(timer)
  }, [orderCustomerSearch])

  const addOrderItemRow = () => {
    setOrderItems([...orderItems, { productCode: '', productName: '', quantity: 1, unitPrice: '', specifications: '' }])
  }

  const removeOrderItemRow = (index: number) => {
    if (orderItems.length <= 1) return
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const updateOrderItem = (index: number, field: string, value: string | number) => {
    const updated = [...orderItems]
    updated[index] = { ...updated[index], [field]: value }
    setOrderItems(updated)
  }

  const handleProductSelect = (index: number, product: { productCode: string | null; name: string; price: number | null }) => {
    const updated = [...orderItems]
    updated[index] = {
      ...updated[index],
      productCode: product.productCode || '',
      productName: product.name,
      unitPrice: product.price ? String(product.price / 100) : updated[index].unitPrice,
    }
    setOrderItems(updated)
  }

  const resetOrderForm = () => {
    setShowOrderForm(false)
    setOrderCustomer(null)
    setOrderCustomerSearch('')
    setOrderCustomerResults([])
    setOrderItems([{ productCode: '', productName: '', quantity: 1, unitPrice: '', specifications: '' }])
    setOrderNotes('')
    setOrderSource('phone')
  }

  const handleCreateOrder = async () => {
    if (!orderCustomer) return
    const validItems = orderItems.filter((item) => item.productName.trim())
    if (validItems.length === 0) return

    setOrderCreating(true)
    setError('')
    try {
      const items = validItems.map((item) => ({
        productName: item.productName.trim(),
        quantity: Number(item.quantity) || 1,
        unitPrice: item.unitPrice ? Math.round(Number(item.unitPrice) * 100) : undefined,
        specifications: item.specifications.trim() || undefined,
      }))

      await api.request('/api/orders', {
        method: 'POST',
        body: {
          customerId: orderCustomer.id,
          items,
          notes: orderNotes.trim() || undefined,
          source: orderSource,
        },
      })

      resetOrderForm()
      loadOrders()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setOrderCreating(false)
    }
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-espresso)]">Siparişler</h1>
          <p className="mt-1 text-sm text-[var(--color-ink)]/50">
            {showArchived ? 'Arşivlenmiş siparişler' : 'Sipariş taleplerini yönetin'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOrderForm(!showOrderForm)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              showOrderForm
                ? 'bg-gray-100 text-gray-600'
                : 'bg-[var(--color-wood-dark)] text-white hover:bg-[var(--color-espresso)]'
            }`}
          >
            {showOrderForm ? 'İptal' : 'Sipariş Oluştur'}
          </button>
          {debugMode && (
            <>
              <button
                onClick={createTestOrder}
                disabled={creatingTest}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {creatingTest ? <Loader2 size={14} className="animate-spin" /> : <Bug size={14} />}
                Test Sipariş
              </button>
              {/* Classic/UI2 Toggle */}
              <button
                onClick={() => setUiMode(uiMode === 'classic' ? 'ui2' : 'classic')}
                className={`relative flex h-8 w-14 items-center rounded-full transition-colors ${
                  uiMode === 'ui2' ? 'bg-[var(--color-wood-dark)]' : 'bg-gray-300'
                }`}
                title={uiMode === 'classic' ? 'UI-2 moduna geç' : 'Klasik moda geç'}
              >
                <span className={`absolute left-1 text-[9px] font-bold ${uiMode === 'classic' ? 'text-gray-500' : 'text-transparent'}`}>
                  KL
                </span>
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    uiMode === 'ui2' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
                <span className={`absolute right-1 text-[9px] font-bold ${uiMode === 'ui2' ? 'text-white' : 'text-transparent'}`}>
                  U2
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Order Creation Form */}
      {showOrderForm && (
        <div className="mb-4 rounded-xl border border-[var(--color-brass)]/30 bg-[var(--color-cream)]/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-wood-dark)]">Yeni Sipariş</h3>

          {/* Customer Selection */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]/60">Müşteri</label>
            {orderCustomer ? (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-cream-deep)] bg-white px-3 py-2 text-sm">
                <span className="font-medium">{orderCustomer.businessName}</span>
                <span className="text-xs text-[var(--color-ink)]/40">{orderCustomer.contactName}</span>
                <button onClick={() => setOrderCustomer(null)} className="ml-auto text-[var(--color-ink)]/30 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={orderCustomerSearch}
                  onChange={(e) => { setOrderCustomerSearch(e.target.value); setOrderCustomer(null) }}
                  placeholder="Müşteri ara..."
                  className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
                />
                {orderCustomerResults.length > 0 && !orderCustomer && (
                  <div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-[var(--color-cream-deep)] bg-white shadow-lg">
                    {orderCustomerResults.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => { setOrderCustomer(c); setOrderCustomerSearch(''); setOrderCustomerResults([]) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-cream)]/50"
                      >
                        <span className="font-medium">{c.businessName}</span>
                        <span className="text-xs text-[var(--color-ink)]/40">{c.contactName} · {c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-3 space-y-2">
            {orderItems.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_100px_1fr_32px] gap-2">
                <div>
                  {item.productName ? (
                    <div className="flex items-center gap-1 rounded-lg border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/30 px-2.5 py-1.5 text-sm">
                      {item.productCode && (
                        <span className="font-mono text-xs font-semibold text-[var(--color-wood-dark)]">{item.productCode}</span>
                      )}
                      <span className="flex-1 truncate">{item.productName}</span>
                      <button type="button" onClick={() => updateOrderItem(index, 'productName', '')} className="text-[var(--color-ink)]/30 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <ProductSearch onSelect={(p) => handleProductSelect(index, p)} placeholder="Ürün ara..." />
                  )}
                </div>
                <input type="number" placeholder="Adet" min="1" value={item.quantity}
                  onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]" />
                <input type="number" placeholder="Birim ₺" step="0.01" value={item.unitPrice}
                  onChange={(e) => updateOrderItem(index, 'unitPrice', e.target.value)}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]" />
                <input placeholder="Not (opsiyonel)" value={item.specifications}
                  onChange={(e) => updateOrderItem(index, 'specifications', e.target.value)}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]" />
                <button type="button" onClick={() => removeOrderItemRow(index)} disabled={orderItems.length <= 1}
                  className="flex items-center justify-center rounded-lg text-[var(--color-ink)]/30 hover:text-red-500 disabled:opacity-30">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOrderItemRow} className="mb-3 text-xs font-medium text-[var(--color-wood-dark)] hover:underline">
            + Ürün Ekle
          </button>

          {/* Notes & Source */}
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_120px]">
            <textarea placeholder="Sipariş notu (opsiyonel)" value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)} rows={2}
              className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]" />
            <select value={orderSource} onChange={(e) => setOrderSource(e.target.value)}
              className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]">
              <option value="phone">Telefon</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">Web Sitesi</option>
              <option value="walk-in">Mağaza</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleCreateOrder} disabled={orderCreating || !orderCustomer}
              className="rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50">
              {orderCreating ? 'Oluşturuluyor...' : 'Sipariş Oluştur'}
            </button>
            <button onClick={resetOrderForm}
              className="rounded-lg border border-[var(--color-cream-deep)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-cream)]">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/40" />
          <input
            type="text"
            placeholder="Sipariş no, müşteri adı..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-white py-2 pl-9 pr-4 outline-none focus:border-[var(--color-brass)]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-[var(--color-cream-deep)] bg-white px-3 py-2 outline-none focus:border-[var(--color-brass)]"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            showArchived
              ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/10 text-[var(--color-wood-dark)]'
              : 'border-[var(--color-cream-deep)] text-[var(--color-ink)]/60'
          }`}
        >
          <Archive size={14} />
          Arşiv
        </button>
        {debugMode && (
          <button
            onClick={toggleSelectAll}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              selectedOrders.size === orders.length && orders.length > 0
                ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/10 text-[var(--color-wood-dark)]'
                : 'border-[var(--color-cream-deep)] text-[var(--color-ink)]/60'
            }`}
            title={selectedOrders.size === orders.length ? 'Tümünü Bırak' : 'Tümünü Seç'}
          >
            <CheckSquare size={14} />
            {selectedOrders.size === orders.length ? 'Bırak' : 'Tümü'}
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {debugMode && selectedOrders.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--color-brass)] bg-[var(--color-brass)]/5 px-4 py-2.5">
          <span className="text-sm font-medium text-[var(--color-wood-dark)]">
            {selectedOrders.size} sipariş seçildi
          </span>
          <div className="flex-1" />
          {!showArchived ? (
            <button
              onClick={handleBulkArchive}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-wood)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-wood-dark)] disabled:opacity-50"
            >
              {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
              Arşivle
            </button>
          ) : (
            <>
              <button
                onClick={handleBulkUnarchive}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-wood)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-wood-dark)] disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                Geri Al
              </button>
              <button
                onClick={handleBulkDeleteClick}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Sil
              </button>
            </>
          )}
          <button
            onClick={() => setSelectedOrders(new Set())}
            className="rounded p-1 text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* List + Detail View */}
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
                const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending
                const Icon = config.icon
                const isSelected = selectedOrder?.id === order.id
                const isChecked = selectedOrders.has(order.id)
                return (
                  <button
                    key={order.id}
                    onClick={() => loadOrderDetail(order.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-[var(--color-brass)] bg-white shadow-sm'
                        : isChecked
                          ? 'border-[var(--color-brass)]/50 bg-[var(--color-brass)]/5'
                          : 'border-[var(--color-cream-deep)] bg-white hover:border-[var(--color-brass)]/50'
                    } ${order.isArchived ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {debugMode && (
                          <div
                            onClick={(e) => toggleOrderSelection(order.id, e)}
                            className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                              isChecked
                                ? 'border-[var(--color-brass)] bg-[var(--color-brass)] text-white'
                                : 'border-[var(--color-cream-deep)] hover:border-[var(--color-brass)]'
                            }`}
                          >
                            {isChecked && <CheckSquare size={12} />}
                          </div>
                        )}
                        <span className="font-mono text-sm font-semibold text-[var(--color-wood-dark)]">
                          {order.orderNumber}
                        </span>
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.bgColor} ${config.color}`}>
                          <Icon size={12} />
                          {config.label}
                        </span>
                        {order.isArchived && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Arşiv</span>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-[var(--color-ink)]/30" />
                    </div>
                    <div className="mt-2 text-sm font-medium">{order.customerName}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-[var(--color-ink)]/50">
                      <span>{order.customerCity || '-'} · {SOURCE_LABELS[order.source] || order.source}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>

                    {/* UI-2: Inline status buttons */}
                    {uiMode === 'ui2' && debugMode && (
                      <div className="mt-3 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                        {(VALID_ORDER_TRANSITIONS[order.status] || []).map((s) => {
                          const sc = ORDER_STATUS_CONFIG[s]
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(order.id, s)}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${sc.bgColor} ${sc.color} hover:ring-1 hover:ring-current`}
                            >
                              {sc.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
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
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_CONFIG[selectedOrder.status]?.bgColor} ${ORDER_STATUS_CONFIG[selectedOrder.status]?.color}`}>
                        {ORDER_STATUS_CONFIG[selectedOrder.status]?.label}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-ink)]/50">
                      {new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleArchive(selectedOrder.id, !selectedOrder.isArchived)}
                      className="rounded p-2 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                      title={selectedOrder.isArchived ? 'Arşivden çıkar' : 'Arşivle'}
                    >
                      {selectedOrder.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                    </button>
                    <button onClick={closeDetail} className="text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]">
                      <X size={18} />
                    </button>
                  </div>
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
                      const config = ORDER_STATUS_CONFIG[s]
                      const Icon = config.icon
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(selectedOrder.id, s)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${config.bgColor} ${config.color} border-transparent hover:ring-1 hover:ring-current`}
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
                            <div>
                              <div className="text-sm font-medium">{item.productName}</div>
                              <div className="text-xs text-[var(--color-ink)]/50">
                                {item.quantity} adet
                                {item.specifications && ` · ${item.specifications}`}
                              </div>
                            </div>
                            <div className="text-sm font-semibold">{formatPrice(item.totalPrice)}</div>
                          </div>
                          {/* Item status selector */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${itemConfig.bgColor} ${itemConfig.color}`}>
                              {itemConfig.label}
                            </span>
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
                      Ekle
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

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          title="Siparişleri Sil"
          message={`${selectedOrders.size} sipariş kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?`}
          confirmText="Evet, Sil"
          cancelText="Vazgeç"
          variant="danger"
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          loading={bulkLoading}
        />
      </div>
  )
}
