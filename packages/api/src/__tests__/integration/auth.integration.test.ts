import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupTestContainers, teardownTestContainers, getTestDb, getTestRedis } from './setup.js'
import { login, refresh, logout, getMe } from '../../services/auth.service.js'
import { hashPassword } from '../../lib/password.js'
import { users } from '../../db/schema.js'
import { eq } from 'drizzle-orm'

describe('Auth Service Integration', () => {
  let db: ReturnType<typeof getTestDb>
  let testUserId: string

  beforeAll(async () => {
    await setupTestContainers()
    db = getTestDb()

    // Create test user
    const passwordHash = await hashPassword('Test1234')
    const [user] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        passwordHash,
        name: 'Test User',
        role: 'admin',
        isActive: true,
      })
      .returning()

    testUserId = user.id
  }, 60000) // 60s timeout for container setup

  afterAll(async () => {
    await teardownTestContainers()
  })

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const result = await login('test@example.com', 'Test1234')

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('user')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.role).toBe('admin')
    })

    it('should reject invalid email', async () => {
      await expect(login('wrong@example.com', 'Test1234')).rejects.toThrow()
    })

    it('should reject invalid password', async () => {
      await expect(login('test@example.com', 'wrongpassword')).rejects.toThrow()
    })

    it('should reject inactive user', async () => {
      // Deactivate user
      await db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, testUserId))

      await expect(login('test@example.com', 'Test1234')).rejects.toThrow()

      // Reactivate
      await db
        .update(users)
        .set({ isActive: true })
        .where(eq(users.id, testUserId))
    })

    it('should downgrade role for view-only user', async () => {
      // Set view-only
      await db
        .update(users)
        .set({ isViewOnly: true })
        .where(eq(users.id, testUserId))

      const result = await login('test@example.com', 'Test1234')
      expect(result.user.role).toBe('viewer')

      // Reset
      await db
        .update(users)
        .set({ isViewOnly: false })
        .where(eq(users.id, testUserId))
    })
  })

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const loginResult = await login('test@example.com', 'Test1234')
      const refreshResult = await refresh(loginResult.refreshToken)

      expect(refreshResult).toHaveProperty('accessToken')
      expect(refreshResult).toHaveProperty('refreshToken')
      expect(refreshResult.accessToken).not.toBe(loginResult.accessToken)
    })

    it('should reject invalid refresh token', async () => {
      await expect(refresh('invalid-token')).rejects.toThrow()
    })
  })

  describe('getMe', () => {
    it('should return user info', async () => {
      const result = await getMe(testUserId)

      expect(result).toHaveProperty('id', testUserId)
      expect(result).toHaveProperty('email', 'test@example.com')
      expect(result).toHaveProperty('name', 'Test User')
      expect(result).toHaveProperty('role', 'admin')
    })

    it('should throw for non-existent user', async () => {
      await expect(getMe('non-existent-id')).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('should logout and invalidate refresh tokens', async () => {
      // Login first
      const loginResult = await login('test@example.com', 'Test1234')

      // Logout
      await logout(testUserId)

      // Try to refresh - should fail
      await expect(refresh(loginResult.refreshToken)).rejects.toThrow()
    })
  })
})
