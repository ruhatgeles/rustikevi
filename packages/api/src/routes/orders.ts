import { Hono } from 'hono'
import { z } from 'zod'
import {
  listOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrder,
  updateItemStatus,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  archiveOrder,
  unarchiveOrder,
  bulkArchiveOrders,
  bulkUnarchiveOrders,
  deleteOrder,
  bulkDeleteOrders,
  getOrderStats,
  processReturn,
  processExchange,
  addTrackingNumber,
  VALID_ORDER_TRANSITIONS,
  VALID_ITEM_TRANSITIONS,
  STATUS_LABELS,
  ITEM_STATUS_LABELS,
} from '../services/order.service.js'
import { requireAuth, requireManager, requireAdmin } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rate-limit.js'

const ordersRoutes = new Hono()

// ── Public: Sipariş talebi oluştur (form) ───────────────

const publicOrderSchema = z.object({
  isletme: z.string().min(1),
  yetkili: z.string().min(1),
  telefon: z.string().min(10),
  sehir: z.string().optional(),
  urun: z.string().min(1),
  adet: z.string().optional(),
  mesaj: z.string().optional(),
})

ordersRoutes.post('/inquiry', rateLimit(20, 60_000), async (c) => {
  const body = await c.req.json()
  const input = publicOrderSchema.parse(body)

  const { db } = await import('../db/index.js')
  const { customers: customersTable } = await import('../db/schema.js')
  const { eq } = await import('drizzle-orm')

  const [existing] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.phone, input.telefon))
    .limit(1)

  let customerId: string

  if (existing) {
    // Güvenlik: Mevcut müşterinin adını/değerini değiştirmiyoruz
    // Sadece şehir bilgisi güncellenebilir
    await db
      .update(customersTable)
      .set({
        city: input.sehir || existing.city,
        updatedAt: new Date(),
      })
      .where(eq(customersTable.id, existing.id))
    customerId = existing.id
  } else {
    const [newCustomer] = await db
      .insert(customersTable)
      .values({
        businessName: input.isletme,
        contactName: input.yetkili,
        phone: input.telefon,
        city: input.sehir,
      })
      .returning()
    customerId = newCustomer.id
  }

  const order = await createOrder(
    {
      customerId,
      items: [
        {
          productName: input.urun,
          quantity: parseInt(input.adet || '1', 10) || 1,
        },
      ],
      notes: input.mesaj,
      source: 'whatsapp',
    },
    null,
  )

  return c.json(
    {
      data: {
        success: true,
        message: 'Sipariş talebiniz kaydedildi',
        orderNumber: order.orderNumber,
      },
    },
    201,
  )
})

// ── Protected routes ────────────────────────────────────

ordersRoutes.use('*', requireAuth())

// GET /api/orders — list orders
ordersRoutes.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1)
  const limit = Number(c.req.query('limit') || 20)
  const status = c.req.query('status')
  const customerId = c.req.query('customerId')
  const assignedTo = c.req.query('assignedTo')
  const search = c.req.query('search')
  const archived = c.req.query('archived') === 'true'

  const result = await listOrders({ status, customerId, assignedTo, search, archived, page, limit })
  return c.json({ data: result })
})

// GET /api/orders/stats — dashboard stats
ordersRoutes.get('/stats', async (c) => {
  const stats = await getOrderStats()
  return c.json({ data: stats })
})

// GET /api/orders/meta — status transitions and labels
ordersRoutes.get('/meta', async (c) => {
  return c.json({
    data: {
      orderTransitions: VALID_ORDER_TRANSITIONS,
      itemTransitions: VALID_ITEM_TRANSITIONS,
      orderLabels: STATUS_LABELS,
      itemLabels: ITEM_STATUS_LABELS,
    },
  })
})

// ── Bulk routes (MUST be before :id routes) ────────────

// POST /api/orders/bulk/archive — bulk archive (manager+)
ordersRoutes.post('/bulk/archive', requireManager(), async (c) => {
  const body = await c.req.json()
  const user = c.get('user')

  const bulkSchema = z.object({
    ids: z.array(z.string().uuid()).min(1),
  })

  const input = bulkSchema.parse(body)
  const result = await bulkArchiveOrders(input.ids, user.sub)
  return c.json({ data: result })
})

// POST /api/orders/bulk/unarchive — bulk unarchive (manager+)
ordersRoutes.post('/bulk/unarchive', requireManager(), async (c) => {
  const body = await c.req.json()
  const user = c.get('user')

  const bulkSchema = z.object({
    ids: z.array(z.string().uuid()).min(1),
  })

  const input = bulkSchema.parse(body)
  const result = await bulkUnarchiveOrders(input.ids, user.sub)
  return c.json({ data: result })
})

// POST /api/orders/bulk/delete — bulk delete archived orders (admin)
ordersRoutes.post('/bulk/delete', requireAdmin(), async (c) => {
  const body = await c.req.json()
  const user = c.get('user')

  const bulkSchema = z.object({
    ids: z.array(z.string().uuid()).min(1),
  })

  const input = bulkSchema.parse(body)
  const result = await bulkDeleteOrders(input.ids, user.sub)
  return c.json({ data: result })
})

// ── Single order routes (AFTER bulk routes) ─────────────

// GET /api/orders/:id — single order with items and activities
ordersRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const order = await getOrderById(id)
  return c.json({ data: order })
})

// POST /api/orders — create order (manager+)
ordersRoutes.post('/', requireManager(), async (c) => {
  const body = await c.req.json()
  const user = c.get('user')

  const createSchema = z.object({
    customerId: z.string().uuid(),
    items: z.array(
      z.object({
        productId: z.number().optional(),
        productName: z.string().min(1),
        quantity: z.number().min(1),
        unitPrice: z.number().optional(),
        specifications: z.string().optional(),
      }),
    ),
    notes: z.string().optional(),
    source: z.string().optional(),
    assignedTo: z.string().uuid().optional(),
  })

  const input = createSchema.parse(body)
  const order = await createOrder(input, user.sub)
  return c.json({ data: order }, 201)
})

