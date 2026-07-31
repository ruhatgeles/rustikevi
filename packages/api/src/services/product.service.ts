import { db } from '../db/index.js'
import { products } from '../db/schema.js'
import { eq, and, sql, desc, asc, ilike, or, inArray } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

interface CreateProductInput {
  productCode?: string
  name: string
  category: string
  color?: string
  description?: string
  shortDescription?: string
  moq?: string
  price?: number
  swatches?: Array<[string, string]>
  images?: string[]
  featured?: boolean
  isActive?: boolean
  sortOrder?: number
}

interface UpdateProductInput extends Partial<CreateProductInput> {}

// ── Renk Kodları (birler basamağı) ─────────────────────
export const COLOR_CODES: Record<string, number> = {
  'Beyaz': 1,
  'Krem': 2,
  'Kahverengi': 3,
  'Siyah': 4,
  'Altın': 5,
  'Gümüş': 6,
  'Gri': 7,
  'Ahşap': 8,
  'Doğal': 9,
  'Özel': 0,
}

export const COLOR_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(COLOR_CODES).map(([name, code]) => [code, name]),
)

// ── Kategori Kodları (on binler basamağı: 1-9) ─────────
export const CATEGORY_CODES: Record<string, number> = {
  'Kordon': 1,
  'Halka': 2,
  'Bağcık': 3,
  'Saçak': 4,
  'Sarkıt': 5,
  'Braçol': 6,
  'Aksesuar': 7,
  'Diğer': 9,
}

export async function generateProductCode(category: string, color: string): Promise<string> {
  const catCode = CATEGORY_CODES[category] || 9
  const colorCode = COLOR_CODES[color] ?? 9

  // Bu kategorideki mevcut ürünleri bul
  const existing = await db
    .select({ productCode: products.productCode })
    .from(products)
    .where(eq(products.category, category))

  // Mevcut kodları parse et, alt kodu bul (binler+yüzler+onlar basamağı)
  let seqCode = 1
  if (existing.length > 0) {
    const seqCodes = existing
      .map((p) => p.productCode)
      .filter(Boolean)
      .map((code) => {
        const num = parseInt(code!, 10)
        return Math.floor((num % 100) / 10) // onlar basamağı = sıra
      })
      .filter((n) => !isNaN(n))
    if (seqCodes.length > 0) {
      seqCode = Math.max(...seqCodes) + 1
    }
  }

  // 5 haneli kod: ABCDE
  // A   = kategori (1-9)       → on binler
  // BCD = alt kod / sıra (001-999) → binler + yüzler + onlar
  // E   = renk (0-9)           → birler
  // Örnek: 10011 = Kordon(1) + 001 sıra + Beyaz(1)
  const code = (catCode * 10000) + (seqCode * 10) + colorCode
  return String(code).padStart(5, '0')
}

export async function listProducts(filters?: {
  category?: string
  featured?: boolean
  activeOnly?: boolean
  search?: string
  archived?: boolean
}) {
  const conditions = []

  // Arşiv filtresi
  conditions.push(eq(products.isArchived, filters?.archived || false))

  if (filters?.activeOnly !== false) {
    conditions.push(eq(products.isActive, true))
  }

  if (filters?.category && filters.category !== 'Tümü') {
    conditions.push(eq(products.category, filters.category))
  }

  if (filters?.featured !== undefined) {
    conditions.push(eq(products.featured, filters.featured))
  }

  if (filters?.search) {
    const s = `%${filters.search}%`
    conditions.push(
      or(
        ilike(products.productCode, s),
        ilike(products.name, s),
        ilike(products.category, s),
        ilike(products.color, s),
        ilike(products.description, s),
      ),
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const data = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(asc(products.productCode), asc(products.sortOrder), asc(products.id))

  return data
}

export async function getAllProducts(archived: boolean = false) {
  return db
    .select()
    .from(products)
    .where(eq(products.isArchived, archived))
    .orderBy(asc(products.productCode), asc(products.sortOrder), asc(products.id))
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
  // Ürün kodu belirlenmemişse otomatik üret
  let productCode = input.productCode
  if (!productCode && input.category && input.color) {
    productCode = await generateProductCode(input.category, input.color)
  }

  const [product] = await db
    .insert(products)
    .values({
      productCode,
      name: input.name,
      category: input.category,
      color: input.color,
      description: input.description || '',
      shortDescription: input.shortDescription || '',
      moq: input.moq || '',
      price: input.price,
      swatches: input.swatches || [],
      images: input.images || [],
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
  const [product] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id })

  if (!product) {
    throw new AppError(404, 'Product not found')
  }

  return product
}

// ── Archive / Unarchive ─────────────────────────────────

export async function archiveProduct(id: number) {
  const [product] = await db
    .update(products)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!product) {
    throw new AppError(404, 'Product not found')
  }

  return product
}

export async function unarchiveProduct(id: number) {
  const [product] = await db
    .update(products)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!product) {
    throw new AppError(404, 'Product not found')
  }

  return product
}

export async function bulkArchiveProducts(ids: number[]) {
  await db
    .update(products)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(inArray(products.id, ids))

  return { success: true, count: ids.length }
}

export async function bulkUnarchiveProducts(ids: number[]) {
  await db
    .update(products)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(inArray(products.id, ids))

  return { success: true, count: ids.length }
}

export async function bulkDeleteProducts(ids: number[]) {
  await db.delete(products).where(inArray(products.id, ids))
  return { success: true, count: ids.length }
}
