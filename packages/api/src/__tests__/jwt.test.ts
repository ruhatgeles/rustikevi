import { describe, it, expect } from 'vitest'
import { signAccessToken, signRefreshToken, verifyToken, getTokenHash } from '../lib/jwt.js'

describe('JWT Library', () => {
  const testPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'admin',
  }

  describe('signAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = signAccessToken(testPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should generate different tokens for different payloads', () => {
      const token1 = signAccessToken(testPayload)
      const token2 = signAccessToken({ ...testPayload, sub: 'user-456' })

      expect(token1).not.toBe(token2)
    })
  })

  describe('signRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = signRefreshToken(testPayload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should be different from access token', () => {
      const accessToken = signAccessToken(testPayload)
      const refreshToken = signRefreshToken(testPayload)

      expect(accessToken).not.toBe(refreshToken)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid access token', () => {
      const token = signAccessToken(testPayload)
      const payload = verifyToken(token)

      expect(payload.sub).toBe(testPayload.sub)
      expect(payload.email).toBe(testPayload.email)
      expect(payload.role).toBe(testPayload.role)
    })

    it('should verify a valid refresh token', () => {
      const token = signRefreshToken(testPayload)
      const payload = verifyToken(token)

      expect(payload.sub).toBe(testPayload.sub)
      expect(payload.email).toBe(testPayload.email)
      expect(payload.role).toBe(testPayload.role)
    })

    it('should throw for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow()
    })

    it('should throw for tampered token', () => {
      const token = signAccessToken(testPayload)
      const tampered = token.slice(0, -5) + 'XXXXX'

      expect(() => verifyToken(tampered)).toThrow()
    })
  })

  describe('getTokenHash', () => {
    it('should generate a consistent hash for the same token', () => {
      const token = 'test-token-123'
      const hash1 = getTokenHash(token)
      const hash2 = getTokenHash(token)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different tokens', () => {
      const hash1 = getTokenHash('token-1')
      const hash2 = getTokenHash('token-2')

      expect(hash1).not.toBe(hash2)
    })

    it('should return a hex string', () => {
      const hash = getTokenHash('test-token')

      expect(hash).toMatch(/^[a-f0-9]+$/)
    })

    it('should return a 64-character SHA-256 hash', () => {
      const hash = getTokenHash('test-token')

      expect(hash).toHaveLength(64)
    })
  })
})
