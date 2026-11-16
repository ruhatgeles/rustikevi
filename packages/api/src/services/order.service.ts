import { db } from '../db/index.js'
import { orders, orderItems, orderActivities, orderReturns, orderReturnItems, customers, products, users } from '../db/schema.js'
import { eq, and, ne, sql, desc, asc, inArray, notInArray } from 'drizzle-orm'
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
  assignedTo?: string | null
  totalAmount?: number | null
}

// ── Helpers ─────────────────────────────────────────────

async function generateOrderNumber(): Promise<string> {
  // Postgres sequence: eşzamanlı siparişlerde bile benzersiz (bkz. migration 0003)
  const [result] = await db.execute<{ n: string }>(sql`SELECT nextval('order_number_seq')::text AS n`)
  return `RVE-${String(result.n).padStart(7, '0')}`
}

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// İade/değişim kalemleri nihai durumdadır: sipariş düzeyindeki geçişler onlara dokunmaz,
// sipariş durumu ve toplamı hesaplanırken dikkate alınmaz.
const TERMINAL_ITEM_STATUSES = ['returned', 'exchanged'] as const
type TerminalItemStatus = (typeof TERMINAL_ITEM_STATUSES)[number]

function isTerminalItemStatus(status: string): boolean {
  return (TERMINAL_ITEM_STATUSES as readonly string[]).includes(status)
}

