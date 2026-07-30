import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Plus, Pencil, Trash2, X, Save, ShieldBan, Eye } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import Swal from 'sweetalert2'

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  isLoginBlocked: boolean
  isViewOnly: boolean
  createdAt: string
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'viewer' })
  const [editForm, setEditForm] = useState({ email: '', password: '', name: '', role: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  const loadUsers = async () => {
    try {
      const result = await api.request<{ data: User[] }>('/api/users')
      setUsers(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.request('/api/users', { method: 'POST', body: form })
      setShowForm(false)
      setForm({ email: '', password: '', name: '', role: 'viewer' })
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({ email: user.email, password: '', name: user.name, role: user.role })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setError('')
    setSaving(true)
    try {
      const body: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      }
      if (editForm.password) {
        body.password = editForm.password
      }
      await api.request(`/api/users/${editingUser.id}`, { method: 'PATCH', body })
      setEditingUser(null)
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivateClick = (id: string) => {
    setUserToDelete(id)
    setShowDeleteModal(true)
  }

  const handleDeactivateConfirm = async () => {
    if (!userToDelete) return
    setError('')
    try {
      await api.request(`/api/users/${userToDelete}`, { method: 'DELETE' })
      setShowDeleteModal(false)
      setUserToDelete(null)
      loadUsers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRestrictionClick = async (user: User) => {
    const { value: formValues } = await Swal.fire({
      title: 'Kullanıcı Kısıtlamaları',
      html: `
        <div style="text-align:left; padding: 8px 0;">
          <p style="margin-bottom:16px; color:#6b7280; font-size:14px;">
            <strong>${user.name}</strong> (${user.email}) kullanıcısı için kısıtlama ayarları:
          </p>
          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#f9fafb; border-radius:8px; margin-bottom:12px;">
            <div>
              <div style="font-weight:600; font-size:14px; color:#1f2937;">Giriş Engeli</div>
              <div style="font-size:12px; color:#6b7280; margin-top:2px;">Kullanıcının sisteme giriş yapmasını engeller</div>
            </div>
            <label class="swal2-switch-wrapper" style="position:relative; display:inline-block; width:48px; height:26px; cursor:pointer;">
              <input type="checkbox" id="swal-login-blocked" ${user.isLoginBlocked ? 'checked' : ''} style="opacity:0; width:0; height:0;">
              <span class="swal2-switch-slider" style="position:absolute; inset:0; background:${user.isLoginBlocked ? '#dc2626' : '#d1d5db'}; border-radius:26px; transition:0.3s;">
                <span style="position:absolute; content:''; height:20px; width:20px; left:${user.isLoginBlocked ? '25px' : '3px'}; bottom:3px; background:white; border-radius:50%; transition:0.3s; box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span>
              </span>
            </label>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#f9fafb; border-radius:8px;">
            <div>
              <div style="font-weight:600; font-size:14px; color:#1f2937;">Sadece Görüntüleyici</div>
              <div style="font-size:12px; color:#6b7280; margin-top:2px;">Kullanıcının rolünü geçici olarak viewer'a düşürür</div>
            </div>
            <label class="swal2-switch-wrapper" style="position:relative; display:inline-block; width:48px; height:26px; cursor:pointer;">
              <input type="checkbox" id="swal-view-only" ${user.isViewOnly ? 'checked' : ''} style="opacity:0; width:0; height:0;">
              <span class="swal2-switch-slider" style="position:absolute; inset:0; background:${user.isViewOnly ? '#2563eb' : '#d1d5db'}; border-radius:26px; transition:0.3s;">
                <span style="position:absolute; content:''; height:20px; width:20px; left:${user.isViewOnly ? '25px' : '3px'}; bottom:3px; background:white; border-radius:50%; transition:0.3s; box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span>
              </span>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Kaydet',
      cancelButtonText: 'İptal',
      confirmButtonColor: '#92400e',
      cancelButtonColor: '#6b7280',
      didOpen: () => {
        // Toggle switch click handlers
        document.querySelectorAll('.swal2-switch-wrapper').forEach((wrapper) => {
          const input = wrapper.querySelector('input') as HTMLInputElement
          const slider = wrapper.querySelector('.swal2-switch-slider') as HTMLElement
          const knob = slider.querySelector('span') as HTMLElement

          const updateVisual = () => {
            const isChecked = input.checked
            const activeColor = input.id === 'swal-login-blocked' ? '#dc2626' : '#2563eb'
            slider.style.background = isChecked ? activeColor : '#d1d5db'
            knob.style.left = isChecked ? '25px' : '3px'
          }

          wrapper.addEventListener('click', (e) => {
            e.preventDefault()
            input.checked = !input.checked
            updateVisual()
          })
        })
      },
      preConfirm: () => {
        const loginBlocked = (document.getElementById('swal-login-blocked') as HTMLInputElement)?.checked ?? false
        const viewOnly = (document.getElementById('swal-view-only') as HTMLInputElement)?.checked ?? false
        return { isLoginBlocked: loginBlocked, isViewOnly: viewOnly }
      },
    })

    if (formValues) {
      try {
        await api.request(`/api/users/${user.id}`, {
          method: 'PATCH',
          body: {
            isLoginBlocked: formValues.isLoginBlocked,
            isViewOnly: formValues.isViewOnly,
          },
        })
        loadUsers()
        Swal.fire({
          icon: 'success',
          title: 'Güncellendi',
          text: 'Kullanıcı kısıtlamaları başarıyla güncellendi.',
          confirmButtonColor: '#92400e',
          timer: 1500,
          timerProgressBar: true,
        })
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Hata',
          text: err.message || 'Bir hata oluştu.',
          confirmButtonColor: '#92400e',
        })
      }
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-[var(--color-espresso)] sm:text-2xl">Kullanıcılar</h1>
        <button
          onClick={() => { setShowForm(true); setEditingUser(null) }}
          className="flex items-center justify-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-espresso)]"
        >
          <Plus size={16} />
          Kullanıcı Ekle
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Yeni Kullanıcı Formu */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-[var(--color-cream-deep)] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Yeni Kullanıcı</h2>
            <button onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Ad Soyad"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            />
            <input
              required
              type="email"
              placeholder="E-posta"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            />
            <input
              required
              type="password"
              minLength={6}
              placeholder="Şifre"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
            >
              <option value="viewer">Viewer</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--color-wood-dark)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50 sm:col-span-2"
            >
              {saving ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </form>
        </div>
      )}

      {/* Düzenleme Formu */}
      {editingUser && (
        <div className="mb-6 rounded-xl border border-[var(--color-brass)] bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Kullanıcı Düzenle: {editingUser.name}</h2>
            <button onClick={() => setEditingUser(null)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleUpdate} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-ink)]/50">Ad Soyad</label>
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-ink)]/50">E-posta</label>
              <input
                required
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-ink)]/50">Yeni Şifre (boş bırakın değiştirmemek için)</label>
              <input
                type="password"
                minLength={6}
                placeholder="••••••"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-ink)]/50">Rol</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-cream-deep)] px-3 py-2 outline-none focus:border-[var(--color-brass)]"
              >
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[var(--color-wood-dark)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-espresso)] disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-[var(--color-cream-deep)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-cream)]"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border border-[var(--color-cream-deep)] bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-cream-deep)] bg-[var(--color-cream)]/50">
            <tr>
              <th className="px-4 py-3 font-medium">Ad</th>
              <th className="px-4 py-3 font-medium">E-posta</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Kısıtlamalar</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[var(--color-cream-deep)] last:border-0">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3 text-[var(--color-ink)]/60">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-[var(--color-cream-deep)] px-2.5 py-0.5 text-xs font-medium">
                    {user.isViewOnly ? 'viewer' : user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.isActive
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {user.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {user.isLoginBlocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        <ShieldBan size={12} />
                        Giriş Engelli
                      </span>
                    )}
                    {user.isViewOnly && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                        <Eye size={12} />
                        Sadece Görüntü
                      </span>
                    )}
                    {!user.isLoginBlocked && !user.isViewOnly && (
                      <span className="text-xs text-[var(--color-ink)]/30">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--color-ink)]/50">
                  {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(user)}
                      className="rounded p-1 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                    >
                      <Pencil size={16} />
                    </button>
                    {user.isActive && (
                      <>
                        <button
                          onClick={() => handleRestrictionClick(user)}
                          title="Kısıtlamalar"
                          className={`rounded p-1 transition-colors ${
                            user.isLoginBlocked || user.isViewOnly
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-[var(--color-ink)]/40 hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]'
                          }`}
                        >
                          <ShieldBan size={16} />
                        </button>
                        <button
                          onClick={() => handleDeactivateClick(user.id)}
                          className="rounded p-1 text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-2 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl border border-[var(--color-cream-deep)] bg-white p-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="rounded-full bg-[var(--color-cream-deep)] px-2 py-0.5 text-[10px] font-medium">
                    {user.isViewOnly ? 'viewer' : user.role}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      user.isActive
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {user.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-[var(--color-ink)]/60">{user.email}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {user.isLoginBlocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                      <ShieldBan size={10} />
                      Giriş Engelli
                    </span>
                  )}
                  {user.isViewOnly && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                      <Eye size={10} />
                      Sadece Görüntü
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--color-ink)]/40">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(user)}
                  className="rounded p-1.5 text-[var(--color-ink)]/40 transition-colors hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]"
                >
                  <Pencil size={14} />
                </button>
                {user.isActive && (
                  <>
                    <button
                      onClick={() => handleRestrictionClick(user)}
                      title="Kısıtlamalar"
                      className={`rounded p-1.5 transition-colors ${
                        user.isLoginBlocked || user.isViewOnly
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-[var(--color-ink)]/40 hover:bg-[var(--color-cream)] hover:text-[var(--color-wood-dark)]'
                      }`}
                    >
                      <ShieldBan size={14} />
                    </button>
                    <button
                      onClick={() => handleDeactivateClick(user.id)}
                      className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Silme Onay Modal */}
      <ConfirmModal
        open={showDeleteModal}
        title="Kullanıcıyı Deaktif Et"
        message="Bu kullanıcıyı deaktif etmek istediğinize emin misiniz?"
        confirmText="Evet, Deaktif Et"
        cancelText="Vazgeç"
        variant="danger"
        onConfirm={handleDeactivateConfirm}
        onCancel={() => { setShowDeleteModal(false); setUserToDelete(null) }}
      />
    </div>
  )
}
