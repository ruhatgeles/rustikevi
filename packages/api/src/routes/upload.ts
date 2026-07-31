import { Hono } from 'hono'
import { requireManager } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import * as fs from 'fs'
import * as path from 'path'

const upload = new Hono()

// Upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'products')

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// POST /api/upload/image — upload product image (manager+)
upload.post('/image', requireManager(), async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
      throw new AppError(400, 'Dosya bulunamadı')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      throw new AppError(400, 'Desteklenmeyen dosya formatı. JPEG, PNG, WebP veya GIF kullanın.')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      throw new AppError(400, 'Dosya boyutu 5MB\'dan büyük olamaz.')
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}-${random}.${ext}`
    const filepath = path.join(UPLOAD_DIR, filename)

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filepath, buffer)

    // Return URL
    const url = `/uploads/products/${filename}`

    return c.json({ data: { url, filename } }, 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(500, 'Dosya yükleme hatası')
  }
})

// POST /api/upload/images — multiple image upload (manager+)
upload.post('/images', requireManager(), async (c) => {
  try {
    const body = await c.req.parseBody({ all: true })
    const files = body['files']

    if (!files) {
      throw new AppError(400, 'Dosya bulunamadı')
    }

    const fileArray = Array.isArray(files) ? files : [files]
    const uploadedFiles: Array<{ url: string; filename: string }> = []

    for (const file of fileArray) {
      if (!(file instanceof File)) continue

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        continue // Skip invalid files
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        continue // Skip large files
      }

      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg'
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const filename = `${timestamp}-${random}.${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(filepath, buffer)

      uploadedFiles.push({
        url: `/uploads/products/${filename}`,
        filename,
      })
    }

    if (uploadedFiles.length === 0) {
      throw new AppError(400, 'Geçerli dosya yüklenemedi')
    }

    return c.json({ data: uploadedFiles }, 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(500, 'Dosya yükleme hatası')
  }
})

// DELETE /api/upload/image/:filename — delete uploaded image (manager+)
upload.delete('/image/:filename', requireManager(), async (c) => {
  const filename = c.req.param('filename')
  const filepath = path.join(UPLOAD_DIR, filename)

  if (!fs.existsSync(filepath)) {
    throw new AppError(404, 'Dosya bulunamadı')
  }

  fs.unlinkSync(filepath)

  return c.json({ data: { message: 'Dosya silindi' } })
})

export default upload
