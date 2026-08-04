import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../lib/api'

interface Product {
  id: number
  productCode: string | null
  name: string
  category: string
  color: string | null
  price: number | null
}

interface ProductSearchProps {
  onSelect: (product: Product) => void
  placeholder?: string
}

export default function ProductSearch({ onSelect, placeholder = 'Ürün ara (kod, isim, renk, kategori...)' }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Arama
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 1) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.request<Product[]>(`/api/products?search=${encodeURIComponent(query)}`)
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSelect = (product: Product) => {
    onSelect(product)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/30" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-white py-1.5 pl-8 pr-8 text-sm outline-none focus:border-[var(--color-brass)]"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/30 hover:text-[var(--color-ink)]"
          >
            <X size={14} />
          </button>
        )}
        {loading && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--color-cream-deep)] bg-white shadow-lg">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-cream)]/50"
            >
              {product.productCode && (
                <span className="shrink-0 rounded bg-[var(--color-cream-deep)] px-1.5 py-0.5 font-mono text-xs font-semibold text-[var(--color-wood-dark)]">
                  {product.productCode}
                </span>
              )}
              <span className="flex-1 truncate font-medium">{product.name}</span>
              <span className="shrink-0 text-xs text-[var(--color-ink)]/40">
                {product.category}
              </span>
              {product.color && (
                <span className="shrink-0 text-xs text-[var(--color-ink)]/40">
                  {product.color}
                </span>
              )}
              {product.price && (
                <span className="shrink-0 text-xs font-medium text-[var(--color-wood-dark)]">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price / 100)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Sonuç yok */}
      {open && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-cream-deep)] bg-white p-3 text-center text-sm text-[var(--color-ink)]/40 shadow-lg">
          Ürün bulunamadı
        </div>
      )}
    </div>
  )
}
