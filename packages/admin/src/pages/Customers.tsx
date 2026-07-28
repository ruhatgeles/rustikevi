import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
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

  const loadCustomers = async (query?: string) => {
    try {
      const params = new URLSearchParams({
        limit: '100',
        sortBy,
        sortOrder,
      })
      if (query) params.set('search', query)
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
  }, [sortBy, sortOrder])

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
            /* Edit Form */
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
            /* Display Mode */
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-[var(--color-espresso)]">
                    {selectedCustomer.businessName}
                  </h1>
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
        <h1 className="text-2xl font-bold text-[var(--color-espresso)]">Müşteriler</h1>
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

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
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
      </form>

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
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Yükleniyor...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Müşteri bulunamadı
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openCustomerDetail(c)}
                  className="cursor-pointer border-b border-[var(--color-cream-deep)] last:border-0 hover:bg-[var(--color-cream)]/30"
                >
                  <td className="px-4 py-3 font-medium">{c.businessName}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
