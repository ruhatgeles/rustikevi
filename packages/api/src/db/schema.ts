import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  serial,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Enums ──────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'viewer'])
export const contentTypeEnum = pgEnum('content_type', ['text', 'json', 'image'])

// ── Users ──────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  isActive: boolean('is_active').notNull().default(true),
  inviteCodeId: uuid('invite_code_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Refresh Tokens ─────────────────────────────────────

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Invite Codes ───────────────────────────────────────

export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  role: userRoleEnum('role').notNull().default('viewer'),
  maxUses: integer('max_uses'), // null = unlimited
  useCount: integer('use_count').notNull().default(0),
  expiresAt: timestamp('expires_at'), // null = never
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── Customers ──────────────────────────────────────────

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessName: varchar('business_name', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdBy: uuid('created_by')
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Content Blocks ─────────────────────────────────────

export const contentBlocks = pgTable('content_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  type: contentTypeEnum('type').notNull().default('text'),
  title: varchar('title', { length: 200 }).notNull(),
  body: text('body').notNull().default(''),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Products ───────────────────────────────────────────

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description').notNull().default(''),
  shortDescription: text('short_description').notNull().default(''),
  moq: varchar('moq', { length: 50 }).notNull().default(''),
  swatches: jsonb('swatches').$type<Array<[string, string]>>().default([]),
  featured: boolean('featured').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ── Relations ──────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  inviteCodes: many(inviteCodes),
  customers: many(customers),
}))

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}))

export const inviteCodesRelations = relations(inviteCodes, ({ one, many }) => ({
  creator: one(users, { fields: [inviteCodes.createdBy], references: [users.id] }),
}))

export const customersRelations = relations(customers, ({ one }) => ({
  creator: one(users, { fields: [customers.createdBy], references: [users.id] }),
}))

export const contentBlocksRelations = relations(contentBlocks, ({ one }) => ({
  updater: one(users, { fields: [contentBlocks.updatedBy], references: [users.id] }),
}))
