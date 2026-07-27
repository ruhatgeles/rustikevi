import { cors } from 'hono/cors'

export function corsMiddleware() {
  return cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })
}
