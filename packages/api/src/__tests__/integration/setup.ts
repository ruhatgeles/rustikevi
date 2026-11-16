// Servisler src/db/index.ts'teki bağlantıyı kullanır; global-setup DATABASE_URL'i
// test container'ına yönlendirdiği için testler ve servisler aynı veritabanını görür.
import { db } from '../../db/index.js'

export function getTestDb() {
  return db
}
