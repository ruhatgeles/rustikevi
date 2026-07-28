import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useDebug } from '../lib/debug'
import ConfirmModal from '../components/ConfirmModal'
import {
  Plus,
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  Phone,
  MapPin,
  Mail,
  Tag,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Package,
  Archive,
  ArchiveRestore,
  CheckSquare,
  Loader2,
} from 'lucide-react'

interface Customer {
  id: string
  businessName: string
  contactName: string
  phone: string
  email: string | null
  city: string | null
  address: string | null
  notes: string | null
  tags: string[]
  isArchived: boolean
  createdAt: string
  orderCount?: number
}

interface CustomerOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number | null
  createdAt: string
  items?: { productName: string; quantity: number }[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  quoted: 'Teklif Verildi',
  confirmed: 'Onaylandı',
  in_production: 'Üretimde',
  shipped: 'Kargoya Verildi',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
  returned: 'İade Edildi',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  quoted: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-green-50 text-green-700',
  in_production: 'bg-purple-50 text-purple-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-50 text-red-700',
  returned: 'bg-orange-50 text-orange-700',
}

export default function Customers() {
  const { debugMode } = useDebug()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    notes: '',
  })
  const [error, setError] = useState('')

  // Sorting
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Archive & selection
  const [showArchived, setShowArchived] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Detail view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderFilter, setOrderFilter] = useState('')

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    notes: '',
  })
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Order creation
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderItems, setOrderItems] = useState([
    { productName: '', quantity: 1, unitPrice: '', specifications: '' },
  ])
  const [orderNotes, setOrderNotes] = useState('')
  const [orderSource, setOrderSource] = useState('phone')
  const [orderCreating, setOrderCreating] = useState(false)

  const loadCustomers = async (query?: string) => {
    try {
      const params = new URLSearchParams({
        limit: '100',
        sortBy,
        sortOrder,
      })
      if (query) params.set('search', query)
      if (showArchived) params.set('archived', 'true')
      const result = await api.request<{ data: Customer[] }>(`/api/customers?${params}`)
      setCustomers(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers(search || undefined)
    setSelectedCustomers(new Set())
  }, [sortBy, sortOrder, showArchived])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadCustomers(search)
  }

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.request('/api/customers', { method: 'POST', body: form })
      setShowForm(false)
      setForm({ businessName: '', contactName: '', phone: '', email: '', city: '', address: '', notes: '' })
      loadCustomers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const loadCustomerOrders = async (customerId: string) => {
    setLoadingOrders(true)
    try {
      const result = await api.request<{ data: CustomerOrder[] }>(
        `/api/orders?customerId=${customerId}&limit=100`,
      )
      setCustomerOrders(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingOrders(false)
    }
  }

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditing(false)
    loadCustomerOrders(customer.id)
  }

  const closeDetail = () => {
    setSelectedCustomer(null)
    setCustomerOrders([])
    setOrderFilter('')
    setEditing(false)
  }

  // Selection
  const toggleCustomerSelection = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedCustomers((prev) => {
      const next = new Set(prev)
      if (next.has(customerId)) {
        next.delete(customerId)
      } else {
        next.add(customerId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(customers.map((c) => c.id)))
    }
  }

  // Bulk actions
  const handleBulkArchive = async () => {
    if (selectedCustomers.size === 0) return
    setBulkLoading(true)
    setError('')
    try {
      await api.request('/api/customers/bulk/archive', {
        method: 'POST',
        body: { ids: Array.from(selectedCustomers) },
      })
      setSelectedCustomers(new Set())
      setSelectedCustomer(null)
      loadCustomers(search || undefined)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkUnarchive = async () => {
    if (selectedCustomers.size === 0) return
    setBulkLoading(true)
    setError('')
    try {
      await api.request('/api/customers/bulk/unarchive', {
        method: 'POST',
        body: { ids: Array.from(selectedCustomers) },
      })
      setSelectedCustomers(new Set())
      setSelectedCustomer(null)
      loadCustomers(search || undefined)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedCustomers.size === 0) return
    setShowDeleteModal(true)
  }

  const handleBulkDeleteConfirm = async () => {
    setBulkLoading(true)
    setError('')
    try {
      await api.request('/api/customers/bulk/delete', {
        method: 'POST',
        body: { ids: Array.from(selectedCustomers) },
      })
      setShowDeleteModal(false)
      setSelectedCustomers(new Set())
      setSelectedCustomer(null)
      loadCustomers(search || undefined)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  // Single archive
  const handleArchive = async (customerId: string, archive: boolean) => {
    setError('')
    try {
      await api.request(`/api/customers/${customerId}/${archive ? 'archive' : 'unarchive'}`, {
        method: 'POST',
      })
      closeDetail()
      loadCustomers(search || undefined)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Edit
  const startEdit = () => {
    if (!selectedCustomer) return
    setEditForm({
      businessName: selectedCustomer.businessName,
      contactName: selectedCustomer.contactName,
      phone: selectedCustomer.phone,
      email: selectedCustomer.email || '',
      city: selectedCustomer.city || '',
      address: selectedCustomer.address || '',
      notes: selectedCustomer.notes || '',
    })
    setEditing(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    setEditLoading(true)
    setError('')
    try {
      const updated = await api.request<Customer>(`/api/customers/${selectedCustomer.id}`, {
        method: 'PATCH',
        body: editForm,
      })
      setSelectedCustomer(updated)
      setEditing(false)
      loadCustomers(search || undefined)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  // Delete
  const handleDeleteClick = () => {
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return
    setDeleteLoading(true)
    setError('')
    try {
      await api.request(`/api/customers/${selectedCustomer.id}`, { method: 'DELETE' })
      setShowDeleteModal(false)
      closeDetail()
      loadCustomers(search || undefined)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Order creation
  const addOrderItemRow = () => {
    setOrderItems([...orderItems, { productName: '', quantity: 1, unitPrice: '', specifications: '' }])
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

  const handleCreateOrder = async () => {
    if (!selectedCustomer) return
    const validItems = orderItems.filter((item) => item.productName.trim())
    if (validItems.length === 0) {
      setError('En az bir ürün adı girin')
      return
    }

    setOrderCreating(true)
    setError('')
    try {
      const items = validItems.map((item) => ({
        productName: item.productName.trim(),
        quantity: Number(item.quantity) || 1,
        unitPrice: item.unitPrice ? Math.round(Number(item.unitPrice) * 100) : undefined,
        specifications: item.specifications.trim() || undefined,
      }))

      const order = await api.request<{ id: string; orderNumber: string }>('/api/orders', {
        method: 'POST',
        body: {
          customerId: selectedCustomer.id,
          items,
          notes: orderNotes.trim() || undefined,
          source: orderSource,
        },
      })

      // Reset form
      setShowOrderForm(false)
      setOrderItems([{ productName: '', quantity: 1, unitPrice: '', specifications: '' }])
      setOrderNotes('')
      setOrderSource('phone')

      // Reload orders
      loadCustomerOrders(selectedCustomer.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setOrderCreating(false)
    }
  }

  // Navigate to order
  const goToOrder = (orderId: string) => {
    navigate('/orders', { state: { orderId } })
  }

  const filteredOrders = orderFilter
    ? customerOrders.filter((o) => o.status === orderFilter)
    : customerOrders

  // Sort indicator
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
  }

  // ── Detail View ─────────────────────────────────────

  if (selectedCustomer) {
    return (
      <div>
        <button
          onClick={closeDetail}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--color-wood-dark)] hover:underline"
        >
          <ArrowLeft size={16} />
          Müşteri Listesine Dön
        </button>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Customer Info Card */}
        <div className="mb-6 rounded-xl border border-[var(--color-cream-deep)] bg-white p-5">
          {editing ? (
            <form onSubmit={handleEdit}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Müşteri Düzenle</h2>
                <button type="button" onClick={() => setEditing(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required placeholder="İşletme Adı" value={editForm.businessName}
                  onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
                <input required placeholder="Yetkili Adı" value={editForm.contactName}
                  onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
                <input required placeholder="Telefon" value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
                <input type="email" placeholder="E-posta" value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
                <input placeholder="Şehir" value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
                <input placeholder="Adres" value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
                <textarea placeholder="Notlar" value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)] sm:col-span-2" rows={2} />
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" disabled={editLoading}
                    className="rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50">
                    {editLoading ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)}
                    className="rounded-lg border border-[var(--color-cream-deep)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-cream)]">
                    İptal
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-[var(--color-espresso)]">
                      {selectedCustomer.businessName}
                    </h1>
                    {selectedCustomer.isArchived && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Arşiv</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-ink)]/60">
                    {selectedCustomer.contactName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCustomer.tags?.length > 0 && (
                    <div className="flex gap-1">
                      {selectedCustomer.tags.map((tag) => (
                        <span key={tag} className="flex items-center gap-1 rounded-full bg-[var(--color-cream-deep)] px-2 py-0.5 text-xs">
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleArchive(selectedCustomer.id, !selectedCustomer.isArchived)}
                    className="rounded p-2 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                    title={selectedCustomer.isArchived ? 'Arşivden çıkar' : 'Arşivle'}
                  >
                    {selectedCustomer.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  </button>
                  <button
                    onClick={startEdit}
                    className="rounded p-2 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                    title="Düzenle"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="rounded p-2 text-[var(--color-ink)]/40 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 text-[var(--color-ink)]/70">
                  <Phone size={14} className="text-[var(--color-wood-dark)]" />
                  {selectedCustomer.phone}
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-[var(--color-ink)]/70">
                    <Mail size={14} className="text-[var(--color-wood-dark)]" />
                    {selectedCustomer.email}
                  </div>
                )}
                {selectedCustomer.city && (
                  <div className="flex items-center gap-2 text-[var(--color-ink)]/70">
                    <MapPin size={14} className="text-[var(--color-wood-dark)]" />
                    {selectedCustomer.city}
                  </div>
                )}
                <div className="text-xs text-[var(--color-ink)]/40">
                  Kayıt: {new Date(selectedCustomer.createdAt).toLocaleDateString('tr-TR')}
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="mt-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                  {selectedCustomer.notes}
                </div>
              )}
            </>
          )}
        </div>

        {/* Orders */}
        <div className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-espresso)]">
              Siparişler ({customerOrders.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOrderForm(!showOrderForm)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  showOrderForm
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-[var(--color-wood-dark)] text-white hover:bg-[var(--color-espresso)]'
                }`}
              >
                {showForm ? 'İptal' : 'Sipariş Oluştur'}
              </button>
              <select
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
                className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
              >
                <option value="">Tüm Durumlar</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Order Creation Form */}
          {showOrderForm && (
            <div className="mb-4 rounded-lg border border-[var(--color-brass)]/30 bg-[var(--color-cream)]/30 p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-wood-dark)]">Yeni Sipariş</h3>

              {/* Items */}
              <div className="mb-3 space-y-2">
                {orderItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-[1fr_80px_100px_1fr_32px] gap-2">
                    <input
                      placeholder="Ürün adı"
                      value={item.productName}
                      onChange={(e) => updateOrderItem(index, 'productName', e.target.value)}
                      className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
                    />
                    <input
                      type="number"
                      placeholder="Adet"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                      className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
                    />
                    <input
                      type="number"
                      placeholder="Birim ₺"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateOrderItem(index, 'unitPrice', e.target.value)}
                      className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
                    />
                    <input
                      placeholder="Not (opsiyonel)"
                      value={item.specifications}
                      onChange={(e) => updateOrderItem(index, 'specifications', e.target.value)}
                      className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
                    />
                    <button
                      type="button"
                      onClick={() => removeOrderItemRow(index)}
                      disabled={orderItems.length <= 1}
                      className="flex items-center justify-center rounded-lg text-[var(--color-ink)]/30 hover:text-red-500 disabled:opacity-30"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOrderItemRow}
                className="mb-3 text-xs font-medium text-[var(--color-wood-dark)] hover:underline"
              >
                + Ürün Ekle
              </button>

              {/* Notes & Source */}
              <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_120px]">
                <textarea
                  placeholder="Sipariş notu (opsiyonel)"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
                />
                <select
                  value={orderSource}
                  onChange={(e) => setOrderSource(e.target.value)}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
                >
                  <option value="phone">Telefon</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="website">Web Sitesi</option>
                  <option value="walk-in">Mağaza</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleCreateOrder}
                  disabled={orderCreating}
                  className="rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50"
                >
                  {orderCreating ? 'Oluşturuluyor...' : 'Sipariş Oluştur'}
                </button>
                <button
                  onClick={() => setShowOrderForm(false)}
                  className="rounded-lg border border-[var(--color-cream-deep)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-cream)]"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {loadingOrders ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-ink)]/40">
              {orderFilter ? 'Bu durumda sipariş yok' : 'Henüz sipariş yok'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => goToOrder(order.id)}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--color-cream-deep)] p-3 text-left transition-colors hover:border-[var(--color-brass)]/50 hover:bg-[var(--color-cream)]/30"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-[var(--color-wood-dark)]">
                        {order.orderNumber}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-ink)]/50">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.totalAmount && (
                      <div className="text-sm font-semibold">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalAmount / 100)}
                      </div>
                    )}
                    <ChevronRight size={16} className="text-[var(--color-ink)]/30" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          title="Müşteriyi Sil"
          message={`"${selectedCustomer?.businessName}" müşterisini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
          confirmText="Evet, Sil"
          cancelText="Vazgeç"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleteLoading}
        />
      </div>
    )
  }

  // ── List View ───────────────────────────────────────

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-espresso)]">Müşteriler</h1>
          <p className="mt-1 text-sm text-[var(--color-ink)]/50">
            {showArchived ? 'Arşivlenmiş müşteriler' : 'Müşteri listesi'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-espresso)]"
        >
          <Plus size={16} />
          Müşteri Ekle
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Search + Filters */}
      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/40" />
          <input
            type="text"
            placeholder="İşletme adı, yetkili veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-white py-2 pl-9 pr-4 outline-none focus:border-[var(--color-brass)]"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-cream-deep)] px-4 text-sm font-medium hover:bg-[var(--color-brass)]/20"
        >
          Ara
        </button>
        <button
          type="button"
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
            type="button"
            onClick={toggleSelectAll}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              selectedCustomers.size === customers.length && customers.length > 0
                ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/10 text-[var(--color-wood-dark)]'
                : 'border-[var(--color-cream-deep)] text-[var(--color-ink)]/60'
            }`}
            title={selectedCustomers.size === customers.length ? 'Tümünü Bırak' : 'Tümünü Seç'}
          >
            <CheckSquare size={14} />
            {selectedCustomers.size === customers.length ? 'Bırak' : 'Tümü'}
          </button>
        )}
      </form>

      {/* Bulk Actions Bar */}
      {debugMode && selectedCustomers.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--color-brass)] bg-[var(--color-brass)]/5 px-4 py-2.5">
          <span className="text-sm font-medium text-[var(--color-wood-dark)]">
            {selectedCustomers.size} müşteri seçildi
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
            onClick={() => setSelectedCustomers(new Set())}
            className="rounded p-1 text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[var(--color-cream-deep)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Yeni Müşteri</h2>
            <button onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="İşletme Adı" value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input required placeholder="Yetkili Adı" value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input required placeholder="Telefon" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input type="email" placeholder="E-posta (opsiyonel)" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input placeholder="Şehir" value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input placeholder="Adres" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <textarea placeholder="Notlar" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)] sm:col-span-2" rows={2} />
            <button type="submit"
              className="rounded-lg bg-[var(--color-wood-dark)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] sm:col-span-2">
              Oluştur
            </button>
          </form>
        </div>
      )}

      {/* Customer List */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-cream-deep)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50">
            <tr>
              {debugMode && <th className="w-10 px-4 py-3"></th>}
              <th onClick={() => toggleSort('businessName')} className="cursor-pointer px-4 py-3 font-medium select-none hover:text-[var(--color-wood-dark)]">
                <span className="inline-flex items-center gap-1">İşletme <SortIcon field="businessName" /></span>
              </th>
              <th onClick={() => toggleSort('contactName')} className="cursor-pointer px-4 py-3 font-medium select-none hover:text-[var(--color-wood-dark)]">
                <span className="inline-flex items-center gap-1">Yetkili <SortIcon field="contactName" /></span>
              </th>
              <th onClick={() => toggleSort('phone')} className="cursor-pointer px-4 py-3 font-medium select-none hover:text-[var(--color-wood-dark)]">
                <span className="inline-flex items-center gap-1">Telefon <SortIcon field="phone" /></span>
              </th>
              <th onClick={() => toggleSort('city')} className="cursor-pointer px-4 py-3 font-medium select-none hover:text-[var(--color-wood-dark)]">
                <span className="inline-flex items-center gap-1">Şehir <SortIcon field="city" /></span>
              </th>
              <th onClick={() => toggleSort('createdAt')} className="cursor-pointer px-4 py-3 font-medium select-none hover:text-[var(--color-wood-dark)]">
                <span className="inline-flex items-center gap-1">Tarih <SortIcon field="createdAt" /></span>
              </th>
              <th onClick={() => toggleSort('orderCount')} className="cursor-pointer px-4 py-3 font-medium select-none hover:text-[var(--color-wood-dark)]">
                <span className="inline-flex items-center gap-1"><Package size={14} /> Sipariş <SortIcon field="orderCount" /></span>
              </th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={debugMode ? 8 : 7} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Yükleniyor...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={debugMode ? 8 : 7} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Müşteri bulunamadı
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const isChecked = selectedCustomers.has(c.id)
                return (
                  <tr
                    key={c.id}
                    onClick={() => openCustomerDetail(c)}
                    className={`cursor-pointer border-b border-[var(--color-cream-deep)] last:border-0 hover:bg-[var(--color-cream)]/30 ${
                      isChecked ? 'bg-[var(--color-brass)]/5' : ''
                    } ${c.isArchived ? 'opacity-60' : ''}`}
                  >
                    {debugMode && (
                      <td className="px-4 py-3">
                        <div
                          onClick={(e) => toggleCustomerSelection(c.id, e)}
                          className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                            isChecked
                              ? 'border-[var(--color-brass)] bg-[var(--color-brass)] text-white'
                              : 'border-[var(--color-cream-deep)] hover:border-[var(--color-brass)]'
                          }`}
                        >
                          {isChecked && <CheckSquare size={12} />}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        {c.businessName}
                        {c.isArchived && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Arşiv</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.contactName}</td>
                    <td className="px-4 py-3 text-[var(--color-ink)]/60">{c.phone}</td>
                    <td className="px-4 py-3 text-[var(--color-ink)]/60">{c.city || '-'}</td>
                    <td className="px-4 py-3 text-[var(--color-ink)]/50">
                      {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        (c.orderCount || 0) > 0
                          ? 'bg-[var(--color-cream-deep)] text-[var(--color-wood-dark)]'
                          : 'bg-gray-50 text-gray-400'
                      }`}>
                        {c.orderCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className="text-[var(--color-ink)]/30" />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        title="Müşterileri Sil"
        message={`${selectedCustomers.size} müşteriyi kalıcı olarak silmek istediğinize emin misiniz? Siparişleri olan müşteriler silinemez.`}
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
