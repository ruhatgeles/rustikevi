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
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'quoted',
  'confirmed',
  'in_production',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
])
export const itemStatusEnum = pgEnum('item_status', [
  'pending',
  'in_stock',
  'out_of_stock',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'returned',
])

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
  isArchived: boolean('is_archived').notNull().default(false),
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

// ── Orders ────────────────────────────────────────────

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: varchar('order_number', { length: 20 }).notNull().unique(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  status: orderStatusEnum('status').notNull().default('pending'),
  totalAmount: integer('total_amount'), // kuruş cinsinden (100 = 1 TL)
  currency: varchar('currency', { length: 3 }).notNull().default('TRY'),
  notes: text('notes'),
  internalNotes: text('internal_notes'), // sadece admin görür
  assignedTo: uuid('assigned_to').references(() => users.id),
  source: varchar('source', { length: 50 }).notNull().default('whatsapp'), // whatsapp, phone, website, walk-in
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .references(() => products.id),
  productName: varchar('product_name', { length: 200 }).notNull(), // ürün silinse bile korunur
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price'), // kuruş cinsinden
  totalPrice: integer('total_price'), // kuruş cinsinden
  itemStatus: itemStatusEnum('item_status').notNull().default('pending'),
  specifications: text('specifications'), // özel notlar, renk, boyut vb.
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const orderActivities = pgTable('order_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .references(() => users.id),
  type: varchar('type', { length: 50 }).notNull(), // status_change, note_added, item_added, etc.
  description: text('description').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  assignee: one(users, { fields: [orders.assignedTo], references: [users.id] }),
  items: many(orderItems),
  activities: many(orderActivities),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}))

export const orderActivitiesRelations = relations(orderActivities, ({ one }) => ({
  order: one(orders, { fields: [orderActivities.orderId], references: [orders.id] }),
  user: one(users, { fields: [orderActivities.userId], references: [users.id] }),
}))
