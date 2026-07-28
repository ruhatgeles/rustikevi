import { db } from '../db/index.js'
import { orders, orderItems, orderActivities, customers, products, users } from '../db/schema.js'
import { eq, and, sql, desc, asc, ilike } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

// ── Types ───────────────────────────────────────────────

interface CreateOrderInput {
  customerId: string
  items: Array<{
    productId?: number
    productName: string
    quantity: number
    unitPrice?: number
    specifications?: string
  }>
  notes?: string
  source?: string
  assignedTo?: string
}

interface UpdateOrderInput {
  notes?: string
  internalNotes?: string
  assignedTo?: string
  totalAmount?: number
}

// ── Helpers ─────────────────────────────────────────────

async function generateOrderNumber(): Promise<string> {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
  const count = countResult.count + 1
  return `RVE-${String(count).padStart(5, '0')}`
}

async function addActivity(
  orderId: string,
  userId: string | null,
  type: string,
  description: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(orderActivities).values({
    orderId,
    userId,
    type,
    description,
    metadata: metadata || {},
  })
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  quoted: 'Teklif Verildi',
  confirmed: 'Onaylandı',
  in_production: 'Üretimde',
  shipped: 'Kargoya Verildi',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
  returned: 'İade Edildi',
}

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  in_stock: 'Stokta',
  out_of_stock: 'Stok Yok',
  in_production: 'Üretimde',
  ready: 'Hazır',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  returned: 'İade',
}

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['quoted', 'confirmed', 'cancelled'],
  quoted: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
}

const VALID_ITEM_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_stock', 'out_of_stock', 'in_production', 'ready'],
  in_stock: ['ready', 'shipped'],
  out_of_stock: ['in_production', 'ready'],
  in_production: ['ready', 'out_of_stock'],
  ready: ['shipped'],
  shipped: ['delivered'],
  delivered: ['returned'],
  returned: [],
}

// ── Service Functions ───────────────────────────────────

export async function listOrders(filters?: {
  status?: string
  customerId?: string
  assignedTo?: string
  search?: string
  archived?: boolean
  page?: number
  limit?: number
}) {
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const offset = (page - 1) * limit

  const conditions = []

  // Default: don't show archived
  if (filters?.archived !== undefined) {
    conditions.push(eq(orders.isArchived, filters.archived))
  } else {
    conditions.push(eq(orders.isArchived, false))
  }

  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status as any))
  }

  if (filters?.customerId) {
    conditions.push(eq(orders.customerId, filters.customerId))
  }

  if (filters?.assignedTo) {
    conditions.push(eq(orders.assignedTo, filters.assignedTo))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(where)

  const data = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerId: orders.customerId,
      status: orders.status,
      totalAmount: orders.totalAmount,
      currency: orders.currency,
      notes: orders.notes,
      source: orders.source,
      isArchived: orders.isArchived,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      customerName: customers.businessName,
      customerPhone: customers.phone,
      customerCity: customers.city,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    data,
    total: countResult.count,
    page,
    limit,
    totalPages: Math.ceil(countResult.count / limit),
  }
}

export async function getOrderById(id: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)

  if (!order) {
    throw new AppError(404, 'Order not found')
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))

  const activities = await db
    .select({
      id: orderActivities.id,
      type: orderActivities.type,
      description: orderActivities.description,
      metadata: orderActivities.metadata,
      createdAt: orderActivities.createdAt,
      userName: users.name,
    })
    .from(orderActivities)
    .leftJoin(users, eq(orderActivities.userId, users.id))
    .where(eq(orderActivities.orderId, id))
    .orderBy(desc(orderActivities.createdAt))

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
    .limit(1)

  return { ...order, items, activities, customer }
}

export async function createOrder(input: CreateOrderInput, userId: string | null) {
  const orderNumber = await generateOrderNumber()

  // Calculate total
  let totalAmount = 0
  for (const item of input.items) {
    if (item.unitPrice) {
      totalAmount += item.unitPrice * item.quantity
    }
  }

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      customerId: input.customerId,
      status: 'pending',
      totalAmount: totalAmount > 0 ? totalAmount : null,
      notes: input.notes,
      source: input.source || 'whatsapp',
      assignedTo: input.assignedTo,
    })
    .returning()

  // Insert items
  for (const item of input.items) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice || null,
      totalPrice: item.unitPrice ? item.unitPrice * item.quantity : null,
      specifications: item.specifications,
    })
  }

  // Add activity
  await addActivity(
    order.id,
    userId,
    'created',
    `Sipariş oluşturuldu (${orderNumber})`,
    { source: input.source || 'whatsapp' },
  )

  return getOrderById(order.id)
}

