import type { Context } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'

/**
 * İstemci IP'si.
 * X-Forwarded-For / X-Real-IP istemci tarafından sahte gönderilebilir; bu yüzden
 * yalnızca API güvenilir bir reverse proxy (nginx, Cloudflare) arkasındaysa
 * TRUST_PROXY=true ile dikkate alınır. Aksi halde TCP soket adresi kullanılır.
 */
export function getClientIp(c: Context): string {
  if (process.env.TRUST_PROXY === 'true') {
    const realIp = c.req.header('x-real-ip')?.trim()
    if (realIp) return realIp
    const xff = c.req.header('x-forwarded-for')
    if (xff) {
      // Proxy kendi gördüğü adresi listenin SONUNA ekler; baştakiler istemci kontrolünde.
      const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length > 0) return parts[parts.length - 1]
    }
  }
  try {
    return getConnInfo(c).remote.address || 'unknown'
  } catch {
    return 'unknown'
  }
}
