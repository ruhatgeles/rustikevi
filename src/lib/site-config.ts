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

export function buildWhatsAppLink(message: string) {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encoded}`
}

export const defaultWhatsAppMessage =
  'Merhaba Rustik Evi, toptan ürün kataloğu ve fiyat listesi hakkında bilgi almak istiyorum.'
