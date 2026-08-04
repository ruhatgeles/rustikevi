# Rustik Evi

> Perde aksesuarları toptan satış tanıtım sitesi + yönetim paneli

Rustik Evi için hazırlanmış kurumsal/tanıtım web sitesi ve backend yönetim paneli.
Türkiye genelindeki perde mağazalarına toptan satış ağını genişletmek amacıyla tasarlandı.

## Proje Yapısı

Bu proje **pnpm monorepo** olarak yapılandırılmıştır:

| Paket | Port | Açıklama |
|-------|------|----------|
| `src/` (root) | 3000 | TanStack Start frontend (Docker deploy) |
| `packages/api` | 3001 | Hono REST API + PostgreSQL |
| `packages/admin` | 3002 | React admin paneli |

## Frontend Sayfaları

| Sayfa | Rota | Açıklama |
|-------|------|----------|
| Ana Sayfa | `/` | Marka tanıtımı, öne çıkan ürünler, katalog CTA |
| Ürünlerimiz | `/urunlerimiz` | Kategoriye göre filtrelenebilir ürün kataloğu |
| Dijital Katalog | `/katalog` | QR kod ile açılan, yazdırılabilir katalog |
| Hakkında | `/hakkinda` | Marka hikayesi ve değerler |
| İletişim | `/iletisim` | WhatsApp sipariş formu, iletişim bilgileri |

## Teknoloji Yığını

### Frontend
| Katman | Teknoloji |
|--------|-----------|
| Framework | TanStack Start (React 19) |
| Build | Vite 7 |
| Stil | Tailwind CSS 4 |
| Deploy | Docker (Linux sunucu) |

### Backend
| Katman | Teknoloji |
|--------|-----------|
| API | Hono (TypeScript) |
| ORM | Drizzle ORM |
| DB | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | Custom JWT + RBAC |
| Admin Panel | React + Vite + Tailwind CSS |
| Container | Docker Compose |

## Hızlı Başlangıç

### Frontend (geliştirme)

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

### Tüm servisler (Docker — tek komut)

```bash
cp .env.example .env
docker compose up -d
```

Servisler:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Admin Panel: http://localhost:3002
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Geliştirme modu (hot-reload)

Frontend ve admin paneli lokalde çalışır (hızlı hot-reload), sadece DB+Redis+API Docker'da:

```bash
# Terminal 1 — DB + Redis + API (Docker)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Terminal 2 — Frontend (lokal)
pnpm dev

# Terminal 3 — Admin panel (lokal)
cd packages/admin
pnpm dev
```

### Sadece backend (Docker)

```bash
docker compose up postgres redis api admin -d
```

## İlk Giriş (Admin Panel)

Seed sonrası oluşan admin hesabı:
- E-posta: `admin@rustikevi.com`
- Şifre: `admin123`

## API Endpointleri

Detaylı dokümantasyon için [README-backend.md](./README-backend.md) dosyasına bakın.

## RBAC Roller

- **admin**: Tüm endpointlere erişim, kullanıcı yönetimi
- **manager**: Müşteri + içerik CRUD
- **viewer**: Sadece okuma

## Mimari

```
rustikevi-web/
├── src/                    # Frontend (TanStack Start)
│   ├── components/
│   ├── data/
│   ├── routes/
│   └── lib/
├── packages/
│   ├── api/                # Hono API sunucusu
│   │   └── src/
│   │       ├── db/         # Drizzle schema, migration, seed
│   │       ├── routes/     # auth, users, customers, content, invite-codes, orders
│   │       ├── services/   # İş mantığı
│   │       └── middleware/  # auth, cors, rate-limit
│   └── admin/              # React admin paneli
│       └── src/
│           ├── pages/      # Login, Dashboard, Users, Customers, Content, InviteCodes
│           └── lib/        # API client, auth context
├── docker-compose.yml
└── .env.example
```

## Lisans

Tüm hakları saklıdır.
