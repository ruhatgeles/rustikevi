import { db } from '../db/index.js'
import { orders, orderItems, orderActivities, orderReturns, orderReturnItems, customers, products, users } from '../db/schema.js'
import { eq, and, sql, desc, asc, ilike, inArray } from 'drizzle-orm'
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
  // MAX kullan — count+1 yerine. Daha güvenli.
  const [result] = await db
    .select({ maxNum: sql<string>`COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0)` })
    .from(orders)
  const nextNum = (parseInt(result.maxNum, 10) || 0) + 1
  return `RVE-${String(nextNum).padStart(7, '0')}`
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
  pending: 'Sipariş Geldi',
  confirmed: 'Onaylandı',
  in_production: 'Üretimde',
  atelier: 'Atölyede',
  ready: 'Hazır',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
}

const ITEM_STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  in_production: 'Üretimde',
  atelier: 'Atölyede',
  ready: 'Hazır',
  shipped: 'Kargoda',
  delivered: 'Teslim Edildi',
  returned: 'İade',
  exchanged: 'Değişim',
}

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_production', 'cancelled'],
  in_production: ['atelier', 'ready', 'cancelled'],
  atelier: ['ready', 'cancelled'],
  ready: ['shipped', 'delivered'],
  shipped: ['delivered'],
  delivered: ['cancelled'], // iade durumunda iptal seçilebilir
  cancelled: [],
}

const VALID_ITEM_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'in_production', 'atelier'],
  confirmed: ['in_production', 'atelier'],
  in_production: ['ready', 'atelier'],
  atelier: ['ready'],
  ready: ['shipped', 'delivered'],
  shipped: ['delivered'],
  delivered: ['returned', 'exchanged'],
  returned: [],
  exchanged: [],
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

  // Sipariş durumu değiştiğinde tüm kalemleri otomatik güncelle
  const ORDER_TO_ITEM_STATUS: Record<string, string> = {
    pending: 'pending',
    confirmed: 'confirmed',
    in_production: 'in_production',
    atelier: 'atelier',
    ready: 'ready',
    shipped: 'shipped',
    delivered: 'delivered',
  }

  const newitemStatus = ORDER_TO_ITEM_STATUS[newStatus]
  if (newitemStatus) {
    // Sadece daha gerideki kalemleri güncelle
    const items = await db
      .select({ id: orderItems.id, itemStatus: orderItems.itemStatus })
      .from(orderItems)
      .where(eq(orderItems.orderId, id))

    const newProgress = ITEM_STATUS_PROGRESS[newitemStatus] ?? 0

    for (const item of items) {
      const currentProgress = ITEM_STATUS_PROGRESS[item.itemStatus] ?? 0
      // Sadece daha gerideki kalemleri ilerlet
      if (currentProgress < newProgress) {
        await db
          .update(orderItems)
          .set({ itemStatus: newitemStatus as any })
          .where(eq(orderItems.id, item.id))

        await addActivity(
          id,
          userId,
          'item_status_change',
          `${item.productName}: ${ITEM_STATUS_LABELS[item.itemStatus]} → ${ITEM_STATUS_LABELS[newitemStatus]}`,
          { itemId: item.id, oldStatus: item.itemStatus, newStatus: newitemStatus },
        )
      }
    }
  }

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

  // Sipariş durumunu otomatik hesapla
  const newOrderStatus = await calculateOrderStatus(orderId)
  const [currentOrder] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)

  if (currentOrder && currentOrder.status !== newOrderStatus) {
    await db
      .update(orders)
      .set({ status: newOrderStatus as any, updatedAt: new Date() })
      .where(eq(orders.id, orderId))

    await addActivity(
      orderId,
      userId,
      'status_change',
      `Sipariş durumu otomatik güncellendi: ${STATUS_LABELS[currentOrder.status]} → ${STATUS_LABELS[newOrderStatus]}`,
      { oldStatus: currentOrder.status, newStatus: newOrderStatus },
    )
  }

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

// ── Bulk Operations ──────────────────────────────────────

export async function bulkArchiveOrders(ids: string[], userId: string) {
  await db
    .update(orders)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(inArray(orders.id, ids))

  for (const id of ids) {
    await addActivity(id, userId, 'archived', 'Sipariş toplu olarak arşive kaldırıldı')
  }

  return { success: true, count: ids.length }
}

