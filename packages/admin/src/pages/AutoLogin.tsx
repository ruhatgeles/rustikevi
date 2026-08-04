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
  const [userName, setUserName] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Token bulunamadı')
      return
    }

    // Birden fazla denemeyi önle
    let isMounted = true

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

        if (!isMounted) return

        // Token'ları kaydet
        localStorage.setItem('accessToken', result.accessToken)
        localStorage.setItem('refreshToken', result.refreshToken)
        localStorage.setItem('user', JSON.stringify(result.user))

        // Auth context'i güncelle
        setTokens(result.accessToken, result.refreshToken, result.user)

        setUserName(result.user.name)
        setStatus('success')

        // 1.5 saniye sonra dashboard'a yönlendir
        setTimeout(() => {
          if (isMounted) {
            navigate('/', { replace: true })
          }
        }, 1500)
      } catch (err: any) {
        if (!isMounted) return
        setStatus('error')
        setError(err.message || 'Giriş yapılamadı')
      }
    }

    verifyToken()

    return () => {
      isMounted = false
    }
  }, [token]) // setTokens ve navigate dependency'den çıkarıldı

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
                Hoş geldin {userName}!
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
