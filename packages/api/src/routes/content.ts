import { Hono } from 'hono'
import { z } from 'zod'
import {
  getContentBySlug,
  listContent,
  upsertContent,
  deleteContent,
} from '../services/content.service.js'
import { requireManager, requireAuth } from '../middleware/auth.js'

const content = new Hono()

const upsertSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().optional(),
  type: z.enum(['text', 'json', 'image']).optional(),
  metadata: z.record(z.unknown()).optional(),
})

// GET /api/content (public - for frontend)
content.get('/public/:slug', async (c) => {
  const slug = c.req.param('slug')
  const data = await getContentBySlug(slug)
  return c.json({ data })
})

// GET /api/content (list all - authenticated)
content.get('/', requireAuth(), async (c) => {
  const data = await listContent()
  return c.json({ data })
})

// GET /api/content/:slug (authenticated)
content.get('/:slug', requireAuth(), async (c) => {
  const slug = c.req.param('slug')
  const data = await getContentBySlug(slug)
  return c.json({ data })
})

// PUT /api/content/:slug (manager+)
content.put('/:slug', requireManager(), async (c) => {
  const slug = c.req.param('slug')
  const body = await c.req.json()
  const input = upsertSchema.parse(body)
  const user = c.get('user')
  const data = await upsertContent(slug, input, user.sub)
  return c.json({ data })
})

// DELETE /api/content/:slug (manager+)
content.delete('/:slug', requireManager(), async (c) => {
  const slug = c.req.param('slug')
  const data = await deleteContent(slug)
  return c.json({ data })
})

export default content
