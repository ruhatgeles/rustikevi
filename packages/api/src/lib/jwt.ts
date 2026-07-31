import jwt from 'jsonwebtoken'
import { createHash } from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  console.warn('⚠️  JWT_SECRET not set, using dev_secret — NOT for production!')
  return 'dev_secret'
})()
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m'
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d'

export interface JwtPayload {
  sub: string // user id
  email: string
  role: string
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY })
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRY })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export function getTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
