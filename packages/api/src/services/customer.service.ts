import { db } from '../db/index.js'
import { customers, orders } from '../db/schema.js'
import { eq, and, ilike, sql, desc, asc, or, inArray } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'
import { PaginatedResponse } from '../types/index.js'

interface CreateCustomerInput {
  businessName: string
  contactName: string
  phone: string
  email?: string
  city?: string
  address?: string
  notes?: string
  tags?: string[]
}

interface UpdateCustomerInput extends Partial<CreateCustomerInput> {}

const VALID_SORT_FIELDS = ['businessName', 'contactName', 'phone', 'city', 'createdAt', 'orderCount'] as const

export async function listCustomers(
  page = 1,
  limit = 20,
  search?: string,
  city?: string,
  tag?: string,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  archived: boolean = false,
): Promise<PaginatedResponse<typeof customers.$inferSelect & { orderCount: number }>> {
  const offset = (page - 1) * limit

  const conditions = []

  // Arşiv filtresi
  conditions.push(eq(customers.isArchived, archived))

  if (search) {
    conditions.push(
      or(
        ilike(customers.businessName, `%${search}%`),
        ilike(customers.contactName, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
      ),
    )
  }

  if (city) {
    conditions.push(ilike(customers.city, `%${city}%`))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(where)

  // Sipariş sayısı subquery
  const orderCountSubquery = db
    .select({
      customerId: orders.customerId,
      count: sql<number>`count(*)::int`.as('order_count'),
    })
    .from(orders)
    .groupBy(orders.customerId)
    .as('order_counts')

  // Sıralama alanı belirle
  const sortField = VALID_SORT_FIELDS.includes(sortBy as any) ? sortBy : 'createdAt'
  const sortDir = sortOrder === 'asc' ? asc : desc

  let orderClause
  if (sortField === 'orderCount') {
    orderClause = sortDir(sql`COALESCE(order_counts.order_count, 0)`)
  } else if (sortField === 'businessName') {
    orderClause = sortDir(customers.businessName)
  } else if (sortField === 'contactName') {
    orderClause = sortDir(customers.contactName)
  } else if (sortField === 'phone') {
    orderClause = sortDir(customers.phone)
  } else if (sortField === 'city') {
    orderClause = sortDir(customers.city)
  } else {
    orderClause = sortDir(customers.createdAt)
  }

  const data = await db
    .select({
      id: customers.id,
      businessName: customers.businessName,
      contactName: customers.contactName,
      phone: customers.phone,
      email: customers.email,
      city: customers.city,
      address: customers.address,
      notes: customers.notes,
      tags: customers.tags,
      createdBy: customers.createdBy,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
      orderCount: sql<number>`COALESCE(order_counts.order_count, 0)::int`,
    })
    .from(customers)
    .leftJoin(orderCountSubquery, eq(customers.id, orderCountSubquery.customerId))
    .where(where)
    .orderBy(orderClause)
    .limit(limit)
    .offset(offset)

  return {
    data,
    total: countResult.count,
    page,
    limit,
    totalPages: Math.ceil(countResult.count / limit),
  }
}

export async function getCustomer(id: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1)

  if (!customer) {
    throw new AppError(404, 'Customer not found')
  }

  return customer
}

export async function createCustomer(input: CreateCustomerInput, createdById: string) {
  const [customer] = await db
    .insert(customers)
    .values({
      ...input,
      createdBy: createdById,
    })
    .returning()

  return customer
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const [customer] = await db
    .update(customers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning()

  if (!customer) {
    throw new AppError(404, 'Customer not found')
  }

  return customer
}

export async function deleteCustomer(id: string) {
  // Sipariş varsa silmeyi engelle
  const [orderCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.customerId, id))

  if (orderCount.count > 0) {
    throw new AppError(400, `Bu müşteriye ait ${orderCount.count} sipariş bulunduğu için silinemez. Önce siparişleri silin.`)
  }

  const [customer] = await db
    .delete(customers)
    .where(eq(customers.id, id))
    .returning({ id: customers.id })

  if (!customer) {
    throw new AppError(404, 'Customer not found')
  }

  return customer
}

// ── Archive / Unarchive ─────────────────────────────────

export async function archiveCustomer(id: string) {
  const [customer] = await db
    .update(customers)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning()

  if (!customer) {
    throw new AppError(404, 'Customer not found')
  }

  return customer
}

export async function unarchiveCustomer(id: string) {
  const [customer] = await db
    .update(customers)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning()

  if (!customer) {
    throw new AppError(404, 'Customer not found')
  }

  return customer
}

// ── Bulk Operations ──────────────────────────────────────

export async function bulkArchiveCustomers(ids: string[]) {
  await db
    .update(customers)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(inArray(customers.id, ids))

  return { success: true, count: ids.length }
}

export async function bulkUnarchiveCustomers(ids: string[]) {
  await db
    .update(customers)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(inArray(customers.id, ids))

  return { success: true, count: ids.length }
}

export async function bulkDeleteCustomers(ids: string[]) {
  // Sipariş kontrolü
  const customersWithOrders = await db
    .select({
      customerId: orders.customerId,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(inArray(orders.customerId, ids))
    .groupBy(orders.customerId)

  if (customersWithOrders.length > 0) {
    throw new AppError(400, `${customersWithOrders.length} müşterinin siparişleri var, silinemez`)
  }

  await db.delete(customers).where(inArray(customers.id, ids))

  return { success: true, count: ids.length }
}
