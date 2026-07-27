import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/index.js'
import { customers } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { rateLimit } from '../middleware/rate-limit.js'

const orders = new Hono()

const orderSchema = z.object({
  isletme: z.string().min(1),
  yetkili: z.string().min(1),
  telefon: z.string().min(10),
  sehir: z.string().optional(),
  urun: z.string().min(1),
  adet: z.string().optional(),
  mesaj: z.string().optional(),
})

// POST /api/orders — sipariş talebi (public, rate limited)
orders.post('/', rateLimit(20, 60_000), async (c) => {
  const body = await c.req.json()
  const input = orderSchema.parse(body)

  // Müşteri olarak kaydet (veya mevcut güncelle)
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.phone, input.telefon))
    .limit(1)

  if (existing) {
    await db
      .update(customers)
      .set({
        businessName: input.isletme,
        contactName: input.yetkili,
        city: input.sehir || null,
        notes: input.mesaj || null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, existing.id))
  } else {
    await db.insert(customers).values({
      businessName: input.isletme,
      contactName: input.yetkili,
      phone: input.telefon,
      city: input.sehir || null,
      notes: input.mesaj
        ? `Ürün: ${input.urun}, Adet: ${input.adet || '-'}\n${input.mesaj}`
        : `Ürün: ${input.urun}, Adet: ${input.adet || '-'}`,
    })
  }

  // wa.me linki frontend'de açılacak, burada sadece success dön
  return c.json({
    data: {
      success: true,
      message: 'Sipariş talebiniz kaydedildi',
    },
  })
})

export default orders
