import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

// Async sürümler event loop'u bloklamaz (sync bcrypt her girişte tüm API'yi ~250ms durduruyordu)
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Kullanıcı bulunamadığında da aynı süreyi harcamak için (e-posta varlığını zamanlamadan sızdırmamak)
const DUMMY_HASH = '$2b$12$vgAxX4lKDCafo6prYHOci.1rsyq5R5NMVLlAM6oxH93stmn7PNLZm'
export async function burnPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH)
}
