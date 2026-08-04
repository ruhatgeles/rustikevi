import { Context, Next } from 'hono'
import { getRedis } from '../lib/redis.js'

interface CacheOptions {
  ttl: number // Time to live in seconds
  keyPrefix?: string
  skipCache?: (c: Context) => boolean
}

export function cacheMiddleware(options: CacheOptions) {
  const { ttl, keyPrefix = 'cache', skipCache } = options

  return async (c: Context, next: Next) => {
    // Sadece GET istekleri için cache
    if (c.req.method !== 'GET') {
      await next()
      return
    }

    // Cache atlama kontrolü
    if (skipCache?.(c)) {
      await next()
      return
    }

    const redis = getRedis()
    if (!redis) {
      // Redis yoksa cache'leme yapma
      await next()
      return
    }

    // Cache key oluştur
    const url = new URL(c.req.url)
    const cacheKey = `${keyPrefix}:${url.pathname}${url.search}`

    try {
      // Cache'den kontrol et
      const cached = await redis.get(cacheKey)
      if (cached) {
        const data = JSON.parse(cached)
        return c.json(data)
      }
    } catch {
      // Redis hatası — devam et
    }

    // Response'u yakala
    await next()

    // Başarılı response'ları cache'le
    if (c.res.status >= 200 && c.res.status < 300) {
      try {
        // Response body'sini oku
        const response = c.res.clone()
        const body = await response.json()

        // Cache'e kaydet
        await redis.setex(cacheKey, ttl, JSON.stringify(body))
      } catch {
        // Cache hatası — önemli değil
      }
    }
  }
}

// Cache invalidation helper
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Ignore errors
  }
}

// Pre-defined cache configs
export const CACHE_TTL = {
  PRODUCTS: 5 * 60,      // 5 dakika
  CATEGORIES: 15 * 60,   // 15 dakika
  META: 60 * 60,         // 1 saat
  STATS: 2 * 60,         // 2 dakika
} as const
