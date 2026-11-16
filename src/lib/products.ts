import { createServerFn } from '@tanstack/react-start'
import type { Product } from '@/data/products'
import fallbackProducts from '@/data/products'

const API_URL = process.env.API_URL || 'http://localhost:3001'

async function fetchFromAPI<T>(path: string): Promise<T | null> {
  try {
    // API asılı kalırsa SSR'ı bloklamasın → zaman aşımında fallback
    const res = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export const getProducts = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Product[]> => {
    const apiProducts = await fetchFromAPI<Product[]>('/api/products')
    if (apiProducts && apiProducts.length > 0) return apiProducts
    return fallbackProducts
  },
)

export const getFeaturedProducts = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Product[]> => {
    const apiProducts = await fetchFromAPI<Product[]>(
      '/api/products?featured=true',
    )
    // Fallback yalnızca API erişilemezse (null); öne çıkan yoksa gerçek ürünlerden ilk 3'ü
    if (apiProducts === null) return fallbackProducts.filter((p) => p.featured)
    if (apiProducts.length > 0) return apiProducts
    const all = await fetchFromAPI<Product[]>('/api/products')
    // Hiç ürün yoksa getProducts ile tutarlı: katalog da fallback gösterir
    if (!all || all.length === 0) return fallbackProducts.filter((p) => p.featured)
    return all.slice(0, 3)
  },
)
