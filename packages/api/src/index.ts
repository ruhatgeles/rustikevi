import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { secureHeaders } from 'hono/secure-headers'
import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './lib/errors.js'
import { logger as pinoLogger } from './lib/logger.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import customerRoutes from './routes/customers.js'
import contentRoutes from './routes/content.js'
import inviteCodeRoutes from './routes/invite-codes.js'
import orderRoutes from './routes/orders.js'
import productRoutes from './routes/products.js'
import uploadRoutes from './routes/upload.js'
import healthRoutes from './routes/health.js'
import autoLoginRoutes from './routes/auto-login.js'
import { openApiSpec } from './openapi.js'
import { getClientIp } from './lib/client-ip.js'

const app = new Hono()

// Security headers (Hono built-in)
app.use('*', secureHeaders())

// Request ID
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)
  await next()
})

// Request logging
app.use('*', async (c, next) => {
  const start = Date.now()
  const requestId = c.get('requestId')
  const reqLogger = pinoLogger.child({ requestId })

  reqLogger.info({
    method: c.req.method,
    url: c.req.url,
    userAgent: c.req.header('user-agent'),
    ip: getClientIp(c),
  }, 'Request started')

  await next()

  const duration = Date.now() - start
  reqLogger.info({
    method: c.req.method,
    url: c.req.url,
    status: c.res.status,
    duration: `${duration}ms`,
  }, 'Request completed')
})

// Global middleware
app.use('*', corsMiddleware())

// Root - API info
app.get('/', (c) =>
  c.json({
    name: 'Rustik Evi API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      customers: '/api/customers',
      content: '/api/content',
      inviteCodes: '/api/invite-codes',
      orders: '/api/orders',
      products: '/api/products',
    },
  })
)

// Health check
app.route('/api/health', healthRoutes)

// API Documentation
app.get('/api/docs', (c) => c.json(openApiSpec))

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/auto-login', autoLoginRoutes)
app.route('/api/users', userRoutes)
app.route('/api/customers', customerRoutes)
app.route('/api/content', contentRoutes)
app.route('/api/invite-codes', inviteCodeRoutes)
app.route('/api/orders', orderRoutes)
app.route('/api/products', productRoutes)
app.route('/api/upload', uploadRoutes)

// Static file serving for uploads
// Dosya adları benzersiz (yeniden yazılmaz) — uzun süre önbelleklenebilir
app.use('/uploads/*', async (c, next) => {
  await next()
  if (c.res.status === 200) c.header('Cache-Control', 'public, max-age=2592000, immutable')
})
app.use('/uploads/*', serveStatic({ root: './', index: '' }))

// Error handler
app.onError(errorHandler)

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = Number(process.env.API_PORT || 3001)
const host = process.env.API_HOST || '0.0.0.0'

const server = serve({ fetch: app.fetch, port, hostname: host }, (info) => {
  console.log(`🚀 Rustik Evi API running on http://${host}:${info.port}`)
})

// Graceful shutdown: Docker SIGTERM gönderdiğinde açık istekleri bitir
function shutdown(signal: string) {
  console.log(`${signal} alındı, API kapatılıyor...`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
