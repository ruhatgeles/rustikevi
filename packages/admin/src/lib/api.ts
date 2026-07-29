// Relative URL — nginx proxy /api/ → api:3001
const API_URL = ''

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

class ApiClient {
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

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) return false

      const { data } = await res.json()
      this.setTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      return false
    }
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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

    // Try refresh on 401
    if (res.status === 401 && token) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        return this.request<T>(path, options)
      }
      this.clearTokens()
      window.location.href = '/login'
      throw new Error('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'İstek başarısız oldu' }))

      // Hata mesajlarınıTürkçe'ye çevir
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
}

export const api = new ApiClient()