// Sipariş toplamı = iade/değişim dışındaki kalemlerin toplamı (kuruş)
async function recalculateOrderTotal(orderId: string, executor: DbExecutor = db) {
  const [row] = await executor
    .select({ total: sql<number>`coalesce(sum(${orderItems.totalPrice}), 0)::int` })
    .from(orderItems)
    .where(and(
      eq(orderItems.orderId, orderId),
      notInArray(orderItems.itemStatus, [...TERMINAL_ITEM_STATUSES]),
    ))

  const totalAmount = row?.total ?? 0
  await executor
    .update(orders)
    .set({ totalAmount: totalAmount > 0 ? totalAmount : null, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
}

async function addActivity(
  orderId: string,
  userId: string | null,
  type: string,
  description: string,
  metadata?: Record<string, unknown>,
  executor: DbExecutor = db,
) {
  await executor.insert(orderActivities).values({
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
  confirmed: ['pending', 'atelier', 'in_production', 'cancelled'],
  atelier: ['confirmed', 'in_production', 'ready', 'cancelled'],
  in_production: ['confirmed', 'atelier', 'ready', 'cancelled'],
  ready: ['atelier', 'in_production', 'shipped', 'delivered'],
  shipped: ['ready', 'delivered'],
  delivered: ['ready', 'shipped'],
  cancelled: [],
}

const VALID_ITEM_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'atelier', 'in_production', 'cancelled'],
  confirmed: ['pending', 'atelier', 'in_production', 'cancelled'],
  atelier: ['confirmed', 'in_production', 'ready', 'cancelled'],
  in_production: ['confirmed', 'atelier', 'ready', 'cancelled'],
  ready: ['atelier', 'in_production', 'shipped', 'delivered'],
  shipped: ['ready', 'delivered'],
  delivered: ['ready', 'shipped', 'returned', 'exchanged'],
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

  // Arama filtresi
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    conditions.push(
      sql`(${orders.orderNumber} ILIKE ${searchTerm} OR ${customers.businessName} ILIKE ${searchTerm} OR ${customers.contactName} ILIKE ${searchTerm} OR ${customers.phone} ILIKE ${searchTerm} OR ${customers.city} ILIKE ${searchTerm})`
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
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

  // Her sipariş için kalemleri getir
  const ordersWithItems = await Promise.all(
    data.map(async (order) => {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))
      return { ...order, items }
    })
  )

  return {
    data: ordersWithItems,
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

  // İade/değişim kalemleri nihai; sipariş düzeyindeki geçiş onları değiştirmez
  const activeItems = order.items.filter((i) => !isTerminalItemStatus(i.itemStatus))

  // Atölye kilidi: kilitli kalemi taşıyacak geçişler reddedilir (iptal hariç),
  // updateItemStatus'taki kuralla aynı
  if (newStatus !== 'cancelled') {
    const lockedItems = activeItems.filter((i) => i.isLocked && i.itemStatus !== newitemStatus)
    if (lockedItems.length > 0) {
      throw new AppError(
        409,
        `Kilitli kalem var (${lockedItems.map((i) => i.productName).join(', ')}). Kilitli kalemler varken sipariş yalnızca iptal edilebilir. Önce kilidi açın veya atölye kullanıcısından "Atölyede Hazır" işaretlemesini isteyin.`,
      )
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(orders.id, id))

    // İptalde atölye kuyruğundan çıkar: kilit ve "atölyede hazır" bayraklarını temizle
    if (newStatus === 'cancelled') {
      await tx
        .update(orderItems)
        .set({ isLocked: false, isReadyInWorkshop: false })
        .where(eq(orderItems.orderId, id))
    }

    if (newitemStatus) {
      for (const item of activeItems) {
        // İleriye adım: gerideki kalemleri ilerlet
        // Geriye adım: ilerideki kalemleri geri al
        if (item.itemStatus === newitemStatus) continue

        // Atölyeden çıkıyorsa isReadyInWorkshop ve isLocked sıfırla
        const itemUpdateData: any = { itemStatus: newitemStatus }
        if (item.itemStatus === 'atelier' && newitemStatus !== 'atelier') {
          itemUpdateData.isReadyInWorkshop = false
          itemUpdateData.isLocked = false
        }

        await tx
          .update(orderItems)
          .set(itemUpdateData)
          .where(eq(orderItems.id, item.id))

        await addActivity(
          id,
          userId,
          'item_status_change',
          `${item.productName}: ${ITEM_STATUS_LABELS[item.itemStatus]} → ${ITEM_STATUS_LABELS[newitemStatus]}`,
          { itemId: item.id, oldStatus: item.itemStatus, newStatus: newitemStatus },
          tx,
        )
      }
    }

    // Add status change activity
    await addActivity(
      id,
      userId,
      'status_change',
      `Durum: ${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[newStatus]}`,
      { oldStatus, newStatus },
      tx,
    )
  })

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
  userRole?: string,
) {
  const [item] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
    .limit(1)

  if (!item) {
    throw new AppError(404, 'Sipariş kalemi bulunamadı')
  }

  const oldStatus = item.itemStatus

  if (oldStatus === newStatus) {
    return getOrderById(orderId)
  }

  // İptal edilmiş siparişin kalemi değişirse otomatik durum hesabı siparişi "diriltir"
  const [parentOrder] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)
  if (parentOrder?.status === 'cancelled') {
    throw new AppError(400, 'İptal edilmiş siparişin kalemleri değiştirilemez')
  }

  // Validate item status transition
  if (!VALID_ITEM_TRANSITIONS[oldStatus]?.includes(newStatus)) {
    throw new AppError(
      400,
      `Geçersiz ürün durum geçişi: ${oldStatus} → ${newStatus}`,
    )
  }

  // Kilitli kalem kontrolü: sadece iptal, iade, değişim yapılabilir
  if (item.isLocked && oldStatus === 'atelier') {
    const allowedForLocked = ['cancelled', 'returned', 'exchanged']
    if (!allowedForLocked.includes(newStatus)) {
      throw new AppError(403, 'Kilitli kalem sadece iptal, iade veya değişim yapılabilir. Önce kilidi açın veya atölye kullanıcısından "Atölyede Hazır" işaretlemesini isteyin.')
    }
  }

  // Kalem düzeyinde iade/değişim: tüm adet için iade/değişim kaydı oluşturulur,
  // toplam ve sipariş durumu aynı işlemde yeniden hesaplanır (processReturn ile aynı kurallar)
  if (isTerminalItemStatus(newStatus)) {
    await markWholeItemTerminal(orderId, itemId, newStatus as TerminalItemStatus, userId)
    return getOrderById(orderId)
  }

  // Atölyeden çıkıyorsa isReadyInWorkshop ve isLocked sıfırla
  const updateData: any = { itemStatus: newStatus }
  if (oldStatus === 'atelier' && newStatus !== 'atelier') {
    updateData.isReadyInWorkshop = false
    updateData.isLocked = false
  }

  await db
    .update(orderItems)
    .set(updateData)
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

  // Sipariş toplamını yeniden hesapla (iade/değişim kalemleri hariç)
  await recalculateOrderTotal(orderId)

  await addActivity(
    orderId,
    userId,
    'item_added',
    `Ürün eklendi: ${item.productName} (${item.quantity} adet)`,
  )

  return getOrderById(orderId)
}

