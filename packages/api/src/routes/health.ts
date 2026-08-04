import { Hono } from 'hono'
import { db } from '../db/index.js'
import { sql } from 'drizzle-orm'
import { getRedis, isRedisAvailable } from '../lib/redis.js'

const health = new Hono()

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  timestamp: string
  checks: {
    database: { status: 'up' | 'down'; latency?: number; error?: string }
    redis: { status: 'up' | 'down'; latency?: number; error?: string }
    memory: { used: number; total: number; percentage: number }
  }
}

// Basic health check
health.get('/', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Detailed health check
health.get('/detailed', async (c) => {
  const startTime = Date.now()
  const checks: HealthCheck['checks'] = {
    database: { status: 'down' },
    redis: { status: 'down' },
    memory: { used: 0, total: 0, percentage: 0 },
  }

  // Database check
  try {
    const dbStart = Date.now()
    await db.execute(sql`SELECT 1`)
    checks.database = {
      status: 'up',
      latency: Date.now() - dbStart,
    }
  } catch (err: any) {
    checks.database = {
      status: 'down',
      error: err.message,
    }
  }

  // Redis check
  try {
    const redisStart = Date.now()
    const redis = getRedis()
    if (redis) {
      await redis.ping()
      checks.redis = {
        status: 'up',
        latency: Date.now() - redisStart,
      }
    } else {
      checks.redis = { status: 'down', error: 'Redis not configured' }
    }
  } catch (err: any) {
    checks.redis = {
      status: 'down',
      error: err.message,
    }
  }

  // Memory check
  const memUsage = process.memoryUsage()
  checks.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024),
    total: Math.round(memUsage.heapTotal / 1024 / 1024),
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  }

  // Determine overall status
  let status: HealthCheck['status'] = 'healthy'
  if (checks.database.status === 'down') {
    status = 'unhealthy'
  } else if (checks.redis.status === 'down') {
    status = 'degraded'
  }

  const result: HealthCheck = {
    status,
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
  }

  const statusCode = status === 'unhealthy' ? 503 : 200
  return c.json(result, statusCode)
})

export default health
