import { createServerFn } from '@tanstack/react-start'
import type { Product } from '@/data/products'
import fallbackProducts from '@/data/products'

const API_URL = process.env.API_URL || 'http://localhost:3001'

async function fetchFromAPI<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`)
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
    if (apiProducts && apiProducts.length > 0) return apiProducts
    return fallbackProducts.filter((p) => p.featured)
  },
)
