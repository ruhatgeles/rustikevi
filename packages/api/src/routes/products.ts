import { Hono } from 'hono'
import { z } from 'zod'
import {
  listProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/product.service.js'
import { requireManager, requireAdmin } from '../middleware/auth.js'

const products = new Hono()

// ─── Public routes ──────────────────────────────────────────

// GET /api/products — list active products (public)
products.get('/', async (c) => {
  const category = c.req.query('category')
  const featured = c.req.query('featured')

  const filters: { category?: string; featured?: boolean } = {}
  if (category) filters.category = category
  if (featured === 'true') filters.featured = true

  const data = await listProducts(filters)
  return c.json({ data })
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
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
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
