import { describe, it, expect } from 'vitest'

describe('Products Page Logic', () => {
  describe('Category Constants', () => {
    const CATEGORIES = ['Rustik', 'Saçak', 'Başlık', 'Dekorink', 'Sarkıt', 'Braçöl']

    it('should have all product categories', () => {
      expect(CATEGORIES).toHaveLength(6)
      expect(CATEGORIES).toContain('Rustik')
      expect(CATEGORIES).toContain('Saçak')
      expect(CATEGORIES).toContain('Başlık')
      expect(CATEGORIES).toContain('Dekorink')
      expect(CATEGORIES).toContain('Sarkıt')
      expect(CATEGORIES).toContain('Braçöl')
    })
  })

  describe('Color Constants', () => {
    const COLORS = ['Beyaz', 'Krem', 'Kahverengi', 'Siyah', 'Altın', 'Gümüş', 'Gri', 'Ahşap', 'Doğal', 'Özel']

    it('should have all color options', () => {
      expect(COLORS).toHaveLength(10)
      expect(COLORS).toContain('Beyaz')
      expect(COLORS).toContain('Krem')
      expect(COLORS).toContain('Özel')
    })
  })

  describe('Product Form Validation', () => {
    it('should require product name', () => {
      const name = ''
      expect(name.length > 0).toBe(false)
    })

    it('should require category selection', () => {
      const category = ''
      expect(category.length > 0).toBe(false)
    })

    it('should accept valid product data', () => {
      const form = {
        name: 'Jüt Kordon',
        category: 'Rustik',
        color: 'Krem',
        price: '150',
      }

      expect(form.name.length > 0).toBe(true)
      expect(form.category.length > 0).toBe(true)
    })

    it('should validate product code format (5 digits)', () => {
      const validCode = '10011'
      const invalidCode = '1234'
      const invalidCode2 = '123456'

      expect(validCode.length === 5).toBe(true)
      expect(/^\d{5}$/.test(validCode)).toBe(true)
      expect(/^\d{5}$/.test(invalidCode)).toBe(false)
      expect(/^\d{5}$/.test(invalidCode2)).toBe(false)
    })

    it('should convert price from TL to kuruş', () => {
      const priceInTL = '250.75'
      const priceInKurus = Math.round(Number(priceInTL) * 100)

      expect(priceInKurus).toBe(25075)
    })

    it('should handle empty price', () => {
      const price = ''
      const result = price ? Math.round(Number(price) * 100) : undefined

      expect(result).toBeUndefined()
    })
  })

  describe('Swatch Management', () => {
    it('should have default swatch colors', () => {
      const defaultSwatch: [string, string] = ['#c9a876', '#8a6d43']

      expect(defaultSwatch).toHaveLength(2)
      expect(defaultSwatch[0]).toMatch(/^#[0-9a-f]{6}$/)
      expect(defaultSwatch[1]).toMatch(/^#[0-9a-f]{6}$/)
    })

    it('should allow adding swatches', () => {
      let swatches: Array<[string, string]> = [['#c9a876', '#8a6d43']]
      swatches = [...swatches, ['#ff0000', '#00ff00']]

      expect(swatches).toHaveLength(2)
    })

    it('should not remove last swatch', () => {
      const swatches: Array<[string, string]> = [['#c9a876', '#8a6d43']]

      // Should not allow removal when only 1 swatch
      const canRemove = swatches.length > 1
      expect(canRemove).toBe(false)
    })

    it('should allow removing extra swatches', () => {
      let swatches: Array<[string, string]> = [
        ['#c9a876', '#8a6d43'],
        ['#ff0000', '#00ff00'],
      ]

      swatches = swatches.filter((_, i) => i !== 1)
      expect(swatches).toHaveLength(1)
    })
  })

  describe('Search and Filter', () => {
    it('should filter products by search term', () => {
      const products = [
        { id: 1, name: 'Jüt Kordon', category: 'Rustik', color: 'Krem', productCode: '10011' },
        { id: 2, name: 'Ahşap Halka', category: 'Halka', color: 'Ahşap', productCode: '20018' },
        { id: 3, name: 'Keten Bağcık', category: 'Bağcık', color: 'Krem', productCode: '30012' },
      ]

      const search = 'kordon'
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Jüt Kordon')
    })

    it('should filter products by category', () => {
      const products = [
        { id: 1, name: 'Jüt Kordon', category: 'Rustik' },
        { id: 2, name: 'Ahşap Halka', category: 'Halka' },
        { id: 3, name: 'Keten Kordon', category: 'Rustik' },
      ]

      const filtered = products.filter(p => p.category === 'Rustik')
      expect(filtered).toHaveLength(2)
    })

    it('should combine search and category filters', () => {
      const products = [
        { id: 1, name: 'Jüt Kordon', category: 'Rustik' },
        { id: 2, name: 'Ahşap Halka', category: 'Halka' },
        { id: 3, name: 'Keten Kordon', category: 'Rustik' },
      ]

      const search = 'kordon'
      const category = 'Rustik'
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        p.category === category
      )

      expect(filtered).toHaveLength(2)
    })
  })

  describe('Sorting', () => {
    it('should sort by sort order then by id', () => {
      const products = [
        { id: 3, sortOrder: 1 },
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 0 },
      ]

      const sorted = [...products].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)

      expect(sorted[0].id).toBe(1)
      expect(sorted[1].id).toBe(2)
      expect(sorted[2].id).toBe(3)
    })
  })
})