export async function updateOrderItem(
  orderId: string,
  itemId: string,
  input: { quantity?: number; unitPrice?: number | null; specifications?: string },
  userId: string,
) {
  const [item] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
    .limit(1)

  if (!item) {
    throw new AppError(404, 'Sipariş kalemi bulunamadı')
  }

  const updateData: any = {}
  if (input.quantity !== undefined) updateData.quantity = input.quantity
  if (input.unitPrice !== undefined) updateData.unitPrice = input.unitPrice
  if (input.specifications !== undefined) updateData.specifications = input.specifications

  // Fiyat veya adet değiştiyse toplam fiyatı güncelle
  if (input.quantity !== undefined || input.unitPrice !== undefined) {
    const qty = input.quantity ?? item.quantity
    // null = fiyat temizlendi; ?? kullanılırsa eski fiyata geri düşerdi
    const price = input.unitPrice !== undefined ? input.unitPrice : item.unitPrice
    updateData.totalPrice = price ? qty * price : null
  }

  await db
    .update(orderItems)
    .set(updateData)
    .where(eq(orderItems.id, itemId))

  // Sipariş toplamını yeniden hesapla (iade/değişim kalemleri hariç)
  await recalculateOrderTotal(orderId)

  await addActivity(
    orderId,
    userId,
    'item_updated',
    `Ürün güncellendi: ${item.productName}`,
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

  // Sipariş toplamını yeniden hesapla (iade/değişim kalemleri hariç)
  await recalculateOrderTotal(orderId)

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
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.isArchived, false))

  const byStatus = await db
    .select({
      status: orders.status,
      count: sql<number>`count(*)::int`,
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
  atelier: 2,       // atölye (stokta yok, hammaddeden üretiliyor)
  in_production: 3, // üretimde
  ready: 4,
  shipped: 5,
  delivered: 6,
  returned: 6,    // iade = teslim seviyesinde
  exchanged: 2,   // değişim = atölye seviyesinde
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

export async function calculateOrderStatus(orderId: string, executor: DbExecutor = db): Promise<string> {
  const items = await executor
    .select({ itemStatus: orderItems.itemStatus })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))

  if (items.length === 0) return 'pending'

  // İade/değişim kalemleri nihai: en geride kalanı ararken sayılmaz.
  // Tüm kalemler nihaiyse sipariş teslim edilmiş sayılır.
  const statuses = items.map((i) => i.itemStatus).filter((st) => !isTerminalItemStatus(st))
  if (statuses.length === 0) return 'delivered'

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

interface ReturnItemInput {
  orderItemId: string
  quantity: number
  note?: string
}

interface ReturnInput {
  items: ReturnItemInput[]
  returnShippingCost?: number
  note?: string
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// Siparişi satır kilidiyle getirir; yalnızca teslim edilmiş siparişlerde iade/değişim yapılır
async function lockDeliveredOrder(tx: Tx, orderId: string, errorMessage: string) {
  const [order] = await tx
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .for('update')

  if (!order) {
    throw new AppError(404, 'Order not found')
  }
  if (order.status !== 'delivered') {
    throw new AppError(400, errorMessage)
  }
}

/**
 * İade/değişim edilecek kalemleri doğrular ve nihai duruma taşır.
 * - Kalem bu siparişe ait ve "teslim edildi" durumunda olmalı
 * - Adet 1..kalem adedi arasında tam sayı olmalı
 * - Kısmi adette satır bölünür: orijinal satırda kalan adet kalır, iade/değişim adedi
 *   yeni bir satıra nihai durumla yazılır (fiyatlar adetle orantılı güncellenir)
 * order_return_items kaydı nihai duruma geçen satırı gösterir.
 */
async function moveItemsToTerminal(
  tx: Tx,
  orderId: string,
  returnId: number,
  requested: ReturnItemInput[],
  status: TerminalItemStatus,
  exchangeNote?: string,
) {
  if (requested.length === 0) {
    throw new AppError(400, 'En az bir kalem seçilmelidir')
  }

  const ids = requested.map((r) => r.orderItemId)
  if (new Set(ids).size !== ids.length) {
    throw new AppError(400, 'Aynı kalem birden fazla kez seçilemez')
  }

  const rows = await tx
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), inArray(orderItems.id, ids)))
    .for('update')
  const byId = new Map(rows.map((r) => [r.id, r]))

  const actionLabel = status === 'returned' ? 'iade' : 'değişim'

  for (const req of requested) {
    const row = byId.get(req.orderItemId)
    if (!row) {
      throw new AppError(400, 'Seçilen kalem bu siparişe ait değil')
    }
    if (row.itemStatus !== 'delivered') {
      throw new AppError(400, `${row.productName}: sadece teslim edilmiş kalemlerde ${actionLabel} yapılabilir`)
    }
    if (!Number.isInteger(req.quantity) || req.quantity < 1 || req.quantity > row.quantity) {
      throw new AppError(400, `${row.productName}: ${actionLabel} adedi 1 ile ${row.quantity} arasında olmalıdır`)
    }
  }

  for (const req of requested) {
    const row = byId.get(req.orderItemId)!
    const terminalData = status === 'exchanged'
      ? { itemStatus: status, isExchanged: true, exchangeNote: exchangeNote ?? null }
      : { itemStatus: status }

    let terminalItemId = row.id
    if (req.quantity === row.quantity) {
      await tx.update(orderItems).set(terminalData).where(eq(orderItems.id, row.id))
    } else {
      // Kısmi: satırı böl
      const remaining = row.quantity - req.quantity
      await tx
        .update(orderItems)
        .set({
          quantity: remaining,
          totalPrice: row.unitPrice ? row.unitPrice * remaining : null,
        })
        .where(eq(orderItems.id, row.id))

      const [split] = await tx
        .insert(orderItems)
        .values({
          orderId,
          productId: row.productId,
          productName: row.productName,
          quantity: req.quantity,
          unitPrice: row.unitPrice,
          totalPrice: row.unitPrice ? row.unitPrice * req.quantity : null,
          specifications: row.specifications,
          ...terminalData,
        })
        .returning({ id: orderItems.id })
      terminalItemId = split.id
    }

    await tx.insert(orderReturnItems).values({
      returnId,
      orderItemId: terminalItemId,
      quantity: req.quantity,
      note: req.note,
    })
  }
}

