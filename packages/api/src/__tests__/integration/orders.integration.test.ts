import { describe, it, expect, beforeAll } from 'vitest'
import { getTestDb } from './setup.js'
import { customers } from '../../db/schema.js'
import { createOrder } from '../../services/order.service.js'
import { Hono } from 'hono'
import ordersRoutes from '../../routes/orders.js'
import { errorHandler } from '../../lib/errors.js'
import { sql } from 'drizzle-orm'

describe('Order numbers (integration)', () => {
  let customerId: string

  beforeAll(async () => {
    const db = getTestDb()
    const [c] = await db
      .insert(customers)
      .values({ businessName: 'Eşzamanlı Test', contactName: 'Test', phone: '05000000000' })
      .returning()
    customerId = c.id
  })

  it('produces unique, sequential numbers under concurrent creation', async () => {
    const results = await Promise.all(
      Array.from({ length: 15 }, () =>
        createOrder({ customerId, items: [{ productName: 'Jüt Kordon', quantity: 1 }] }, null),
      ),
    )
    const numbers = results.map((o) => o.orderNumber)
    expect(new Set(numbers).size).toBe(15)
    for (const n of numbers) expect(n).toMatch(/^RVE-\d{7}$/)
  })

  it('public inquiry matches existing customer regardless of phone format', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.route('/api/orders', ordersRoutes)
    const send = (telefon: string) =>
      app.request('/api/orders/inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isletme: 'Format Test', yetkili: 'Ali', telefon, urun: 'Saçak', adet: '1.000 metre' }),
      })

    const r1 = await send('0 (532) 111 22 33')
    expect(r1.status).toBe(201)
    const r2 = await send('+90 532 111 2233')
    expect(r2.status).toBe(201)

    const db = getTestDb()
    const rows = await db
      .select()
      .from(customers)
      .where(sql`right(regexp_replace(${customers.phone}, '[^0-9]', '', 'g'), 10) = '5321112233'`)
    expect(rows).toHaveLength(1)
    expect(rows[0].phone).toBe('05321112233')
  })

  it('rejects over-long fields with 400 instead of a database error', async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.route('/api/orders', ordersRoutes)
    const res = await app.request('/api/orders/inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isletme: 'x'.repeat(500), yetkili: 'A', telefon: '05321112233', urun: 'B' }),
    })
    expect(res.status).toBe(400)
  })
})
