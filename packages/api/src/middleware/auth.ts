import { createMiddleware } from 'hono/factory'
import { verifyToken, JwtPayload } from '../lib/jwt.js'
import { AppError } from '../lib/errors.js'

// Extend Hono context
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
    requestId: string
  }
}

export function authMiddleware(requiredRoles?: string[]) {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing or invalid authorization header')
    }

    const token = authHeader.slice(7)

    let payload: JwtPayload
    try {
      payload = verifyToken(token)
    } catch {
      throw new AppError(401, 'Invalid or expired token')
    }

    // Refresh token (7 gün) erişim token'ı yerine kullanılamaz
    if (payload.type === 'refresh') {
      throw new AppError(401, 'Invalid or expired token')
    }

    if (requiredRoles && !requiredRoles.includes(payload.role)) {
      throw new AppError(403, 'Insufficient permissions')
    }

    c.set('user', payload)
    await next()
  })
}

// Shorthand guards
export const requireAdmin = () => authMiddleware(['admin'])
export const requireManager = () => authMiddleware(['admin', 'manager'])
export const requireAtolye = () => authMiddleware(['admin', 'atolye'])
export const requireAuth = () => authMiddleware()
