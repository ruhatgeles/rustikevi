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

## Hızlı Başlangıç (Docker — production ile aynı kurulum)

```bash
cp .env.example .env
# .env içindeki "degistir_..." değerlerini doldurun:
#   openssl rand -base64 48   → JWT_SECRET
#   güçlü bir POSTGRES_PASSWORD ve en az 12 karakterlik SEED_ADMIN_PASSWORD
docker compose up -d --build
```

İlk açılışta API container'ı **migration'ları otomatik çalıştırır** ve hiç kullanıcı yoksa
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` ile ilk admin'i oluşturur.

| Servis | Adres | Not |
|--------|-------|-----|
| Site | http://localhost:3000 | `/api` ve `/uploads` isteklerini API'ye iletir |
| Admin | http://localhost:3002 | nginx, `/api` → API |
| API | http://127.0.0.1:3001 | yalnızca sunucunun kendisinden erişilir |
| PostgreSQL | 127.0.0.1:5432 | dışarıya kapalı |
| Redis | 127.0.0.1:6379 | dışarıya kapalı |

Örnek ürün ve içerik verisi (isteğe bağlı, boş tablolara yazar):

```bash
docker compose exec api node dist/db/seed.js
```

## Sunucuya Kurulum (production)

1. Sunucuda Docker + Docker Compose kurulu olsun, repoyu klonlayın, `.env`'i doldurun.
2. `docker compose up -d --build`
3. Önüne HTTPS sağlayan bir reverse proxy koyun ve iki alan adını yönlendirin:
   - `rustikevi.com` → `127.0.0.1:3000`
   - `admin.rustikevi.com` → `127.0.0.1:3002`

   Örnek **Caddy** (`/etc/caddy/Caddyfile`, sertifikayı kendisi alır):

   ```
   rustikevi.com, www.rustikevi.com {
       reverse_proxy 127.0.0.1:3000
   }
   admin.rustikevi.com {
       reverse_proxy 127.0.0.1:3002
   }
   ```

   Cloudflare kullanılıyorsa SSL modunu **Full (strict)** yapın veya Cloudflare Tunnel ile
   aynı iki portu yayınlayın. Sunucu güvenlik duvarında yalnızca 80/443 açık olmalı;
   3000/3002'yi doğrudan açmayın.
4. Güncelleme: `git pull && docker compose up -d --build` (migration'lar açılışta uygulanır).

### Yedekleme

```bash
# Veritabanı
docker compose exec -T postgres pg_dump -U rustikevi rustikevi | gzip > yedek-$(date +%F).sql.gz
# Yüklenen ürün görselleri
docker run --rm -v rustikevi-web_uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```

Geri yükleme: `gunzip -c yedek.sql.gz | docker compose exec -T postgres psql -U rustikevi rustikevi`

## Lokal Geliştirme

```bash
pnpm install
docker compose up -d postgres redis          # sadece veritabanları

# API (packages/api/.env veya kökteki .env'de DATABASE_URL=...@localhost:5432/...)
cd packages/api && pnpm db:migrate && pnpm db:seed && pnpm dev   # :3001

# Ayrı terminallerde
pnpm dev                                     # site  :3000 (/api → :3001 proxy)
cd packages/admin && pnpm dev                # admin :3002 (/api → :3001 proxy)
```

### Kontroller

```bash
pnpm check                                   # tip kontrolü + tüm unit testler
pnpm --filter @rustikevi/api test:integration   # gerçek Postgres/Redis (Docker gerekir)
```

### Şema değişikliği

`packages/api/src/db/schema.ts` düzenlenir → `cd packages/api && pnpm db:generate` →
oluşan SQL `migrations/` altına commit edilir. Elle SQL dosyası çalıştırmaya gerek yoktur.

## İlk Giriş

İlk admin hesabı `.env`'deki `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` ile oluşturulur.
Production'da varsayılan veya 12 karakterden kısa şifre kabul edilmez.

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
- **atolye**: Atölye ekranı (kilitli/hazır ürün akışı)

## Davet Kodu Akışı

1. Admin panelinden davet kodu oluşturulur
2. Kod + rol + son kullanma tarihi belirlenir
3. Yeni kullanıcı kodu doğrular → kayıt formu açılır
4. Kayıt sonrası kullanıcı ilgili rolde oluşturulur
