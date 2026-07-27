import { Context, Next } from 'hono'
import { AppError } from '../lib/errors.js'

// Simple in-memory rate limiter (production'da Redis tabanlı olmalı)
const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(maxRequests = 60, windowMs = 60_000) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const key = `${ip}:${c.req.path}`
    const now = Date.now()

    const entry = requests.get(key)

    if (!entry || now > entry.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs })
      await next()
      return
    }

    if (entry.count >= maxRequests) {
      throw new AppError(429, 'Too many requests')
    }

    entry.count++
    await next()
  }
}
