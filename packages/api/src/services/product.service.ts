import { db } from '../db/index.js'
import { products } from '../db/schema.js'
import { eq, and, sql, desc, asc } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

interface CreateProductInput {
  name: string
  category: string
  description?: string
  shortDescription?: string
  moq?: string
  swatches?: Array<[string, string]>
  featured?: boolean
  isActive?: boolean
  sortOrder?: number
}

interface UpdateProductInput extends Partial<CreateProductInput> {}

export async function listProducts(filters?: {
  category?: string
  featured?: boolean
  activeOnly?: boolean
}) {
  const conditions = []

  if (filters?.activeOnly !== false) {
    conditions.push(eq(products.isActive, true))
  }

  if (filters?.category && filters.category !== 'Tümü') {
    conditions.push(eq(products.category, filters.category))
  }

  if (filters?.featured !== undefined) {
    conditions.push(eq(products.featured, filters.featured))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const data = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(asc(products.sortOrder), asc(products.id))

  return data
}

export async function getAllProducts() {
  return db
    .select()
    .from(products)
    .orderBy(asc(products.sortOrder), asc(products.id))
}

export async function getProductById(id: number) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!product) {
    throw new AppError(404, 'Product not found')
  }

  return product
}

export async function createProduct(input: CreateProductInput) {
  const [product] = await db
    .insert(products)
    .values({
      name: input.name,
      category: input.category,
      description: input.description || '',
      shortDescription: input.shortDescription || '',
      moq: input.moq || '',
      swatches: input.swatches || [],
      featured: input.featured || false,
      isActive: input.isActive !== false,
      sortOrder: input.sortOrder || 0,
    })
    .returning()

  return product
}

export async function updateProduct(id: number, input: UpdateProductInput) {
  const [product] = await db
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!product) {
    throw new AppError(404, 'Product not found')
  }

  return product
}

export async function deleteProduct(id: number) {
  // Soft delete — set isActive to false
  const [product] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning({ id: products.id })

  if (!product) {
    throw new AppError(404, 'Product not found')
  }

  return product
}

export async function hardDeleteProduct(id: number) {
  const [product] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id })

  if (!product) {
    throw new AppError(404, 'Product not found')
  }

  return product
}
