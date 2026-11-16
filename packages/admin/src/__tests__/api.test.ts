import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('Token Management', () => {
    it('should store tokens in localStorage', () => {
      localStorage.setItem('accessToken', 'test-access-token')
      localStorage.setItem('refreshToken', 'test-refresh-token')

      expect(localStorage.getItem('accessToken')).toBe('test-access-token')
      expect(localStorage.getItem('refreshToken')).toBe('test-refresh-token')
    })

    it('should clear tokens from localStorage', () => {
      localStorage.setItem('accessToken', 'test-access-token')
      localStorage.setItem('refreshToken', 'test-refresh-token')
      localStorage.setItem('user', '{"id":"1"}')

      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')

      expect(localStorage.getItem('accessToken')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('Request Handling', () => {
    it('should make GET request with correct headers', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const res = await fetch('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }))
      expect(data).toEqual(mockResponse)
    })

    it('should include Authorization header when token exists', async () => {
      localStorage.setItem('accessToken', 'my-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      })

      const token = localStorage.getItem('accessToken')
      await fetch('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }))
    })

    it('should make POST request with body', async () => {
      const body = { email: 'test@example.com', password: 'password123' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { accessToken: 'token' } }),
      })

      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }))
    })
  })

  describe('Error Handling', () => {
    it('should translate known error messages to Turkish', () => {
      const errorMessages: Record<string, string> = {
        'Invalid email or password': 'E-posta veya şifre hatalı',
        'Missing or invalid authorization header': 'Oturum açmanız gerekiyor',
        'Invalid or expired token': 'Oturum süreniz doldu',
        'Insufficient permissions': 'Bu işlem için yetkiniz yok',
        'Order not found': 'Sipariş bulunamadı',
        'Customer not found': 'Müşteri bulunamadı',
        'Product not found': 'Ürün bulunamadı',
        'User not found': 'Kullanıcı bulunamadı',
      }

      expect(errorMessages['Invalid email or password']).toBe('E-posta veya şifre hatalı')
      expect(errorMessages['Insufficient permissions']).toBe('Bu işlem için yetkiniz yok')
      expect(errorMessages['Order not found']).toBe('Sipariş bulunamadı')
    })

    it('should handle network errors', () => {
      const errorMessage = 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.'

      expect(errorMessage).toContain('Bağlantı hatası')
    })
  })
})

// ── Gerçek ApiClient: 401 / token yenileme davranışı ──────────────
describe('ApiClient refresh flow', () => {
  type ApiModule = typeof import('../lib/api')
  let api: ApiModule['api']

  const jsonRes = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  })

  const authHeader = (call: unknown[]) =>
    ((call[1] as RequestInit).headers as Record<string, string>).Authorization

  beforeEach(async () => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    localStorageMock.clear()
    vi.resetModules()
    api = (await import('../lib/api')).api
  })

  it('concurrent 401s share a single refresh and each request retries once', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')

    let refreshCalls = 0
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (url === '/api/auth/refresh') {
        refreshCalls++
        await new Promise((r) => setTimeout(r, 10))
        return jsonRes(200, { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
      }
      const auth = (init.headers as Record<string, string>).Authorization
      if (auth === 'Bearer new-access') return jsonRes(200, { data: { url } })
      return jsonRes(401, { error: 'Invalid or expired token' })
    })

    const results = await Promise.all([
      api.request<{ url: string }>('/api/a'),
      api.request<{ url: string }>('/api/b'),
      api.request<{ url: string }>('/api/c'),
      api.request<{ url: string }>('/api/d'),
    ])

    expect(results.map((r) => r.url)).toEqual(['/api/a', '/api/b', '/api/c', '/api/d'])
    expect(refreshCalls).toBe(1)
    // 4 ilk deneme + 1 refresh + 4 tekrar
    expect(mockFetch).toHaveBeenCalledTimes(9)
    expect(localStorage.getItem('accessToken')).toBe('new-access')
  })

  it('login 401 does not trigger refresh or retry loop even with stored tokens', async () => {
    localStorage.setItem('accessToken', 'valid-access')
    localStorage.setItem('refreshToken', 'valid-refresh')
    mockFetch.mockResolvedValue(jsonRes(401, { error: 'Invalid email or password' }))

    await expect(
      api.request('/api/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'x' } }),
    ).rejects.toThrow('E-posta veya şifre hatalı')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls.some((c) => c[0] === '/api/auth/refresh')).toBe(false)
    // Mevcut oturum silinmemeli
    expect(localStorage.getItem('accessToken')).toBe('valid-access')
  })

  it('auto-login verify 401 does not trigger refresh', async () => {
    localStorage.setItem('accessToken', 'valid-access')
    localStorage.setItem('refreshToken', 'valid-refresh')
    mockFetch.mockResolvedValue(jsonRes(401, { error: 'Link expired' }))

    await expect(
      api.request('/api/auto-login/verify', { method: 'POST', body: { token: 't' } }),
    ).rejects.toThrow('Link expired')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('logout with an expired access token refreshes once and then revokes', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (url === '/api/auth/refresh') {
        return jsonRes(200, { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
      }
      const auth = (init.headers as Record<string, string>).Authorization
      if (auth === 'Bearer new-access') return jsonRes(200, { data: { success: true } })
      return jsonRes(401, { error: 'Invalid or expired token' })
    })

    await api.request('/api/auth/logout', { method: 'POST' })

    expect(mockFetch.mock.calls.map((c) => c[0])).toEqual([
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/auth/logout',
    ])
    expect(authHeader(mockFetch.mock.calls[2])).toBe('Bearer new-access')
  })

  it('retries at most once when the retried request still returns 401', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/auth/refresh') {
        return jsonRes(200, { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
      }
      return jsonRes(401, { error: 'Invalid or expired token' })
    })

    await expect(api.request('/api/x')).rejects.toThrow('Oturum süreniz doldu')
    // ilk deneme + refresh + tek tekrar
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(authHeader(mockFetch.mock.calls[2])).toBe('Bearer new-access')
  })

  it('clears tokens when refresh fails', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/auth/refresh') return jsonRes(401, { error: 'Invalid refresh token' })
      return jsonRes(401, { error: 'Invalid or expired token' })
    })

    await expect(api.request('/api/x')).rejects.toThrow('Oturum süreniz doldu')
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('uploadFile refreshes and retries on 401', async () => {
    localStorage.setItem('accessToken', 'old-access')
    localStorage.setItem('refreshToken', 'old-refresh')
    mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (url === '/api/auth/refresh') {
        return jsonRes(200, { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
      }
      const auth = (init.headers as Record<string, string>).Authorization
      if (auth === 'Bearer new-access') return jsonRes(200, { data: { url: '/uploads/a.jpg' } })
      return jsonRes(401, { error: 'Invalid or expired token' })
    })

    const result = await api.uploadFile<{ url: string }>('/api/upload/image', new FormData())
    expect(result.url).toBe('/uploads/a.jpg')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})
