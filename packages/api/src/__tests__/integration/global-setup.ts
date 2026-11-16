import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../migrations')

let pg: StartedPostgreSqlContainer
let redis: StartedRedisContainer

// Container'lar tüm entegrasyon testleri için bir kez başlar; şema GERÇEK migration'larla kurulur.
export async function setup() {
  pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('rustikevi_test')
    .withUsername('test')
    .withPassword('test')
    .start()
  redis = await new RedisContainer('redis:7-alpine').start()

  process.env.DATABASE_URL = pg.getConnectionUri()
  process.env.REDIS_URL = redis.getConnectionUrl()
  process.env.JWT_SECRET ||= 'integration-test-secret-at-least-32-chars'

  const client = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS })
  await client.end()
}

export async function teardown() {
  await redis?.stop()
  await pg?.stop()
}
