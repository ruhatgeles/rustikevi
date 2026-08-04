import { describe, it, expect } from 'vitest'
import { AppError } from '../lib/errors.js'

describe('AppError', () => {
  it('should create an error with status and message', () => {
    const error = new AppError(404, 'Not found')

    expect(error.status).toBe(404)
    expect(error.message).toBe('Not found')
  })

  it('should be an instance of Error', () => {
    const error = new AppError(500, 'Server error')

    expect(error).toBeInstanceOf(Error)
  })

  it('should support various HTTP status codes', () => {
    const error400 = new AppError(400, 'Bad request')
    const error401 = new AppError(401, 'Unauthorized')
    const error403 = new AppError(403, 'Forbidden')
    const error409 = new AppError(409, 'Conflict')
    const error429 = new AppError(429, 'Too many requests')

    expect(error400.status).toBe(400)
    expect(error401.status).toBe(401)
    expect(error403.status).toBe(403)
    expect(error409.status).toBe(409)
    expect(error429.status).toBe(429)
  })
})
