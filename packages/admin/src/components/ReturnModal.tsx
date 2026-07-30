import { useState, useEffect } from 'react'
import { X, Package, AlertTriangle } from 'lucide-react'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number | null
  itemStatus: string
}

interface ReturnModalProps {
  open: boolean
  orderItems: OrderItem[]
  orderNumber: string
  preselectedItemId?: string | null
  onConfirm: (data: {
    items: Array<{ orderItemId: string; quantity: number; note?: string }>
    returnShippingCost?: number
    note?: string
  }) => void
  onCancel: () => void
  loading?: boolean
}

export default function ReturnModal({
  open,
  orderItems,
  orderNumber,
  preselectedItemId,
  onConfirm,
  onCancel,
  loading = false,
}: ReturnModalProps) {
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; note: string }>>({})
  const [returnShippingCost, setReturnShippingCost] = useState('')
  const [note, setNote] = useState('')

  // Auto-select preselected item when modal opens
  useEffect(() => {
    if (open && preselectedItemId) {
      const item = orderItems.find((i) => i.id === preselectedItemId)
      if (item) {
        setSelectedItems({ [preselectedItemId]: { quantity: item.quantity, note: '' } })
      }
    }
  }, [open, preselectedItemId])

  if (!open) return null

  const deliveredItems = orderItems.filter((item) => item.itemStatus === 'delivered')

  const toggleItem = (itemId: string, maxQuantity: number) => {
    setSelectedItems((prev) => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [itemId]: { quantity: maxQuantity, note: '' } }
    })
  }

  const updateQuantity = (itemId: string, quantity: number, maxQuantity: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.min(Math.max(1, quantity), maxQuantity),
      },
    }))
  }

  const updateItemNote = (itemId: string, note: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], note },
    }))
  }

  const handleConfirm = () => {
    const items = Object.entries(selectedItems).map(([orderItemId, data]) => ({
      orderItemId,
      quantity: data.quantity,
      note: data.note || undefined,
    }))

    if (items.length === 0) return

    onConfirm({
      items,
      returnShippingCost: returnShippingCost ? parseInt(returnShippingCost, 10) * 100 : undefined,
      note: note || undefined,
    })
  }

  const totalSelectedItems = Object.keys(selectedItems).length
  const allItemsSelected = totalSelectedItems === deliveredItems.length

  const formatPrice = (amount: number | null) => {
    if (!amount) return null
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-espresso)]">İade İşlemi</h2>
            <p className="mt-1 text-sm text-[var(--color-ink)]/50">Sipariş: {orderNumber}</p>
          </div>
          <button onClick={onCancel} className="text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]">
            <X size={20} />
          </button>
        </div>

        {/* Uyarı */}
        {allItemsSelected && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <div className="text-sm text-red-700">
              <strong>Dikkat:</strong> Tüm ürünler iade edildiğinde sipariş "İptal" olarak işaretlenecektir.
            </div>
          </div>
        )}

        {/* Ürünler */}
        <div className="mb-4 max-h-60 space-y-2 overflow-y-auto">
          <label className="block text-sm font-medium">İade Edilecek Ürünler</label>
          {deliveredItems.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
              Teslim edilmiş ürün bulunamadı
            </div>
          ) : (
            deliveredItems.map((item) => {
              const isSelected = !!selectedItems[item.id]
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    isSelected ? 'border-red-300 bg-red-50' : 'border-[var(--color-cream-deep)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleItem(item.id, item.quantity)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.productName}</div>
                      <div className="mt-1 text-xs text-[var(--color-ink)]/50">
                        {item.quantity} adet
                        {item.unitPrice && ` · ${formatPrice(item.unitPrice)}`}
                      </div>
                      {isSelected && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-[var(--color-ink)]/60">Adet:</label>
                            <input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={selectedItems[item.id]?.quantity || 1}
                              onChange={(e) =>
                                updateQuantity(item.id, parseInt(e.target.value, 10), item.quantity)
                              }
                              className="w-20 rounded border border-[var(--color-cream-deep)] px-2 py-1 text-xs"
                            />
                            <span className="text-xs text-[var(--color-ink)]/40">/ {item.quantity}</span>
                          </div>
                          <input
                            type="text"
                            placeholder="İade notu (opsiyonel)"
                            value={selectedItems[item.id]?.note || ''}
                            onChange={(e) => updateItemNote(item.id, e.target.value)}
                            className="w-full rounded border border-[var(--color-cream-deep)] px-2 py-1 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Kargo ücreti */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Kargo Ücreti (₺)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={returnShippingCost}
            onChange={(e) => setReturnShippingCost(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
          />
        </div>

        {/* Genel not */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Not</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="İade notu..."
            rows={2}
            className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
          />
        </div>

        {/* Butonlar */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[var(--color-cream-deep)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-cream)]"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || totalSelectedItems === 0}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            İade Al ({totalSelectedItems} ürün)
          </button>
        </div>
      </div>
    </div>
  )
}
