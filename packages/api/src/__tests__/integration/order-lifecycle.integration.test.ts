import { describe, it, expect, beforeAll } from 'vitest'
import { getTestDb } from './setup.js'
import { customers, users, orders, orderItems, orderReturnItems } from '../../db/schema.js'
import {
  createOrder,
  processReturn,
  processExchange,
  updateOrderStatus,
  updateOrderItem,
  getAtelierItems,
} from '../../services/order.service.js'
import { createProduct, bulkCreateProducts } from '../../services/product.service.js'
import { eq } from 'drizzle-orm'

const db = getTestDb()

let customerId: string
let userId: string

beforeAll(async () => {
  const [c] = await db
    .insert(customers)
    .values({ businessName: 'Yaşam Döngüsü Test', contactName: 'Test', phone: '05009998877' })
    .returning()
  customerId = c.id
  const [u] = await db
    .insert(users)
    .values({ email: 'lifecycle@example.com', passwordHash: 'x', name: 'Lifecycle', role: 'admin' })
    .returning()
  userId = u.id
})

// Siparişi ve kalemlerini doğrudan verilen duruma getirir
async function makeOrder(
  items: Array<{ productName: string; quantity: number; unitPrice?: number }>,
  status: 'delivered' | 'atelier' = 'delivered',
) {
  const order = await createOrder({ customerId, items }, userId)
  await db.update(orders).set({ status }).where(eq(orders.id, order.id))
  await db.update(orderItems).set({ itemStatus: status }).where(eq(orderItems.orderId, order.id))
  return order
}

