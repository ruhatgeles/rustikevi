import { cors } from 'hono/cors'

// Virgülle ayrılmış birden fazla origin desteklenir: "https://admin.rustikevi.com,https://rustikevi.com"
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3002,http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export function corsMiddleware() {
  return cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : null),
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })
}