export async function bulkUnarchiveOrders(ids: string[], userId: string) {
  await db
    .update(orders)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(inArray(orders.id, ids))

  for (const id of ids) {
    await addActivity(id, userId, 'unarchived', 'Sipariş toplu olarak arşivden çıkarıldı')
  }

  return { success: true, count: ids.length }
}

export async function deleteOrder(id: string, userId: string) {
  const order = await getOrderById(id)

  // Arşivlenmiş siparişler silinebilir
  if (!order.isArchived) {
    throw new AppError(400, 'Sadece arşivlenmiş siparişler silinebilir')
  }

  // İlişkili kayıtları sil (sıra önemli - foreign key kısıtlamaları)
  // 1. order_return_items (order_items'a bağlı)
  const returnRecords = await db
    .select({ id: orderReturns.id })
    .from(orderReturns)
    .where(eq(orderReturns.orderId, id))

  if (returnRecords.length > 0) {
    const returnIds = returnRecords.map((r) => r.id)
    await db.delete(orderReturnItems).where(inArray(orderReturnItems.returnId, returnIds))
    await db.delete(orderReturns).where(eq(orderReturns.orderId, id))
  }

  // 2. order_activities
  await db.delete(orderActivities).where(eq(orderActivities.orderId, id))

  // 3. order_items
  await db.delete(orderItems).where(eq(orderItems.orderId, id))

  // 4. orders
  await db.delete(orders).where(eq(orders.id, id))

  return { success: true }
}

export async function bulkDeleteOrders(ids: string[], userId: string) {
  // Sadece arşivlenmiş siparişler silinebilir
  const ordersToDelete = await db
    .select({ id: orders.id, isArchived: orders.isArchived })
    .from(orders)
    .where(inArray(orders.id, ids))

  const archivedIds = ordersToDelete.filter((o) => o.isArchived).map((o) => o.id)

  if (archivedIds.length === 0) {
    throw new AppError(400, 'Silinecek arşivlenmiş sipariş bulunamadı')
  }

  // İlişkili kayıtları sil (sıra önemli - foreign key kısıtlamaları)
  // 1. order_return_items (order_items'a bağlı)
  const returnRecords = await db
    .select({ id: orderReturns.id })
    .from(orderReturns)
    .where(inArray(orderReturns.orderId, archivedIds))

  if (returnRecords.length > 0) {
    const returnIds = returnRecords.map((r) => r.id)
    await db.delete(orderReturnItems).where(inArray(orderReturnItems.returnId, returnIds))
    await db.delete(orderReturns).where(inArray(orderReturns.orderId, archivedIds))
  }

  // 2. order_activities
  await db.delete(orderActivities).where(inArray(orderActivities.orderId, archivedIds))

  // 3. order_items
  await db.delete(orderItems).where(inArray(orderItems.orderId, archivedIds))

  // 4. orders
  await db.delete(orders).where(inArray(orders.id, archivedIds))

  return { success: true, count: archivedIds.length }
}

// ── Order Status Calculation ─────────────────────────────

// Kalem durumlarının ilerleme sırası (en geriden en ileriye)
const ITEM_STATUS_PROGRESS: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  in_production: 2,
  atelier: 3,
  ready: 4,
  shipped: 5,
  delivered: 6,
  returned: 6,    // iade = teslim seviyesinde
  exchanged: 2,   // değişim = üretim seviyesinde
}

// Kalem durumunu sipariş durumuna çevir
const ITEM_TO_ORDER_STATUS: Record<string, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  in_production: 'in_production',
  atelier: 'atelier',
  ready: 'ready',
  shipped: 'shipped',
  delivered: 'delivered',
  returned: 'delivered',
  exchanged: 'in_production',
}

export async function calculateOrderStatus(orderId: string): Promise<string> {
  const items = await db
    .select({ itemStatus: orderItems.itemStatus })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  if (items.length === 0) return 'pending'

  const statuses = items.map((i) => i.itemStatus)

  // En gerideki kalem durumunu bul (en düşük progress değeri)
  let lowestStatus = statuses[0]
  let lowestProgress = ITEM_STATUS_PROGRESS[statuses[0]] ?? 0

  for (const status of statuses) {
    const progress = ITEM_STATUS_PROGRESS[status] ?? 0
    if (progress < lowestProgress) {
      lowestProgress = progress
      lowestStatus = status
    }
  }

  return ITEM_TO_ORDER_STATUS[lowestStatus] || 'pending'
}

