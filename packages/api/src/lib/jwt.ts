import jwt from 'jsonwebtoken'
import { createHash, randomUUID } from 'node:crypto'

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32 || /change_me|dev_secret/.test(secret)) {
      throw new Error('JWT_SECRET production ortamında en az 32 karakterlik rastgele bir değer olmalı')
    }
    return secret
  }
  if (!secret) {
    console.warn('⚠️  JWT_SECRET not set, using dev_secret — NOT for production!')
    return 'dev_secret'
  }
  return secret
})()
type Expiry = NonNullable<jwt.SignOptions['expiresIn']>
const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY || '15m') as Expiry
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY || '7d') as Expiry

export interface JwtPayload {
  sub: string // user id
  email: string
  role: string
  type?: 'refresh'
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(stripClaims(payload), JWT_SECRET, { expiresIn: ACCESS_EXPIRY, jwtid: randomUUID() })
}

export function signRefreshToken(payload: JwtPayload): string {
  // jti: aynı saniyede üretilen token'lar bile benzersiz olsun (rotation için şart)
  return jwt.sign({ ...stripClaims(payload), type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRY, jwtid: randomUUID() })
}

// Yalnızca uygulama alanları; exp/iat/jti/type tekrar imzalanmasın
function stripClaims({ sub, email, role }: JwtPayload): JwtPayload {
  return { sub, email, role }
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export function getTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
