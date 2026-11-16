import { useEffect, useState, useMemo, useCallback } from 'react'
import { api } from '../lib/api'
import ConfirmModal from '../components/ConfirmModal'
import ProductDetailModal from '../components/ProductDetailModal'
import ProductGalleryModal from '../components/ProductGalleryModal'
import ImageUpload from '../components/ImageUpload'
import {
  Plus, Search, X, Pencil, Trash2, Eye, EyeOff,
  Archive, ArchiveRestore, CheckSquare, Loader2, ImageIcon, Check,
  Tags,
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
  images: string[]
  featured: boolean
  isActive: boolean
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface Category {
  id: number
  name: string
  sortOrder: number
}

const DEFAULT_COLORS = ['Beyaz', 'Krem', 'Kırık Beyaz', 'Kahverengi', 'Siyah', 'Altın', 'Gümüş', 'Gri', 'Ahşap', 'Doğal']

// Load colors from localStorage or use defaults
function getColors(): string[] {
  try {
    const saved = localStorage.getItem('product_colors')
    return saved ? JSON.parse(saved) : DEFAULT_COLORS
  } catch {
    return DEFAULT_COLORS
  }
}

function saveColors(colors: string[]) {
  localStorage.setItem('product_colors', JSON.stringify(colors))
}

const emptyForm = {
  productCode: '',
  name: '',
  category: 'Rustik',
  color: '',
  description: '',
  shortDescription: '',
  moq: '',
  price: '',
  images: [] as string[],
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

  // Dynamic categories from API
  const [categories, setCategories] = useState<string[]>([])
  const [managedCategories, setManagedCategories] = useState<Category[]>([])
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)

  // Dynamic colors
  const [colors, setColors] = useState<string[]>(getColors)
  const [customColor, setCustomColor] = useState('')
  const [showColorInput, setShowColorInput] = useState(false)
  const [newColorName, setNewColorName] = useState('')

  // Bulk create
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    name: '',
    category: '',
    description: '',
    shortDescription: '',
    moq: '',
    price: '',
    selectedColors: [] as string[],
  })
  const [bulkSaving, setBulkSaving] = useState(false)

  // Archive & selection
  const [showArchived, setShowArchived] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Product detail & gallery
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null)

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

  const loadCategories = async () => {
    try {
      const data = await api.request<string[]>('/api/products/categories')
      setCategories(data)
    } catch {
      // Kategoriler yüklenemezse boş kalır
    }
  }

  const loadManagedCategories = async () => {
    try {
      const data = await api.request<Category[]>('/api/products/categories/manage')
      setManagedCategories(data)
    } catch {
      setManagedCategories([])
    }
  }

  const handleAddCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setCategoryLoading(true)
    try {
      await api.request('/api/products/categories', {
        method: 'POST',
        body: { name },
      })
      setNewCategoryName('')
      loadCategories()
      loadManagedCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async (id: number) => {
    setCategoryLoading(true)
    try {
      await api.request(`/api/products/categories/${id}`, { method: 'DELETE' })
      loadCategories()
      loadManagedCategories()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleAddColor = useCallback(() => {
    const trimmed = newColorName.trim()
    if (!trimmed) return
    if (!colors.includes(trimmed)) {
      const newColors = [...colors, trimmed]
      setColors(newColors)
      saveColors(newColors)
    }
    setNewColorName('')
  }, [newColorName, colors])

  const handleDeleteColor = useCallback((colorToDelete: string) => {
    const newColors = colors.filter(c => c !== colorToDelete)
    setColors(newColors)
    saveColors(newColors)
    // If the deleted color was selected in form, clear it
    if (form.color === colorToDelete) {
      setForm({ ...form, color: '' })
    }
  }, [colors, form])

  const handleBulkColorToggle = useCallback((color: string) => {
    setBulkForm(prev => ({
      ...prev,
      selectedColors: prev.selectedColors.includes(color)
        ? prev.selectedColors.filter(c => c !== color)
        : [...prev.selectedColors, color],
    }))
  }, [])

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bulkForm.selectedColors.length === 0) {
      setError('En az bir renk seçmelisiniz')
      return
    }
    setError('')
    setBulkSaving(true)

    try {
      await api.request('/api/products/bulk', {
        method: 'POST',
        body: {
          name: bulkForm.name,
          category: bulkForm.category,
          colors: bulkForm.selectedColors,
          description: bulkForm.description || undefined,
          shortDescription: bulkForm.shortDescription || undefined,
          moq: bulkForm.moq || undefined,
          price: bulkForm.price ? Math.round(Number(bulkForm.price) * 100) : undefined,
        },
      })
      setShowBulkForm(false)
      setBulkForm({
        name: '',
        category: '',
        description: '',
        shortDescription: '',
        moq: '',
        price: '',
        selectedColors: [],
      })
      loadProducts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkSaving(false)
    }
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
    setSelectedProducts(new Set())
  }, [showArchived])

  useEffect(() => {
    if (showCategoryManager) {
      loadManagedCategories()
    }
  }, [showCategoryManager])

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
    setShowColorInput(false)
    setCustomColor('')
  }, [])

  const addCustomColor = useCallback(() => {
    const trimmed = customColor.trim()
    if (!trimmed) return
    if (!colors.includes(trimmed)) {
      const newColors = [...colors, trimmed]
      setColors(newColors)
      saveColors(newColors)
    }
    setForm({ ...form, color: trimmed })
    setCustomColor('')
    setShowColorInput(false)
  }, [customColor, colors, form])

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
      images: product.images || [],
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkForm(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-brass)] bg-[var(--color-brass)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-wood-dark)] transition-colors hover:bg-[var(--color-brass)]/20"
          >
            <Plus size={16} />
            Toplu Ekle
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-espresso)]"
          >
            <Plus size={16} />
            Ürün Ekle
          </button>
        </div>
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
          <div className="flex items-center gap-1">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--color-cream-deep)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)] sm:flex-none"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-2 text-sm font-medium transition-colors ${
                showCategoryManager
                  ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/10 text-[var(--color-wood-dark)]'
                  : 'border-[var(--color-cream-deep)] text-[var(--color-ink)]/60 hover:border-[var(--color-brass)]'
              }`}
              title="Kategorileri Yönet"
            >
              <Tags size={14} />
            </button>
          </div>
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
        </div>
      </div>

      {/* Category & Color Manager */}
      {showCategoryManager && (
        <div className="mb-4 rounded-xl border border-[var(--color-cream-deep)] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-wood-dark)]">
              <Tags size={16} />
              Kategori & Renk Yönetimi
            </h3>
            <button onClick={() => setShowCategoryManager(false)} className="text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]">
              <X size={16} />
            </button>
          </div>

          {/* Categories Section */}
          <div className="mb-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]/50">Kategoriler</h4>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="Yeni kategori adı..."
                className="flex-1 rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim() || categoryLoading}
                className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                {categoryLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Ekle
              </button>
            </div>
            {managedCategories.length === 0 ? (
              <p className="text-xs text-[var(--color-ink)]/40">Henüz kategori eklenmemiş</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {managedCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50 px-2.5 py-1.5 text-sm"
                  >
                    <span className="font-medium text-[var(--color-wood-dark)]">{cat.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      disabled={categoryLoading}
                      className="rounded p-0.5 text-[var(--color-ink)]/30 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Sil"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mb-4 border-t border-[var(--color-cream-deep)]" />

          {/* Colors Section */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]/50">Renkler</h4>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddColor()}
                placeholder="Yeni renk adı..."
                className="flex-1 rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
              />
              <button
                onClick={handleAddColor}
                disabled={!newColorName.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                <Plus size={14} />
                Ekle
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <div
                  key={color}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50 px-2.5 py-1.5 text-sm"
                >
                  <span className="font-medium text-[var(--color-wood-dark)]">{color}</span>
                  <button
                    onClick={() => handleDeleteColor(color)}
                    className="rounded p-0.5 text-[var(--color-ink)]/30 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Sil"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedProducts.size > 0 && (
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
              onChange={(e) => {
                if (e.target.value === '__manage_categories__') {
                  setShowCategoryManager(true)
                } else {
                  setForm({ ...form, category: e.target.value })
                }
              }}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]">
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              <option value="__manage_categories__">+ Kategorileri Yönet...</option>
            </select>
            {/* Color Select with Custom Input */}
            <div className="relative">
              <select value={form.color}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setShowColorInput(true)
                  } else {
                    setForm({ ...form, color: e.target.value })
                    setShowColorInput(false)
                  }
                }}
                className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]">
                <option value="">Renk Seçin</option>
                {colors.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__custom__">+ Yeni Renk Ekle...</option>
              </select>
              {showColorInput && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomColor()}
                    placeholder="Yeni renk adı..."
                    autoFocus
                    className="flex-1 rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
                  />
                  <button
                    type="button"
                    onClick={addCustomColor}
                    disabled={!customColor.trim()}
                    className="flex items-center justify-center rounded-lg bg-green-500 px-3 py-2 text-white hover:bg-green-600 disabled:opacity-50"
                    title="Ekle"
                  >
                    <Check size={16} />
                  </button>
                </div>
              )}
            </div>
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
            {/* Images */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]/70">Görseller</label>
              <ImageUpload
                images={form.images}
                onChange={(images) => setForm({ ...form, images })}
                maxImages={10}
              />
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

      {/* Bulk Create Form */}
      {showBulkForm && (
        <div className="mb-6 rounded-xl border border-[var(--color-brass)] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Toplu Ürün Oluştur</h2>
            <button onClick={() => setShowBulkForm(false)}><X size={18} /></button>
          </div>
          <p className="mb-4 text-xs text-[var(--color-ink)]/50">
            Aynı ürünün farklı renk varyasyonlarını tek seferde oluşturun. Örn: "Dekorink" için 8 farklı renk seçin, 8 ayrı ürün oluşsun.
          </p>
          <form onSubmit={handleBulkSubmit} className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Ürün Adı (örn: Dekorink)" value={bulkForm.name}
              onChange={(e) => setBulkForm({ ...bulkForm, name: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <select required value={bulkForm.category}
              onChange={(e) => setBulkForm({ ...bulkForm, category: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]">
              <option value="">Kategori Seçin</option>
              {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <input type="number" placeholder="Fiyat (₺)" step="0.01" value={bulkForm.price}
              onChange={(e) => setBulkForm({ ...bulkForm, price: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input placeholder="Min. Sipariş (örn: 200 adet)" value={bulkForm.moq}
              onChange={(e) => setBulkForm({ ...bulkForm, moq: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]" />
            <input placeholder="Kısa Açıklama" value={bulkForm.shortDescription}
              onChange={(e) => setBulkForm({ ...bulkForm, shortDescription: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)] sm:col-span-2" />
            <textarea placeholder="Detaylı Açıklama" value={bulkForm.description} rows={2}
              onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)] sm:col-span-2" />

            {/* Color Selection */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[var(--color-ink)]/70">
                Renkler <span className="text-[var(--color-ink)]/40">({bulkForm.selectedColors.length} seçili)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const isSelected = bulkForm.selectedColors.includes(color)
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleBulkColorToggle(color)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-[var(--color-brass)] bg-[var(--color-brass)]/10 text-[var(--color-wood-dark)]'
                          : 'border-[var(--color-cream-deep)] text-[var(--color-ink)]/60 hover:border-[var(--color-brass)]'
                      }`}
                    >
                      {isSelected && <Check size={14} />}
                      {color}
                    </button>
                  )
                })}
              </div>
            </div>

            <button type="submit" disabled={bulkSaving || bulkForm.selectedColors.length === 0}
              className="rounded-lg bg-[var(--color-wood-dark)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50 sm:col-span-2">
              {bulkSaving ? 'Oluşturuluyor...' : `${bulkForm.selectedColors.length} Ürün Oluştur`}
            </button>
          </form>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-[var(--color-cream-deep)] bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50">
            <tr>
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3 font-medium">Kod</th>
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Renk</th>
              <th className="px-4 py-3 font-medium">Fiyat</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 text-right font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
                  Yükleniyor...
                </td>
              </tr>
            ) : displayProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-[var(--color-ink)]/40">
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
                        <button
                          onClick={() => { setSelectedProduct(product); setShowDetailModal(true) }}
                          className="font-medium text-[var(--color-wood-dark)] hover:underline"
                        >
                          {product.name}
                        </button>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{formatPrice(product.price)}</span>
                        <button
                          onClick={() => { setGalleryProduct(product); setShowGalleryModal(true) }}
                          className="rounded p-1 text-[var(--color-ink)]/30 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                          title="Görselleri Gör"
                        >
                          <ImageIcon size={14} />
                        </button>
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
                    <button
                      onClick={() => { setSelectedProduct(product); setShowDetailModal(true) }}
                      className="mt-1.5 text-sm font-medium text-[var(--color-wood-dark)] hover:underline"
                    >
                      {product.name}
                    </button>
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
                    <button
                      onClick={() => { setGalleryProduct(product); setShowGalleryModal(true) }}
                      className="rounded p-1 text-[var(--color-ink)]/30 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                      title="Görselleri Gör"
                    >
                      <ImageIcon size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
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

      {/* Product Detail Modal */}
      <ProductDetailModal
        open={showDetailModal}
        product={selectedProduct}
        onClose={() => { setShowDetailModal(false); setSelectedProduct(null) }}
      />

      {/* Product Gallery Modal */}
      <ProductGalleryModal
        open={showGalleryModal}
        productName={galleryProduct?.name || ''}
        images={galleryProduct?.images || []}
        onClose={() => { setShowGalleryModal(false); setGalleryProduct(null) }}
      />
    </div>
  )
}
