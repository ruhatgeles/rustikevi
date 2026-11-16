import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize, sep } from 'node:path'
import { Readable } from 'node:stream'
import { gzipSync } from 'node:zlib'

const { default: fetchHandler } = await import('./dist/server/server.js')

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'
// Sunucu içinden API'ye erişim adresi (Docker ağında http://api:3001)
const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '')
const CLIENT_DIR = join(process.cwd(), 'dist', 'client')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

const COMPRESSIBLE = new Set(['.js', '.mjs', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest', '.html'])

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Statik dosyaları bellekte tut (build çıktısı değişmez)
const fileCache = new Map()

async function loadStatic(filePath) {
  if (fileCache.has(filePath)) return fileCache.get(filePath)
  const fileStat = await stat(filePath)
  if (!fileStat.isFile()) return null
  const ext = extname(filePath).toLowerCase()
  const content = await readFile(filePath)
  const entry = {
    ext,
    content,
    gzipped: COMPRESSIBLE.has(ext) && content.length > 1024 ? gzipSync(content) : null,
  }
  fileCache.set(filePath, entry)
  return entry
}

async function serveStatic(req, res, pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }
  if (decoded.includes('\0')) return false
  const filePath = normalize(join(CLIENT_DIR, decoded))
  // Path traversal koruması: CLIENT_DIR dışına çıkılamaz
  if (filePath !== CLIENT_DIR && !filePath.startsWith(CLIENT_DIR + sep)) return false

  let entry
  try {
    entry = await loadStatic(filePath)
  } catch {
    return false
  }
  if (!entry) return false

  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': MIME_TYPES[entry.ext] || 'application/octet-stream',
    Vary: 'Accept-Encoding',
  }
  if (pathname.startsWith('/assets/')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable'
  } else if (['.png', '.jpg', '.jpeg', '.webp', '.avif', '.ico', '.svg', '.woff2'].includes(entry.ext)) {
    headers['Cache-Control'] = 'public, max-age=604800'
  } else {
    headers['Cache-Control'] = 'public, max-age=3600'
  }

  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '')
  const body = acceptsGzip && entry.gzipped ? entry.gzipped : entry.content
  if (body === entry.gzipped) headers['Content-Encoding'] = 'gzip'
  headers['Content-Length'] = body.length

  res.writeHead(200, headers)
  res.end(req.method === 'HEAD' ? undefined : body)
  return true
}

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host',
])

// /api ve /uploads isteklerini API'ye ilet: tarayıcı aynı origin'le konuşur, CORS gerekmez
async function proxyToApi(req, res, url) {
  const headers = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP.has(key) && value !== undefined) headers[key] = Array.isArray(value) ? value.join(', ') : value
  }
  // İstemcinin gönderdiği IP başlıklarını ezip gerçek soket adresini yaz (sahte IP ile rate-limit atlatılamasın)
  const remote = req.socket.remoteAddress || ''
  headers['x-real-ip'] = remote
  headers['x-forwarded-for'] = remote
  headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'http'
  headers['x-forwarded-host'] = req.headers.host || ''

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  let upstream
  try {
    upstream = await fetch(API_URL + url.pathname + url.search, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? 'half' : undefined,
      redirect: 'manual',
    })
  } catch (err) {
    console.error('API proxy error:', err.message)
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'API şu anda erişilemiyor' }))
    return
  }

  const outHeaders = {}
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key) && key !== 'content-encoding' && key !== 'content-length') outHeaders[key] = value
  })
  const setCookies = upstream.headers.getSetCookie?.() ?? []
  if (setCookies.length) outHeaders['set-cookie'] = setCookies
  res.writeHead(upstream.status, outHeaders)
  if (upstream.body && req.method !== 'HEAD') {
    Readable.fromWeb(upstream.body).pipe(res)
  } else {
    res.end()
  }
}

async function handleSsr(req, res, url) {
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? 'half' : undefined,
  })

  const response = await fetchHandler.fetch(request)

  const outHeaders = { ...SECURITY_HEADERS }
  response.headers.forEach((value, key) => {
    if (key !== 'set-cookie') outHeaders[key] = value
  })
  const setCookies = response.headers.getSetCookie?.() ?? []
  if (setCookies.length) outHeaders['set-cookie'] = setCookies
  res.writeHead(response.status, outHeaders)

  if (response.body && req.method !== 'HEAD') {
    Readable.fromWeb(response.body).pipe(res)
  } else {
    res.end()
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('ok')
      return
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
      await proxyToApi(req, res, url)
      return
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname !== '/') {
      const served = await serveStatic(req, res, url.pathname)
      if (served) return
    }

    await handleSsr(req, res, url)
  } catch (err) {
    console.error('Server error:', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    }
    res.end('Internal Server Error')
  }
})

server.keepAliveTimeout = 65_000
server.headersTimeout = 66_000

server.listen(PORT, HOST, () => {
  console.log(`🌐 Rustik Evi web running on http://${HOST}:${PORT} (API: ${API_URL})`)
})

function shutdown(signal) {
  console.log(`${signal} alındı, sunucu kapatılıyor...`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
