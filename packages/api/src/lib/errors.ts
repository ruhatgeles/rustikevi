import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

export class AppError extends HTTPException {
  constructor(status: number, message: string) {
    super(status, { message })
  }
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.status as any)
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Doğrulama hatası',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
      400
    )
  }

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status as any)
  }

  // Hata detaylarını logla
  console.error('═══════════════════════════════════════')
  console.error('❌ Beklenmeyen Hata:')
  console.error('Mesaj:', err.message)
  console.error('Stack:', err.stack)
  if ((err as any).cause) {
    console.error('Neden:', (err as any).cause)
  }
  console.error('═══════════════════════════════════════')

  return c.json({ error: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.' }, 500)
}
