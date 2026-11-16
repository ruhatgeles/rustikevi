import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}))

vi.mock('../db/schema.js', () => ({
  products: { id: 'id', productCode: 'productCode', name: 'name', category: 'category', color: 'color', description: 'description', shortDescription: 'shortDescription', moq: 'moq', price: 'price', swatches: 'swatches', featured: 'featured', isActive: 'isActive', isArchived: 'isArchived', sortOrder: 'sortOrder', createdAt: 'createdAt', updatedAt: 'updatedAt' },
}))

vi.mock('../lib/errors.js', () => ({
  AppError: class AppError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

describe('Product Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Product Code Generation', () => {
    it('should have correct category codes', async () => {
      const { CATEGORY_CODES } = await import('../services/product.service.js')

      expect(CATEGORY_CODES['Kordon']).toBe(1)
      expect(CATEGORY_CODES['Halka']).toBe(2)
      expect(CATEGORY_CODES['Bağcık']).toBe(3)
      expect(CATEGORY_CODES['Saçak']).toBe(4)
      expect(CATEGORY_CODES['Sarkıt']).toBe(5)
      expect(CATEGORY_CODES['Braçol']).toBe(6)
      expect(CATEGORY_CODES['Aksesuar']).toBe(7)
      expect(CATEGORY_CODES['Diğer']).toBe(9)
    })

    it('should have correct color codes', async () => {
      const { COLOR_CODES } = await import('../services/product.service.js')

      expect(COLOR_CODES['Beyaz']).toBe(1)
      expect(COLOR_CODES['Krem']).toBe(2)
      expect(COLOR_CODES['Kahverengi']).toBe(3)
      expect(COLOR_CODES['Siyah']).toBe(4)
      expect(COLOR_CODES['Altın']).toBe(5)
      expect(COLOR_CODES['Gümüş']).toBe(6)
      expect(COLOR_CODES['Gri']).toBe(7)
      expect(COLOR_CODES['Ahşap']).toBe(8)
      expect(COLOR_CODES['Doğal']).toBe(9)
      expect(COLOR_CODES['Özel']).toBe(0)
    })

    it('should have reverse color name mapping', async () => {
      const { COLOR_NAMES } = await import('../services/product.service.js')

      expect(COLOR_NAMES[1]).toBe('Beyaz')
      expect(COLOR_NAMES[2]).toBe('Krem')
      expect(COLOR_NAMES[0]).toBe('Özel')
    })

    it('should generate 5-digit product codes', () => {
      // Test the code format logic
      const catCode = 1 // Kordon
      const seqCode = 1
      const colorCode = 1 // Beyaz

      const code = (catCode * 10000) + (seqCode * 10) + colorCode
      const codeStr = String(code).padStart(5, '0')

      expect(codeStr).toBe('10011')
      expect(codeStr.length).toBe(5)
    })

    it('should generate correct codes for different categories', () => {
      // Kordon(1) + seq 1 + Beyaz(1) = 10011
      expect(String((1 * 10000) + (1 * 10) + 1).padStart(5, '0')).toBe('10011')

      // Halka(2) + seq 3 + Siyah(4) = 20034
      expect(String((2 * 10000) + (3 * 10) + 4).padStart(5, '0')).toBe('20034')

      // Saçak(4) + seq 5 + Altın(5) = 40055
      expect(String((4 * 10000) + (5 * 10) + 5).padStart(5, '0')).toBe('40055')
    })

    it('parses the full 3-digit sequence block (no collision after 9 products)', async () => {
      const { nextSequenceFromCodes } = await import('../services/product.service.js')

      // 10101 = Kordon + sıra 010 + Beyaz → sonraki 11 olmalı (eski kod 1 diyordu)
      expect(nextSequenceFromCodes(['10011', '10094', '10101'], 1)).toBe(11)
      expect(nextSequenceFromCodes(['19991'], 1)).toBe(1000)
      expect(nextSequenceFromCodes([], 1)).toBe(1)
    })

    it('only counts codes with the same category prefix and 5-digit format', async () => {
      const { nextSequenceFromCodes } = await import('../services/product.service.js')

      expect(nextSequenceFromCodes(['20051', '10021', null, 'ABCDE', '9001'], 2)).toBe(6)
      expect(nextSequenceFromCodes(['20051', '10021'], 9)).toBe(1)
    })

    it('detects Postgres unique violations (direct or wrapped)', async () => {
      const { isUniqueViolation } = await import('../services/product.service.js')

      expect(isUniqueViolation({ code: '23505' })).toBe(true)
      expect(isUniqueViolation({ cause: { code: '23505' } })).toBe(true)
      expect(isUniqueViolation({ code: '23503' })).toBe(false)
      expect(isUniqueViolation(null)).toBe(false)
    })
  })

  describe('getProductById', () => {
    it('should throw 404 when product not found', async () => {
      const { getProductById } = await import('../services/product.service.js')
      const { db } = await import('../db/index.js')

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(getProductById(999)).rejects.toThrow('Product not found')
    })

    it('should return product when found', async () => {
      const { getProductById } = await import('../services/product.service.js')
      const { db } = await import('../db/index.js')

      const product = {
        id: 1,
        productCode: '10011',
        name: 'Test Product',
        category: 'Kordon',
        color: 'Beyaz',
        description: 'Test description',
        shortDescription: 'Short desc',
        moq: '100 adet',
        price: 15000,
        swatches: [['#fff', '#000']],
        featured: false,
        isActive: true,
        isArchived: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([product]),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      const result = await getProductById(1)

      expect(result).toEqual(product)
    })
  })

  describe('updateProduct', () => {
    it('should throw 404 when updating non-existent product', async () => {
      const { updateProduct } = await import('../services/product.service.js')
      const { db } = await import('../db/index.js')

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).update.mockReturnValue(mockUpdateChain as any)

      await expect(updateProduct(999, { name: 'Updated' })).rejects.toThrow('Product not found')
    })
  })

  describe('deleteProduct', () => {
    it('should throw 404 when deleting non-existent product', async () => {
      const { deleteProduct } = await import('../services/product.service.js')
      const { db } = await import('../db/index.js')

      const mockDeleteChain = {
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).delete.mockReturnValue(mockDeleteChain as any)

      await expect(deleteProduct(999)).rejects.toThrow('Product not found')
    })
  })

  describe('archiveProduct', () => {
    it('should throw 404 when archiving non-existent product', async () => {
      const { archiveProduct } = await import('../services/product.service.js')
      const { db } = await import('../db/index.js')

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).update.mockReturnValue(mockUpdateChain as any)

      await expect(archiveProduct(999)).rejects.toThrow('Product not found')
    })
  })

  describe('unarchiveProduct', () => {
    it('should throw 404 when unarchiving non-existent product', async () => {
      const { unarchiveProduct } = await import('../services/product.service.js')
      const { db } = await import('../db/index.js')

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(db).update.mockReturnValue(mockUpdateChain as any)

      await expect(unarchiveProduct(999)).rejects.toThrow('Product not found')
    })
  })
})