export async function updateOrderStatus(
  id: string,
  newStatus: string,
  userId: string,
  note?: string,
) {
  const order = await getOrderById(id)
  const oldStatus = order.status

  if (oldStatus === newStatus) {
    return order
  }

  // Validate status transition
  if (!VALID_ORDER_TRANSITIONS[oldStatus]?.includes(newStatus)) {
    throw new AppError(
      400,
      `Geçersiz durum geçişi: ${oldStatus} → ${newStatus}`,
    )
  }

  await db
    .update(orders)
    .set({ status: newStatus as any, updatedAt: new Date() })
    .where(eq(orders.id, id))

  // Add status change activity
  await addActivity(
    id,
    userId,
    'status_change',
    `Durum: ${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[newStatus]}`,
    { oldStatus, newStatus },
  )

  // Add note as separate activity if provided
  if (note?.trim()) {
    await addActivity(id, userId, 'note_added', note.trim())
  }

  return getOrderById(id)
}

export async function updateOrder(id: string, input: UpdateOrderInput, userId: string) {
  const [order] = await db
    .update(orders)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning()

  if (!order) {
    throw new AppError(404, 'Order not found')
  }

  if (input.internalNotes) {
    await addActivity(id, userId, 'note_added', input.internalNotes)
  }

  return getOrderById(id)
}

export async function archiveOrder(id: string, userId: string) {
  const [order] = await db
    .update(orders)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning()

  if (!order) {
    throw new AppError(404, 'Order not found')
  }

  await addActivity(id, userId, 'archived', 'Sipariş arşive kaldırıldı')

  return getOrderById(id)
}

export async function unarchiveOrder(id: string, userId: string) {
  const [order] = await db
    .update(orders)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning()

  if (!order) {
    throw new AppError(404, 'Order not found')
  }

  await addActivity(id, userId, 'unarchived', 'Sipariş arşivden çıkarıldı')

  return getOrderById(id)
}

export async function updateItemStatus(
  orderId: string,
  itemId: string,
  newStatus: string,
  userId: string,
) {
  const [item] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
    .limit(1)

  if (!item) {
    throw new AppError(404, 'Order item not found')
  }

  const oldStatus = item.itemStatus

  if (oldStatus === newStatus) {
    return getOrderById(orderId)
  }

  // Validate item status transition
  if (!VALID_ITEM_TRANSITIONS[oldStatus]?.includes(newStatus)) {
    throw new AppError(
      400,
      `Geçersiz ürün durum geçişi: ${oldStatus} → ${newStatus}`,
    )
  }

  await db
    .update(orderItems)
    .set({ itemStatus: newStatus as any })
    .where(eq(orderItems.id, itemId))

  await addActivity(
    orderId,
    userId,
    'item_status_change',
    `${item.productName}: ${ITEM_STATUS_LABELS[oldStatus]} → ${ITEM_STATUS_LABELS[newStatus]}`,
    { itemId, oldStatus, newStatus, productName: item.productName },
  )

  return getOrderById(orderId)
}

export async function addOrderItem(
  orderId: string,
  item: {
    productId?: number
    productName: string
    quantity: number
    unitPrice?: number
    specifications?: string
  },
  userId: string,
) {
  await db.insert(orderItems).values({
    orderId,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice || null,
    totalPrice: item.unitPrice ? item.unitPrice * item.quantity : null,
    specifications: item.specifications,
  })

  // Recalculate total
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  const totalAmount = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0)

  await db
    .update(orders)
    .set({ totalAmount: totalAmount > 0 ? totalAmount : null, updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  await addActivity(
    orderId,
    userId,
    'item_added',
    `Ürün eklendi: ${item.productName} (${item.quantity} adet)`,
  )

  return getOrderById(orderId)
}

export async function removeOrderItem(orderId: string, itemId: string, userId: string) {
  const [item] = await db
    .delete(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
    .returning()

  if (!item) {
    throw new AppError(404, 'Order item not found')
  }

  // Recalculate total
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  const totalAmount = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0)

  await db
    .update(orders)
    .set({ totalAmount: totalAmount > 0 ? totalAmount : null, updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  await addActivity(
    orderId,
    userId,
    'item_removed',
    `Ürün çıkarıldı: ${item.productName}`,
  )

  return getOrderById(orderId)
}

export async function getOrderStats() {
  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.isArchived, false))

  const byStatus = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)`,
    })
    .from(orders)
    .where(eq(orders.isArchived, false))
    .groupBy(orders.status)

  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      customerName: customers.businessName,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.isArchived, false))
    .orderBy(desc(orders.createdAt))
    .limit(5)

  return {
    total: total.count,
    byStatus: byStatus.reduce(
      (acc, s) => ({ ...acc, [s.status]: s.count }),
      {} as Record<string, number>,
    ),
    recentOrders,
  }
}

export { STATUS_LABELS, ITEM_STATUS_LABELS, VALID_ORDER_TRANSITIONS, VALID_ITEM_TRANSITIONS }
