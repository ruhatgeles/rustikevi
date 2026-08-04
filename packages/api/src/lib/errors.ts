import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import { logger } from './logger.js'

export class AppError extends HTTPException {
  constructor(status: number, message: string) {
    super(status, { message })
  }
}

export function errorHandler(err: Error, c: Context) {
  const requestId = c.get('requestId') || 'unknown'

  if (err instanceof AppError) {
    logger.warn({ requestId, status: err.status, message: err.message }, 'App error')
    return c.json({ error: err.message, requestId }, err.status as any)
  }

  if (err instanceof ZodError) {
    logger.warn({ requestId, errors: err.errors }, 'Validation error')
    return c.json(
      {
        error: 'Doğrulama hatası',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
        requestId,
      },
      400
    )
  }

  if (err instanceof HTTPException) {
    logger.warn({ requestId, status: err.status, message: err.message }, 'HTTP error')
    return c.json({ error: err.message, requestId }, err.status as any)
  }

  // Beklenmeyen hata — structured logging
  logger.error({
    err,
    requestId,
    stack: err.stack,
    cause: (err as any).cause,
  }, 'Unexpected error')

  return c.json({
    error: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
    requestId,
  }, 500)
}
