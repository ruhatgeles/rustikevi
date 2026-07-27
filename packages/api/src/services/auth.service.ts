import { db } from '../db/index.js'
import { users, refreshTokens } from '../db/schema.js'
import { eq, and, gt } from 'drizzle-orm'
import { comparePassword, hashPassword } from '../lib/password.js'
import { signAccessToken, signRefreshToken, getTokenHash, JwtPayload } from '../lib/jwt.js'
import { AppError } from '../lib/errors.js'
import { LoginResponse } from '../types/index.js'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.isActive, true)))
    .limit(1)

  if (!user) {
    throw new AppError(401, 'Invalid email or password')
  }

  const valid = comparePassword(password, user.passwordHash)
  if (!valid) {
    throw new AppError(401, 'Invalid email or password')
  }

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  }

  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  // Store refresh token hash
  const tokenHash = getTokenHash(refreshToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  }
}

export async function refresh(refreshTokenStr: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { verifyToken } = await import('../lib/jwt.js')

  let payload: JwtPayload
  try {
    payload = verifyToken(refreshTokenStr)
  } catch {
    throw new AppError(401, 'Invalid refresh token')
  }

  const tokenHash = getTokenHash(refreshTokenStr)

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.userId, payload.sub),
        gt(refreshTokens.expiresAt, new Date())
      )
    )
    .limit(1)

  if (!stored) {
    throw new AppError(401, 'Refresh token not found or expired')
  }

  // Delete old token
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id))

  // Issue new pair
  const newPayload: JwtPayload = { sub: payload.sub, email: payload.email, role: payload.role }
  const newAccess = signAccessToken(newPayload)
  const newRefresh = signRefreshToken(newPayload)

  const newHash = getTokenHash(newRefresh)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.insert(refreshTokens).values({
    userId: payload.sub,
    tokenHash: newHash,
    expiresAt,
  })

  return { accessToken: newAccess, refreshToken: newRefresh }
}

export async function logout(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}

export async function getMe(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new AppError(404, 'User not found')
  }

  return user
}