// PATCH /api/orders/:id/status — update status (manager+)
ordersRoutes.patch('/:id/status', requireManager(), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const user = c.get('user')

  const statusSchema = z.object({
    status: z.enum([
      'pending',
      'confirmed',
      'in_production',
      'atelier',
      'ready',
      'shipped',
      'delivered',
      'cancelled',
    ]),
    note: z.string().optional(),
  })

  const input = statusSchema.parse(body)
  const order = await updateOrderStatus(id, input.status, user.sub, input.note)
  return c.json({ data: order })
})

// PATCH /api/orders/:id/items/:itemId/status — update item status (manager+)
ordersRoutes.patch('/:id/items/:itemId/status', requireManager(), async (c) => {
  const orderId = c.req.param('id')
  const itemId = c.req.param('itemId')
  const body = await c.req.json()
  const user = c.get('user')

  const itemStatusSchema = z.object({
    status: z.enum([
      'pending',
      'confirmed',
      'in_production',
      'atelier',
      'ready',
      'shipped',
      'delivered',
      'returned',
      'exchanged',
    ]),
  })

  const input = itemStatusSchema.parse(body)
  const order = await updateItemStatus(orderId, itemId, input.status, user.sub)
  return c.json({ data: order })
})

// PATCH /api/orders/:id — update order fields (manager+)
ordersRoutes.patch('/:id', requireManager(), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const user = c.get('user')

  const updateSchema = z.object({
    notes: z.string().optional(),
    internalNotes: z.string().optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    totalAmount: z.number().nullable().optional(),
  })

  const input = updateSchema.parse(body)
  const order = await updateOrder(id, input, user.sub)
  return c.json({ data: order })
})

// POST /api/orders/:id/archive — archive order (manager+)
ordersRoutes.post('/:id/archive', requireManager(), async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const order = await archiveOrder(id, user.sub)
  return c.json({ data: order })
})

// POST /api/orders/:id/unarchive — unarchive order (manager+)
ordersRoutes.post('/:id/unarchive', requireManager(), async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const order = await unarchiveOrder(id, user.sub)
  return c.json({ data: order })
})

// POST /api/orders/:id/items — add item to order (manager+)
ordersRoutes.post('/:id/items', requireManager(), async (c) => {
  const orderId = c.req.param('id')
  const body = await c.req.json()
  const user = c.get('user')

  const itemSchema = z.object({
    productId: z.number().optional(),
    productName: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().optional(),
    specifications: z.string().optional(),
  })

  const input = itemSchema.parse(body)
  const order = await addOrderItem(orderId, input, user.sub)
  return c.json({ data: order })
})

// PATCH /api/orders/:id/items/:itemId — update item (manager+)
ordersRoutes.patch('/:id/items/:itemId', requireManager(), async (c) => {
  const orderId = c.req.param('id')
  const itemId = c.req.param('itemId')
  const body = await c.req.json()
  const user = c.get('user')

  const updateItemSchema = z.object({
    quantity: z.number().min(1).optional(),
    unitPrice: z.number().nullable().optional(),
    specifications: z.string().optional(),
  })

  const input = updateItemSchema.parse(body)
  const order = await updateOrderItem(orderId, itemId, input, user.sub)
  return c.json({ data: order })
})

// DELETE /api/orders/:id/items/:itemId — remove item (manager+)
ordersRoutes.delete('/:id/items/:itemId', requireManager(), async (c) => {
  const orderId = c.req.param('id')
  const itemId = c.req.param('itemId')
  const user = c.get('user')

  const order = await removeOrderItem(orderId, itemId, user.sub)
  return c.json({ data: order })
})

// PATCH /api/orders/:id/tracking — add tracking number (manager+)
ordersRoutes.patch('/:id/tracking', requireManager(), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const user = c.get('user')

  const trackingSchema = z.object({
    trackingNumber: z.string().min(1),
  })

  const input = trackingSchema.parse(body)
  const order = await addTrackingNumber(id, input.trackingNumber, user.sub)
  return c.json({ data: order })
})

// POST /api/orders/:id/return — process return (manager+)
ordersRoutes.post('/:id/return', requireManager(), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const user = c.get('user')

  const returnSchema = z.object({
    items: z.array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().min(1),
        note: z.string().optional(),
      }),
    ).min(1),
    returnShippingCost: z.number().optional(),
    note: z.string().optional(),
  })

  const input = returnSchema.parse(body)
  const order = await processReturn(id, input, user.sub)
  return c.json({ data: order })
})

// POST /api/orders/:id/exchange — process exchange (manager+)
ordersRoutes.post('/:id/exchange', requireManager(), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const user = c.get('user')

  const exchangeSchema = z.object({
    oldItems: z.array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().min(1),
        note: z.string().optional(),
      }),
    ).min(1),
    newItems: z.array(
      z.object({
        productName: z.string().min(1),
        quantity: z.number().min(1),
        unitPrice: z.number().optional(),
        specifications: z.string().optional(),
      }),
    ).min(1),
    note: z.string().optional(),
  })

  const input = exchangeSchema.parse(body)
  const order = await processExchange(id, input, user.sub)
  return c.json({ data: order })
})

// DELETE /api/orders/:id — delete archived order (admin)
ordersRoutes.delete('/:id', requireAdmin(), async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')
  const result = await deleteOrder(id, user.sub)
  return c.json({ data: result })
})

export default ordersRoutes
