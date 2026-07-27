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
        error: 'Validation error',
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

  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
}
