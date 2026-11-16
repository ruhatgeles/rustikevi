// Relative URL — nginx proxy /api/ → api:3001
const API_URL = ''

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

// Kimlik doğrulama gerektirmeyen uçlar: buradan gelen 401 "oturum süresi doldu"
// anlamına gelmez (yanlış şifre, kullanılmış link vb.), token yenilemeye çalışılmaz.
// Not: /api/auth/logout ve /me ile /api/auto-login/generate, /info, DELETE gibi
// uçlar normal JWT ister; süresi dolmuş token'da yenilenip tekrar denenmelidir
// (aksi halde çıkışta refresh token sunucuda iptal edilmez).
const NO_REFRESH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auto-login/verify']

function shouldSkipRefresh(path: string): boolean {
  const pathname = path.split('?')[0]
  return NO_REFRESH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

class ApiClient {
  // Eşzamanlı 401'ler tek bir yenileme isteğini paylaşır
  private refreshPromise: Promise<boolean> | null = null

  private getToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken')
  }

  private setTokens(access: string, refresh: string) {
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
  }

  clearTokens() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  private refreshAccessToken(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) {
        // Başka bir sekme aynı refresh token ile önce yenilemiş olabilir:
        // localStorage'da farklı bir refresh token varsa onu kullan.
        const current = this.getRefreshToken()
        return !!current && current !== refreshToken
      }

      const { data } = await res.json()
      this.setTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      return false
    }
  }

  /**
   * 401 sonrası ortak karar: yeniden denenmeli mi?
   * true → istek yeni token ile bir kez tekrar gönderilir.
   * Yenileme başarısızsa oturum kapatılır ve hata fırlatılır.
   */
  private async handleUnauthorized(sentToken: string): Promise<true> {
    // Bu istek beklerken başka bir istek token'ı zaten yenilemiş olabilir
    const current = this.getToken()
    if (current && current !== sentToken) return true

    const refreshed = await this.refreshAccessToken()
    if (refreshed) return true

    this.clearTokens()
    window.location.href = '/login'
    throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
  }

  request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.doRequest<T>(path, options, false)
  }

  private async doRequest<T>(path: string, options: RequestOptions, retried: boolean): Promise<T> {
    const { method = 'GET', body, headers = {} } = options
    const token = this.getToken()

    let res: Response
    try {
      res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (err) {
      throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.')
    }

    // 401 → token yenile ve en fazla bir kez tekrar dene
    if (res.status === 401 && token && !retried && !shouldSkipRefresh(path)) {
      await this.handleUnauthorized(token)
      return this.doRequest<T>(path, options, true)
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'İstek başarısız oldu' }))

      // Hata mesajlarını Türkçe'ye çevir
      const errorMessages: Record<string, string> = {
        'Invalid email or password': 'E-posta veya şifre hatalı',
        'Missing or invalid authorization header': 'Oturum açmanız gerekiyor',
        'Invalid or expired token': 'Oturum süreniz doldu',
        'Insufficient permissions': 'Bu işlem için yetkiniz yok',
        'Order not found': 'Sipariş bulunamadı',
        'Customer not found': 'Müşteri bulunamadı',
        'Product not found': 'Ürün bulunamadı',
        'User not found': 'Kullanıcı bulunamadı',
        'Request failed': 'İstek başarısız oldu',
        'Session expired': 'Oturum süreniz doldu',
      }

      const errorMessage = errorMessages[err.error] || err.error || `Hata: ${res.status}`
      throw new Error(errorMessage)
    }

    const json = await res.json()
    return json.data
  }

  uploadFile<T>(path: string, formData: FormData): Promise<T> {
    return this.doUpload<T>(path, formData, false)
  }

  private async doUpload<T>(path: string, formData: FormData, retried: boolean): Promise<T> {
    const token = this.getToken()

    let res: Response
    try {
      res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })
    } catch (err) {
      throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.')
    }

    // 401 → token yenile ve en fazla bir kez tekrar dene
    if (res.status === 401 && token && !retried && !shouldSkipRefresh(path)) {
      await this.handleUnauthorized(token)
      return this.doUpload<T>(path, formData, true)
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'İstek başarısız oldu' }))
      throw new Error(err.error || `Hata: ${res.status}`)
    }

    const json = await res.json()
    return json.data
  }
}

export const api = new ApiClient()
