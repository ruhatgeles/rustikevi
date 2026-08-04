import { useState, useRef, useCallback } from 'react'
import { Upload, X, ImageIcon, Loader2, AlertCircle } from 'lucide-react'
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
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      setError('Lütfen bir görsel dosyası seçin (JPEG, PNG, WebP, GIF)')
      return
    }
    if (images.length + imageFiles.length > maxImages) {
      setError(`En fazla ${maxImages} görsel yükleyebilirsiniz. Şu an ${images.length} görsel var.`)
      return
    }

    setError(null)
    setUploading(true)
    setProgress(`${imageFiles.length} görsel yükleniyor...`)

    try {
      const uploadedUrls: string[] = []

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        setProgress(`${i + 1}/${imageFiles.length}: ${file.name} yükleniyor...`)

        const formData = new FormData()
        formData.append('file', file)

        try {
          const result = await api.uploadFile<{ url: string; filename: string }>('/api/upload/image', formData)
          if (result?.url) {
            uploadedUrls.push(result.url)
          } else {
            console.warn('Geçersiz sunucu yanıtı:', result)
          }
        } catch (fileErr: any) {
          console.error(`Dosya yükleme hatası (${file.name}):`, fileErr)
          setError(`"${file.name}" yüklenemedi: ${fileErr.message || 'Bilinmeyen hata'}`)
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls])
        setProgress(`${uploadedUrls.length} görsel başarıyla yüklendi!`)
        setTimeout(() => setProgress(null), 3000)
      } else if (!error) {
        setError('Hiçbir görsel yüklenemedi. Lütfen tekrar deneyin.')
      }
    } catch (err: any) {
      console.error('Yükleme hatası:', err)
      setError(err.message || 'Görsel yükleme hatası. Lütfen tekrar deneyin.')
    } finally {
      setUploading(false)
    }
  }, [images, maxImages, onChange, error])

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
      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Progress Message */}
      {progress && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          <p className="text-sm text-blue-700">{progress}</p>
        </div>
      )}

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
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="animate-spin text-[var(--color-wood-dark)]" />
            <p className="text-sm text-[var(--color-ink)]/60">
              {progress || 'Yükleniyor...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-[var(--color-ink)]/30" />
            <div>
              <p className="text-sm font-medium text-[var(--color-ink)]/70">
                Görselleri sürükle bırak veya tıkla
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink)]/40">
                JPEG, PNG, WebP, GIF • Maks 20MB • En fazla {maxImages} görsel
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
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMjAgMTBDMTUuNTggMTAgMTIgMTMuNTggMTIgMThDMTIgMjIuNDIgMTUuNTggMjYgMjAgMjZDMjQuNDIgMjYgMjggMjIuNDIgMjggMThDMjggMTMuNTggMjQuNDIgMTAgMjAgMTBaTTIwIDI0QzE2LjY5IDI0IDE0IDIxLjMxIDE0IDE4QzE0IDE0LjY5IDE2LjY5IDEyIDIwIDEyQzIzLjMxIDEyIDI2IDE0LjY5IDI2IDE4QzI2IDIxLjMxIDIzLjMxIDI0IDIwIDI0WiIgZmlsbD0iIzlDQTNBRiIvPjwvc3ZnPg=='
                }}
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
