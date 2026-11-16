import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { useWhatsAppLink } from '@/lib/site-config'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

// Boş = aynı origin: site sunucusu /api isteklerini API'ye iletir (prod: server.mjs, dev: vite proxy)
const API_URL = import.meta.env.VITE_API_URL ?? ''

// Ürün listesi boş/yüklenmemişken de API'nin zorunlu 'urun' alanı dolu gitsin
const GENERAL_CATALOG = 'Genel Katalog'

interface ProductOption {
  id: number
  name: string
  category: string
}

export function WhatsAppOrderForm() {
  const buildWhatsAppLink = useWhatsAppLink()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [fields, setFields] = useState({
    isletme: '',
    yetkili: '',
    telefon: '',
    sehir: '',
    urun: GENERAL_CATALOG,
    adet: '',
    mesaj: '',
  })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')
  // Kullanıcı ürün alanını bizzat değiştirdiyse (Genel Katalog dahil) liste gelince ezilmez
  const urunTouched = useRef(false)

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((r) => r.json())
      .then((d) => {
        const list: ProductOption[] = Array.isArray(d?.data) ? d.data : []
        setProducts(list)
        // Kullanıcı henüz seçim yapmadıysa ilk ürünü öner
        if (list.length > 0 && !urunTouched.current) {
          setFields((prev) =>
            prev.urun === GENERAL_CATALOG ? { ...prev, urun: list[0].name } : prev,
          )
        }
      })
      .catch(() => {})
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    if (name === 'urun') urunTouched.current = true
    setFields((prev) => ({ ...prev, [name]: value }))
  }

  // Sipariş numarası state'ten değil parametreden alınır (setState sonrası closure eski değeri görür)
  const buildMessage = (orderNo: string) => {
    const lines = [
      `Merhaba Rustik Evi, toptan sipariş talebim var.`,
      `İşletme: ${fields.isletme || '-'}`,
      `Yetkili: ${fields.yetkili || '-'}`,
      `Telefon: ${fields.telefon || '-'}`,
      `Şehir: ${fields.sehir || '-'}`,
      `Ürün: ${fields.urun || GENERAL_CATALOG}`,
      `Adet / Metraj: ${fields.adet || '-'}`,
    ]
    if (fields.mesaj) lines.push(`Not: ${fields.mesaj}`)
    if (orderNo) lines.push(`Sipariş No: ${orderNo}`)
    return lines.join('\n')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(false)
    try {
      const res = await fetch(`${API_URL}/api/orders/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, urun: fields.urun || GENERAL_CATALOG }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const no: string = data.data?.orderNumber || ''
      const link = buildWhatsAppLink(buildMessage(no))
      setOrderNumber(no)
      setWhatsappLink(link)
      setSent(true)
      // await sonrası açılan pencere engellenebilir; başarı ekranında manuel link de var
      window.open(link, '_blank', 'noreferrer')
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-3xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366]/15 text-[var(--color-whatsapp)]">
          <WhatsAppIcon size={22} />
        </span>
        <div>
          <h3 className="font-display text-xl text-[var(--color-espresso)]">
            Hızlı Toptan Sipariş
          </h3>
          <p className="text-sm text-[var(--color-ink)]/60">
            Formu doldurun, mesajınız WhatsApp'ta hazır olarak açılsın.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-700">
            Form gönderilemedi. Lütfen tekrar deneyin veya doğrudan WhatsApp'tan yazın.
          </p>
        </div>
      )}

      {sent ? (
        <div className="rounded-2xl border border-[#25D366]/30 bg-[#25D366]/10 p-6 text-center">
          <p className="font-display text-lg text-[var(--color-espresso)]">
            Talebiniz alındı, teşekkürler!
          </p>
          {orderNumber && (
            <p className="mt-2 text-sm font-semibold text-[var(--color-wood-dark)]">
              Sipariş No: {orderNumber}
            </p>
          )}
          <p className="mt-1 text-sm text-[var(--color-ink)]/65">
            Açılan sohbette mesajı gönderdiğinizde talebiniz çalışma saatlerimiz içinde
            değerlendirilir. WhatsApp açılmadıysa aşağıdaki butonu kullanın.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-whatsapp)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-whatsapp-hover)]"
            >
              <WhatsAppIcon size={18} />
              WhatsApp'ı Aç
            </a>
          )}
          <button
            onClick={() => {
              setFields({
                isletme: '',
                yetkili: '',
                telefon: '',
                sehir: '',
                urun: products[0]?.name || GENERAL_CATALOG,
                adet: '',
                mesaj: '',
              })
              setOrderNumber('')
              setWhatsappLink('')
              setSent(false)
            }}
            className="rounded-full border border-[var(--color-wood-dark)] px-5 py-2 text-sm font-semibold text-[var(--color-wood-dark)] transition-colors hover:bg-[var(--color-wood-dark)] hover:text-[var(--color-linen)]"
          >
            Yeni Talep Oluştur
          </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink)]/80">İşletme Adı</span>
            <input
              required
              name="isletme"
              value={fields.isletme}
              onChange={handleChange}
              placeholder="Örn. Aydın Ev Tekstil"
              className="rounded-xl border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/40 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink)]/80">Yetkili Adı</span>
            <input
              required
              name="yetkili"
              value={fields.yetkili}
              onChange={handleChange}
              placeholder="Adınız Soyadınız"
              className="rounded-xl border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/40 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink)]/80">Telefon</span>
            <input
              required
              name="telefon"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              pattern="(?=(?:\D*\d){10,13}\D*$)[0-9 +\(\)\-]+"
              title="En az 10 haneli telefon numarası (örn. 0532 123 45 67)"
              maxLength={20}
              value={fields.telefon}
              onChange={handleChange}
              placeholder="05xx xxx xx xx"
              className="rounded-xl border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/40 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink)]/80">Şehir</span>
            <input
              required
              name="sehir"
              value={fields.sehir}
              onChange={handleChange}
              placeholder="Örn. Gaziantep"
              className="rounded-xl border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/40 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--color-ink)]/80">İlgilendiğiniz Ürün</span>
            <select
              name="urun"
              value={fields.urun}
              onChange={handleChange}
              className="rounded-xl border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/40 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.category})
                </option>
              ))}
              <option value={GENERAL_CATALOG}>Genel Katalog / Emin Değilim</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--color-ink)]/80">Tahmini Adet / Metraj</span>
            <input
              required
              name="adet"
              value={fields.adet}
              onChange={handleChange}
              placeholder="Örn. 200 adet kelepçe, 150 adet halka"
              className="rounded-xl border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/40 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--color-ink)]/80">Ek Not (opsiyonel)</span>
            <textarea
              name="mesaj"
              value={fields.mesaj}
              onChange={handleChange}
              rows={3}
              placeholder="Renk, desen veya teslimat tercihleriniz"
              className="resize-none rounded-xl border border-[var(--color-cream-deep)] bg-[var(--color-cream)]/40 px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-brass)]"
            />
          </label>

          <button
            type="submit"
            disabled={sending}
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[var(--color-whatsapp)] hover:bg-[var(--color-whatsapp-hover)] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60 sm:col-span-2"
          >
            <WhatsAppIcon size={18} />
            {sending ? 'Hazırlanıyor…' : "WhatsApp'ta Siparişi Gönder"}
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  )
}
