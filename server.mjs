import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const { default: fetchHandler } = await import('./dist/server/server.js')

const PORT = process.env.PORT || 3000
const CLIENT_DIR = join(process.cwd(), 'dist', 'client')

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  let pathname = url.pathname

  // Try to serve from dist/client
  const filePath = join(CLIENT_DIR, pathname)

  try {
    const fileStat = await stat(filePath)
    if (fileStat.isFile()) {
      const ext = extname(filePath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      const content = await readFile(filePath)

      const headers = {
        'Content-Type': contentType,
        'Content-Length': content.length,
      }

      // Cache static assets aggressively
      if (pathname.startsWith('/assets/')) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable'
      } else if (ext === '.png' || ext === '.jpg' || ext === '.ico' || ext === '.svg') {
        headers['Cache-Control'] = 'public, max-age=604800'
      }

      res.writeHead(200, headers)
      res.end(content)
      return true
    }
  } catch {
    // File not found, fall through to SSR
  }

  return false
}

const server = createServer(async (req, res) => {
  try {
    // Try static file first
    const served = await serveStatic(req, res)
    if (served) return

    // Fall back to SSR
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
    })

    const response = await fetchHandler.fetch(request)

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()))

    if (response.body) {
      const reader = response.body.getReader()
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }
        res.end()
      }
      await pump()
    } else {
      res.end()
    }
  } catch (err) {
    console.error('Server error:', err)
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal Server Error')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Rustik Evi web running on http://0.0.0.0:${PORT}`)
})
