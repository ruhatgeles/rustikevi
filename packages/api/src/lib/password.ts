import { hashSync, compareSync } from 'bcryptjs'

const SALT_ROUNDS = 12

export function hashPassword(password: string): string {
  return hashSync(password, SALT_ROUNDS)
}

export function comparePassword(password: string, hash: string): boolean {
  return compareSync(password, hash)
}
