import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  Factory,
  Lock,
  Unlock,
  CheckCircle,
  Package,
  User,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'

interface AtelierItem {
  id: string
  orderId: string
  productId: number | null
  productName: string
  quantity: number
  unitPrice: number | null
  totalPrice: number | null
  itemStatus: string
  specifications: string | null
  isLocked: boolean
  createdAt: string
  orderNumber: string
  orderStatus: string
  orderCreatedAt: string
  customerName: string
  customerPhone: string | null
  productCode: string | null
}

export default function Atolye() {
  const { user } = useAuth()
  const [items, setItems] = useState<AtelierItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'
  const isAtolye = user?.role === 'atolye'

  const loadItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.request<AtelierItem[]>('/api/orders/atelier/items')
      setItems(data)
    } catch (err: any) {
      setError(err.message || 'Atölye verileri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
    // 30 saniyede bir otomatik yenile
    const interval = setInterval(loadItems, 30_000)
    return () => clearInterval(interval)
  }, [loadItems])

  const handleLock = async (orderId: string, itemId: string) => {
    try {
      setActionLoading(itemId)
      await api.request(`/api/orders/${orderId}/items/${itemId}/lock`, { method: 'POST' })
      await loadItems()
    } catch (err: any) {
      alert(err.message || 'Kilitleme hatası')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnlock = async (orderId: string, itemId: string) => {
    try {
      setActionLoading(itemId)
      await api.request(`/api/orders/${orderId}/items/${itemId}/unlock`, { method: 'POST' })
      await loadItems()
    } catch (err: any) {
      alert(err.message || 'Kilit açma hatası')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReady = async (orderId: string, itemId: string) => {
    try {
      setActionLoading(itemId)
      await api.request(`/api/orders/${orderId}/items/${itemId}/ready-workshop`, { method: 'POST' })
      await loadItems()
    } catch (err: any) {
      alert(err.message || 'Hazır işaretleme hatası')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 animate-spin text-[var(--color-wood)]" size={32} />
          <p className="text-[var(--color-ink)]/60">Atölye yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-[var(--color-espresso)]">
            <Factory className="text-[var(--color-wood)]" size={28} />
            Atölye
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink)]/60">
            Atölyedeki ürünleri takip edin ve yönetin
          </p>
        </div>
        <button
          onClick={loadItems}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-cream-deep)] bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-cream)] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="shrink-0 text-red-500" size={20} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && !loading && (
        <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-cream-deep)]">
          <div className="text-center">
            <Package className="mx-auto mb-4 text-[var(--color-ink)]/30" size={48} />
            <p className="text-lg font-medium text-[var(--color-ink)]/50">
              Atölyede ürün yok
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink)]/40">
              Sipariş kalemleri atölyeye gönderildiğinde burada görünecek
            </p>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border-2 bg-white p-5 transition-all ${
                item.isLocked
                  ? 'border-[var(--color-wood)]/30 shadow-sm'
                  : 'border-[var(--color-cream-deep)]'
              }`}
            >
              {/* Item Header */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-[var(--color-espresso)]">
                      {item.productName}
                    </h3>
                    {item.productCode && (
                      <span className="rounded-full bg-[var(--color-cream)] px-3 py-1 text-xs font-medium text-[var(--color-ink)]/70">
                        #{item.productCode}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[var(--color-ink)]/70">
                    <span className="flex items-center gap-1.5">
                      <User size={14} />
                      {item.customerName}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Package size={14} />
                      {item.quantity} adet
                    </span>
                    <span className="text-[var(--color-ink)]/50">
                      Sipariş: {item.orderNumber}
                    </span>
                  </div>
                </div>

                {/* Lock Status Badge */}
                <div className="flex items-center gap-2">
                  {item.isLocked ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-wood)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-wood-dark)]">
                      <Lock size={14} />
                      Kilitli
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
                      <Unlock size={14} />
                      Kilitli Değil
                    </span>
                  )}
                </div>
              </div>

              {/* Specifications */}
              {item.specifications && (
                <div className="mb-4 rounded-lg bg-[var(--color-linen)] p-3">
                  <p className="text-sm text-[var(--color-ink)]/70">
                    <span className="font-medium">Notlar:</span> {item.specifications}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 border-t border-[var(--color-cream-deep)] pt-4">
                {/* Kilitle butonu - sadece kilitli olmayan ve manager/admin */}
                {!item.isLocked && (isAdmin || user?.role === 'manager') && (
                  <button
                    onClick={() => handleLock(item.orderId, item.id)}
                    disabled={actionLoading === item.id}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-wood)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wood-dark)] disabled:opacity-50"
                  >
                    <Lock size={16} />
                    {actionLoading === item.id ? 'Kilitleniyor...' : 'Kilitle'}
                  </button>
                )}

                {/* Kilit aç butonu - sadece admin */}
                {item.isLocked && isAdmin && (
                  <button
                    onClick={() => handleUnlock(item.orderId, item.id)}
                    disabled={actionLoading === item.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Unlock size={16} />
                    {actionLoading === item.id ? 'Açılıyor...' : 'Kilidi Aç'}
                  </button>
                )}

                {/* Atölyede Hazır butonu - sadece kilitli ve atolye/admin */}
                {item.isLocked && (isAdmin || isAtolye) && (
                  <button
                    onClick={() => handleReady(item.orderId, item.id)}
                    disabled={actionLoading === item.id}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    {actionLoading === item.id ? 'İşleniyor...' : 'Atölyede Hazır'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {items.length > 0 && (
        <div className="mt-6 rounded-lg border border-[var(--color-cream-deep)] bg-white p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-[var(--color-ink)]/50">Toplam Kalem:</span>{' '}
              <span className="font-semibold text-[var(--color-espresso)]">{items.length}</span>
            </div>
            <div>
              <span className="text-[var(--color-ink)]/50">Kilitli:</span>{' '}
              <span className="font-semibold text-[var(--color-wood)]">
                {items.filter((i) => i.isLocked).length}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-ink)]/50">Kilitli Değil:</span>{' '}
              <span className="font-semibold text-gray-600">
                {items.filter((i) => !i.isLocked).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
