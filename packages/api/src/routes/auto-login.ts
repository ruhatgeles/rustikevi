import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rate-limit.js'
import {
  createAutoLoginToken,
  autoLogin,
  getAutoLoginInfo,
  deleteAutoLoginToken,
} from '../services/auto-login.service.js'

const autoLoginRoutes = new Hono()

// POST /api/auto-login/generate — Otomatik giriş linki oluştur/yenile (admin)
autoLoginRoutes.post('/generate', requireAdmin(), rateLimit(10, 60_000), async (c) => {
  const body = await c.req.json()
  const schema = z.object({
    userId: z.string().uuid(),
  })

  const input = schema.parse(body)
  const result = await createAutoLoginToken(input.userId)

  return c.json({
    data: {
      url: result.url,
      token: result.token,
      expiresAt: result.expiresAt,
      useCount: result.useCount,
      maxUses: 1000,
    }
  })
})

// POST /api/auto-login/verify — Token ile giriş yap (public)
autoLoginRoutes.post('/verify', rateLimit(30, 60_000), async (c) => {
  const body = await c.req.json()
  const schema = z.object({
    token: z.string().min(1),
  })

  const input = schema.parse(body)
  const result = await autoLogin(input.token)

  return c.json({ data: result })
})

// GET /api/auto-login/info/:userId — Link bilgisini getir (admin)
autoLoginRoutes.get('/info/:userId', requireAdmin(), async (c) => {
  const userId = c.req.param('userId')
  const info = await getAutoLoginInfo(userId)
  return c.json({ data: info })
})

// DELETE /api/auto-login/:userId — Kullanıcının linkini sil (admin)
autoLoginRoutes.delete('/:userId', requireAdmin(), async (c) => {
  const userId = c.req.param('userId')
  await deleteAutoLoginToken(userId)
  return c.json({ data: { success: true } })
})

export default autoLoginRoutes
