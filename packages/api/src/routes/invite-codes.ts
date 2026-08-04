import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/index.js'
import { inviteCodes } from '../db/schema.js'
import { eq, desc, and, gt, sql } from 'drizzle-orm'
import { requireAdmin } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import { nanoid } from 'nanoid'

const inviteCodesRoutes = new Hono()

// Verify invite code (public - for registration)
inviteCodesRoutes.post('/verify', async (c) => {
  const body = await c.req.json()
  const { code } = z.object({ code: z.string() }).parse(body)

  const [invite] = await db
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.code, code))
    .limit(1)

  if (!invite) {
    throw new AppError(404, 'Invalid invite code')
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new AppError(400, 'Invite code has expired')
  }

  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    throw new AppError(400, 'Invite code has been fully used')
  }

  return c.json({
    data: {
      valid: true,
      role: invite.role,
    },
  })
})

// All other routes require admin
inviteCodesRoutes.use('*', requireAdmin())

const createCodeSchema = z.object({
  role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

// GET /api/invite-codes
inviteCodesRoutes.get('/', async (c) => {
  const data = await db
    .select()
    .from(inviteCodes)
    .orderBy(desc(inviteCodes.createdAt))

  return c.json({ data })
})

// POST /api/invite-codes
inviteCodesRoutes.post('/', async (c) => {
  const body = await c.req.json()
  const input = createCodeSchema.parse(body)
  const user = c.get('user')

  const code = `RUSTIK-${nanoid(8).toUpperCase()}`

  const [invite] = await db
    .insert(inviteCodes)
    .values({
      code,
      role: input.role,
      maxUses: input.maxUses ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: user.sub,
    })
    .returning()

  return c.json({ data: invite }, 201)
})

// DELETE /api/invite-codes/:id
inviteCodesRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const [deleted] = await db
    .delete(inviteCodes)
    .where(eq(inviteCodes.id, id))
    .returning({ id: inviteCodes.id })

  if (!deleted) {
    throw new AppError(404, 'Invite code not found')
  }

  return c.json({ data: deleted })
})

export default inviteCodesRoutes
