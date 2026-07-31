import { useState } from 'react'
import { X, ImageIcon, Eye, EyeOff, Star, Package } from 'lucide-react'
import ProductGalleryModal from './ProductGalleryModal'

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

interface ProductDetailModalProps {
  open: boolean
  product: Product | null
  onClose: () => void
}

export default function ProductDetailModal({
  open,
  product,
  onClose,
}: ProductDetailModalProps) {
  const [showGallery, setShowGallery] = useState(false)

  if (!open || !product) return null

  const formatPrice = (kurus: number | null) => {
    if (!kurus) return '-'
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(kurus / 100)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-cream-deep)] px-4 py-3">
            <div className="flex items-center gap-2">
              {product.productCode && (
                <span className="rounded bg-[var(--color-cream-deep)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--color-wood-dark)]">
                  {product.productCode}
                </span>
              )}
              <h3 className="text-base font-semibold text-[var(--color-espresso)]">{product.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto p-4">
            {/* Images / Swatches */}
            <div className="mb-4">
              {product.images && product.images.length > 0 ? (
                <div className="relative">
                  <div className="grid grid-cols-3 gap-2">
                    {product.images.slice(0, 3).map((img, i) => (
                      <div
                        key={i}
                        className="aspect-square cursor-pointer overflow-hidden rounded-lg border border-[var(--color-cream-deep)] transition-colors hover:border-[var(--color-brass)]"
                        onClick={() => setShowGallery(true)}
                      >
                        <img src={img} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                  {product.images.length > 3 && (
                    <button
                      onClick={() => setShowGallery(true)}
                      className="mt-2 text-xs font-medium text-[var(--color-wood-dark)] hover:underline"
                    >
                      +{product.images.length - 3} görsel daha
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg bg-[var(--color-cream)]/30">
                  <ImageIcon size={32} className="text-[var(--color-ink)]/20" />
                </div>
              )}
              {product.images && product.images.length > 0 && (
                <button
                  onClick={() => setShowGallery(true)}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-[var(--color-wood-dark)] hover:underline"
                >
                  <ImageIcon size={12} />
                  Tüm Görselleri Gör ({product.images.length})
                </button>
              )}
            </div>

            {/* Category & Status */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--color-cream-deep)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-wood-dark)]">
                {product.category}
              </span>
              {product.color && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] text-gray-600">
                  {product.color}
                </span>
              )}
              {product.featured && (
                <span className="flex items-center gap-0.5 rounded-full bg-[var(--color-brass)]/20 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-wood-dark)]">
                  <Star size={10} /> Öne Çıkan
                </span>
              )}
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                product.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {product.isActive ? <Eye size={10} /> : <EyeOff size={10} />}
                {product.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>

            {/* Price */}
            <div className="mb-4 rounded-lg bg-[var(--color-cream)]/50 p-3">
              <div className="text-2xl font-bold text-[var(--color-espresso)]">
                {formatPrice(product.price)}
              </div>
              {product.moq && (
                <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-ink)]/50">
                  <Package size={12} />
                  Min. Sipariş: {product.moq}
                </div>
              )}
            </div>

            {/* Descriptions */}
            {product.shortDescription && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]/60">Kısa Açıklama</label>
                <p className="text-sm text-[var(--color-ink)]">{product.shortDescription}</p>
              </div>
            )}
            {product.description && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-[var(--color-ink)]/60">Detaylı Açıklama</label>
                <p className="whitespace-pre-wrap text-sm text-[var(--color-ink)]">{product.description}</p>
              </div>
            )}

            {/* Meta */}
            <div className="mt-4 border-t border-[var(--color-cream-deep)] pt-3 text-xs text-[var(--color-ink)]/40">
              <div>Oluşturulma: {new Date(product.createdAt).toLocaleDateString('tr-TR')}</div>
              <div>Güncelleme: {new Date(product.updatedAt).toLocaleDateString('tr-TR')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Modal */}
      <ProductGalleryModal
        open={showGallery}
        productName={product.name}
        images={product.images || []}
        onClose={() => setShowGallery(false)}
      />
    </>
  )
}
