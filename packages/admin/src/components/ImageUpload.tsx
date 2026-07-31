import { useState, useRef, useCallback } from 'react'
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react'
import { api } from '../lib/api'

interface ImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
}

export default function ImageUpload({
  images,
  onChange,
  maxImages = 10,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'))

    if (imageFiles.length === 0) return
    if (images.length + imageFiles.length > maxImages) {
      alert(`En fazla ${maxImages} görsel yükleyebilirsiniz.`)
      return
    }

    setUploading(true)
    try {
      const uploadedUrls: string[] = []

      for (const file of imageFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const result = await api.uploadFile('/api/upload/image', formData)
        uploadedUrls.push(result.data.url)
      }

      onChange([...images, ...uploadedUrls])
    } catch (err: any) {
      alert(err.message || 'Görsel yükleme hatası')
    } finally {
      setUploading(false)
    }
  }, [images, maxImages, onChange])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
  }, [images, onChange])

  return (
    <div className="space-y-3">
      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragActive
            ? 'border-[var(--color-wood-dark)] bg-[var(--color-cream)]'
            : 'border-[var(--color-cream-deep)] hover:border-[var(--color-brass)] hover:bg-[var(--color-cream)]/50'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="animate-spin text-[var(--color-wood-dark)]" />
            <p className="text-sm text-[var(--color-ink)]/60">Yükleniyor...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-[var(--color-ink)]/30" />
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]/70">
                Görselleri sürükle bırak veya tıkla
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink)]/40">
                JPEG, PNG, WebP, GIF • Maks 5MB • En fazla {maxImages} görsel
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img, i) => (
            <div
              key={i}
              className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--color-cream-deep)]"
            >
              <img
                src={img}
                alt={`Görsel ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeImage(i)
                }}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={12} />
              </button>
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[10px] text-white">
                  Ana Görsel
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
