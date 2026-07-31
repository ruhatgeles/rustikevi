import { Context, Next } from 'hono'
import { getRedis } from '../lib/redis.js'
import { AppError } from '../lib/errors.js'

// In-memory fallback
const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Periyodik temizlik
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) {
      memoryStore.delete(key)
    }
  }
}, 60_000)

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 dakika

export function bruteForceProtection() {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const body = await c.req.json().catch(() => ({}))
    const email = body.email || 'unknown'
    const key = `bruteforce:${ip}:${email}`

    // Redis dene
    const redis = getRedis()
    if (redis) {
      try {
        const attempts = await redis.get(key)
        if (attempts && parseInt(attempts) >= MAX_ATTEMPTS) {
          const ttl = await redis.pttl(key)
          throw new AppError(429, `Çok fazla başarısız deneme. ${Math.ceil(ttl / 60000)} dakika sonra tekrar deneyin.`)
        }
      } catch (err) {
        if (err instanceof AppError) throw err
        // Redis hatası — in-memory fallback'e düş
      }
    }

    // In-memory fallback
    const entry = memoryStore.get(key)
    if (entry && Date.now() < entry.resetAt && entry.count >= MAX_ATTEMPTS) {
      const remaining = Math.ceil((entry.resetAt - Date.now()) / 60000)
      throw new AppError(429, `Çok fazla başarısız deneme. ${remaining} dakika sonra tekrar deneyin.`)
    }

    await next()
  }
}

export async function recordFailedAttempt(ip: string, email: string): Promise<void> {
  const key = `bruteforce:${ip}:${email}`

  const redis = getRedis()
  if (redis) {
    try {
      const current = await redis.incr(key)
      if (current === 1) {
        await redis.pexpire(key, LOCKOUT_DURATION)
      }
      return
    } catch {
      // Redis hatası — in-memory fallback'e düş
    }
  }

  // In-memory fallback
  const entry = memoryStore.get(key)
  if (!entry || Date.now() > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: Date.now() + LOCKOUT_DURATION })
  } else {
    entry.count++
  }
}

export async function clearFailedAttempts(ip: string, email: string): Promise<void> {
  const key = `bruteforce:${ip}:${email}`

  const redis = getRedis()
  if (redis) {
    try {
      await redis.del(key)
    } catch {
      // Ignore
    }
  }

  memoryStore.delete(key)
}