// Kalemler değiştikten sonra sipariş toplamını ve durumunu yeniden hesapla
async function refreshOrderAfterReturn(tx: Tx, orderId: string) {
  await recalculateOrderTotal(orderId, tx)
  const newStatus = await calculateOrderStatus(orderId, tx)
  await tx
    .update(orders)
    .set({ status: newStatus as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
}

// Durum açılır listesinden gelen iade/değişim: kalemin tamamını nihai duruma taşır
async function markWholeItemTerminal(
  orderId: string,
  itemId: string,
  status: TerminalItemStatus,
  userId: string,
) {
  await db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update')
    if (!order) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status === 'cancelled') {
      throw new AppError(400, 'İptal edilmiş siparişin kalemleri değiştirilemez')
    }

    // Kilit altında güncel adet okunur; durum ve aidiyet kontrolü moveItemsToTerminal'da tekrar yapılır
    const [item] = await tx
      .select({ quantity: orderItems.quantity, productName: orderItems.productName, itemStatus: orderItems.itemStatus })
      .from(orderItems)
      .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
      .for('update')
    if (!item) {
      throw new AppError(404, 'Sipariş kalemi bulunamadı')
    }

    const [record] = await tx
      .insert(orderReturns)
      .values({ orderId, type: status === 'returned' ? 'return' : 'exchange' })
      .returning()

    await moveItemsToTerminal(tx, orderId, record.id, [{ orderItemId: itemId, quantity: item.quantity }], status)

    await refreshOrderAfterReturn(tx, orderId)

    await addActivity(
      orderId,
      userId,
      'item_status_change',
      `${item.productName}: ${ITEM_STATUS_LABELS[item.itemStatus]} → ${ITEM_STATUS_LABELS[status]}`,
      { itemId, oldStatus: item.itemStatus, newStatus: status, productName: item.productName, returnId: record.id },
      tx,
    )
  })
}

