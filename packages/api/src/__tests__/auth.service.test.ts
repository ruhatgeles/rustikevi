import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock the database and dependencies ───────────────────

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
}

const mockUsers = { id: 'id', email: 'email', passwordHash: 'passwordHash', name: 'name', role: 'role', isActive: 'isActive', isLoginBlocked: 'isLoginBlocked', isViewOnly: 'isViewOnly', createdAt: 'createdAt' }
const mockRefreshTokens = { id: 'id', userId: 'userId', tokenHash: 'tokenHash', expiresAt: 'expiresAt' }

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}))

vi.mock('../db/schema.js', () => ({
  users: { id: 'id', email: 'email', passwordHash: 'passwordHash', name: 'name', role: 'role', isActive: 'isActive', isLoginBlocked: 'isLoginBlocked', isViewOnly: 'isViewOnly', createdAt: 'createdAt' },
  refreshTokens: { id: 'id', userId: 'userId', tokenHash: 'tokenHash', expiresAt: 'expiresAt' },
}))

vi.mock('../lib/password.js', () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
}))

vi.mock('../lib/jwt.js', () => ({
  signAccessToken: vi.fn().mockReturnValue('access-token'),
  signRefreshToken: vi.fn().mockReturnValue('refresh-token'),
  getTokenHash: vi.fn().mockReturnValue('token-hash'),
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

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should throw 401 when user is not found', async () => {
      const { login } = await import('../services/auth.service.js')
      const { db } = await import('../db/index.js')

      // Mock db.select().from().where().limit() to return empty array
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).select.mockReturnValue(mockChain as any)

      await expect(login('nonexistent@example.com', 'password123')).rejects.toThrow()
    })

    it('should throw 403 when user is login blocked', async () => {
      const { login } = await import('../services/auth.service.js')
      const { db } = await import('../db/index.js')
      const { comparePassword } = await import('../lib/password.js')

      const blockedUser = {
        id: 'user-1',
        email: 'blocked@example.com',
        passwordHash: 'hash',
        name: 'Blocked User',
        role: 'viewer',
        isActive: true,
        isLoginBlocked: true,
        isViewOnly: false,
      }

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([blockedUser]),
      }
      vi.mocked(db).select.mockReturnValue(mockChain as any)
      vi.mocked(comparePassword).mockReturnValue(true)

      await expect(login('blocked@example.com', 'password123')).rejects.toThrow('Hesabınıza giriş engeli konulmuştur')
    })

    it('should throw 401 when password is invalid', async () => {
      const { login } = await import('../services/auth.service.js')
      const { db } = await import('../db/index.js')
      const { comparePassword } = await import('../lib/password.js')

      const user = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'User',
        role: 'viewer',
        isActive: true,
        isLoginBlocked: false,
        isViewOnly: false,
      }

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([user]),
      }
      vi.mocked(db).select.mockReturnValue(mockChain as any)
      vi.mocked(comparePassword).mockReturnValue(false)

      await expect(login('user@example.com', 'wrongpassword')).rejects.toThrow('Invalid email or password')
    })

    it('should return tokens on successful login', async () => {
      const { login } = await import('../services/auth.service.js')
      const { db } = await import('../db/index.js')
      const { comparePassword } = await import('../lib/password.js')
      const { signAccessToken, signRefreshToken } = await import('../lib/jwt.js')

      const user = {
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hash',
        name: 'Test User',
        role: 'manager',
        isActive: true,
        isLoginBlocked: false,
        isViewOnly: false,
      }

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([user]),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)
      vi.mocked(comparePassword).mockReturnValue(true)
      vi.mocked(signAccessToken).mockReturnValue('access-token')
      vi.mocked(signRefreshToken).mockReturnValue('refresh-token')

      // Mock insert chain
      const mockInsertChain = {
        values: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(db).insert.mockReturnValue(mockInsertChain as any)

      const result = await login('user@example.com', 'password123')

      expect(result).toHaveProperty('accessToken', 'access-token')
      expect(result).toHaveProperty('refreshToken', 'refresh-token')
      expect(result).toHaveProperty('user')
      expect(result.user.email).toBe('user@example.com')
      expect(result.user.role).toBe('manager')
    })

    it('should downgrade role to viewer when isViewOnly is true', async () => {
      const { login } = await import('../services/auth.service.js')
      const { db } = await import('../db/index.js')
      const { comparePassword } = await import('../lib/password.js')

      const viewOnlyUser = {
        id: 'user-1',
        email: 'viewer@example.com',
        passwordHash: 'hash',
        name: 'View Only User',
        role: 'manager',
        isActive: true,
        isLoginBlocked: false,
        isViewOnly: true,
      }

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([viewOnlyUser]),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)
      vi.mocked(comparePassword).mockReturnValue(true)

      const mockInsertChain = {
        values: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(db).insert.mockReturnValue(mockInsertChain as any)

      const result = await login('viewer@example.com', 'password123')

      expect(result.user.role).toBe('viewer')
    })
  })

  describe('refresh', () => {
    it('should throw 401 for invalid refresh token', async () => {
      const { refresh } = await import('../services/auth.service.js')
      const { verifyToken } = await import('../lib/jwt.js')

      vi.mocked(verifyToken).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await expect(refresh('invalid-token')).rejects.toThrow('Invalid refresh token')
    })

    it('should throw 401 when refresh token not found in DB', async () => {
      const { refresh } = await import('../services/auth.service.js')
      const { verifyToken } = await import('../lib/jwt.js')
      const { db } = await import('../db/index.js')

      vi.mocked(verifyToken).mockReturnValue({
        sub: 'user-1',
        email: 'user@example.com',
        role: 'viewer',
      })

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(refresh('expired-token')).rejects.toThrow('Refresh token not found or expired')
    })
  })

  describe('logout', () => {
    it('should delete all refresh tokens for user', async () => {
      const { logout } = await import('../services/auth.service.js')
      const { db } = await import('../db/index.js')

      const mockDeleteChain = {
        where: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(db).delete.mockReturnValue(mockDeleteChain as any)

      await logout('user-1')

      expect(db.delete).toHaveBeenCalled()
    })
  })

  describe('getMe', () => {
    it('should throw 404 when user not found', async () => {
      const { getMe } = await import('../services/auth.service.js')
      const { db } = await import('../db/index.js')

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(getMe('nonexistent-id')).rejects.toThrow('User not found')
    })

    it('should return user data when found', async () => {
      const { getMe } = await import('../services/auth.service.js')
      const { db } = await import('../db/index.js')

      const userData = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'admin',
        isActive: true,
        isLoginBlocked: false,
        isViewOnly: false,
        createdAt: new Date(),
      }

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([userData]),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      const result = await getMe('user-1')

      expect(result).toEqual(userData)
    })
  })
})
