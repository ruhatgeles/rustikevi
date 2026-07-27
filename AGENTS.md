# AGENTS.md

Bu doküman, Rustik Evi projesinin mimarisini gelecekteki AI ajanları ve
geliştiriciler için özetler.

## Proje Özeti

Rustik Evi — perde aksesuarı toptan satıcısı. Monorepo yapısında frontend + backend.

**Frontend:** SSR tanıtım sitesi (TanStack Start, Docker deploy). Ürün verisi
admin paneli üzerinden yönetilir (`GET /api/products`), hardcoded veri fallback
olarak kalır. Sipariş talepleri backend API + WhatsApp wa.me.

**Backend:** Docker'da çalışan Hono API + React admin paneli. PostgreSQL + Redis.
Ürün yönetimi, müşteri yönetimi, içerik yönetimi, kullanıcı/davet kodu/yetkilendirme.

### Teknoloji Yığını

#### Frontend (`src/`)
| Katman | Teknoloji |
|--------|-----------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Stil | Tailwind CSS 4 (CSS custom properties ile tema) |
| İkonlar | lucide-react |
| Form | Backend API (POST /api/orders) + WhatsApp wa.me |
| Deploy | Docker (Linux sunucu) |

#### Backend (`packages/api`)
| Katman | Teknoloji |
|--------|-----------|
| API Framework | Hono (TypeScript) |
| ORM | Drizzle ORM |
| DB | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | Custom JWT + RBAC (admin/manager/viewer) |
| Validation | Zod |
| Container | Docker |

#### Admin Panel (`packages/admin`)
| Katman | Teknoloji |
|--------|-----------|
| Framework | React 19 + Vite 7 |
| Stil | Tailwind CSS 4 |
| Router | react-router-dom v7 |
| İkonlar | lucide-react |

## Dizin Yapısı

```
rustikevi-web/
├── src/                            # Frontend (TanStack Start)
│   ├── components/
│   │   ├── Header.tsx              # Üst menü, mobil menü, "Toptan Sipariş Ver" CTA
│   │   ├── Footer.tsx              # Alt bilgi: iletişim, sosyal medya, sayfa linkleri
│   │   ├── WhatsAppFloatingButton.tsx  # Sağ altta sabit WhatsApp sipariş butonu
│   │   ├── WhatsAppOrderForm.tsx   # İletişim sayfasındaki hızlı sipariş formu
│   │   ├── CatalogQRCode.tsx       # /katalog sayfasına yönlenen QR kod
│   │   ├── ProductCard.tsx         # Ürün kartı (gradyan görsel + kategori rozeti)
│   │   └── icons/WhatsAppIcon.tsx  # Inline SVG WhatsApp ikonu
│   ├── data/
│   │   └── products.ts            # Ürün kataloğu verisi + kategori listesi
│   ├── lib/
│   │   ├── products.ts            # createServerFn ile API'den ürün çekme
│   │   └── site-config.ts         # Marka bilgileri, WhatsApp numarası
│   ├── routes/
│   │   ├── __root.tsx             # Header/Footer/WhatsApp butonu + kök layout
│   │   ├── index.tsx              # Ana Sayfa
│   │   ├── urunlerimiz.tsx        # Ürünlerimiz (kategori filtresi)
│   │   ├── hakkinda.tsx           # Hakkında
│   │   ├── iletisim.tsx           # İletişim + sipariş formu
│   │   └── katalog.tsx            # Dijital katalog
│   └── styles.css                 # Tema değişkenleri, font importları
├── packages/
│   ├── api/                       # Hono REST API sunucusu (port 3001)
│   │   └── src/
│   │       ├── db/
│   │       │   ├── schema.ts      # Drizzle şema (6 tablo)
│   │       │   ├── index.ts       # DB bağlantısı
│   │       │   ├── migrate.ts     # Migration runner
│   │       │   └── seed.ts        # Seed data (ilk admin)
│   │       ├── routes/
│   │       │   ├── auth.ts        # login, refresh, logout, me
│   │       │   ├── users.ts       # Kullanıcı CRUD (admin)
│   │       │   ├── customers.ts   # Müşteri CRUD (manager+)
│   │       │   ├── content.ts     # İçerik CRUD (manager+)
│   │       │   ├── invite-codes.ts # Davet kodu üretme/doğrulama
│   │       │   ├── orders.ts      # Sipariş talebi (public)
│   │       │   └── products.ts    # Ürün CRUD (public list, manager+ yazma)
│   │       ├── services/          # İş mantığı katmanı
│   │       ├── middleware/
│   │       │   ├── auth.ts        # JWT verify + RBAC guard
│   │       │   ├── cors.ts
│   │       │   └── rate-limit.ts
│   │       └── lib/
│   │           ├── jwt.ts         # Token üret/verify
│   │           ├── password.ts    # bcrypt hash/compare
│   │           └── errors.ts      # HTTP error handler
│   └── admin/                     # React admin paneli (port 3002)
│       └── src/
│           ├── pages/
│           │   ├── Login.tsx
│           │   ├── Dashboard.tsx
│           │   ├── Products.tsx    # Ürün yönetimi (manager+)
│           │   ├── Users.tsx       # Kullanıcı yönetimi (admin)
│           │   ├── Customers.tsx   # Müşteri yönetimi (manager+)
│           │   ├── Content.tsx     # İçerik yönetimi (manager+)
│           │   └── InviteCodes.tsx # Davet kodu yönetimi (admin)
│           ├── components/
│           │   └── Layout.tsx      # Sidebar + header layout
│           └── lib/
│               ├── api.ts         # Fetch wrapper (JWT auto-refresh)
│               └── auth.tsx       # Auth context + provider
├── docker-compose.yml             # 5 servis: web, api, admin, postgres, redis
├── server.mjs                     # Frontend SSR server (statik dosya + SSR)
├── .env.example                   # Ortam değişkenleri şablonu
└── public/                        # Statik dosyalar (favicon, logo, vs.)
```

