import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './lib/errors.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import customerRoutes from './routes/customers.js'
import contentRoutes from './routes/content.js'
import inviteCodeRoutes from './routes/invite-codes.js'
import orderRoutes from './routes/orders.js'
import productRoutes from './routes/products.js'

const app = new Hono()

// Global middleware
app.use('*', logger())
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
app.get('/api/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() })
)

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/users', userRoutes)
app.route('/api/customers', customerRoutes)
app.route('/api/content', contentRoutes)
app.route('/api/invite-codes', inviteCodeRoutes)
app.route('/api/orders', orderRoutes)
app.route('/api/products', productRoutes)

// Error handler
app.onError(errorHandler)

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = Number(process.env.API_PORT || 3001)
const host = process.env.API_HOST || '0.0.0.0'

serve({ fetch: app.fetch, port, host }, (info) => {
  console.log(`🚀 Rustik Evi API running on http://${host}:${info.port}`)
})
