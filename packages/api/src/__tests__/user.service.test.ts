import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}))

vi.mock('../db/schema.js', () => ({
  users: { id: 'id', email: 'email', passwordHash: 'passwordHash', name: 'name', role: 'role', isActive: 'isActive', isLoginBlocked: 'isLoginBlocked', isViewOnly: 'isViewOnly', inviteCodeId: 'inviteCodeId', createdAt: 'createdAt', updatedAt: 'updatedAt' },
  inviteCodes: { id: 'id', code: 'code', role: 'role', maxUses: 'maxUses', useCount: 'useCount', expiresAt: 'expiresAt', createdBy: 'createdBy', createdAt: 'createdAt' },
  refreshTokens: { id: 'rt.id', userId: 'rt.userId', tokenHash: 'rt.tokenHash', expiresAt: 'rt.expiresAt' },
  autoLoginTokens: { id: 'al.id', userId: 'al.userId', tokenHash: 'al.tokenHash', expiresAt: 'al.expiresAt' },
}))

// updateUser önce mevcut durumu okur; select zinciri için yardımcı
function mockCurrentUser(db: any, current: any[] | Array<any>, extra: any[][] = []) {
  const results = [current, ...extra]
  let i = 0
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => Promise.resolve(results[Math.min(i++, results.length - 1)])),
  }
  db.select.mockReturnValue(chain as any)
}

function mockUpdateReturning(db: any, rows: any[]) {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(rows),
  }
  db.update.mockReturnValue(chain as any)
}

function mockDelete(db: any) {
  const where = vi.fn().mockResolvedValue(undefined)
  db.delete.mockReturnValue({ where } as any)
  return where
}

const CURRENT = { role: 'manager', isActive: true, isLoginBlocked: false, isViewOnly: false }
const UPDATED = {
  id: 'user-1', email: 'user@example.com', name: 'U', role: 'manager',
  isActive: true, isLoginBlocked: false, isViewOnly: false, updatedAt: new Date(),
}

