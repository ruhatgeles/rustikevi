import { Hono } from 'hono'
import { z } from 'zod'
import { listUsers, createUser, updateUser, deactivateUser } from '../services/user.service.js'
import { requireAdmin } from '../middleware/auth.js'
import { validatePasswordOrThrow } from '../lib/password-policy.js'

const users = new Hono()

// All user routes require admin
users.use('*', requireAdmin())

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  inviteCode: z.string().optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  isActive: z.boolean().optional(),
  isLoginBlocked: z.boolean().optional(),
  isViewOnly: z.boolean().optional(),
})

// GET /api/users
users.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1)
  const limit = Number(c.req.query('limit') || 20)
  const search = c.req.query('search')

  const result = await listUsers(page, limit, search)
  return c.json({ data: result })
})

// POST /api/users
users.post('/', async (c) => {
  const body = await c.req.json()
  const input = createUserSchema.parse(body)
  validatePasswordOrThrow(input.password)
  const user = await createUser(input)
  return c.json({ data: user }, 201)
})

// PATCH /api/users/:id
users.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const input = updateUserSchema.parse(body)
  if (input.password) {
    validatePasswordOrThrow(input.password)
  }
  const user = await updateUser(id, input)
  return c.json({ data: user })
})

// DELETE /api/users/:id (soft delete)
users.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const user = await deactivateUser(id)
  return c.json({ data: user })
})

export default users
