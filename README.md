# Rustik Evi

> Perde aksesuarları toptan satış tanıtım sitesi

Rustik Evi için hazırlanmış kurumsal/tanıtım web sitesi. Türkiye genelindeki perde
mağazalarına toptan satış ağını genişletmek amacıyla tasarlandı: dijital ürün kataloğu,
QR kod ile hızlı erişim ve WhatsApp üzerinden anında sipariş oluşturma formu içerir.

## Sayfalar

| Sayfa | Rota | Açıklama |
|-------|------|----------|
| Ana Sayfa | `/` | Marka tanıtımı, öne çıkan ürünler, katalog CTA |
| Ürünlerimiz | `/urunlerimiz` | Kategoriye göre filtrelenebilir ürün kataloğu |
| Dijital Katalog | `/katalog` | QR kod ile açılan, yazdırılabilir katalog |
| Hakkında | `/hakkinda` | Marka hikayesi ve değerler |
| İletişim | `/iletisim` | WhatsApp sipariş formu, iletişim bilgileri |

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | TanStack Start (React 19, dosya tabanlı yönlendirme) |
| Build | Vite 7 |
| Stil | Tailwind CSS 4 (CSS custom properties ile tema) |
| İkonlar | lucide-react |
| Form | Netlify Forms + WhatsApp wa.me |
| Deploy | Netlify |

## Başlangıç

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # prodüksiyon build
```

Netlify özelliklerini yerel test için:

```bash
netlify dev
```

## Yapılandırma

İletişim bilgileri ve WhatsApp numarası `src/lib/site-config.ts` dosyasında yönetilir.
Canlıya almadan önce `whatsappNumber` alanını güncelleyin.

## Mimari

```
src/
├── components/     # Paylaşılan bileşenler
├── data/           # Ürün kataloğu verisi
├── lib/            # Yardımcı fonksiyonlar
├── routes/         # TanStack Router sayfaları
└── styles.css      # Tema değişkenleri, font importları
public/
└── order-form.html # Netlify Forms build-time algılama iskeleti
```

## Notlar

- Ürün görselleri yerine marka paletiyle uyumlu gradyanlar kullanılmıştır.
- QR kod `api.qrserver.com` üzerinden çalışma zamanında üretilir.
- WhatsApp formu hem `wa.me` linki açar hem de Netlify Forms'a yedek kayıt gönderir.

## Lisans

Tüm hakları saklıdır.
