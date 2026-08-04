import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from '../lib/password.js'

describe('Password Library', () => {
  describe('hashPassword', () => {
    it('should hash a password', () => {
      const hash = hashPassword('password123')

      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).not.toBe('password123')
    })

    it('should generate different hashes for the same password (due to salt)', () => {
      const hash1 = hashPassword('password123')
      const hash2 = hashPassword('password123')

      // bcrypt uses random salt, so hashes should be different
      expect(hash1).not.toBe(hash2)
    })

    it('should start with bcrypt identifier', () => {
      const hash = hashPassword('password123')

      expect(hash).toMatch(/^\$2[ab]\$/)
    })
  })

  describe('comparePassword', () => {
    it('should return true for matching password', () => {
      const hash = hashPassword('password123')
      const result = comparePassword('password123', hash)

      expect(result).toBe(true)
    })

    it('should return false for non-matching password', () => {
      const hash = hashPassword('password123')
      const result = comparePassword('wrongpassword', hash)

      expect(result).toBe(false)
    })

    it('should return false for empty password', () => {
      const hash = hashPassword('password123')
      const result = comparePassword('', hash)

      expect(result).toBe(false)
    })
  })
})
