import { createContext, useContext } from 'react'

// Default site config — API'den gelen veri ile override edilir (root loader → SiteConfigContext)
export const siteConfig = {
  name: 'Rustik Evi',
  legalName: 'RustikEvi Perde Sistemleri Tic. Ltd. Şti. | Şahinbey, Gaziantep',
  tagline: 'Perde Aksesuarları Toptan Satış',
  phoneDisplay: '+90 545 725 28 28',
  whatsappNumber: '905457252828',
  email: 'rustikevi@gmail.com',
  address: 'Çamlıca, Özdemir Cd. No:16, 27300 Şahinbey/Gaziantep, Türkiye',
  shortAddress: 'Çamlıca, Özdemir Cd, Gaziantep',
  instagram: 'https://instagram.com/rustikevi',
  facebook: 'https://facebook.com/rustikevi',
  workingHours: 'Pazartesi - Cuma: 08:30 - 18:30, Cumartesi: 09:00 - 14:00',
}

export type SiteConfig = typeof siteConfig

export function buildWhatsAppLink(
  message: string,
  whatsappNumber: string = siteConfig.whatsappNumber,
) {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${whatsappNumber}?text=${encoded}`
}

export const defaultWhatsAppMessage =
  'Merhaba Rustik Evi, toptan ürün kataloğu ve fiyat listesi hakkında bilgi almak istiyorum.'

// Helper: API config'ini varsayılanların üzerine yaz — yalnızca bilinen anahtarlar ve
// boş olmayan string değerler alınır; admin'de silinen/bozulan alan varsayılana düşer.
export function mergeSiteConfig(
  apiConfig: Record<string, unknown> | null | undefined,
): SiteConfig {
  const merged: SiteConfig = { ...siteConfig }
  if (!apiConfig || typeof apiConfig !== 'object') return merged
  for (const key of Object.keys(siteConfig) as Array<keyof SiteConfig>) {
    const value = apiConfig[key]
    if (typeof value === 'string' && value.trim()) merged[key] = value.trim()
  }
  // wa.me yalnızca rakam kabul eder ("+90 545 ..." girilirse temizle)
  const digits = merged.whatsappNumber.replace(/\D/g, '')
  merged.whatsappNumber = digits.length >= 10 ? digits : siteConfig.whatsappNumber
  // Sosyal medya linkleri yalnızca http(s) olabilir
  for (const key of ['instagram', 'facebook'] as const) {
    if (!/^https?:\/\//i.test(merged[key])) merged[key] = siteConfig[key]
  }
  return merged
}

export const SiteConfigContext = createContext<SiteConfig>(siteConfig)

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext)
}

/** Güncel (API'den gelen) WhatsApp numarasıyla link üretir. */
export function useWhatsAppLink() {
  const { whatsappNumber } = useSiteConfig()
  return (message: string) => buildWhatsAppLink(message, whatsappNumber)
}