vi.mock('../lib/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  comparePassword: vi.fn(),
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

describe('User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('should throw 409 when email already exists', async () => {
      const { createUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'existing-user' }]),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(createUser({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      })).rejects.toThrow('Email already in use')
    })

    it('should throw 400 for invalid invite code', async () => {
      const { createUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')

      // First call: check email (no existing)
      // Second call: check invite code (not found)
      let callCount = 0
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve([]) // email check
          return Promise.resolve([]) // invite code check
        }),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(createUser({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        inviteCode: 'INVALID-CODE',
      })).rejects.toThrow('Invalid invite code')
    })

    it('should throw 400 for expired invite code', async () => {
      const { createUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')

      const expiredDate = new Date(Date.now() - 86400000) // yesterday
      let callCount = 0
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve([])
          return Promise.resolve([{
            id: 'code-1',
            code: 'RUSTIK-ABC12345',
            role: 'viewer',
            maxUses: null,
            useCount: 0,
            expiresAt: expiredDate,
          }])
        }),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(createUser({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        inviteCode: 'RUSTIK-ABC12345',
      })).rejects.toThrow('Invite code has expired')
    })

    it('should throw 400 when invite code max uses reached', async () => {
      const { createUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')

      let callCount = 0
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return Promise.resolve([])
          return Promise.resolve([{
            id: 'code-1',
            code: 'RUSTIK-FULL0001',
            role: 'viewer',
            maxUses: 5,
            useCount: 5,
            expiresAt: null,
          }])
        }),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(createUser({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        inviteCode: 'RUSTIK-FULL0001',
      })).rejects.toThrow('Invite code has been fully used')
    })
  })

  describe('updateUser', () => {
    it('should throw 409 when updating to existing email', async () => {
      const { updateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')

      mockCurrentUser(vi.mocked(db), [CURRENT], [[{ id: 'other-user' }]])

      await expect(updateUser('user-1', {
        email: 'taken@example.com',
      })).rejects.toThrow('Bu e-posta adresi zaten kullanılıyor')
    })

    it('should throw 404 when user not found', async () => {
      const { updateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')

      mockCurrentUser(vi.mocked(db), [])

      await expect(updateUser('nonexistent-id', {
        name: 'New Name',
      })).rejects.toThrow('Kullanıcı bulunamadı')
    })

    it('should hash password when updating password', async () => {
      const { updateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')
      const { hashPassword } = await import('../lib/password.js')

      mockCurrentUser(vi.mocked(db), [CURRENT])
      mockDelete(vi.mocked(db))
      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: 'user-1',
          email: 'user@example.com',
          name: 'Updated User',
          role: 'viewer',
          isActive: true,
          isLoginBlocked: false,
          isViewOnly: false,
          updatedAt: new Date(),
        }]),
      }
      vi.mocked(db).update.mockReturnValue(mockUpdateChain as any)
      vi.mocked(hashPassword).mockResolvedValue('new-hashed-password')

      await updateUser('user-1', { password: 'newpassword123' })

      expect(hashPassword).toHaveBeenCalledWith('newpassword123')
    })

    it('revokes refresh tokens (not auto-login links) when password changes', async () => {
      const { updateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')
      const { refreshTokens, autoLoginTokens } = await import('../db/schema.js')

      mockCurrentUser(vi.mocked(db), [CURRENT])
      mockUpdateReturning(vi.mocked(db), [UPDATED])
      mockDelete(vi.mocked(db))

      await updateUser('user-1', { password: 'newpassword123' })

      expect(vi.mocked(db).delete).toHaveBeenCalledWith(refreshTokens)
      expect(vi.mocked(db).delete).not.toHaveBeenCalledWith(autoLoginTokens)
    })

    it('revokes refresh tokens and auto-login links when user is blocked', async () => {
      const { updateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')
      const { refreshTokens, autoLoginTokens } = await import('../db/schema.js')

      mockCurrentUser(vi.mocked(db), [CURRENT])
      mockUpdateReturning(vi.mocked(db), [{ ...UPDATED, isLoginBlocked: true }])
      mockDelete(vi.mocked(db))

      await updateUser('user-1', { isLoginBlocked: true, isViewOnly: false })

      expect(vi.mocked(db).delete).toHaveBeenCalledWith(refreshTokens)
      expect(vi.mocked(db).delete).toHaveBeenCalledWith(autoLoginTokens)
    })

    it('revokes refresh tokens when role changes', async () => {
      const { updateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')
      const { refreshTokens, autoLoginTokens } = await import('../db/schema.js')

      mockCurrentUser(vi.mocked(db), [CURRENT])
      mockUpdateReturning(vi.mocked(db), [{ ...UPDATED, role: 'viewer' }])
      mockDelete(vi.mocked(db))

      await updateUser('user-1', { role: 'viewer' })

      expect(vi.mocked(db).delete).toHaveBeenCalledWith(refreshTokens)
      expect(vi.mocked(db).delete).not.toHaveBeenCalledWith(autoLoginTokens)
    })

    it('does not revoke sessions when only name/email change (role sent unchanged)', async () => {
      const { updateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')

      // Admin düzenleme formu rolü her zaman gönderir; değişmediyse oturum kapanmamalı
      mockCurrentUser(vi.mocked(db), [CURRENT], [[]])
      mockUpdateReturning(vi.mocked(db), [UPDATED])
      mockDelete(vi.mocked(db))

      await updateUser('user-1', { name: 'Yeni', email: 'new@example.com', role: 'manager' })

      expect(vi.mocked(db).delete).not.toHaveBeenCalled()
    })
  })

  describe('deactivateUser', () => {
    it('should throw 404 when deactivating non-existent user', async () => {
      const { deactivateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).update.mockReturnValue(mockUpdateChain as any)

      await expect(deactivateUser('nonexistent-id')).rejects.toThrow('User not found')
    })

    it('revokes refresh tokens and auto-login links on deactivate', async () => {
      const { deactivateUser } = await import('../services/user.service.js')
      const { db } = await import('../db/index.js')
      const { refreshTokens, autoLoginTokens } = await import('../db/schema.js')

      mockUpdateReturning(vi.mocked(db), [{ id: 'user-1' }])
      mockDelete(vi.mocked(db))

      await deactivateUser('user-1')

      expect(vi.mocked(db).delete).toHaveBeenCalledWith(refreshTokens)
      expect(vi.mocked(db).delete).toHaveBeenCalledWith(autoLoginTokens)
    })
  })
})
