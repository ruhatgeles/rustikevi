import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import Redis from 'ioredis'
import * as schema from '../../db/schema.js'

let pgContainer: StartedPostgreSqlContainer
let redisContainer: StartedRedisContainer
let db: ReturnType<typeof drizzle>
let redis: Redis

export async function setupTestContainers() {
  // PostgreSQL container
  pgContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('rustikevi_test')
    .withUsername('test')
    .withPassword('test')
    .start()

  // Redis container
  redisContainer = await new RedisContainer('redis:7-alpine').start()

  // Create connections
  const pgClient = postgres(pgContainer.getConnectionUri())
  db = drizzle(pgClient, { schema })

  redis = new Redis(redisContainer.getConnectionUri())

  // Run migrations (or create tables)
  await createTables(db)

  return { db, redis, pgContainer, redisContainer }
}

export async function teardownTestContainers() {
  if (redis) await redis.quit()
  if (pgContainer) await pgContainer.stop()
  if (redisContainer) await redisContainer.stop()
}

export function getTestDb() {
  return db
}

export function getTestRedis() {
  return redis
}

async function createTables(db: ReturnType<typeof drizzle>) {
  // Create tables based on schema
  // This is a simplified version - in production, use drizzle-kit push
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'viewer',
      is_active BOOLEAN NOT NULL DEFAULT true,
      is_login_blocked BOOLEAN NOT NULL DEFAULT false,
      is_view_only BOOLEAN NOT NULL DEFAULT false,
      invite_code_id UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_name VARCHAR(200) NOT NULL,
      contact_name VARCHAR(100),
      phone VARCHAR(20) NOT NULL,
      city VARCHAR(100),
      address TEXT,
      notes TEXT,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      product_code VARCHAR(5),
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) NOT NULL,
      color VARCHAR(50),
      description TEXT,
      short_description VARCHAR(500),
      moq VARCHAR(50),
      price INTEGER,
      images JSONB DEFAULT '[]',
      tags JSONB DEFAULT '[]',
      featured BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      is_archived BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number VARCHAR(20) UNIQUE NOT NULL,
      customer_id UUID REFERENCES customers(id),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      total_amount INTEGER,
      currency VARCHAR(3) DEFAULT 'TRY',
      notes TEXT,
      internal_notes TEXT,
      source VARCHAR(20) DEFAULT 'whatsapp',
      assigned_to UUID REFERENCES users(id),
      tracking_number VARCHAR(100),
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name VARCHAR(200) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER,
      total_price INTEGER,
      item_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      specifications TEXT,
      is_exchanged BOOLEAN DEFAULT false,
      exchange_note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(20) UNIQUE NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'viewer',
      max_uses INTEGER,
      use_count INTEGER DEFAULT 0,
      expires_at TIMESTAMP,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS content_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR(100) UNIQUE NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      updated_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_returns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL DEFAULT 'return',
      return_shipping_cost INTEGER,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_return_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      return_id UUID REFERENCES order_returns(id) ON DELETE CASCADE,
      order_item_id UUID REFERENCES order_items(id),
      quantity INTEGER NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
}

import { sql } from 'drizzle-orm'
