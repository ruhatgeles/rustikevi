import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rate-limit.js'
import {
  createAutoLoginToken,
  autoLogin,
  deleteAutoLoginToken,
} from '../services/auto-login.service.js'

const autoLoginRoutes = new Hono()

// POST /api/auto-login/generate — Otomatik giriş linki oluştur (admin)
autoLoginRoutes.post('/generate', requireAdmin(), rateLimit(10, 60_000), async (c) => {
  const body = await c.req.json()
  const schema = z.object({
    userId: z.string().uuid(),
  })

  const input = schema.parse(body)
  const result = await createAutoLoginToken(input.userId)

  // Tam URL oluştur
  const baseUrl = process.env.ADMIN_URL || 'http://localhost:3002'
  const loginUrl = `${baseUrl}/auto-login/${result.token}`

  return c.json({
    data: {
      url: loginUrl,
      token: result.token,
      expiresAt: result.expiresAt,
    }
  })
})

// POST /api/auto-login/verify — Token ile giriş yap (public)
autoLoginRoutes.post('/verify', rateLimit(20, 60_000), async (c) => {
  const body = await c.req.json()
  const schema = z.object({
    token: z.string().min(1),
  })

  const input = schema.parse(body)
  const result = await autoLogin(input.token)

  return c.json({ data: result })
})

// DELETE /api/auto-login/:userId — Kullanıcının linkini sil (admin)
autoLoginRoutes.delete('/:userId', requireAdmin(), async (c) => {
  const userId = c.req.param('userId')
  await deleteAutoLoginToken(userId)
  return c.json({ data: { success: true } })
})

export default autoLoginRoutes
