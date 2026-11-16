import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { readMigrationFiles } from 'drizzle-orm/migrator'

const MIGRATIONS_FOLDER = './migrations'

/**
 * Bu migration'lar drizzle migrator kullanılmaya başlanmadan önce production'a
 * `drizzle-kit push` ile zaten uygulanmıştı (2026-08 yedeğiyle doğrulandı).
 * 0002 ve sonrası idempotent yazıldığı için normal şekilde çalışır.
 */
const LEGACY_BASELINE_COUNT = 2 // 0000_sturdy_ser_duncan, 0001_grey_whirlwind

async function baselineLegacyDatabase(client: postgres.Sql) {
  const [{ legacy }] = await client<{ legacy: boolean }[]>`
    SELECT to_regclass('public.users') IS NOT NULL
       AND to_regclass('drizzle.__drizzle_migrations') IS NULL AS legacy`
  if (!legacy) return

  console.log('▶ Migration kaydı olmayan mevcut veritabanı bulundu, baseline oluşturuluyor...')
  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER }).slice(0, LEGACY_BASELINE_COUNT)
  await client.begin(async (tx) => {
    await tx`CREATE SCHEMA IF NOT EXISTS drizzle`
    await tx`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`
    for (const m of migrations) {
      await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${m.hash}, ${m.folderMillis})`
    }
  })
  console.log(`  ${migrations.length} migration uygulanmış olarak işaretlendi.`)
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} })
  try {
    console.log('Running migrations...')
    await baselineLegacyDatabase(client)
    await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER })
    console.log('Migrations complete!')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
