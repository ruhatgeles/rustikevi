# Rustik Evi Backend

Rustik Evi toptan perde aksesuarı işletmesi için yönetim paneli ve API.

## Teknoloji Yığını

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

### Docker ile (önerilen)

```bash
cp .env.example .env
# .env dosyasını düzenleyin (JWT_SECRET, şifreler vs.)

docker compose up -d
```

Servisler:
- API: http://localhost:3001
- Admin Panel: http://localhost:3002
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Lokal Geliştirme

```bash
# PostgreSQL ve Redis çalışıyor olmalı
cp .env.example .env

pnpm install

# Migration çalıştır
cd packages/api
pnpm db:push

# Seed data (ilk admin kullanıcı)
pnpm db:seed

# API başlat
pnpm dev

# Ayrı terminalde - Admin panel
cd packages/admin
pnpm dev
```

## İlk Giriş

Seed sonrası oluşan admin hesabı:
- E-posta: `admin@rustikevi.com` (veya .env'deki SEED_ADMIN_EMAIL)
- Şifre: `admin123` (veya .env'deki SEED_ADMIN_PASSWORD)

## API Endpointleri

| Method | Path | Açıklama | Yetki |
|--------|------|----------|-------|
| POST | /api/auth/login | Giriş | public |
| POST | /api/auth/refresh | Token yenile | public |
| POST | /api/auth/logout | Çıkış | auth |
| GET | /api/auth/me | Kullanıcı bilgisi | auth |
| GET | /api/users | Kullanıcı listesi | admin |
| POST | /api/users | Kullanıcı oluştur | admin |
| PATCH | /api/users/:id | Kullanıcı güncelle | admin |
| DELETE | /api/users/:id | Kullanıcı deaktif | admin |
| GET | /api/customers | Müşteri listesi | manager+ |
| POST | /api/customers | Müşteri oluştur | manager+ |
| PATCH | /api/customers/:id | Müşteri güncelle | manager+ |
| DELETE | /api/customers/:id | Müşteri sil | admin |
| GET | /api/content | İçerik listesi | auth |
| GET | /api/content/public/:slug | İçerik getir | public |
| PUT | /api/content/:slug | İçerik güncelle | manager+ |
| GET | /api/invite-codes | Davet kodları | admin |
| POST | /api/invite-codes | Kod oluştur | admin |
| POST | /api/invite-codes/verify | Kod doğrula | public |
| DELETE | /api/invite-codes/:id | Kod sil | admin |

## RBAC Roller

- **admin**: Tüm endpointlere erişim
- **manager**: Müşteri + içerik CRUD
- **viewer**: Sadece okuma

## Davet Kodu Akışı

1. Admin panelinden davet kodu oluşturulur
2. Kod + rol + son kullanma tarihi belirlenir
3. Yeni kullanıcı kodu doğrular → kayıt formu açılır
4. Kayıt sonrası kullanıcı ilgili rolde oluşturulur
