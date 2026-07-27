import { db } from '../db/index.js'
import { customers } from '../db/schema.js'
import { eq, and, ilike, sql, desc, or } from 'drizzle-orm'
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

export async function listCustomers(
  page = 1,
  limit = 20,
  search?: string,
  city?: string,
  tag?: string
): Promise<PaginatedResponse<typeof customers.$inferSelect>> {
  const offset = (page - 1) * limit

  const conditions = []

  if (search) {
    conditions.push(
      or(
        ilike(customers.businessName, `%${search}%`),
        ilike(customers.contactName, `%${search}%`),
        ilike(customers.phone, `%${search}%`)
      )
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

  const data = await db
    .select()
    .from(customers)
    .where(where)
    .orderBy(desc(customers.createdAt))
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
  const [customer] = await db
    .delete(customers)
    .where(eq(customers.id, id))
    .returning({ id: customers.id })

  if (!customer) {
    throw new AppError(404, 'Customer not found')
  }

  return customer
}
