import { Hono } from 'hono'
import { z } from 'zod'
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  archiveCustomer,
  unarchiveCustomer,
  bulkArchiveCustomers,
  bulkUnarchiveCustomers,
  bulkDeleteCustomers,
} from '../services/customer.service.js'
import { requireManager, requireAdmin } from '../middleware/auth.js'

const customers = new Hono()

// All customer routes require manager+
customers.use('*', requireManager())

const createCustomerSchema = z.object({
  businessName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(100),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional(),
  city: z.string().max(100).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const updateCustomerSchema = createCustomerSchema.partial()

// GET /api/customers
customers.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1)
  const limit = Number(c.req.query('limit') || 20)
  const search = c.req.query('search')
  const city = c.req.query('city')
  const tag = c.req.query('tag')
  const sortBy = c.req.query('sortBy') || 'createdAt'
  const sortOrder = (c.req.query('sortOrder') || 'desc') as 'asc' | 'desc'
  const archived = c.req.query('archived') === 'true'

  const result = await listCustomers(page, limit, search, city, tag, sortBy, sortOrder, archived)
  return c.json({ data: result })
})

// ── Bulk routes (MUST be before :id routes) ────────────

// POST /api/customers/bulk/archive
customers.post('/bulk/archive', async (c) => {
  const body = await c.req.json()
  const bulkSchema = z.object({ ids: z.array(z.string().uuid()).min(1) })
  const input = bulkSchema.parse(body)
  const result = await bulkArchiveCustomers(input.ids)
  return c.json({ data: result })
})

// POST /api/customers/bulk/unarchive
customers.post('/bulk/unarchive', async (c) => {
  const body = await c.req.json()
  const bulkSchema = z.object({ ids: z.array(z.string().uuid()).min(1) })
  const input = bulkSchema.parse(body)
  const result = await bulkUnarchiveCustomers(input.ids)
  return c.json({ data: result })
})

// POST /api/customers/bulk/delete (admin only)
customers.post('/bulk/delete', requireAdmin(), async (c) => {
  const body = await c.req.json()
  const bulkSchema = z.object({ ids: z.array(z.string().uuid()).min(1) })
  const input = bulkSchema.parse(body)
  const result = await bulkDeleteCustomers(input.ids)
  return c.json({ data: result })
})

// ── Single customer routes ──────────────────────────────

// GET /api/customers/:id
customers.get('/:id', async (c) => {
  const id = c.req.param('id')
  const customer = await getCustomer(id)
  return c.json({ data: customer })
})

// POST /api/customers
customers.post('/', async (c) => {
  const body = await c.req.json()
  const input = createCustomerSchema.parse(body)
  const user = c.get('user')
  const customer = await createCustomer(input, user.sub)
  return c.json({ data: customer }, 201)
})

// PATCH /api/customers/:id
customers.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const input = updateCustomerSchema.parse(body)
  const customer = await updateCustomer(id, input)
  return c.json({ data: customer })
})

// DELETE /api/customers/:id (admin only)
customers.delete('/:id', requireAdmin(), async (c) => {
  const id = c.req.param('id')
  const customer = await deleteCustomer(id)
  return c.json({ data: customer })
})

// POST /api/customers/:id/archive
customers.post('/:id/archive', async (c) => {
  const id = c.req.param('id')
  const customer = await archiveCustomer(id)
  return c.json({ data: customer })
})

// POST /api/customers/:id/unarchive
customers.post('/:id/unarchive', async (c) => {
  const id = c.req.param('id')
  const customer = await unarchiveCustomer(id)
  return c.json({ data: customer })
})

export default customers
