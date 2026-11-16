import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const DATABASE_URL = process.env.DATABASE_URL!

const client = postgres(DATABASE_URL, {
  max: Number(process.env.DB_POOL_MAX || 10),
  idle_timeout: 30,
  connect_timeout: 10,
  // "already exists, skipping" gibi zararsız NOTICE mesajları log'u kirletmesin
  onnotice: () => {},
})
export const db = drizzle(client, { schema })
