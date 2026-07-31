import { db } from '../db/index.js'
import { users, autoLoginTokens } from '../db/schema.js'
import { eq, and, gt, sql } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'
import { signAccessToken, signRefreshToken, getTokenHash, JwtPayload } from '../lib/jwt.js'
import crypto from 'crypto'

// Token süresi: 90 gün
const TOKEN_EXPIRY_DAYS = 90
const MAX_USES = 1000

/**
 * Kullanıcı için otomatik giriş linki oluştur veya mevcut linki getir
 */
export async function createAutoLoginToken(userId: string): Promise<{ token: string; url: string; expiresAt: Date; useCount: number }> {
  // Kullanıcıyı kontrol et
  const [user] = await db
    .select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new AppError(404, 'Kullanıcı bulunamadı')
  }

  if (!user.isActive) {
    throw new AppError(400, 'Bu kullanıcı aktif değil')
  }

  // Mevcut token var mı kontrol et
  const [existing] = await db
    .select({
      id: autoLoginTokens.id,
      useCount: autoLoginTokens.useCount,
      expiresAt: autoLoginTokens.expiresAt,
    })
    .from(autoLoginTokens)
    .where(
      and(
        eq(autoLoginTokens.userId, userId),
        gt(autoLoginTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  // Mevcut token varsa ve kullanılabilecek durumdaysa, yeni token oluşturup güncelle
  if (existing) {
    // Yeni token oluştur (eski linki geçersiz kıl)
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = getTokenHash(token)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    await db
      .update(autoLoginTokens)
      .set({
        tokenHash,
        useCount: 0,
        maxUses: MAX_USES,
        expiresAt,
      })
      .where(eq(autoLoginTokens.id, existing.id))

    const baseUrl = process.env.ADMIN_URL || 'http://localhost:3002'
    const url = `${baseUrl}/auto-login/${token}`

    return { token, url, expiresAt, useCount: 0 }
  }

  // Yeni token oluştur
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = getTokenHash(token)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(autoLoginTokens).values({
    userId,
    tokenHash,
    useCount: 0,
    maxUses: MAX_USES,
    expiresAt,
  })

  const baseUrl = process.env.ADMIN_URL || 'http://localhost:3002'
  const url = `${baseUrl}/auto-login/${token}`

  return { token, url, expiresAt, useCount: 0 }
}

/**
 * Token ile otomatik giriş yap
 */
export async function autoLogin(token: string): Promise<{
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; name: string; role: string }
}> {
  const tokenHash = getTokenHash(token)

  // Token'ı bul
  const [stored] = await db
    .select({
      id: autoLoginTokens.id,
      userId: autoLoginTokens.userId,
      useCount: autoLoginTokens.useCount,
      maxUses: autoLoginTokens.maxUses,
      expiresAt: autoLoginTokens.expiresAt,
    })
    .from(autoLoginTokens)
    .where(
      and(
        eq(autoLoginTokens.tokenHash, tokenHash),
        gt(autoLoginTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!stored) {
    throw new AppError(401, 'Geçersiz veya süresi dolmuş token')
  }

  // Kullanım sayısını kontrol et
  if (stored.useCount >= stored.maxUses) {
    throw new AppError(401, 'Bu linkin kullanım hakkı dolmuş. Yeni link isteyin.')
  }

  // Kullanıcıyı getir
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      isViewOnly: users.isViewOnly,
    })
    .from(users)
    .where(eq(users.id, stored.userId))
    .limit(1)

  if (!user || !user.isActive) {
    throw new AppError(401, 'Kullanıcı bulunamadı veya aktif değil')
  }

  // Kullanım sayısını artır
  await db
    .update(autoLoginTokens)
    .set({ useCount: sql`${autoLoginTokens.useCount} + 1` })
    .where(eq(autoLoginTokens.id, stored.id))

  // Normal JWT token'ları oluştur
  const effectiveRole = user.isViewOnly ? 'viewer' : user.role
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: effectiveRole,
  }

  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
    },
  }
}

/**
 * Kullanıcının mevcut otomatik giriş link bilgisini getir
 */
export async function getAutoLoginInfo(userId: string): Promise<{
  exists: boolean
  useCount?: number
  maxUses?: number
  expiresAt?: Date
} | null> {
  const [stored] = await db
    .select({
      useCount: autoLoginTokens.useCount,
      maxUses: autoLoginTokens.maxUses,
      expiresAt: autoLoginTokens.expiresAt,
    })
    .from(autoLoginTokens)
    .where(
      and(
        eq(autoLoginTokens.userId, userId),
        gt(autoLoginTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!stored) {
    return { exists: false }
  }

  return {
    exists: true,
    useCount: stored.useCount,
    maxUses: stored.maxUses,
    expiresAt: stored.expiresAt,
  }
}

/**
 * Kullanıcının otomatik giriş linkini sil
 */
export async function deleteAutoLoginToken(userId: string): Promise<void> {
  await db
    .delete(autoLoginTokens)
    .where(eq(autoLoginTokens.userId, userId))
}
