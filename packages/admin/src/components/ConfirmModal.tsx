import { X, AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Sil',
  cancelText = 'İptal',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null

  const colors = {
    danger: {
      icon: 'bg-red-50 text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
      ring: 'ring-red-200',
    },
    warning: {
      icon: 'bg-yellow-50 text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      ring: 'ring-yellow-200',
    },
  }

  const c = colors[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className={`relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ${c.ring}`}>
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded p-1 text-[var(--color-ink)]/30 transition-colors hover:text-[var(--color-ink)]"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className={`mb-4 inline-flex rounded-full p-3 ${c.icon}`}>
          <AlertTriangle size={24} />
        </div>

        {/* Content */}
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-espresso)]">
          {title}
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-[var(--color-ink)]/60">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[var(--color-cream-deep)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]/70 transition-colors hover:bg-[var(--color-cream)] disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${c.button}`}
          >
            {loading ? 'Siliniyor...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
