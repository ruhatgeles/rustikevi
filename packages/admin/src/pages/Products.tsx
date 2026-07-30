import { useEffect, useState, useMemo, useCallback } from 'react'
import { api } from '../lib/api'
import { useDebug } from '../lib/debug'
import ConfirmModal from '../components/ConfirmModal'
import {
  Plus, Search, X, Pencil, Trash2, Eye, EyeOff,
  Archive, ArchiveRestore, CheckSquare, Loader2,
} from 'lucide-react'

interface Product {
  id: number
  productCode: string | null
  name: string
  category: string
  color: string | null
  description: string
  shortDescription: string
  moq: string
  price: number | null
  swatches: Array<[string, string]>
  featured: boolean
  isActive: boolean
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const CATEGORIES = ['Rustik', 'Saçak', 'Başlık', 'Dekorink', 'Sarkıt', 'Braçöl']
const COLORS = ['Beyaz', 'Krem', 'Kahverengi', 'Siyah', 'Altın', 'Gümüş', 'Gri', 'Ahşap', 'Doğal', 'Özel']

const emptyForm = {
  productCode: '',
  name: '',
  category: 'Rustik',
  color: '',
  description: '',
  shortDescription: '',
  moq: '',
  price: '',
  swatches: [['#c9a876', '#8a6d43']] as Array<[string, string]>,
  featured: false,
  isActive: true,
  sortOrder: 0,
}

export default function Products() {
  const { debugMode } = useDebug()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Archive & selection
  const [showArchived, setShowArchived] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (showArchived) params.set('archived', 'true')
      const data = await api.request<Product[]>(`/api/products/all?${params}`)
      setProducts(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
    setSelectedProducts(new Set())
  }, [showArchived])

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(timer)
  }, [search])

  // Memoized + stable-sorted filtered list
  const filtered = useMemo(() => {
    const s = debouncedSearch.toLowerCase()
    return products
      .filter((p) => {
        const matchesSearch =
          !s ||
          (p.productCode || '').toLowerCase().includes(s) ||
          p.name.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s) ||
          (p.color || '').toLowerCase().includes(s)
        const matchesCategory = !filterCategory || p.category === filterCategory
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  }, [products, debouncedSearch, filterCategory])

  // Freeze display order during editing so products don't shift mid-edit
  const [frozenIds, setFrozenIds] = useState<number[] | null>(null)

  useEffect(() => {
    if (editingId !== null && frozenIds === null) {
      // Start editing: snapshot the current filtered order
      setFrozenIds(filtered.map((p) => p.id))
    } else if (editingId === null && frozenIds !== null) {
      // Editing finished: clear freeze
      setFrozenIds(null)
    }
  }, [editingId])

  const displayProducts = useMemo(() => {
    if (frozenIds) {
      // During editing, keep frozen order but reflect live data from filtered
      const filteredMap = new Map<number, Product>()
      for (const p of filtered) filteredMap.set(p.id, p)
      return frozenIds.map((id) => filteredMap.get(id)).filter(Boolean) as Product[]
    }
    return filtered
  }, [filtered, frozenIds])

  // Selection
  const toggleProductSelection = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedProducts.size === displayProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(displayProducts.map((p) => p.id)))
    }
  }, [selectedProducts.size, displayProducts])

  // Bulk actions
  const handleBulkArchive = async () => {
    if (selectedProducts.size === 0) return
    setBulkLoading(true)
    setError('')
    try {
      await api.request('/api/products/bulk/archive', {
        method: 'POST',
        body: { ids: Array.from(selectedProducts) },
      })
      setSelectedProducts(new Set())
      loadProducts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkUnarchive = async () => {
    if (selectedProducts.size === 0) return
    setBulkLoading(true)
    setError('')
    try {
      await api.request('/api/products/bulk/unarchive', {
        method: 'POST',
        body: { ids: Array.from(selectedProducts) },
      })
      setSelectedProducts(new Set())
      loadProducts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedProducts.size === 0) return
    setDeleteTarget(null)
    setShowDeleteModal(true)
  }

  const handleBulkDeleteConfirm = async () => {
    setDeleteLoading(true)
    setError('')
    try {
      await api.request('/api/products/bulk/delete', {
        method: 'POST',
        body: { ids: Array.from(selectedProducts) },
      })
      setShowDeleteModal(false)
      setSelectedProducts(new Set())
      loadProducts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Single archive
  const handleArchive = async (id: number, archive: boolean) => {
    setError('')
    try {
      await api.request(`/api/products/${id}/${archive ? 'archive' : 'unarchive'}`, { method: 'POST' })
      loadProducts()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Single delete
  const handleDeleteClick = (id: number) => {
    setDeleteTarget(id)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setError('')
    try {
      await api.request(`/api/products/${deleteTarget}`, { method: 'DELETE' })
      setShowDeleteModal(false)
      setDeleteTarget(null)
      loadProducts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const resetForm = useCallback(() => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setError('')
  }, [])

  const openCreate = useCallback(() => {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setShowForm(true)
  }, [])

  const openEdit = useCallback((product: Product) => {
    setEditingId(product.id)
    setForm({
      productCode: product.productCode || '',
      name: product.name,
      category: product.category,
      color: product.color || '',
      description: product.description,
      shortDescription: product.shortDescription,
      moq: product.moq,
      price: product.price ? String(product.price / 100) : '',
      swatches: product.swatches.length > 0 ? product.swatches : [['#c9a876', '#8a6d43']],
      featured: product.featured,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
    })
    setShowForm(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const body: any = {
        ...form,
        productCode: form.productCode || undefined,
        color: form.color || undefined,
        price: form.price ? Math.round(Number(form.price) * 100) : undefined,
      }

      if (editingId) {
        await api.request(`/api/products/${editingId}`, { method: 'PATCH', body })
      } else {
        await api.request('/api/products', { method: 'POST', body })
      }
      resetForm()
      loadProducts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addSwatch = () => {
    setForm({ ...form, swatches: [...form.swatches, ['#c9a876', '#8a6d43']] })
  }

  const removeSwatch = (index: number) => {
    if (form.swatches.length <= 1) return
    setForm({ ...form, swatches: form.swatches.filter((_, i) => i !== index) })
  }

  const updateSwatch = (index: number, colorIndex: 0 | 1, value: string) => {
    const updated = [...form.swatches]
    updated[index] = [...updated[index]] as [string, string]
    updated[index][colorIndex] = value
    setForm({ ...form, swatches: updated })
  }

  const formatPrice = (kurus: number | null) => {
    if (!kurus) return '-'
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(kurus / 100)
  }

  const deleteModalTitle = deleteTarget ? 'Ürünü Sil' : 'Ürünleri Sil'
  const deleteModalMessage = deleteTarget
    ? 'Bu ürünü kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
    : `${selectedProducts.size} ürünü kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-espresso)] sm:text-2xl">Ürünler</h1>
          <p className="mt-1 text-xs text-[var(--color-ink)]/50 sm:text-sm">
            {showArchived ? 'Arşivlenmiş ürünler' : 'Ürün listesi'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-espresso)]"
        >
          <Plus size={16} />
          Ürün Ekle
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/40" />
          <input
            type="text"
            placeholder="Kod, ürün adı, kategori veya renk ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[var(--color-brass)]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--color-cream-deep)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)] sm:flex-none"
          >
            <option value="">Tüm Kategoriler</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
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
            <span className="hidden sm:inline">Arşiv</span>
          </button>
          {debugMode && (
            <button
              onClick={toggleSelectAll}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                selectedProducts.size === displayProducts.length && displayProducts.length > 0
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/10 text-[var(--color-wood-dark)]'
                  : 'border-[var(--color-cream-deep)] text-[var(--color-ink)]/60'
              }`}
            >
              <CheckSquare size={14} />
              <span className="hidden sm:inline">{selectedProducts.size === displayProducts.length ? 'Bırak' : 'Tümü'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {debugMode && selectedProducts.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-brass)] bg-[var(--color-brass)]/5 px-3 py-2.5 sm:gap-3 sm:px-4">
          <span className="text-sm font-medium text-[var(--color-wood-dark)]">
            {selectedProducts.size} ürün seçildi
          </span>
          <div className="flex-1" />
          {!showArchived ? (
            <button onClick={handleBulkArchive} disabled={bulkLoading}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-wood)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-wood-dark)] disabled:opacity-50">
              {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
              Arşivle
            </button>
          ) : (
            <>
              <button onClick={handleBulkUnarchive} disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-wood)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-wood-dark)] disabled:opacity-50">
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                Geri Al
              </button>
              <button onClick={handleBulkDeleteClick} disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Sil
              </button>
            </>
          )}
          <button onClick={() => setSelectedProducts(new Set())}
            className="rounded p-1 text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[var(--color-cream-deep)] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Ürün Düzenle' : 'Yeni Ürün'}</h2>
            <button onClick={resetForm}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Ürün Adı" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input placeholder="Ürün Kodu (5 hane, opsiyonel)" value={form.productCode} maxLength={5}
              onChange={(e) => setForm({ ...form, productCode: e.target.value.replace(/[^0-9]/g, '') })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 font-mono outline-none focus:border-[var(--color-brass)]" />
            <select value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]">
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]">
              <option value="">Renk Seçin</option>
              {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Fiyat (₺)" step="0.01" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input placeholder="Kısa Açıklama" value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)] sm:col-span-2" />
            <textarea placeholder="Detaylı Açıklama" value={form.description} rows={3}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)] sm:col-span-2" />
            <input placeholder="Min. Sipariş (örn: 200 adet)" value={form.moq}
              onChange={(e) => setForm({ ...form, moq: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-ink)]/70">Renk Kartları</label>
                <button type="button" onClick={addSwatch}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--color-wood-dark)] hover:underline">
                  <Plus size={12} /> Renk Ekle
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {form.swatches.map((swatch, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-[var(--color-cream-deep)] p-2">
                    <div className="h-8 w-8 rounded border border-gray-200"
                      style={{ background: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]})` }} />
                    <input type="color" value={swatch[0]}
                      onChange={(e) => updateSwatch(i, 0, e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border-0 p-0" title="Başlangıç rengi" />
                    <input type="color" value={swatch[1]}
                      onChange={(e) => updateSwatch(i, 1, e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border-0 p-0" title="Bitiş rengi" />
                    {form.swatches.length > 1 && (
                      <button type="button" onClick={() => removeSwatch(i)} className="text-red-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="rounded border-[var(--color-cream-deep)]" />
                Öne Çıkan
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-[var(--color-cream-deep)]" />
                Aktif
              </label>
            </div>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-[var(--color-wood-dark)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50 sm:col-span-2">
              {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Oluştur'}
            </button>
          </form>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-[var(--color-cream-deep)] bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50">
            <tr>
              {debugMode && <th className="w-10 px-4 py-3"></th>}
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Renk</th>
              <th className="px-4 py-3 font-medium">Fiyat</th>
              <th className="px-4 py-3 font-medium">Renkler</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 text-right font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={debugMode ? 9 : 8} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Yükleniyor...
                </td>
              </tr>
            ) : displayProducts.length === 0 ? (
              <tr>
                <td colSpan={debugMode ? 9 : 8} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Ürün bulunamadı
                </td>
              </tr>
            ) : (
              displayProducts.map((product) => {
                const isChecked = selectedProducts.has(product.id)
                return (
                  <tr key={product.id}
                    className={`border-b border-[var(--color-cream-deep)] last:border-0 ${
                      !product.isActive ? 'opacity-50' : ''
                    } ${product.isArchived ? 'opacity-60' : ''} ${isChecked ? 'bg-[var(--color-brass)]/5' : ''}`}>
                    {debugMode && (
                      <td className="px-4 py-3">
                        <div onClick={(e) => toggleProductSelection(product.id, e)}
                          className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                            isChecked
                              ? 'border-[var(--color-brass)] bg-[var(--color-brass)] text-white'
                              : 'border-[var(--color-cream-deep)] hover:border-[var(--color-brass)]'
                          }`}>
                          {isChecked && <CheckSquare size={12} />}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {product.productCode ? (
                        <span className="rounded bg-[var(--color-cream-deep)] px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--color-wood-dark)]">
                          {product.productCode}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        {product.isArchived && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Arşiv</span>
                        )}
                      </div>
                      <div className="mt-0.5 max-w-xs truncate text-xs text-[var(--color-ink)]/50">
                        {product.shortDescription}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--color-cream-deep)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-wood-dark)]">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink)]/60">{product.color || '-'}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(product.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {product.swatches.slice(0, 3).map((swatch, i) => (
                          <div key={i} className="h-5 w-5 rounded-full border border-gray-200"
                            style={{ background: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]})` }}
                            title={`${swatch[0]} → ${swatch[1]}`} />
                        ))}
                        {product.swatches.length > 3 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] text-gray-500">
                            +{product.swatches.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {product.isActive ? (
                          <Eye size={14} className="text-green-600" />
                        ) : (
                          <EyeOff size={14} className="text-gray-400" />
                        )}
                        {product.featured && (
                          <span className="rounded bg-[var(--color-brass)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-wood-dark)]">★</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleArchive(product.id, !product.isArchived)}
                          className="rounded-lg p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                          title={product.isArchived ? 'Arşivden çıkar' : 'Arşivle'}>
                          {product.isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                        </button>
                        <button onClick={() => openEdit(product)}
                          className="rounded-lg p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                          title="Düzenle">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDeleteClick(product.id)}
                          className="rounded-lg p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Sil">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-8 text-center text-[var(--color-ink)]/40">
            Ürün bulunamadı
          </div>
        ) : (
          displayProducts.map((product) => {
            const isChecked = selectedProducts.has(product.id)
            return (
              <div
                key={product.id}
                className={`rounded-xl border bg-white p-3 ${
                  !product.isActive ? 'opacity-50' : ''
                } ${product.isArchived ? 'opacity-60' : ''} ${
                  isChecked ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/5' : 'border-[var(--color-cream-deep)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {debugMode && (
                        <div
                          onClick={(e) => toggleProductSelection(product.id, e)}
                          className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                            isChecked
                              ? 'border-[var(--color-brass)] bg-[var(--color-brass)] text-white'
                              : 'border-[var(--color-cream-deep)] hover:border-[var(--color-brass)]'
                          }`}
                        >
                          {isChecked && <CheckSquare size={12} />}
                        </div>
                      )}
                      {product.productCode && (
                        <span className="rounded bg-[var(--color-cream-deep)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--color-wood-dark)]">
                          {product.productCode}
                        </span>
                      )}
                      <span className="rounded-full bg-[var(--color-cream-deep)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-wood-dark)]">
                        {product.category}
                      </span>
                      {product.isArchived && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Arşiv</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-sm font-medium">{product.name}</div>
                    {product.shortDescription && (
                      <div className="mt-0.5 truncate text-xs text-[var(--color-ink)]/50">{product.shortDescription}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(product)}
                      className="rounded-lg p-1.5 text-[var(--color-ink)]/40 hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                      title="Düzenle">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDeleteClick(product.id)}
                      className="rounded-lg p-1.5 text-[var(--color-ink)]/40 hover:bg-red-50 hover:text-red-600"
                      title="Sil">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
                    {product.color && (
                      <span className="text-xs text-[var(--color-ink)]/50">{product.color}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {product.swatches.slice(0, 3).map((swatch, i) => (
                        <div key={i} className="h-4 w-4 rounded-full border border-gray-200"
                          style={{ background: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]})` }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      {product.isActive ? (
                        <Eye size={12} className="text-green-600" />
                      ) : (
                        <EyeOff size={12} className="text-gray-400" />
                      )}
                      {product.featured && (
                        <span className="rounded bg-[var(--color-brass)]/20 px-1 py-0.5 text-[9px] font-semibold text-[var(--color-wood-dark)]">★</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="mt-3 text-xs text-[var(--color-ink)]/40">
        {displayProducts.length} / {products.length} ürün
      </p>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        title={deleteModalTitle}
        message={deleteModalMessage}
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        variant="danger"
        onConfirm={deleteTarget ? handleDeleteConfirm : handleBulkDeleteConfirm}
        onCancel={() => { setShowDeleteModal(false); setDeleteTarget(null) }}
        loading={deleteLoading}
      />
    </div>
  )
}
