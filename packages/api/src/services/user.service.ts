import { db } from '../db/index.js'
import { users, inviteCodes } from '../db/schema.js'
import { eq, and, ilike, sql, desc } from 'drizzle-orm'
import { hashPassword } from '../lib/password.js'
import { AppError } from '../lib/errors.js'
import { PaginatedResponse } from '../types/index.js'

interface CreateUserInput {
  email: string
  password: string
  name: string
  role?: string
  inviteCode?: string
}

interface UpdateUserInput {
  name?: string
  email?: string
  password?: string
  role?: string
  isActive?: boolean
}

export async function listUsers(
  page = 1,
  limit = 20,
  search?: string
): Promise<PaginatedResponse<typeof users.$inferSelect>> {
  const offset = (page - 1) * limit

  const where = search
    ? ilike(users.name, `%${search}%`)
    : undefined

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(where)

  const data = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    data,
    total: countResult.count,
    page,
    limit,
    totalPages: Math.ceil(countResult.count / limit),
  }
}

export async function createUser(input: CreateUserInput, createdById?: string) {
  // Check duplicate email
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)

  if (existing) {
    throw new AppError(409, 'Email already in use')
  }

  // Validate invite code if provided
  let inviteCodeId: string | undefined
  if (input.inviteCode) {
    const [code] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, input.inviteCode))
      .limit(1)

    if (!code) {
      throw new AppError(400, 'Invalid invite code')
    }

    if (code.expiresAt && code.expiresAt < new Date()) {
      throw new AppError(400, 'Invite code has expired')
    }

    if (code.maxUses !== null && code.useCount >= code.maxUses) {
      throw new AppError(400, 'Invite code has been fully used')
    }

    inviteCodeId = code.id

    // Increment use count
    await db
      .update(inviteCodes)
      .set({ useCount: sql`${inviteCodes.useCount} + 1` })
      .where(eq(inviteCodes.id, code.id))
  }

  const passwordHash = hashPassword(input.password)

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      role: (input.role as any) || 'viewer',
      inviteCodeId,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })

  return user
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const updateData: any = { ...input, updatedAt: new Date() }

  // Şifre değiştiriliyorsa hashle
  if (input.password) {
    updateData.passwordHash = hashPassword(input.password)
    delete updateData.password
  }

  // E-posta değiştiriliyorsa mükerrer kontrolü yap
  if (input.email) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, input.email), sql`${users.id} != ${id}`))
      .limit(1)

    if (existing) {
      throw new AppError(409, 'Bu e-posta adresi zaten kullanılıyor')
    }
  }

  const [user] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      updatedAt: users.updatedAt,
    })

  if (!user) {
    throw new AppError(404, 'Kullanıcı bulunamadı')
  }

  return user
}

export async function deactivateUser(id: string) {
  const [user] = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id })

  if (!user) {
    throw new AppError(404, 'User not found')
  }

  return user
}
