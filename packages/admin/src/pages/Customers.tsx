import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Plus, Search, X, ChevronRight, ArrowLeft, Phone, MapPin, Mail, Tag } from 'lucide-react'

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

  // Detail view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderFilter, setOrderFilter] = useState('')

  const loadCustomers = async (query?: string) => {
    try {
      const params = new URLSearchParams({ limit: '100' })
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
    loadCustomers()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadCustomers(search)
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
        `/api/orders?customerId=${customerId}&limit=100`
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
    loadCustomerOrders(customer.id)
  }

  const closeDetail = () => {
    setSelectedCustomer(null)
    setCustomerOrders([])
    setOrderFilter('')
  }

  const filteredOrders = orderFilter
    ? customerOrders.filter((o) => o.status === orderFilter)
    : customerOrders

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

        {/* Customer Info Card */}
        <div className="mb-6 rounded-xl border border-[var(--color-cream-deep)] bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-espresso)]">
                {selectedCustomer.businessName}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-ink)]/60">
                {selectedCustomer.contactName}
              </p>
            </div>
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
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-cream-deep)] p-3"
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
                  <div className="text-right">
                    {order.totalAmount && (
                      <div className="text-sm font-semibold">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalAmount / 100)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
              <th className="px-4 py-3 font-medium">İşletme</th>
              <th className="px-4 py-3 font-medium">Yetkili</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Şehir</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Yükleniyor...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
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
