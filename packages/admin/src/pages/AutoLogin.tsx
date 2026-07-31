import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function AutoLogin() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { setTokens } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Token bulunamadı')
      return
    }

    const verifyToken = async () => {
      try {
        const result = await api.request<{
          accessToken: string
          refreshToken: string
          user: { id: string; email: string; name: string; role: string }
        }>('/api/auto-login/verify', {
          method: 'POST',
          body: { token },
        })

        // Token'ları kaydet
        setTokens(result.accessToken, result.refreshToken)

        setStatus('success')

        // 1.5 saniye sonra dashboard'a yönlendir
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } catch (err: any) {
        setStatus('error')
        setError(err.message || 'Giriş yapılamadı')
      }
    }

    verifyToken()
  }, [token, navigate, setTokens])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-linen)]">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-[var(--color-cream-deep)] bg-white p-8 shadow-lg">
        <div className="text-center">
          {/* Logo */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-wood)] text-2xl font-bold text-white">
            RE
          </div>

          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto mb-4 animate-spin text-[var(--color-wood)]" size={48} />
              <h1 className="text-xl font-bold text-[var(--color-espresso)]">
                Giriş yapılıyor...
              </h1>
              <p className="mt-2 text-sm text-[var(--color-ink)]/60">
                Lütfen bekleyin
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
              <h1 className="text-xl font-bold text-[var(--color-espresso)]">
                Giriş başarılı!
              </h1>
              <p className="mt-2 text-sm text-[var(--color-ink)]/60">
                Ana sayfaya yönlendiriliyorsunuz...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto mb-4 text-red-500" size={48} />
              <h1 className="text-xl font-bold text-[var(--color-espresso)]">
                Giriş yapılamadı
              </h1>
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 rounded-lg bg-[var(--color-wood)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-wood-dark)]"
              >
                Giriş sayfasına git
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
