import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Plus, Search, X, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react'

interface Product {
  id: number
  name: string
  category: string
  description: string
  shortDescription: string
  moq: string
  swatches: Array<[string, string]>
  featured: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const CATEGORIES = ['Rustik', 'Saçak', 'Başlık', 'Dekorink', 'Sarkıt', 'Braçöl']

const emptyForm = {
  name: '',
  category: 'Rustik',
  description: '',
  shortDescription: '',
  moq: '',
  swatches: [['#c9a876', '#8a6d43']] as Array<[string, string]>,
  featured: false,
  isActive: true,
  sortOrder: 0,
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadProducts = async () => {
    try {
      const data = await api.request<Product[]>('/api/products/all')
      setProducts(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !filterCategory || p.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (product: Product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      shortDescription: product.shortDescription,
      moq: product.moq,
      swatches: product.swatches.length > 0 ? product.swatches : [['#c9a876', '#8a6d43']],
      featured: product.featured,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (editingId) {
        await api.request(`/api/products/${editingId}`, { method: 'PATCH', body: form })
      } else {
        await api.request('/api/products', { method: 'POST', body: form })
      }
      resetForm()
      loadProducts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bu ürünü pasif yapmak istediğinize emin misiniz?')) return
    try {
      await api.request(`/api/products/${id}`, { method: 'DELETE' })
      loadProducts()
    } catch (err: any) {
      setError(err.message)
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-espresso)]">Ürünler</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-espresso)]"
        >
          <Plus size={16} />
          Ürün Ekle
        </button>
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
            placeholder="Ürün adı veya kategori ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-white py-2 pl-9 pr-4 outline-none focus:border-[var(--color-brass)]"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-[var(--color-cream-deep)] bg-white px-3 py-2 outline-none focus:border-[var(--color-brass)]"
        >
          <option value="">Tüm Kategoriler</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[var(--color-cream-deep)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? 'Ürün Düzenle' : 'Yeni Ürün'}</h2>
            <button onClick={resetForm}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Ürün Adı"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              placeholder="Kısa Açıklama"
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)] sm:col-span-2"
            />
            <textarea
              placeholder="Detaylı Açıklama"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)] sm:col-span-2"
              rows={3}
            />
            <input
              placeholder="Min. Sipariş (örn: 200 adet)"
              value={form.moq}
              onChange={(e) => setForm({ ...form, moq: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            />
            <input
              type="number"
              placeholder="Sıralama"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            />

            {/* Swatches */}
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-ink)]/70">
                  Renk Kartları
                </label>
                <button
                  type="button"
                  onClick={addSwatch}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--color-wood-dark)] hover:underline"
                >
                  <Plus size={12} />
                  Renk Ekle
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {form.swatches.map((swatch, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-cream-deep)] p-2"
                  >
                    <div
                      className="h-8 w-8 rounded border border-gray-200"
                      style={{
                        background: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]})`,
                      }}
                    />
                    <input
                      type="color"
                      value={swatch[0]}
                      onChange={(e) => updateSwatch(i, 0, e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                      title="Başlangıç rengi"
                    />
                    <input
                      type="color"
                      value={swatch[1]}
                      onChange={(e) => updateSwatch(i, 1, e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                      title="Bitiş rengi"
                    />
                    {form.swatches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSwatch(i)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  className="rounded border-[var(--color-cream-deep)]"
                />
                Öne Çıkan
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-[var(--color-cream-deep)]"
                />
                Aktif
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--color-wood-dark)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50 sm:col-span-2"
            >
              {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Oluştur'}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-cream-deep)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50">
            <tr>
              <th className="w-10 px-4 py-3 font-medium"></th>
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Min. Sipariş</th>
              <th className="px-4 py-3 font-medium">Renk</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Sıra</th>
              <th className="px-4 py-3 text-right font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Yükleniyor...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Ürün bulunamadı
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr
                  key={product.id}
                  className={`border-b border-[var(--color-cream-deep)] last:border-0 ${
                    !product.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <GripVertical size={14} className="text-[var(--color-ink)]/20" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{product.name}</div>
                    <div className="mt-0.5 max-w-xs truncate text-xs text-[var(--color-ink)]/50">
                      {product.shortDescription}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--color-cream-deep)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-wood-dark)]">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink)]/60">{product.moq}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {product.swatches.slice(0, 3).map((swatch, i) => (
                        <div
                          key={i}
                          className="h-5 w-5 rounded-full border border-gray-200"
                          style={{
                            background: `linear-gradient(135deg, ${swatch[0]}, ${swatch[1]})`,
                          }}
                          title={`${swatch[0]} → ${swatch[1]}`}
                        />
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
                        <span className="rounded bg-[var(--color-brass)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-wood-dark)]">
                          ★
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink)]/50">{product.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(product)}
                        className="rounded-lg p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                        title="Düzenle"
                      >
                        <Pencil size={15} />
                      </button>
                      {product.isActive && (
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded-lg p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Pasif Yap"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[var(--color-ink)]/40">
        {filtered.length} / {products.length} ürün
      </p>
    </div>
  )
}
