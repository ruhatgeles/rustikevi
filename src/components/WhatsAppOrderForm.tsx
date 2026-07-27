import { useState } from 'react'
import { Send } from 'lucide-react'
import products from '@/data/products'
import { buildWhatsAppLink } from '@/lib/site-config'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const initialState = {
  isletme: '',
  yetkili: '',
  telefon: '',
  sehir: '',
  urun: products[0]?.name ?? '',
  adet: '',
  mesaj: '',
}

export function WhatsAppOrderForm() {
  const [fields, setFields] = useState(initialState)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const buildMessage = () => {
    const lines = [
      `Merhaba Rustik Evi, toptan sipariş talebim var.`,
      `İşletme: ${fields.isletme || '-'}`,
      `Yetkili: ${fields.yetkili || '-'}`,
      `Telefon: ${fields.telefon || '-'}`,
      `Şehir: ${fields.sehir || '-'}`,
      `Ürün: ${fields.urun}`,
      `Adet / Metraj: ${fields.adet || '-'}`,
    ]
    if (fields.mesaj) lines.push(`Not: ${fields.mesaj}`)
    return lines.join('\n')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(false)
    let formOk = false
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      formOk = res.ok
    } catch {
      formOk = false
    }
    setSending(false)
    if (!formOk) {
      setError(true)
      return
    }
    setSent(true)
    window.open(buildWhatsAppLink(buildMessage()), '_blank', 'noreferrer')
  }

  return (
    <div className="rounded-3xl border border-[var(--color-cream-deep)] bg-[var(--color-linen)] p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366]/15 text-[#1f9c53]">
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
            WhatsApp açıldı, teşekkürler!
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink)]/65">
            Açılan sohbette mesajı gönderdiğinizde talebiniz çalışma saatlerimiz içinde
            değerlendirilir. Yeni bir talep için formu tekrar doldurabilirsiniz.
          </p>
          <button
            onClick={() => {
              setFields(initialState)
              setSent(false)
            }}
            className="mt-4 rounded-full border border-[var(--color-wood-dark)] px-5 py-2 text-sm font-semibold text-[var(--color-wood-dark)] transition-colors hover:bg-[var(--color-wood-dark)] hover:text-[var(--color-linen)]"
          >
            Yeni Talep Oluştur
          </button>
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
              pattern="[0-9]{10,11}"
              maxLength={11}
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
                  {p.name}
                </option>
              ))}
              <option value="Genel Katalog">Genel Katalog / Emin Değilim</option>
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
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1fb355] disabled:opacity-60 sm:col-span-2"
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
