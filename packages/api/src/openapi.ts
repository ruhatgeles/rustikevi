export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Rustik Evi API',
    description: 'Perde aksesuarı toptan satıcısı için sipariş ve müşteri yönetim API\'si',
    version: '1.0.0',
    contact: {
      name: 'Rustik Evi',
      url: 'https://rustikevi.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development',
    },
    {
      url: 'https://api.rustikevi.com',
      description: 'Production',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Kimlik doğrulama işlemleri' },
    { name: 'Users', description: 'Kullanıcı yönetimi (Admin)' },
    { name: 'Customers', description: 'Müşteri yönetimi' },
    { name: 'Products', description: 'Ürün yönetimi' },
    { name: 'Orders', description: 'Sipariş yönetimi' },
    { name: 'Content', description: 'İçerik yönetimi' },
    { name: 'Invite Codes', description: 'Davet kodu yönetimi' },
    { name: 'Health', description: 'Sistem sağlık kontrolü' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Temel sağlık kontrolü',
        responses: {
          '200': {
            description: 'Sistem sağlıklı',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/health/detailed': {
      get: {
        tags: ['Health'],
        summary: 'Detaylı sağlık kontrolü',
        responses: {
          '200': {
            description: 'Sistem durumu',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthCheck',
                },
              },
            },
          },
          '503': {
            description: 'Sistem sağlıksız',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Giriş yap',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Başarılı giriş',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Geçersiz kimlik bilgileri' },
          '429': { description: 'Çok fazla deneme' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Token yenile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token yenilendi',
          },
          '401': { description: 'Geçersiz refresh token' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Çıkış yap',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Başarılı çıkış' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Mevcut kullanıcı bilgisi',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Kullanıcı bilgisi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Ürünleri listele',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'tag', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'featured', in: 'query', schema: { type: 'boolean' } },
          { name: 'archived', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': {
            description: 'Ürün listesi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Ürün oluştur',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProduct' },
            },
          },
        },
        responses: {
          '201': { description: 'Ürün oluşturuldu' },
          '400': { description: 'Geçersiz veri' },
          '401': { description: 'Yetkisiz' },
        },
      },
    },
    '/api/products/categories': {
      get: {
        tags: ['Products'],
        summary: 'Kategori listesi',
        responses: {
          '200': {
            description: 'Kategori listesi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/orders': {
      get: {
        tags: ['Orders'],
        summary: 'Siparişleri listele',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'customerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'assignedTo', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'archived', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': {
            description: 'Sipariş listesi',
          },
        },
      },
    },
    '/api/orders/inquiry': {
      post: {
        tags: ['Orders'],
        summary: 'Sipariş talebi oluştur (public)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isletme', 'yetkili', 'telefon', 'urun'],
                properties: {
                  isletme: { type: 'string' },
                  yetkili: { type: 'string' },
                  telefon: { type: 'string', minLength: 10 },
                  sehir: { type: 'string' },
                  urun: { type: 'string' },
                  adet: { type: 'string' },
                  mesaj: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Sipariş talebi oluşturuldu' },
          '400': { description: 'Geçersiz veri' },
          '429': { description: 'Rate limit' },
        },
      },
    },
    '/api/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Sipariş durumu güncelle',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['pending', 'confirmed', 'in_production', 'atelier', 'ready', 'shipped', 'delivered', 'cancelled'],
                  },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Durum güncellendi' },
          '400': { description: 'Geçersiz geçiş' },
        },
      },
    },
    '/api/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Müşterileri listele',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'archived', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': { description: 'Müşteri listesi' },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'Kullanıcıları listele',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Kullanıcı listesi' },
        },
      },
    },
    '/api/content': {
      get: {
        tags: ['Content'],
        summary: 'İçerik bloklarını listele',
        responses: {
          '200': { description: 'İçerik listesi' },
        },
      },
    },
    '/api/invite-codes': {
      get: {
        tags: ['Invite Codes'],
        summary: 'Davet kodlarını listele',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Davet kodu listesi' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'manager', 'viewer'] },
          isActive: { type: 'boolean' },
          isLoginBlocked: { type: 'boolean' },
          isViewOnly: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          productCode: { type: 'string', nullable: true },
          name: { type: 'string' },
          category: { type: 'string' },
          color: { type: 'string', nullable: true },
          description: { type: 'string' },
          shortDescription: { type: 'string' },
          moq: { type: 'string' },
          price: { type: 'integer', nullable: true },
          images: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
          featured: { type: 'boolean' },
          isActive: { type: 'boolean' },
          isArchived: { type: 'boolean' },
          sortOrder: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateProduct: {
        type: 'object',
        required: ['name', 'category'],
        properties: {
          productCode: { type: 'string' },
          name: { type: 'string', minLength: 1, maxLength: 200 },
          category: { type: 'string', minLength: 1, maxLength: 100 },
          color: { type: 'string' },
          description: { type: 'string' },
          shortDescription: { type: 'string' },
          moq: { type: 'string' },
          price: { type: 'integer' },
          images: { type: 'array', items: { type: 'string' } },
          tags: { type: 'array', items: { type: 'string' } },
          featured: { type: 'boolean' },
          isActive: { type: 'boolean' },
          sortOrder: { type: 'integer' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orderNumber: { type: 'string' },
          customerId: { type: 'string', format: 'uuid' },
          status: { type: 'string' },
          totalAmount: { type: 'integer', nullable: true },
          currency: { type: 'string' },
          notes: { type: 'string', nullable: true },
          internalNotes: { type: 'string', nullable: true },
          source: { type: 'string' },
          assignedTo: { type: 'string', format: 'uuid', nullable: true },
          trackingNumber: { type: 'string', nullable: true },
          isArchived: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          businessName: { type: 'string' },
          contactName: { type: 'string', nullable: true },
          phone: { type: 'string' },
          city: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true },
          isArchived: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          version: { type: 'string' },
          uptime: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
          checks: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['up', 'down'] },
                  latency: { type: 'integer', nullable: true },
                  error: { type: 'string', nullable: true },
                },
              },
              redis: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['up', 'down'] },
                  latency: { type: 'integer', nullable: true },
                  error: { type: 'string', nullable: true },
                },
              },
              memory: {
                type: 'object',
                properties: {
                  used: { type: 'integer' },
                  total: { type: 'integer' },
                  percentage: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  },
}
