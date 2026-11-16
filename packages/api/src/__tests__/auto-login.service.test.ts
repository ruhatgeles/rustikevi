import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../db/schema.js', () => ({
  users: { id: 'id', email: 'email', name: 'name', role: 'role', isActive: 'isActive', isLoginBlocked: 'isLoginBlocked', isViewOnly: 'isViewOnly' },
  autoLoginTokens: { id: 'al.id', userId: 'al.userId', tokenHash: 'al.tokenHash', useCount: 'al.useCount', maxUses: 'al.maxUses', expiresAt: 'al.expiresAt' },
  refreshTokens: { id: 'rt.id', userId: 'rt.userId', tokenHash: 'rt.tokenHash', expiresAt: 'rt.expiresAt' },
}))

vi.mock('../lib/jwt.js', () => ({
  signAccessToken: vi.fn().mockReturnValue('access-token'),
  signRefreshToken: vi.fn().mockReturnValue('refresh-token'),
  getTokenHash: vi.fn((t: string) => `hash:${t}`),
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

const STORED = { id: 'tok-1', userId: 'user-1', useCount: 0, maxUses: 1000, expiresAt: new Date(Date.now() + 86_400_000) }
const USER = { id: 'user-1', email: 'a@example.com', name: 'Atölye', role: 'atolye', isActive: true, isViewOnly: false, isLoginBlocked: false }

// select zincirleri sırayla: önce token, sonra kullanıcı
function mockSelects(db: any, results: any[][]) {
  let i = 0
  db.select.mockImplementation(() => {
    const result = results[i++]
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(result),
    }
  })
}

describe('Auto-login Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('autoLogin', () => {
    it('stores the refresh token hash so /auth/refresh works after the access token expires', async () => {
      const { autoLogin } = await import('../services/auto-login.service.js')
      const { db } = await import('../db/index.js')
      const { refreshTokens } = await import('../db/schema.js')

      mockSelects(vi.mocked(db), [[STORED], [USER]])
      vi.mocked(db).update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) } as any)
      const values = vi.fn().mockResolvedValue(undefined)
      vi.mocked(db).insert.mockReturnValue({ values } as any)

      const result = await autoLogin('abcd2345')

      expect(result.refreshToken).toBe('refresh-token')
      expect(vi.mocked(db).insert).toHaveBeenCalledWith(refreshTokens)
      expect(values).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        tokenHash: 'hash:refresh-token',
        expiresAt: expect.any(Date),
      }))
    })

    it('rejects a login-blocked user and does not consume a use or issue tokens', async () => {
      const { autoLogin } = await import('../services/auto-login.service.js')
      const { db } = await import('../db/index.js')

      mockSelects(vi.mocked(db), [[STORED], [{ ...USER, isLoginBlocked: true }]])

      await expect(autoLogin('abcd2345')).rejects.toThrow('giriş engeli')
      expect(vi.mocked(db).update).not.toHaveBeenCalled()
      expect(vi.mocked(db).insert).not.toHaveBeenCalled()
    })

    it('rejects an inactive user', async () => {
      const { autoLogin } = await import('../services/auto-login.service.js')
      const { db } = await import('../db/index.js')

      mockSelects(vi.mocked(db), [[STORED], [{ ...USER, isActive: false }]])

      await expect(autoLogin('abcd2345')).rejects.toThrow('aktif değil')
    })
  })

  describe('createAutoLoginToken', () => {
    it('refuses to create a link for a login-blocked user', async () => {
      const { createAutoLoginToken } = await import('../services/auto-login.service.js')
      const { db } = await import('../db/index.js')

      mockSelects(vi.mocked(db), [[{ id: 'user-1', role: 'atolye', isActive: true, isLoginBlocked: true }]])

      await expect(createAutoLoginToken('user-1')).rejects.toThrow('giriş engeli')
      expect(vi.mocked(db).insert).not.toHaveBeenCalled()
    })
  })
})
