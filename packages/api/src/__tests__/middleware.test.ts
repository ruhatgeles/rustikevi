import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies
vi.mock('../lib/jwt.js', () => ({
  verifyToken: vi.fn(),
}))

vi.mock('../lib/errors.js', () => ({
  AppError: class AppError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('should throw 401 when Authorization header is missing', async () => {
      const { requireAuth } = await import('../middleware/auth.js')

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
        set: vi.fn(),
      }

      const middleware = requireAuth()

      await expect(middleware(mockContext as any, vi.fn())).rejects.toThrow()
    })

    it('should throw 401 when Authorization header does not start with Bearer', async () => {
      const { requireAuth } = await import('../middleware/auth.js')

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Basic token123'),
        },
        set: vi.fn(),
      }

      const middleware = requireAuth()

      await expect(middleware(mockContext as any, vi.fn())).rejects.toThrow()
    })

    it('should throw 401 for invalid token', async () => {
      const { requireAuth } = await import('../middleware/auth.js')
      const { verifyToken } = await import('../lib/jwt.js')

      vi.mocked(verifyToken).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer invalid-token'),
        },
        set: vi.fn(),
      }

      const middleware = requireAuth()

      await expect(middleware(mockContext as any, vi.fn())).rejects.toThrow()
    })

    it('should set user and call next for valid token', async () => {
      const { requireAuth } = await import('../middleware/auth.js')
      const { verifyToken } = await import('../lib/jwt.js')

      const payload = { sub: 'user-1', email: 'test@example.com', role: 'viewer' }
      vi.mocked(verifyToken).mockReturnValue(payload)

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer valid-token'),
        },
        set: vi.fn(),
      }
      const mockNext = vi.fn()

      const middleware = requireAuth()
      await middleware(mockContext as any, mockNext)

      expect(mockContext.set).toHaveBeenCalledWith('user', payload)
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('requireManager', () => {
    it('should throw 403 for viewer role', async () => {
      const { requireManager } = await import('../middleware/auth.js')
      const { verifyToken } = await import('../lib/jwt.js')

      const payload = { sub: 'user-1', email: 'test@example.com', role: 'viewer' }
      vi.mocked(verifyToken).mockReturnValue(payload)

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer valid-token'),
        },
        set: vi.fn(),
      }

      const middleware = requireManager()

      await expect(middleware(mockContext as any, vi.fn())).rejects.toThrow()
    })

    it('should allow manager role', async () => {
      const { requireManager } = await import('../middleware/auth.js')
      const { verifyToken } = await import('../lib/jwt.js')

      const payload = { sub: 'user-1', email: 'test@example.com', role: 'manager' }
      vi.mocked(verifyToken).mockReturnValue(payload)

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer valid-token'),
        },
        set: vi.fn(),
      }
      const mockNext = vi.fn()

      const middleware = requireManager()
      await middleware(mockContext as any, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it('should allow admin role', async () => {
      const { requireManager } = await import('../middleware/auth.js')
      const { verifyToken } = await import('../lib/jwt.js')

      const payload = { sub: 'user-1', email: 'test@example.com', role: 'admin' }
      vi.mocked(verifyToken).mockReturnValue(payload)

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer valid-token'),
        },
        set: vi.fn(),
      }
      const mockNext = vi.fn()

      const middleware = requireManager()
      await middleware(mockContext as any, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('requireAdmin', () => {
    it('should throw 403 for manager role', async () => {
      const { requireAdmin } = await import('../middleware/auth.js')
      const { verifyToken } = await import('../lib/jwt.js')

      const payload = { sub: 'user-1', email: 'test@example.com', role: 'manager' }
      vi.mocked(verifyToken).mockReturnValue(payload)

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer valid-token'),
        },
        set: vi.fn(),
      }

      const middleware = requireAdmin()

      await expect(middleware(mockContext as any, vi.fn())).rejects.toThrow()
    })

    it('should allow admin role', async () => {
      const { requireAdmin } = await import('../middleware/auth.js')
      const { verifyToken } = await import('../lib/jwt.js')

      const payload = { sub: 'user-1', email: 'test@example.com', role: 'admin' }
      vi.mocked(verifyToken).mockReturnValue(payload)

      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer valid-token'),
        },
        set: vi.fn(),
      }
      const mockNext = vi.fn()

      const middleware = requireAdmin()
      await middleware(mockContext as any, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })
})

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests within limit', async () => {
    const { rateLimit } = await import('../middleware/rate-limit.js')

    const mockContext = {
      req: {
        header: vi.fn().mockReturnValue('127.0.0.1'),
        path: '/api/test',
      },
    }
    const mockNext = vi.fn()

    const middleware = rateLimit(5, 60000)
    await middleware(mockContext as any, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should throw 429 when limit exceeded', async () => {
    const { rateLimit } = await import('../middleware/rate-limit.js')

    const mockContext = {
      req: {
        header: vi.fn().mockReturnValue('192.168.1.1'),
        path: '/api/limited',
      },
    }
    const mockNext = vi.fn()

    const middleware = rateLimit(2, 60000)

    // First 2 requests should pass
    await middleware(mockContext as any, mockNext)
    await middleware(mockContext as any, mockNext)

    // Third request should fail
    await expect(middleware(mockContext as any, mockNext)).rejects.toThrow('Too many requests')
  })
})
