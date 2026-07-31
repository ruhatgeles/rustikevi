import { Hono } from 'hono'
import { z } from 'zod'
import { login, refresh, logout, getMe } from '../services/auth.service.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rate-limit.js'
import { bruteForceProtection, recordFailedAttempt, clearFailedAttempts } from '../middleware/brute-force.js'

const auth = new Hono()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

// POST /api/auth/login
auth.post('/login', rateLimit(10, 60_000), bruteForceProtection(), async (c) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  const body = await c.req.json()
  const { email, password } = loginSchema.parse(body)

  try {
    const result = await login(email, password)
    // Başarılı giriş — failed attempts temizle
    await clearFailedAttempts(ip, email)
    return c.json({ data: result })
  } catch (err) {
    // Başarısız giriş — failed attempts kaydet
    await recordFailedAttempt(ip, email)
    throw err
  }
})

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
  const body = await c.req.json()
  const { refreshToken } = refreshSchema.parse(body)
  const result = await refresh(refreshToken)
  return c.json({ data: result })
})

// POST /api/auth/logout
auth.post('/logout', requireAuth(), async (c) => {
  const user = c.get('user')
  await logout(user.sub)
  return c.json({ data: { success: true } })
})

// GET /api/auth/me
auth.get('/me', requireAuth(), async (c) => {
  const user = c.get('user')
  const me = await getMe(user.sub)
  return c.json({ data: me })
})

export default auth
