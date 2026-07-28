import { Hono } from 'hono'
import { z } from 'zod'
import {
  listProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  generateProductCode,
  COLOR_CODES,
  COLOR_NAMES,
  CATEGORY_CODES,
} from '../services/product.service.js'
import { requireManager, requireAdmin } from '../middleware/auth.js'

const products = new Hono()

// ─── Public routes ──────────────────────────────────────────

// GET /api/products — list active products (public, supports search)
products.get('/', async (c) => {
  const category = c.req.query('category')
  const featured = c.req.query('featured')
  const search = c.req.query('search')

  const filters: { category?: string; featured?: boolean; search?: string } = {}
  if (category) filters.category = category
  if (featured === 'true') filters.featured = true
  if (search) filters.search = search

  const data = await listProducts(filters)
  return c.json({ data })
})

// GET /api/products/meta — code maps (manager+)
products.get('/meta', requireManager(), async (c) => {
  return c.json({
    data: {
      colorCodes: COLOR_CODES,
      colorNames: COLOR_NAMES,
      categoryCodes: CATEGORY_CODES,
    },
  })
})

// GET /api/products/generate-code — generate a product code (manager+)
products.get('/generate-code', requireManager(), async (c) => {
  const category = c.req.query('category')
  const color = c.req.query('color')

  if (!category || !color) {
    return c.json({ error: 'category and color required' }, 400)
  }

  const code = await generateProductCode(category, color)
  return c.json({ data: { code } })
})

// GET /api/products/all — all products including inactive (manager+)
products.get('/all', requireManager(), async (c) => {
  const data = await getAllProducts()
  return c.json({ data })
})

// GET /api/products/:id — single product (public)
products.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const product = await getProductById(id)
  return c.json({ data: product })
})

// ─── Protected routes (manager+) ───────────────────────────

products.use('/', async (c, next) => {
  // POST requires manager+
  if (c.req.method === 'POST') {
    return requireManager()(c, next)
  }
  return next()
})

const createProductSchema = z.object({
  productCode: z.string().length(5).optional(),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  color: z.string().max(50).optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  moq: z.string().optional(),
  swatches: z.array(z.tuple([z.string(), z.string()])).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

const updateProductSchema = createProductSchema.partial()

// POST /api/products — create product (manager+)
products.post('/', async (c) => {
  const body = await c.req.json()
  const input = createProductSchema.parse(body)
  const product = await createProduct(input)
  return c.json({ data: product }, 201)
})

// PATCH /api/products/:id — update product (manager+)
products.patch('/:id', requireManager(), async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const input = updateProductSchema.parse(body)
  const product = await updateProduct(id, input)
  return c.json({ data: product })
})

// DELETE /api/products/:id — soft delete (admin only)
products.delete('/:id', requireAdmin(), async (c) => {
  const id = Number(c.req.param('id'))
  const product = await deleteProduct(id)
  return c.json({ data: product })
})

export default products