export async function processReturn(orderId: string, input: ReturnInput, userId: string) {
  await db.transaction(async (tx) => {
    await lockDeliveredOrder(tx, orderId, 'Sadece teslim edilmiş siparişlerde iade yapılabilir')

    // İade kaydı oluştur
    const [returnRecord] = await tx
      .insert(orderReturns)
      .values({
        orderId,
        type: 'return',
        returnShippingCost: input.returnShippingCost || null,
        note: input.note,
      })
      .returning()

    // Kalemleri doğrula, gerekiyorsa böl ve "iade" olarak işaretle
    await moveItemsToTerminal(tx, orderId, returnRecord.id, input.items, 'returned')

    await refreshOrderAfterReturn(tx, orderId)

    await addActivity(
      orderId,
      userId,
      'return',
      `İade işlemi: ${input.items.length} ürün iade edildi${input.returnShippingCost ? `, kargo ücreti: ${input.returnShippingCost / 100} ₺` : ''}`,
      { returnId: returnRecord.id, itemCount: input.items.length },
      tx,
    )
  })

  return getOrderById(orderId)
}

interface ExchangeInput {
  oldItems: ReturnItemInput[]
  newItems: Array<{ productName: string; quantity: number; unitPrice?: number; specifications?: string }>
  note?: string
}

export async function processExchange(orderId: string, input: ExchangeInput, userId: string) {
  await db.transaction(async (tx) => {
    await lockDeliveredOrder(tx, orderId, 'Sadece teslim edilmiş siparişlerde değişim yapılabilir')

    // Değişim kaydı oluştur
    const [exchangeRecord] = await tx
      .insert(orderReturns)
      .values({
        orderId,
        type: 'exchange',
        note: input.note,
      })
      .returning()

    // Eski kalemleri doğrula, gerekiyorsa böl ve "değişim" olarak işaretle
    await moveItemsToTerminal(tx, orderId, exchangeRecord.id, input.oldItems, 'exchanged', input.note)

    // Yeni kalemleri ekle
    for (const item of input.newItems) {
      await tx.insert(orderItems).values({
        orderId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice || null,
        totalPrice: item.unitPrice ? item.unitPrice * item.quantity : null,
        itemStatus: 'in_production',
        specifications: item.specifications,
      })
    }

    await refreshOrderAfterReturn(tx, orderId)

    await addActivity(
      orderId,
      userId,
      'exchange',
      `Değişim işlemi: ${input.oldItems.length} ürün değiştirildi, ${input.newItems.length} yeni ürün eklendi`,
      { exchangeId: exchangeRecord.id },
      tx,
    )
  })

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

// ── Workshop (Atölye) Operations ───────────────────────

export async function lockOrderItem(
  orderId: string,
  itemId: string,
  userId: string,
) {
  const [item] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
    .limit(1)

  if (!item) {
    throw new AppError(404, 'Sipariş kalemi bulunamadı')
  }

  if (item.isLocked) {
    throw new AppError(400, 'Bu kalem zaten kilitli')
  }

  const [parentOrder] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)
  if (parentOrder?.status === 'cancelled') {
    throw new AppError(400, 'İptal edilmiş siparişin kalemleri atölyeye gönderilemez')
  }

  // Sadece atelier durumundaki kalemler kilitlenebilir
  if (item.itemStatus !== 'atelier') {
    throw new AppError(400, 'Sadece atölyedeki kalemler kilitlenebilir')
  }

  await db
    .update(orderItems)
    .set({ isLocked: true })
    .where(eq(orderItems.id, itemId))

  await addActivity(
    orderId,
    userId,
    'item_locked',
    `${item.productName}: Atölyeye gönderildi ve kilitlendi`,
    { itemId, productName: item.productName },
  )

  return getOrderById(orderId)
}

