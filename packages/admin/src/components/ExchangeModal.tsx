import { useState } from 'react'
import { X, Package, ArrowRight, Plus, Trash2 } from 'lucide-react'
import ProductSearch from './ProductSearch'

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number | null
  itemStatus: string
}

interface Product {
  id: number
  name: string
  productCode: string | null
  category: string
  color: string | null
  price: number | null
}

interface ExchangeModalProps {
  open: boolean
  orderItems: OrderItem[]
  orderNumber: string
  onConfirm: (data: {
    oldItems: Array<{ orderItemId: string; quantity: number; note?: string }>
    newItems: Array<{ productName: string; quantity: number; unitPrice?: number; specifications?: string }>
    note?: string
  }) => void
  onCancel: () => void
  loading?: boolean
}

interface NewItem {
  productName: string
  quantity: number
  unitPrice: number | undefined
  specifications: string
}

export default function ExchangeModal({
  open,
  orderItems,
  orderNumber,
  onConfirm,
  onCancel,
  loading = false,
}: ExchangeModalProps) {
  const [selectedOldItems, setSelectedOldItems] = useState<Record<string, { quantity: number; note: string }>>({})
  const [newItems, setNewItems] = useState<NewItem[]>([])
  const [note, setNote] = useState('')

  if (!open) return null

  const deliveredItems = orderItems.filter((item) => item.itemStatus === 'delivered')

  const toggleOldItem = (itemId: string, maxQuantity: number) => {
    setSelectedOldItems((prev) => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [itemId]: { quantity: maxQuantity, note: '' } }
    })
  }

  const updateOldQuantity = (itemId: string, quantity: number, maxQuantity: number) => {
    setSelectedOldItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.min(Math.max(1, quantity), maxQuantity),
      },
    }))
  }

  const updateOldNote = (itemId: string, note: string) => {
    setSelectedOldItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], note },
    }))
  }

  const addNewItem = () => {
    setNewItems((prev) => [
      ...prev,
      { productName: '', quantity: 1, unitPrice: undefined, specifications: '' },
    ])
  }

  const removeNewItem = (index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateNewItem = (index: number, field: keyof NewItem, value: any) => {
    setNewItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const handleProductSelect = (index: number, product: Product) => {
    updateNewItem(index, 'productName', product.name)
    if (product.price) {
      updateNewItem(index, 'unitPrice', product.price)
    }
  }

  const handleConfirm = () => {
    const oldItems = Object.entries(selectedOldItems).map(([orderItemId, data]) => ({
      orderItemId,
      quantity: data.quantity,
      note: data.note || undefined,
    }))

    const validNewItems = newItems.filter((item) => item.productName.trim() !== '')

    if (oldItems.length === 0 || validNewItems.length === 0) return

    onConfirm({
      oldItems,
      newItems: validNewItems.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        specifications: item.specifications || undefined,
      })),
      note: note || undefined,
    })
  }

  const totalSelectedOld = Object.keys(selectedOldItems).length
  const totalNewItems = newItems.filter((item) => item.productName.trim() !== '').length

  const formatPrice = (amount: number | null) => {
    if (!amount) return null
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount / 100)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-espresso)]">Değişim İşlemi</h2>
            <p className="mt-1 text-sm text-[var(--color-ink)]/50">Sipariş: {orderNumber}</p>
          </div>
          <button onClick={onCancel} className="text-[var(--color-ink)]/40 hover:text-[var(--color-ink)]">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Sol: Yanlış gönderilen ürünler */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Yanlış Gönderilen Ürünler
              {totalSelectedOld > 0 && (
                <span className="ml-2 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-medium text-pink-700">
                  {totalSelectedOld} seçili
                </span>
              )}
            </label>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {deliveredItems.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
                  Teslim edilmiş ürün bulunamadı
                </div>
              ) : (
                deliveredItems.map((item) => {
                  const isSelected = !!selectedOldItems[item.id]
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleOldItem(item.id, item.quantity)}
                      className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        isSelected
                          ? 'border-pink-400 bg-pink-50 shadow-sm'
                          : 'border-[var(--color-cream-deep)] hover:border-pink-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          isSelected
                            ? 'border-pink-500 bg-pink-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
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
                                  value={selectedOldItems[item.id]?.quantity || 1}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    updateOldQuantity(item.id, parseInt(e.target.value, 10), item.quantity)
                                  }
                                  className="w-16 rounded border border-[var(--color-cream-deep)] px-2 py-1 text-xs"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Değişim notu"
                                value={selectedOldItems[item.id]?.note || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateOldNote(item.id, e.target.value)}
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
          </div>

          {/* Sağ: Yeni gönderilecek ürünler */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Yeni Gönderilecek Ürünler</label>
              <button
                onClick={addNewItem}
                className="flex items-center gap-1 rounded-lg bg-[var(--color-cream-deep)] px-2 py-1 text-xs font-medium hover:bg-[var(--color-brass)]/20"
              >
                <Plus size={12} />
                Ekle
              </button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {newItems.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
                  Ürün ekleyin
                </div>
              ) : (
                newItems.map((item, index) => (
                  <div key={index} className="rounded-lg border border-[var(--color-cream-deep)] p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <ProductSearch
                          value={item.productName}
                          onChange={(value) => updateNewItem(index, 'productName', value)}
                          onSelect={(product) => handleProductSelect(index, product)}
                          placeholder="Ürün ara..."
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-[var(--color-ink)]/50">Adet</label>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateNewItem(index, 'quantity', parseInt(e.target.value, 10) || 1)
                              }
                              className="w-full rounded border border-[var(--color-cream-deep)] px-2 py-1 text-xs"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-[var(--color-ink)]/50">Birim Fiyat (₺)</label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unitPrice || ''}
                              onChange={(e) =>
                                updateNewItem(
                                  index,
                                  'unitPrice',
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              className="w-full rounded border border-[var(--color-cream-deep)] px-2 py-1 text-xs"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Özel not (opsiyonel)"
                          value={item.specifications}
                          onChange={(e) => updateNewItem(index, 'specifications', e.target.value)}
                          className="w-full rounded border border-[var(--color-cream-deep)] px-2 py-1 text-xs"
                        />
                      </div>
                      <button
                        onClick={() => removeNewItem(index)}
                        className="text-[var(--color-ink)]/30 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Genel not */}
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">Değişim Notu</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Değişim nedeni..."
            rows={2}
            className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brass)]"
          />
        </div>

        {/* Butonlar */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-[var(--color-cream-deep)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-cream)]"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || totalSelectedOld === 0 || totalNewItems === 0}
            className="flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Değişim Yap ({totalSelectedOld} → {totalNewItems})
          </button>
        </div>
      </div>
    </div>
  )
}