describe('Product codes (integration)', () => {
  it('keeps codes unique past 9 products in a category', async () => {
    const colors = ['Beyaz', 'Krem', 'Siyah']
    const codes: string[] = []
    for (let i = 0; i < 12; i++) {
      const p = await createProduct({ name: `Kordon ${i}`, category: 'Kordon', color: colors[i % 3] })
      codes.push(p.productCode!)
    }
    expect(new Set(codes).size).toBe(12)
    expect(codes[11]).toBe('10124') // sıra 012 + Siyah(4)
  })

  it('does not collide between unmapped categories and Diğer (shared prefix 9)', async () => {
    const a = await createProduct({ name: 'Diğer ürün', category: 'Diğer', color: 'Beyaz' })
    const b = await createProduct({ name: 'Yeni kategori ürünü', category: 'Yepyeni', color: 'Beyaz' })
    expect(a.productCode).not.toBe(b.productCode)
    expect(b.productCode!.startsWith('9')).toBe(true)
  })

  it('maps a duplicate manual code to 409', async () => {
    await createProduct({ productCode: '77777', name: 'Elle kod', category: 'Aksesuar' })
    await expect(
      createProduct({ productCode: '77777', name: 'Elle kod 2', category: 'Aksesuar' }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('handles concurrent creates in the same category without a 500', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        createProduct({ name: `Eşzamanlı ${i}`, category: 'Halka', color: 'Gri' }),
      ),
    )
    for (const r of results) {
      if (r.status === 'rejected') expect((r.reason as { status?: number }).status).toBe(409)
    }
    const codes = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value.productCode] : []))
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('Returns & exchanges (integration)', () => {
  it('partial return splits the line and recomputes the total', async () => {
    const order = await makeOrder([{ productName: 'Jüt Kordon', quantity: 100, unitPrice: 1000 }])
    const itemId = order.items[0].id

    const result = await processReturn(order.id, { items: [{ orderItemId: itemId, quantity: 5 }] }, userId)

    const original = result.items.find((i) => i.id === itemId)!
    const returned = result.items.find((i) => i.id !== itemId)!
    expect(original).toMatchObject({ quantity: 95, totalPrice: 95000, itemStatus: 'delivered' })
    expect(returned).toMatchObject({ quantity: 5, totalPrice: 5000, itemStatus: 'returned' })
    expect(result.totalAmount).toBe(95000)
    expect(result.status).toBe('delivered')

    const [ri] = await db.select().from(orderReturnItems).where(eq(orderReturnItems.orderItemId, returned.id))
    expect(ri.quantity).toBe(5)
  })

  it('rejects over-quantity, foreign items and already-returned items', async () => {
    const order = await makeOrder([{ productName: 'Halka', quantity: 10, unitPrice: 500 }])
    const other = await makeOrder([{ productName: 'Saçak', quantity: 3 }])
    const itemId = order.items[0].id

    await expect(
      processReturn(order.id, { items: [{ orderItemId: itemId, quantity: 11 }] }, userId),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      processReturn(order.id, { items: [{ orderItemId: other.items[0].id, quantity: 1 }] }, userId),
    ).rejects.toMatchObject({ status: 400 })

    // Başarısız denemeler hiçbir şey yazmamalı (transaction)
    const [unchanged] = await db.select().from(orderItems).where(eq(orderItems.id, itemId))
    expect(unchanged).toMatchObject({ quantity: 10, itemStatus: 'delivered' })

    await processReturn(order.id, { items: [{ orderItemId: itemId, quantity: 10 }] }, userId)
    await expect(
      processReturn(order.id, { items: [{ orderItemId: itemId, quantity: 1 }] }, userId),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('exchange: order follows the new items and order-level moves leave terminal items alone', async () => {
    const order = await makeOrder([
      { productName: 'Eski', quantity: 2, unitPrice: 1000 },
      { productName: 'İade', quantity: 1, unitPrice: 300 },
    ])
    const [oldItem, retItem] = order.items
    await processReturn(order.id, { items: [{ orderItemId: retItem.id, quantity: 1 }] }, userId)

    const afterExchange = await processExchange(
      order.id,
      {
        oldItems: [{ orderItemId: oldItem.id, quantity: 2 }],
        newItems: [{ productName: 'Yeni', quantity: 2, unitPrice: 1200 }],
      },
      userId,
    )
    expect(afterExchange.status).toBe('in_production')
    expect(afterExchange.totalAmount).toBe(2400)

    await updateOrderStatus(order.id, 'ready', userId)
    const delivered = await updateOrderStatus(order.id, 'delivered', userId)
    expect(delivered.status).toBe('delivered')

    const byName = Object.fromEntries(delivered.items.map((i) => [i.productName, i.itemStatus]))
    expect(byName).toEqual({ Eski: 'exchanged', İade: 'returned', Yeni: 'delivered' })

    // delivered → shipped düzeltmesi de iade/değişim kalemlerine dokunmamalı
    const shipped = await updateOrderStatus(order.id, 'shipped', userId)
    const byName2 = Object.fromEntries(shipped.items.map((i) => [i.productName, i.itemStatus]))
    expect(byName2).toEqual({ Eski: 'exchanged', İade: 'returned', Yeni: 'shipped' })
  })
})

describe('Atelier lock & cancel (integration)', () => {
  it('blocks order-level moves of locked items, allows cancel and clears the workshop queue', async () => {
    const order = await makeOrder([{ productName: 'Kilitli Ürün', quantity: 4 }], 'atelier')
    const itemId = order.items[0].id
    await db.update(orderItems).set({ isLocked: true }).where(eq(orderItems.id, itemId))

    await expect(updateOrderStatus(order.id, 'in_production', userId)).rejects.toMatchObject({ status: 409 })
    let atelier = await getAtelierItems()
    expect(atelier.some((i) => i.id === itemId)).toBe(true)

    const cancelled = await updateOrderStatus(order.id, 'cancelled', userId)
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.items[0]).toMatchObject({ isLocked: false, isReadyInWorkshop: false })

    atelier = await getAtelierItems()
    expect(atelier.some((i) => i.id === itemId)).toBe(false)
  })

  it('does not duplicate atelier rows for products sharing a name', async () => {
    await bulkCreateProducts({ name: 'Varyantlı Püskül', category: 'Saçak', colors: ['Beyaz', 'Krem', 'Siyah'] })
    const order = await makeOrder([{ productName: 'Varyantlı Püskül', quantity: 1 }], 'atelier')

    const rows = (await getAtelierItems()).filter((i) => i.orderId === order.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].productCode).toBeNull()

    // Tekil ad eşleşmesi yine kod/görsel getirir
    const single = await createProduct({ name: 'Tekil Ürün', category: 'Bağcık', color: 'Krem', images: ['/a.webp'] })
    const order2 = await makeOrder([{ productName: 'Tekil Ürün', quantity: 1 }], 'atelier')
    const [row2] = (await getAtelierItems()).filter((i) => i.orderId === order2.id)
    expect(row2.productCode).toBe(single.productCode)
    expect(row2.productImages).toEqual(['/a.webp'])
  })
})

describe('Order item price (integration)', () => {
  it('clearing the unit price clears the line total and the order total', async () => {
    const order = await createOrder({ customerId, items: [{ productName: 'Fiyatlı', quantity: 3, unitPrice: 2000 }] }, userId)
    expect(order.totalAmount).toBe(6000)
    const updated = await updateOrderItem(order.id, order.items[0].id, { unitPrice: null }, userId)
    expect(updated.items[0]).toMatchObject({ unitPrice: null, totalPrice: null })
    expect(updated.totalAmount).toBeNull()
  })
})
