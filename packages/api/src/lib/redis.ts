import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let redis: Redis | null = null

export function getRedis(): Redis | null {
  if (redis) return redis

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null // Stop retrying
        return Math.min(times * 200, 1000)
      },
      lazyConnect: true,
    })

    redis.on('error', () => {
      // Suppress connection errors — fallback to in-memory
    })

    return redis
  } catch {
    return null
  }
}

export async function isRedisAvailable(): Promise<boolean> {
  const client = getRedis()
  if (!client) return false

  try {
    await client.ping()
    return true
  } catch {
    return false
  }
}
