import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let redis: Redis | null = null

export function getRedis(): Redis | null {
  if (redis) return redis

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      // Bağlantı yokken komutları kuyrukta bekletme: hemen hata ver, in-memory fallback devreye girsin
      enableOfflineQueue: false,
      // Redis yeniden başlarsa bağlantıyı kendiliğinden toparla (eskiden 3 denemeden sonra kalıcı ölüyordu)
      retryStrategy(times) {
        return Math.min(times * 500, 5000)
      },
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
