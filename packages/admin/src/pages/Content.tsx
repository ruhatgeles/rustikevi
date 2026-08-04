import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Pencil, X, Save, Plus, Trash2 } from 'lucide-react'

interface ContentBlock {
  id: string
  slug: string
  title: string
  body: string
  type: string
  metadata: Record<string, unknown>
  updatedAt: string
}

const emptyForm = {
  slug: '',
  title: '',
  body: '',
  type: 'text' as string,
  metadata: {} as Record<string, unknown>,
}

export default function Content() {
  const [items, setItems] = useState<ContentBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ContentBlock | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [metaKey, setMetaKey] = useState('')
  const [metaValue, setMetaValue] = useState('')

  const loadContent = async () => {
    try {
      const data = await api.request<ContentBlock[]>('/api/content')
      setItems(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContent()
  }, [])

  const resetForm = () => {
    setForm(emptyForm)
    setEditing(null)
    setCreating(false)
    setError('')
  }

  const openCreate = () => {
    resetForm()
    setCreating(true)
  }

  const openEdit = (item: ContentBlock) => {
    setCreating(false)
    setEditing(item)
    setForm({
      slug: item.slug,
      title: item.title,
      body: item.body,
      type: item.type,
      metadata: item.metadata || {},
    })
  }

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const slug = creating ? form.slug : editing?.slug
      if (!slug) {
        setError('Slug zorunludur')
        setSaving(false)
        return
      }
      await api.request(`/api/content/${slug}`, {
        method: 'PUT',
        body: {
          title: form.title,
          body: form.body,
          type: form.type,
          metadata: form.type === 'json' ? form.metadata : undefined,
        },
      })
      resetForm()
      loadContent()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slug: string) => {
    if (!confirm(`"${slug}" içerik blokunu silmek istediğinize emin misiniz?`)) return
    try {
      await api.request(`/api/content/${slug}`, { method: 'DELETE' })
      if (editing?.slug === slug) resetForm()
      loadContent()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const addMetadata = () => {
    if (!metaKey.trim()) return
    setForm({ ...form, metadata: { ...form.metadata, [metaKey]: metaValue } })
    setMetaKey('')
    setMetaValue('')
  }

  const removeMetadata = (key: string) => {
    const updated = { ...form.metadata }
    delete updated[key]
    setForm({ ...form, metadata: updated })
  }

  const updateMetaValue = (key: string, value: string) => {
    setForm({ ...form, metadata: { ...form.metadata, [key]: value } })
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-espresso)] sm:text-2xl">İçerik Yönetimi</h1>
          <p className="mt-1 text-xs text-[var(--color-ink)]/50 sm:text-sm">
            Site içerik bloklarını buradan düzenleyebilirsiniz.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-espresso)]"
        >
          <Plus size={16} />
          İçerik Ekle
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Form */}
      {(editing || creating) && (
        <div className="mb-6 rounded-xl border border-[var(--color-cream-deep)] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">
              {creating ? 'Yeni İçerik Bloku' : `Düzenle: ${editing?.slug}`}
            </h2>
            <button onClick={resetForm}>
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            {creating && (
              <div>
                <label className="mb-1 block text-sm font-medium">Slug (benzersiz anahtar)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="ornek: site-config, about-hero"
                  className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
                />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Başlık</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Tip</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
                >
                  <option value="text">Text</option>
                  <option value="json">JSON</option>
                  <option value="image">Image</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {form.type === 'json' ? 'JSON Verisi (alternatif: aşağıdan key-value ile ekleyin)' : 'İçerik'}
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={form.type === 'json' ? 4 : 6}
                placeholder={form.type === 'json' ? '{"key": "value"}' : 'İçerik metni...'}
                className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-brass)]"
              />
            </div>

            {/* Metadata editor for json type */}
            {form.type === 'json' && (
              <div>
                <label className="mb-1 block text-sm font-medium">Metadata (Key-Value)</label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {Object.entries(form.metadata).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50 px-2 py-1 text-xs"
                    >
                      <span className="font-semibold text-[var(--color-wood-dark)]">{key}:</span>
                      <input
                        value={String(val)}
                        onChange={(e) => updateMetaValue(key, e.target.value)}
                        className="w-32 bg-transparent outline-none"
                      />
                      <button
                        onClick={() => removeMetadata(key)}
                        className="ml-1 text-red-400 hover:text-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    placeholder="key"
                    value={metaKey}
                    onChange={(e) => setMetaKey(e.target.value)}
                    className="w-32 rounded-lg border border-[var(--color-cream-deep)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
                  />
                  <input
                    placeholder="value"
                    value={metaValue}
                    onChange={(e) => setMetaValue(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--color-cream-deep)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-brass)]"
                  />
                  <button
                    type="button"
                    onClick={addMetadata}
                    className="rounded-lg bg-[var(--color-cream-deep)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-brass)]/20"
                  >
                    Ekle
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-wood)] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-8 text-center text-[var(--color-ink)]/40">
            Henüz içerik bloku yok
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-[var(--color-cream-deep)] bg-white p-3 sm:p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      item.type === 'json'
                        ? 'bg-purple-100 text-purple-700'
                        : item.type === 'image'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-[var(--color-cream-deep)] text-[var(--color-ink)]/70'
                    }`}
                  >
                    {item.type}
                  </span>
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs text-[var(--color-ink)]/40">/{item.slug}</span>
                </div>
                <p className="mt-1 truncate text-sm text-[var(--color-ink)]/50">
                  {item.type === 'json'
                    ? JSON.stringify(item.metadata || {}).slice(0, 80)
                    : item.body.slice(0, 80)}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded p-2 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                  title="Düzenle"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.slug)}
                  className="rounded p-2 text-[var(--color-ink)]/40 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Sil"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
