import { Hono } from 'hono'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { writeFile, unlink } from 'node:fs/promises'
import * as path from 'node:path'
import sharp from 'sharp'
import { requireManager } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

const upload = new Hono()

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'products')
mkdirSync(UPLOAD_DIR, { recursive: true })

const MAX_SIZE = 20 * 1024 * 1024 // 20MB (ham telefon fotoğrafları)
const MAX_DIMENSION = 1600 // px — web için yeterli, dosya boyutunu ciddi düşürür
const FILENAME_RE = /^[0-9]+-[a-z0-9]+\.(webp|gif|jpg|png)$/

type ImageKind = 'jpeg' | 'png' | 'webp' | 'gif'

/**
 * Dosya türünü içerikten (magic bytes) belirle.
 * Tarayıcının gönderdiği MIME türü ve dosya adı güvenilmezdir: "x.html" resim diye yüklenirse
 * aynı origin'den HTML olarak servis edilip XSS'e yol açar.
 */
function detectImageKind(buf: Buffer): ImageKind | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  const head = buf.toString('ascii', 0, 6)
  if (head === 'GIF87a' || head === 'GIF89a') return 'gif'
  return null
}

function newBaseName(): string {
  return `${Date.now()}-${randomBytes(6).toString('hex')}`
}

/** Görseli doğrular, optimize eder (EXIF yönü, boyut, WebP) ve diske yazar. */
async function saveImage(file: File): Promise<{ url: string; filename: string }> {
  if (file.size > MAX_SIZE) {
    throw new AppError(400, `"${file.name}" 20MB'dan büyük olamaz.`)
  }
  const input = Buffer.from(await file.arrayBuffer())
  const kind = detectImageKind(input)
  if (!kind) {
    throw new AppError(400, `"${file.name}" desteklenmeyen dosya. JPEG, PNG, WebP veya GIF kullanın.`)
  }

  let output: Buffer
  let ext: string
  if (kind === 'gif') {
    // Animasyonu korumak için GIF olduğu gibi saklanır
    output = input
    ext = 'gif'
  } else {
    try {
      output = await sharp(input, { failOn: 'error' })
        .rotate() // EXIF yönünü uygula
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
      ext = 'webp'
    } catch (err) {
      logger.warn({ err, name: file.name }, 'Görsel işlenemedi')
      throw new AppError(400, `"${file.name}" bozuk veya okunamayan bir görsel.`)
    }
  }

  const filename = `${newBaseName()}.${ext}`
  await writeFile(path.join(UPLOAD_DIR, filename), output)
  return { url: `/uploads/products/${filename}`, filename }
}

// POST /api/upload/image — tek görsel (manager+)
upload.post('/image', requireManager(), async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || !(file instanceof File)) {
    throw new AppError(400, 'Dosya bulunamadı')
  }
  const saved = await saveImage(file)
  return c.json({ data: saved }, 201)
})

// POST /api/upload/images — çoklu görsel (manager+)
upload.post('/images', requireManager(), async (c) => {
  const body = await c.req.parseBody({ all: true })
  const files = body['files']
  if (!files) {
    throw new AppError(400, 'Dosya bulunamadı')
  }

  const fileArray = (Array.isArray(files) ? files : [files]).filter((f): f is File => f instanceof File)
  const uploadedFiles: Array<{ url: string; filename: string }> = []
  const errors: string[] = []

  for (const file of fileArray) {
    try {
      uploadedFiles.push(await saveImage(file))
    } catch (err) {
      errors.push(err instanceof AppError ? err.message : `"${file.name}" yüklenemedi`)
    }
  }

  if (uploadedFiles.length === 0) {
    throw new AppError(400, errors[0] || 'Geçerli dosya yüklenemedi')
  }

  return c.json({ data: uploadedFiles, errors }, 201)
})

// DELETE /api/upload/image/:filename — görsel sil (manager+)
upload.delete('/image/:filename', requireManager(), async (c) => {
  const filename = c.req.param('filename')
  // Yalnızca bizim ürettiğimiz dosya adları: path traversal (../) imkânsız
  if (!FILENAME_RE.test(filename)) {
    throw new AppError(400, 'Geçersiz dosya adı')
  }
  try {
    await unlink(path.join(UPLOAD_DIR, filename))
  } catch {
    throw new AppError(404, 'Dosya bulunamadı')
  }
  return c.json({ data: { message: 'Dosya silindi' } })
})

export default upload
