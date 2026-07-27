import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-linen)]">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-cream-deep)] bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-wood)] text-xl font-bold text-white">
            RE
          </div>
          <h1 className="font-serif text-2xl text-[var(--color-espresso)]">Rustik Evi</h1>
          <p className="mt-1 text-sm text-[var(--color-ink)]/50">Admin Panel Girişi</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]/70">
              E-posta
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/30 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink)]/70">
              Şifre
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/30 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-wood-dark)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-espresso)] disabled:opacity-60"
          >
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