// ── Return & Exchange ───────────────────────────────────

interface ReturnInput {
  items: Array<{ orderItemId: string; quantity: number; note?: string }>
  returnShippingCost?: number
  note?: string
}

export async function processReturn(orderId: string, input: ReturnInput, userId: string) {
  const order = await getOrderById(orderId)

  if (order.status !== 'delivered') {
    throw new AppError(400, 'Sadece teslim edilmiş siparişlerde iade yapılabilir')
  }

  // İade kaydı oluştur
  const [returnRecord] = await db
    .insert(orderReturns)
    .values({
      orderId,
      type: 'return',
      returnShippingCost: input.returnShippingCost || null,
      note: input.note,
    })
    .returning()

  // İade kalemlerini kaydet
  for (const item of input.items) {
    await db.insert(orderReturnItems).values({
      returnId: returnRecord.id,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      note: item.note,
    })

    // Kalem durumunu güncelle
    await db
      .update(orderItems)
      .set({ itemStatus: 'returned' })
      .where(eq(orderItems.id, item.orderItemId))
  }

  // Sipariş durumunu yeniden hesapla
  const newStatus = await calculateOrderStatus(orderId)
  await db
    .update(orders)
    .set({ status: newStatus as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  // Aktivite ekle
  await addActivity(
    orderId,
    userId,
    'return',
    `İade işlemi: ${input.items.length} ürün iade edildi${input.returnShippingCost ? `, kargo ücreti: ${input.returnShippingCost / 100} ₺` : ''}`,
    { returnId: returnRecord.id, itemCount: input.items.length },
  )

  return getOrderById(orderId)
}

interface ExchangeInput {
  oldItems: Array<{ orderItemId: string; quantity: number; note?: string }>
  newItems: Array<{ productName: string; quantity: number; unitPrice?: number; specifications?: string }>
  note?: string
}

export async function processExchange(orderId: string, input: ExchangeInput, userId: string) {
  const order = await getOrderById(orderId)

  if (order.status !== 'delivered') {
    throw new AppError(400, 'Sadece teslim edilmiş siparişlerde değişim yapılabilir')
  }

  // Değişim kaydı oluştur
  const [exchangeRecord] = await db
    .insert(orderReturns)
    .values({
      orderId,
      type: 'exchange',
      note: input.note,
    })
    .returning()

  // Eski kalemleri işaretle
  for (const item of input.oldItems) {
    await db.insert(orderReturnItems).values({
      returnId: exchangeRecord.id,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      note: item.note,
    })

    await db
      .update(orderItems)
      .set({
        itemStatus: 'exchanged',
        isExchanged: true,
        exchangeNote: input.note,
      })
      .where(eq(orderItems.id, item.orderItemId))
  }

  // Yeni kalemleri ekle
  for (const item of input.newItems) {
    await db.insert(orderItems).values({
      orderId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice || null,
      totalPrice: item.unitPrice ? item.unitPrice * item.quantity : null,
      itemStatus: 'in_production',
      specifications: item.specifications,
    })
  }

  // Sipariş durumunu yeniden hesapla
  const newStatus = await calculateOrderStatus(orderId)
  await db
    .update(orders)
    .set({ status: newStatus as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId))

  // Aktivite ekle
  await addActivity(
    orderId,
    userId,
    'exchange',
    `Değişim işlemi: ${input.oldItems.length} ürün değiştirildi, ${input.newItems.length} yeni ürün eklendi`,
    { exchangeId: exchangeRecord.id },
  )

  return getOrderById(orderId)
}

// ── Tracking Number ─────────────────────────────────────

export async function addTrackingNumber(orderId: string, trackingNumber: string, userId: string) {
  const [order] = await db
    .update(orders)
    .set({ trackingNumber, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning()

  if (!order) {
    throw new AppError(404, 'Order not found')
  }

  await addActivity(
    orderId,
    userId,
    'tracking_added',
    `Kargo takip numarası eklendi: ${trackingNumber}`,
    { trackingNumber },
  )

  return getOrderById(orderId)
}

export { STATUS_LABELS, ITEM_STATUS_LABELS, VALID_ORDER_TRANSITIONS, VALID_ITEM_TRANSITIONS }
