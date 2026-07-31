import { db } from '../db/index.js'
import { users, autoLoginTokens } from '../db/schema.js'
import { eq, and, gt } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'
import { signAccessToken, signRefreshToken, getTokenHash, JwtPayload } from '../lib/jwt.js'
import crypto from 'crypto'

// Token süresi: 30 gün
const TOKEN_EXPIRY_DAYS = 30

/**
 * Kullanıcı için otomatik giriş linki oluştur
 */
export async function createAutoLoginToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
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

  // Önce bu kullanıcının eski token'larını temizle
  await db
    .delete(autoLoginTokens)
    .where(eq(autoLoginTokens.userId, userId))

  // Yeni token oluştur
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = getTokenHash(token)
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // Token'ı kaydet
  await db.insert(autoLoginTokens).values({
    userId,
    tokenHash,
    expiresAt,
  })

  return { token, expiresAt }
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

  // Token'ı kullanıldıktan sonra yenile (her girişte yeni token)
  await db.delete(autoLoginTokens).where(eq(autoLoginTokens.id, stored.id))

  // Yeni token oluştur (kullanıcı tekrar giriş yapabilsin)
  const newToken = crypto.randomBytes(32).toString('hex')
  const newTokenHash = getTokenHash(newToken)
  const newExpiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(autoLoginTokens).values({
    userId: user.id,
    tokenHash: newTokenHash,
    expiresAt: newExpiresAt,
  })

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
 * Kullanıcının mevcut otomatik giriş linkini getir
 */
export async function getAutoLoginLink(userId: string): Promise<{ token: string; expiresAt: Date } | null> {
  const [stored] = await db
    .select({
      tokenHash: autoLoginTokens.tokenHash,
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
    return null
  }

  // Token hash'i geri dönüştürülemez, bu yüzden sadece varlığını bildiriyoruz
  // Gerçek token sadece oluşturulduğunda bilinebilir
  return { token: '***', expiresAt: stored.expiresAt }
}

/**
 * Kullanıcının otomatik giriş linkini sil
 */
export async function deleteAutoLoginToken(userId: string): Promise<void> {
  await db
    .delete(autoLoginTokens)
    .where(eq(autoLoginTokens.userId, userId))
}
