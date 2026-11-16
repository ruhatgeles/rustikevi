import { describe, it, expect, beforeAll } from 'vitest'
import { getTestDb } from './setup.js'
import { customers } from '../../db/schema.js'
import { createOrder } from '../../services/order.service.js'

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
})
