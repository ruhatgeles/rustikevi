import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

interface ProductGalleryModalProps {
  open: boolean
  productName: string
  images: string[]
  onClose: () => void
}

export default function ProductGalleryModal({
  open,
  productName,
  images,
  onClose,
}: ProductGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!open) return null

  const hasImages = images.length > 0

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-cream-deep)] px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-espresso)]">{productName}</h3>
            {hasImages && (
              <p className="text-xs text-[var(--color-ink)]/50">
                {currentIndex + 1} / {images.length} görsel
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {!hasImages ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ImageIcon size={48} className="mb-3 text-[var(--color-ink)]/20" />
              <p className="text-sm text-[var(--color-ink)]/40">Bu ürün için henüz görsel eklenmemiş</p>
            </div>
          ) : (
            <div className="relative">
              {/* Main Image */}
              <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-[var(--color-cream)]/30">
                <img
                  src={images[currentIndex]}
                  alt={`${productName} - ${currentIndex + 1}`}
                  className="max-h-[400px] w-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-2 rounded-full bg-white/80 p-2 shadow-md transition-colors hover:bg-white"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-2 rounded-full bg-white/80 p-2 shadow-md transition-colors hover:bg-white"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                        i === currentIndex
                          ? 'border-[var(--color-wood-dark)]'
                          : 'border-[var(--color-cream-deep)] hover:border-[var(--color-brass)]'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${productName} - ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
