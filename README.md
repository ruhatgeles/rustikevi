# Rustik Evi

Rustik Evi için hazırlanmış, perde aksesuarları ve rustik perde ürünlerini tanıtan statik
kurumsal/tanıtım web sitesi. Site, Türkiye genelindeki perde mağazalarına toptan satış
ağını genişletmek amacıyla tasarlandı: dijital ürün kataloğu, QR kod ile hızlı erişim ve
WhatsApp üzerinden anında sipariş oluşturma formu içerir.

## Sayfalar

- **Ana Sayfa** (`/`) — marka tanıtımı, öne çıkan ürünler, dijital katalog CTA
- **Ürünlerimiz** (`/urunlerimiz`) — kategoriye göre filtrelenebilir ürün kataloğu
- **Dijital Katalog** (`/katalog`) — QR kod ve buton ile açılan, yazdırılabilir katalog sayfası
- **Hakkında** (`/hakkinda`) — marka hikayesi ve değerler
- **İletişim** (`/iletisim`) — WhatsApp hızlı sipariş formu, iletişim bilgileri, sosyal medya

## Teknolojiler

- [TanStack Start](https://tanstack.com/start) (React 19, dosya tabanlı yönlendirme)
- Tailwind CSS 4
- Netlify Forms (toptan sipariş formu kayıtları için)
- Netlify (statik/SSR barındırma)

## Yerel Geliştirme

```bash
pnpm install
pnpm dev
```

Site `http://localhost:3000` adresinde açılır. Netlify özelliklerini (Forms dahil) yerel
olarak test etmek için Netlify CLI kullanılabilir:

```bash
netlify dev
```

## Yapılandırma

İletişim bilgileri, WhatsApp numarası ve sosyal medya linkleri `src/lib/site-config.ts`
dosyasında tek bir yerden yönetilir. Canlıya almadan önce `whatsappNumber` alanını gerçek
işletme numarasıyla güncelleyin.

## Notlar

- WhatsApp sipariş formu, mesajı hem `wa.me` linki olarak açar hem de Netlify Forms'a
  yedek kayıt olarak gönderir (Netlify panelinden görüntülenebilir).
- QR kod, `/katalog` sayfasının tam URL'sini kodlayarak çalışma zamanında oluşturulur.
- Ürün görselleri yerine, marka renk paletiyle uyumlu doku efektli gradyanlar kullanılmıştır;
  gerçek ürün fotoğrafları eklenene kadar bu görsel dil korunabilir.
