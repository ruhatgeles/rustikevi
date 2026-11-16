import { db } from '../db/index.js'
import { products, productCategories } from '../db/schema.js'
import { eq, and, asc, ilike, like, or, inArray } from 'drizzle-orm'
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

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// Postgres unique violation (23505) — drizzle hatayı DrizzleQueryError.cause içinde sarabilir
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null
  return e?.code === '23505' || e?.cause?.code === '23505'
}

const DUPLICATE_CODE_MESSAGE = 'Bu ürün kodu zaten kullanılıyor'

/**
 * Aynı kategori önekiyle (A) başlayan 5 haneli kodlardan bir sonraki sıra numarasını (BCD) hesaplar.
 * Sıra, kategori adına göre değil kod önekine göre tutulur: CATEGORY_CODES'ta olmayan
 * kategoriler 9 önekini "Diğer" ile paylaştığından aksi halde kodlar çakışır.
 */
export function nextSequenceFromCodes(codes: Array<string | null | undefined>, catCode: number): number {
  const prefix = String(catCode)
  let max = 0
  for (const code of codes) {
    if (!code || !/^\d{5}$/.test(code) || !code.startsWith(prefix)) continue
    const seq = Math.floor((parseInt(code, 10) % 10000) / 10) // binler+yüzler+onlar = sıra
    if (seq > max) max = seq
  }
  return max + 1
}

export async function generateProductCode(
  category: string,
  color: string,
  executor: DbExecutor = db,
): Promise<string> {
  const catCode = CATEGORY_CODES[category] || 9
  const colorCode = COLOR_CODES[color] ?? 9

  // Aynı kategori önekine sahip mevcut kodlar (kategori adından bağımsız)
  const existing = await executor
    .select({ productCode: products.productCode })
    .from(products)
    .where(like(products.productCode, `${catCode}%`))

  const seqCode = nextSequenceFromCodes(existing.map((p) => p.productCode), catCode)
  if (seqCode > 999) {
    throw new AppError(409, 'Bu kategori için ürün kodu kapasitesi doldu (999). Kodu elle girin.')
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

export async function getDistinctCategories(): Promise<string[]> {
  const result = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.isArchived, false)))
    .orderBy(asc(products.category))

  return result.map((r) => r.category).filter(Boolean)
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
  const values = {
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
  }

  // Ürün kodu belirlenmemişse otomatik üret; eşzamanlı oluşturmada çakışırsa yeniden dene
  const autoCode = !input.productCode && !!input.category && !!input.color
  const maxAttempts = autoCode ? 3 : 1

  for (let attempt = 1; ; attempt++) {
    const productCode = autoCode
      ? await generateProductCode(input.category, input.color!)
      : input.productCode
    try {
      const [product] = await db
        .insert(products)
        .values({ ...values, productCode })
        .returning()
      return product
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      if (attempt >= maxAttempts) throw new AppError(409, DUPLICATE_CODE_MESSAGE)
    }
  }
}

export async function updateProduct(id: number, input: UpdateProductInput) {
  const [product] = await db
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()
    .catch((err) => {
      if (isUniqueViolation(err)) throw new AppError(409, DUPLICATE_CODE_MESSAGE)
      throw err
    })

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

// ── Bulk Create ──────────────────────────────────────────

interface BulkCreateProductInput {
  name: string
  category: string
  colors: string[]
  description?: string
  shortDescription?: string
  moq?: string
  price?: number
  featured?: boolean
  isActive?: boolean
}

export async function bulkCreateProducts(input: BulkCreateProductInput) {
  // Hepsi ya da hiçbiri: bir renk başarısız olursa yarım ürün grubu kalmasın
  try {
    return await db.transaction(async (tx) => {
      const created = []

      for (const color of input.colors) {
        const productCode = await generateProductCode(input.category, color, tx)

        const [product] = await tx
          .insert(products)
          .values({
            productCode,
            name: input.name,
            category: input.category,
            color,
            description: input.description || '',
            shortDescription: input.shortDescription || '',
            moq: input.moq || '',
            price: input.price,
            swatches: [],
            images: [],
            featured: input.featured || false,
            isActive: input.isActive !== false,
            sortOrder: 0,
          })
          .returning()

        created.push(product)
      }

      return created
    })
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, DUPLICATE_CODE_MESSAGE + '. Lütfen tekrar deneyin.')
    throw err
  }
}

// ── Category Management ──────────────────────────────────

export async function listCategories() {
  const result = await db
    .select()
    .from(productCategories)
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.name))
  return result
}

export async function createCategory(name: string, sortOrder?: number) {
  const trimmed = name.trim()
  if (!trimmed) throw new AppError(400, 'Kategori adı boş olamaz')

  // Check for duplicates
  const existing = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.name, trimmed))
    .limit(1)

  if (existing.length > 0) {
    throw new AppError(409, 'Bu kategori zaten mevcut')
  }

  const [category] = await db
    .insert(productCategories)
    .values({ name: trimmed, sortOrder: sortOrder ?? 0 })
    .returning()

  return category
}

export async function deleteCategory(id: number) {
  const [category] = await db
    .delete(productCategories)
    .where(eq(productCategories.id, id))
    .returning()

  if (!category) {
    throw new AppError(404, 'Kategori bulunamadı')
  }

  return category
}

export async function getCategoriesWithFallback(): Promise<string[]> {
  // Try dedicated table first
  const dedicated = await db.select().from(productCategories).orderBy(asc(productCategories.sortOrder), asc(productCategories.name))

  if (dedicated.length > 0) {
    return dedicated.map(c => c.name)
  }

  // Fallback: distinct categories from products
  const result = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.isArchived, false)))
    .orderBy(asc(products.category))

  return result.map(r => r.category).filter(Boolean)
}
