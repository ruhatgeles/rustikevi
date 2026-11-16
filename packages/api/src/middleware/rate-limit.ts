import { Context, Next } from 'hono'
import { AppError } from '../lib/errors.js'
import { getRedis } from '../lib/redis.js'
import { getClientIp } from '../lib/client-ip.js'

// In-memory fallback (Redis yoksa kullanılır)
const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Periyodik temizlik (memory leak önleme)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) {
      memoryStore.delete(key)
    }
  }
}, 60_000).unref() // Her dakika temizle

export function rateLimit(maxRequests = 60, windowMs = 60_000) {
  return async (c: Context, next: Next) => {
    const ip = getClientIp(c)
    const key = `ratelimit:${ip}:${c.req.path}`
    const now = Date.now()

    // Redis dene
    const redis = getRedis()
    if (redis) {
      let current: number | null = null
      try {
        current = await redis.incr(key)
        if (current === 1) {
          await redis.pexpire(key, windowMs)
        }
      } catch {
        // Redis hatası — in-memory fallback'e düş
        current = null
      }
      if (current !== null) {
        if (current > maxRequests) {
          throw new AppError(429, 'Too many requests')
        }
        // next() try dışında: handler hatası fallback'e düşüp handler'ı ikinci kez çalıştırmasın
        await next()
        return
      }
    }

    // In-memory fallback
    const entry = memoryStore.get(key)

    if (!entry || now > entry.resetAt) {
      memoryStore.set(key, { count: 1, resetAt: now + windowMs })
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
