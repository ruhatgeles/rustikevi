import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Plus, Copy, Trash2, X, Check } from 'lucide-react'

interface InviteCode {
  id: string
  code: string
  role: string
  maxUses: number | null
  useCount: number
  expiresAt: string | null
  createdAt: string
}

export default function InviteCodes() {
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ role: 'viewer', maxUses: '', expiresAt: '' })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadCodes = async () => {
    try {
      const data = await api.request<InviteCode[]>('/api/invite-codes')
      setCodes(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCodes()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.request('/api/invite-codes', {
        method: 'POST',
        body: {
          role: form.role,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        },
      })
      setShowForm(false)
      setForm({ role: 'viewer', maxUses: '', expiresAt: '' })
      loadCodes()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu davet kodunu silmek istediğinize emin misiniz?')) return
    try {
      await api.request(`/api/invite-codes/${id}`, { method: 'DELETE' })
      loadCodes()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-espresso)]">Davet Kodları</h1>
          <p className="mt-1 text-sm text-[var(--color-ink)]/50">
            Yeni kullanıcı kaydı için davet kodları oluşturun.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-espresso)]"
        >
          <Plus size={16} />
          Kod Oluştur
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-[var(--color-cream-deep)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Yeni Davet Kodu</h2>
            <button onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-3">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            >
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <input
              type="number"
              min="1"
              placeholder="Maks kullanım (boş=sınırsız)"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            />
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-wood-dark)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] sm:col-span-3"
            >
              Oluştur
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
          </div>
        ) : codes.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-8 text-center text-[var(--color-ink)]/40">
            Henüz davet kodu yok
          </div>
        ) : (
          codes.map((code) => (
            <div
              key={code.id}
              className="flex items-center justify-between rounded-xl border border-[var(--color-cream-deep)] bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => copyCode(code.code, code.id)}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-cream)] px-3 py-1.5 font-mono text-sm font-medium transition-colors hover:bg-[var(--color-cream-deep)]"
                >
                  {copiedId === code.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {code.code}
                </button>
                <span className="rounded-full bg-[var(--color-cream-deep)] px-2.5 py-0.5 text-xs font-medium">
                  {code.role}
                </span>
                <span className="text-xs text-[var(--color-ink)]/50">
                  {code.useCount}/{code.maxUses ?? '∞'} kullanım
                </span>
                {code.expiresAt && (
                  <span className="text-xs text-[var(--color-ink)]/40">
                    Son: {new Date(code.expiresAt).toLocaleDateString('tr-TR')}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(code.id)}
                className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
