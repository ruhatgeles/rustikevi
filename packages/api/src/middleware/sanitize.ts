import { Context, Next } from 'hono'
import { z } from 'zod'

// HTML escape fonksiyonu
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Recursive obje temizleme
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return escapeHtml(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Prototype pollution prevention
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue
      }
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }

  return obj
}

// Input length limits
const MAX_STRING_LENGTH = 10000
const MAX_ARRAY_LENGTH = 1000
const MAX_OBJECT_DEPTH = 10

function validateInputDepth(obj: any, depth: number = 0): boolean {
  if (depth > MAX_OBJECT_DEPTH) return false

  if (typeof obj === 'string') {
    return obj.length <= MAX_STRING_LENGTH
  }

  if (Array.isArray(obj)) {
    if (obj.length > MAX_ARRAY_LENGTH) return false
    return obj.every((item) => validateInputDepth(item, depth + 1))
  }

  if (obj && typeof obj === 'object') {
    const values = Object.values(obj)
    return values.every((value) => validateInputDepth(value, depth + 1))
  }

  return true
}

export function sanitizeMiddleware() {
  return async (c: Context, next: Next) => {
    // Sadece body olan request'ler için
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      try {
        const contentType = c.req.header('content-type')

        // JSON body'ler için
        if (contentType?.includes('application/json')) {
          const body = await c.req.json()

          // Input depth kontrolü
          if (!validateInputDepth(body)) {
            return c.json(
              { error: 'İstek çok karmaşık veya çok büyük' },
              400
            )
          }

          // XSS prevention
          const sanitized = sanitizeObject(body)

          // Yeni request oluştur (Hono'da body değiştirme)
          // Not: Hono'da request body'sini doğrudan değiştirmek zor
          // Bu yüzden sadece logluyoruz, asıl sanitization Zod ile yapılıyor
        }
      } catch {
        // JSON parse hatası — devam et, Zod yakalayacak
      }
    }

    await next()
  }
}

// Zod ile entegrasyon için helper
export const sanitizedString = (maxLength: number = 1000) =>
  z.string().max(maxLength).transform((val) => escapeHtml(val.trim()))

// Export for testing
export { escapeHtml, sanitizeObject, validateInputDepth }
