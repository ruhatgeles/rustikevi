import { AppError } from './errors.js'

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Şifre en az 8 karakter olmalıdır')
  }

  if (password.length > 128) {
    errors.push('Şifre en fazla 128 karakter olabilir')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Şifre en az bir büyük harf içermelidir')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Şifre en az bir küçük harf içermelidir')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Şifre en az bir rakam içermelidir')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validatePasswordOrThrow(password: string): void {
  const result = validatePassword(password)
  if (!result.valid) {
    throw new AppError(400, result.errors.join('. '))
  }
}

// Zod ile entegrasyon için custom validator
export const passwordSchema = (z: any) =>
  z
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .max(128, 'Şifre en fazla 128 karakter olabilir')
    .refine((val: string) => /[A-Z]/.test(val), 'Şifre en az bir büyük harf içermelidir')
    .refine((val: string) => /[a-z]/.test(val), 'Şifre en az bir küçük harf içermelidir')
    .refine((val: string) => /[0-9]/.test(val), 'Şifre en az bir rakam içermelidir')
