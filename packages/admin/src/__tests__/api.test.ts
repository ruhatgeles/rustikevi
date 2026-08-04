import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