## Önemli Kararlar

### Backend

- **Monorepo yapısı**: Frontend ve backend aynı pnpm workspace içinde. `packages/api` ve
  `packages/admin` ayrı paketler olarak yönetilir.
- **RBAC roller**: admin (tam yetki), manager (müşteri+içerik CRUD), viewer (okuma).
  Davet kodu ile kullanıcı kaydı, her kod belirli bir rol atar.
- **JWT akışı**: Access token (15dk) + refresh token (7gün). Refresh token hash'i
  `refresh_tokens` tablosunda saklanır. Otomatik yenileme admin paneli `api.ts`'de yapılır.
- **Docker**: 4 servis (api, admin, postgres, redis). `docker compose up -d` ile tek komutla
  çalışır. Volume'lar veri persistansı sağlar.
- **Gelecek genişleme**: WhatsApp webhook → Redis queue (BullMQ). Sipariş/ödeme → yeni
  tablolar + route'lar. CRM export → customer service'den CSV/JSON endpoint.

### Frontend

- **Ürün görselleri yok**: Gerçek fotoğraf sağlanmadığından, ürün kartlarında marka
  paletiyle uyumlu CSS gradyanları kullanılıyor (`Product.swatch` alanı). Gerçek görseller
  eklendiğinde `ProductCard.tsx` ve `katalog.tsx` içindeki gradyan `div`ler `<img>` ile
  değiştirilmeli.
- **Ürün verisi API'den**: Ürünler `createServerFn` ile SSR sırasında `GET /api/products`'tan çekilir. API yoksa `src/data/products.ts` fallback olarak kullanılır. Admin panelinden ürün ekleme/düzenleme/silme yapılır.
- **WhatsApp sipariş akışı**: `WhatsAppOrderForm` form verisini `POST /api/orders` ile
  backend API'ye gönderir. API müşteri kaydı oluşturur. Başarılı olursa `wa.me` linki
  yeni sekmede açılır.
- **QR kod**: Üçüncü parti bir servise (`api.qrserver.com`) bağımlıdır, ek bir npm paketi
  gerektirmez. Çalışma zamanında `window.location.origin` kullanılarak mutlak URL üretilir.
- **Renk paleti**: `styles.css` içindeki CSS değişkenleri (`--color-wood`, `--color-cream`,
  `--color-espresso`, `--color-brass` vb.) tüm bileşenlerde kullanılır; yeni bileşenler bu
  değişkenlerle tutarlı kalmalı.
- **Yazı tipleri**: Başlıklarda `Fraunces` (serif, `font-display` sınıfı), gövde metninde
  `Manrope` kullanılır — Google Fonts üzerinden `styles.css` içinde import edilir.

## Backend Genişletme Notları (İleriye Dönük)

- Ürün verisi `products` tablosunda, admin paneli üzerinden yönetilir. `src/data/products.ts` fallback olarak kalır.
- Sipariş akışı: WhatsApp Business API webhook + Redis queue (BullMQ) ile otomatikleştirilebilir.
- Ödeme entegrasyonu: Stripe/Iyzico webhook → `payments` tablosu.
- CRM entegrasyonu: müşteri verisi CSV/JSON export endpoint.

## Geliştirme Komutları

### Frontend
```bash
pnpm install
pnpm dev      # Geliştirme sunucusu (port 3000)
pnpm build    # Prodüksiyon build
```

### Backend (Docker)
```bash
cp .env.example .env
docker compose up -d
# API: http://localhost:3001
# Admin: http://localhost:3002
```

### Backend (lokal)
```bash
cd packages/api
pnpm db:push     # DB şemasını uygula
pnpm db:seed     # İlk admin kullanıcı oluştur
pnpm dev         # API sunucusu (port 3001)

cd packages/admin
pnpm dev         # Admin paneli (port 3002)
```

## Konvansiyonlar

- Bileşenler: PascalCase (`WhatsAppOrderForm.tsx`)
- Yardımcı fonksiyonlar/hook'lar: camelCase
- Rotalar: kebab-case veya Türkçe sayfa adları (`urunlerimiz`, `hakkinda`, `iletisim`)
- Import path'lerinde `@/*` alias'ı `src/*`'e karşılık gelir
- TypeScript strict mode aktif