export async function unlockOrderItem(
  orderId: string,
  itemId: string,
  userId: string,
) {
  const [item] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
    .limit(1)

  if (!item) {
    throw new AppError(404, 'Sipariş kalemi bulunamadı')
  }

  if (!item.isLocked) {
    throw new AppError(400, 'Bu kalem zaten kilitli değil')
  }

  await db
    .update(orderItems)
    .set({ isLocked: false })
    .where(eq(orderItems.id, itemId))

  await addActivity(
    orderId,
    userId,
    'item_unlocked',
    `${item.productName}: Kilit kaldırıldı`,
    { itemId, productName: item.productName },
  )

  return getOrderById(orderId)
}

export async function markItemReadyInWorkshop(
  orderId: string,
  itemId: string,
  userId: string,
) {
  const [item] = await db
    .select()
    .from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)))
    .limit(1)

  if (!item) {
    throw new AppError(404, 'Sipariş kalemi bulunamadı')
  }

  if (!item.isLocked) {
    throw new AppError(400, 'Bu kalem kilitli değil. Önce kilitleyin.')
  }

  if (item.itemStatus !== 'atelier') {
    throw new AppError(400, 'Sadece atölyedeki kalemler "hazır" olarak işaretlenebilir')
  }

  // Kilit kalkar, isReadyInWorkshop true olur ama status atelier'de kalır
  await db
    .update(orderItems)
    .set({ isLocked: false, isReadyInWorkshop: true })
    .where(eq(orderItems.id, itemId))

  await addActivity(
    orderId,
    userId,
    'item_ready_workshop',
    `${item.productName}: Atölyede hazır - Transfer bekleniyor`,
    { itemId, productName: item.productName },
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

// Atölyedeki kalemleri getir (atelier durumundakiler)
export async function getAtelierItems() {
  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      itemStatus: orderItems.itemStatus,
      specifications: orderItems.specifications,
      isLocked: orderItems.isLocked,
      isReadyInWorkshop: orderItems.isReadyInWorkshop,
      createdAt: orderItems.createdAt,
      orderNumber: orders.orderNumber,
      orderStatus: orders.status,
      orderCreatedAt: orders.createdAt,
      customerName: customers.businessName,
      customerPhone: customers.phone,
      // productId yoksa ada göre eşleştir — yalnızca bu adda TEK ürün varsa.
      // Renk varyantları aynı adı paylaştığından ad join'i satırları çoğaltıyordu.
      productCode: sql<string | null>`case when ${orderItems.productId} is not null then ${products.productCode} else (
        select min(p.product_code) from products p where p.name = ${orderItems.productName} having count(*) = 1
      ) end`,
      productImages: sql<string[] | null>`case when ${orderItems.productId} is not null then ${products.images} else (
        select (array_agg(p.images))[1] from products p where p.name = ${orderItems.productName} having count(*) = 1
      ) end`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(
        eq(orderItems.itemStatus, 'atelier'),
        eq(orders.isArchived, false),
        ne(orders.status, 'cancelled'),
      ),
    )
    .orderBy(asc(orderItems.createdAt))

  return items
}

export { STATUS_LABELS, ITEM_STATUS_LABELS, VALID_ORDER_TRANSITIONS, VALID_ITEM_TRANSITIONS }
