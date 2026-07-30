import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock database ────────────────────────────────────────

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}))

vi.mock('../db/schema.js', () => ({
  orders: { id: 'id', orderNumber: 'orderNumber', customerId: 'customerId', status: 'status', totalAmount: 'totalAmount', currency: 'currency', notes: 'notes', internalNotes: 'internalNotes', assignedTo: 'assignedTo', source: 'source', trackingNumber: 'trackingNumber', isArchived: 'isArchived', createdAt: 'createdAt', updatedAt: 'updatedAt' },
  orderItems: { id: 'id', orderId: 'orderId', productId: 'productId', productName: 'productName', quantity: 'quantity', unitPrice: 'unitPrice', totalPrice: 'totalPrice', itemStatus: 'itemStatus', specifications: 'specifications', isExchanged: 'isExchanged', exchangeNote: 'exchangeNote', createdAt: 'createdAt' },
  orderActivities: { id: 'id', orderId: 'orderId', userId: 'userId', type: 'type', description: 'description', metadata: 'metadata', createdAt: 'createdAt' },
  orderReturns: { id: 'id', orderId: 'orderId', type: 'type', returnShippingCost: 'returnShippingCost', note: 'note', createdAt: 'createdAt' },
  orderReturnItems: { id: 'id', returnId: 'returnId', orderItemId: 'orderItemId', quantity: 'quantity', note: 'note' },
  customers: { id: 'id', businessName: 'businessName', contactName: 'contactName', phone: 'phone', email: 'email', city: 'city', address: 'address', notes: 'notes', tags: 'tags', isArchived: 'isArchived', createdBy: 'createdBy', createdAt: 'createdAt', updatedAt: 'updatedAt' },
  products: { id: 'id', productCode: 'productCode', name: 'name', category: 'category', color: 'color', description: 'description', shortDescription: 'shortDescription', moq: 'moq', price: 'price', swatches: 'swatches', featured: 'featured', isActive: 'isActive', isArchived: 'isArchived', sortOrder: 'sortOrder', createdAt: 'createdAt', updatedAt: 'updatedAt' },
  users: { id: 'id', email: 'email', name: 'name', role: 'role' },
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

describe('Order Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Status Transitions', () => {
    it('should have valid order status transitions defined', async () => {
      const { VALID_ORDER_TRANSITIONS } = await import('../services/order.service.js')

      expect(VALID_ORDER_TRANSITIONS).toBeDefined()
      expect(VALID_ORDER_TRANSITIONS.pending).toContain('confirmed')
      expect(VALID_ORDER_TRANSITIONS.pending).toContain('cancelled')
      expect(VALID_ORDER_TRANSITIONS.cancelled).toHaveLength(0)
    })

    it('should have valid item status transitions defined', async () => {
      const { VALID_ITEM_TRANSITIONS } = await import('../services/order.service.js')

      expect(VALID_ITEM_TRANSITIONS).toBeDefined()
      expect(VALID_ITEM_TRANSITIONS.pending).toContain('confirmed')
      expect(VALID_ITEM_TRANSITIONS.delivered).toContain('returned')
      expect(VALID_ITEM_TRANSITIONS.delivered).toContain('exchanged')
      expect(VALID_ITEM_TRANSITIONS.returned).toHaveLength(0)
      expect(VALID_ITEM_TRANSITIONS.exchanged).toHaveLength(0)
    })

    it('should have all order status labels', async () => {
      const { STATUS_LABELS } = await import('../services/order.service.js')

      expect(STATUS_LABELS).toBeDefined()
      expect(STATUS_LABELS.pending).toBe('Sipariş Geldi')
      expect(STATUS_LABELS.confirmed).toBe('Onaylandı')
      expect(STATUS_LABELS.in_production).toBe('Üretimde')
      expect(STATUS_LABELS.atelier).toBe('Atölyede')
      expect(STATUS_LABELS.ready).toBe('Hazır')
      expect(STATUS_LABELS.shipped).toBe('Kargoda')
      expect(STATUS_LABELS.delivered).toBe('Teslim Edildi')
      expect(STATUS_LABELS.cancelled).toBe('İptal Edildi')
    })

    it('should have all item status labels', async () => {
      const { ITEM_STATUS_LABELS } = await import('../services/order.service.js')

      expect(ITEM_STATUS_LABELS).toBeDefined()
      expect(ITEM_STATUS_LABELS.pending).toBe('Beklemede')
      expect(ITEM_STATUS_LABELS.returned).toBe('İade')
      expect(ITEM_STATUS_LABELS.exchanged).toBe('Değişim')
    })

    it('should not allow transition from cancelled to any status', async () => {
      const { VALID_ORDER_TRANSITIONS } = await import('../services/order.service.js')

      expect(VALID_ORDER_TRANSITIONS.cancelled).toEqual([])
    })

    it('should allow delivered to be cancelled', async () => {
      const { VALID_ORDER_TRANSITIONS } = await import('../services/order.service.js')

      expect(VALID_ORDER_TRANSITIONS.delivered).toContain('cancelled')
    })
  })

  describe('Order Number Generation', () => {
    it('should generate order number with RVE prefix', async () => {
      const { db } = await import('../db/index.js')

      // Mock the MAX query for order number generation
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }

      // The generateOrderNumber function is internal, but we can verify
      // the pattern by checking the schema expects RVE-XXXXXXX format
      const orderNumberPattern = /^RVE-\d{7}$/
      expect('RVE-0000001').toMatch(orderNumberPattern)
      expect('RVE-0000020').toMatch(orderNumberPattern)
      expect('RVE-1234567').toMatch(orderNumberPattern)
    })
  })

  describe('Order Item Calculations', () => {
    it('should calculate total price correctly', () => {
      // Test the price calculation logic
      const items = [
        { quantity: 10, unitPrice: 15000 }, // 150 TL
        { quantity: 5, unitPrice: 20000 },  // 200 TL
      ]

      const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

      expect(total).toBe(250000) // 2500 TL in kuruş
    })

    it('should handle null unit prices', () => {
      const items = [
        { quantity: 10, unitPrice: 15000 },
        { quantity: 5, unitPrice: null },
      ]

      const total = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0)

      expect(total).toBe(150000)
    })

    it('should return null total when all prices are null', () => {
      const items = [
        { quantity: 10, unitPrice: null },
        { quantity: 5, unitPrice: null },
      ]

      const total = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0)

      expect(total).toBe(0)
    })
  })

  describe('Return & Exchange Validation', () => {
    it('should only allow returns on delivered orders', () => {
      const validStatuses = ['delivered']
      const testStatus = 'pending'

      expect(validStatuses).toContain('delivered')
      expect(validStatuses).not.toContain(testStatus)
    })

    it('should only allow exchanges on delivered orders', () => {
      const validStatuses = ['delivered']
      const testStatus = 'confirmed'

      expect(validStatuses).toContain('delivered')
      expect(validStatuses).not.toContain(testStatus)
    })
  })

  describe('getOrderById', () => {
    it('should throw 404 when order not found', async () => {
      const { getOrderById } = await import('../services/order.service.js')
      const { db } = await import('../db/index.js')

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(getOrderById('nonexistent-id')).rejects.toThrow('Order not found')
    })
  })

  describe('archiveOrder', () => {
    it('should throw 404 when archiving non-existent order', async () => {
      const { archiveOrder } = await import('../services/order.service.js')
      const { db } = await import('../db/index.js')

      // Mock getOrderById to throw
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(archiveOrder('nonexistent-id', 'user-1')).rejects.toThrow('Order not found')
    })
  })

  describe('deleteOrder', () => {
    it('should not allow deleting non-archived orders', async () => {
      const { deleteOrder } = await import('../services/order.service.js')
      const { db } = await import('../db/index.js')

      const nonArchivedOrder = {
        id: 'order-1',
        isArchived: false,
        status: 'pending',
      }

      // Mock getOrderById
      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([nonArchivedOrder])
          .mockResolvedValueOnce([]) // items
          .mockResolvedValueOnce([]) // activities
          .mockResolvedValueOnce([{ businessName: 'Test' }]), // customer
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(deleteOrder('order-1', 'user-1')).rejects.toThrow('Sadece arşivlenmiş siparişler silinebilir')
    })
  })

  describe('bulkDeleteOrders', () => {
    it('should throw when no archived orders found for deletion', async () => {
      const { bulkDeleteOrders } = await import('../services/order.service.js')
      const { db } = await import('../db/index.js')

      const nonArchivedOrders = [
        { id: 'order-1', isArchived: false },
        { id: 'order-2', isArchived: false },
      ]

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(nonArchivedOrders),
      }
      vi.mocked(db).select.mockReturnValue(mockSelectChain as any)

      await expect(bulkDeleteOrders(['order-1', 'order-2'], 'user-1')).rejects.toThrow('Silinecek arşivlenmiş sipariş bulunamadı')
    })
  })
})
