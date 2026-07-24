# AGENTS.md

Bu doküman, Rustik Evi tanıtım sitesinin mimarisini gelecekteki AI ajanları ve
geliştiriciler için özetler.

## Proje Özeti

Perde aksesuarı ve rustik perde toptan satıcısı Rustik Evi için statik tanıtım sitesi.
Şu an backend'i yok; ürün verisi kod içinde sabit (`src/data/products.ts`), sipariş
talepleri WhatsApp derin bağlantısı (`wa.me`) ve yedek olarak Netlify Forms üzerinden
alınıyor.

### Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Stil | Tailwind CSS 4 (CSS custom properties ile tema) |
| İkonlar | lucide-react |
| Form | Netlify Forms (statik skeleton + AJAX submit) |
| Deploy | Netlify |

## Dizin Yapısı

```
src/
├── components/
│   ├── Header.tsx              # Üst menü, mobil menü, "Toptan Sipariş Ver" CTA
│   ├── Footer.tsx               # Alt bilgi: iletişim, sosyal medya, sayfa linkleri
│   ├── WhatsAppFloatingButton.tsx  # Sağ altta sabit WhatsApp sipariş butonu
│   ├── WhatsAppOrderForm.tsx    # İletişim sayfasındaki hızlı sipariş formu
│   ├── CatalogQRCode.tsx        # /katalog sayfasına yönlenen QR kod (qrserver.com API)
│   ├── ProductCard.tsx          # Ürün kartı (gradyan görsel + kategori rozeti)
│   └── icons/WhatsAppIcon.tsx   # Inline SVG WhatsApp ikonu (lucide'da yok)
├── data/
│   └── products.ts              # Ürün kataloğu verisi + kategori listesi
├── lib/
│   └── site-config.ts           # Marka bilgileri, WhatsApp numarası, wa.me link üreticisi
├── routes/
│   ├── __root.tsx                # Header/Footer/WhatsApp butonu içeren kök layout
│   ├── index.tsx                  # Ana Sayfa
│   ├── urunlerimiz.tsx           # Ürünlerimiz (kategori filtresi)
│   ├── hakkinda.tsx               # Hakkında
│   ├── iletisim.tsx               # İletişim + sipariş formu
│   └── katalog.tsx                # Dijital katalog (QR/buton hedefi, yazdırılabilir)
└── styles.css                     # Tema değişkenleri (ahşap/krem/kahverengi paleti), font importları
public/
└── order-form.html                # Netlify Forms build-time algılaması için statik form iskeleti
```

## Önemli Kararlar

- **Ürün görselleri yok**: Gerçek fotoğraf sağlanmadığından, ürün kartlarında marka
  paletiyle uyumlu CSS gradyanları kullanılıyor (`Product.swatch` alanı). Gerçek görseller
  eklendiğinde `ProductCard.tsx` ve `katalog.tsx` içindeki gradyan `div`ler `<img>` ile
  değiştirilmeli.
- **WhatsApp sipariş akışı**: `WhatsAppOrderForm` hem `wa.me` linkini yeni sekmede açar hem
  de aynı verileri Netlify Forms'a (`toptan-siparis` formu) gönderir. Netlify Forms, React
  tarafından render edildiği için build-time algılama `public/order-form.html` üzerinden
  yapılır — bu dosya değiştirilmeden kalmalı, alan adları React formuyla birebir eşleşmeli.
- **QR kod**: Üçüncü parti bir servise (`api.qrserver.com`) bağımlıdır, ek bir npm paketi
  gerektirmez. Çalışma zamanında `window.location.origin` kullanılarak mutlak URL üretilir.
- **Renk paleti**: `styles.css` içindeki CSS değişkenleri (`--color-wood`, `--color-cream`,
  `--color-espresso`, `--color-brass` vb.) tüm bileşenlerde kullanılır; yeni bileşenler bu
  değişkenlerle tutarlı kalmalı.
- **Yazı tipleri**: Başlıklarda `Fraunces` (serif, `font-display` sınıfı), gövde metninde
  `Manrope` kullanılır — Google Fonts üzerinden `styles.css` içinde import edilir.

## Backend Genişletme Notları (İleriye Dönük)

Site şu an tamamen statik. E-ticarete geçiş planlanırsa:

- Ürün verisi `src/data/products.ts`'ten Netlify Database'e (Postgres + Drizzle) taşınabilir.
- Sipariş formu, doğrudan bir sipariş kaydı oluşturan bir Netlify Function/server function'a
  bağlanabilir (WhatsApp bağlantısı yine de korunabilir).
- Görsel yükleme gerektiğinde Netlify Blobs kullanılmalı, yerel dosya sistemi veya harici
  servisler tercih edilmemeli.

## Geliştirme Komutları

```bash
pnpm install
pnpm dev      # Geliştirme sunucusu (port 3000)
pnpm build    # Prodüksiyon build
```

## Konvansiyonlar

- Bileşenler: PascalCase (`WhatsAppOrderForm.tsx`)
- Yardımcı fonksiyonlar/hook'lar: camelCase
- Rotalar: kebab-case veya Türkçe sayfa adları (`urunlerimiz`, `hakkinda`, `iletisim`)
- Import path'lerinde `@/*` alias'ı `src/*`'e karşılık gelir
- TypeScript strict mode aktif
