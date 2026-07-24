export interface Product {
  id: number
  name: string
  category: string
  description: string
  shortDescription: string
  moq: string
  swatches: Array<[string, string]>
}

export const categories = ['Tümü', 'Rustik', 'Saçak', 'Başlık', 'Dekorink', 'Sarkıt', 'Braçöl'] as const

const products: Array<Product> = [
  // ── Rustik ──────────────────────────────────────────────
  {
    id: 1,
    name: 'Jüt Kordon',
    category: 'Rustik',
    shortDescription: 'Doğal jüt lifinden üretilen rustik perde bağı.',
    description:
      'El örgüsü jüt lifinden üretilen kordonlarımız, rustik tarzdaki perde dekorasyonlarıyla mükemmel uyum sağlar. Kopmaya karşı güçlendirilmiş iç örgüsü sayesinde günlük kullanıma uygundur.',
    moq: '200 adet',
    swatches: [['#c9a876', '#8a6d43'], ['#d89e67', '#996334'], ['#baad8a', '#7b7257']],
  },
  {
    id: 2,
    name: 'Ahşap Halka',
    category: 'Rustik',
    shortDescription: 'Doğal ahşaptan üretilen dekoratif perde halkası.',
    description:
      'Dayanıklı doğal ahşaptan üretilen halkalarımız, rustik ve doğal tarzdaki dekorasyonlar için idealdir. Farklı çap seçenekleri mevcuttur.',
    moq: '150 adet',
    swatches: [['#a0785a', '#5c3d28'], ['#af6e4b', '#6b3319'], ['#917d6e', '#4d423c']],
  },
  {
    id: 3,
    name: 'Keten Bağcık',
    category: 'Rustik',
    shortDescription: 'Doğal keten dokuma perde bağcığı.',
    description:
      'Doğal keten liflerinden dokunan bağcıklarımız, dayanıklılığı ve şık görünümü bir arada sunar. Renk seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#b8a080', '#7a6548'], ['#c79671', '#895b39'], ['#a9a594', '#6b6a5c']],
  },
  {
    id: 4,
    name: 'Rustik Perde Kancası',
    category: 'Rustik',
    shortDescription: 'Paslanmaz çelik gövdeli rustik perde kancası.',
    description:
      'Paslanmaz çelik gövde üzerine doğal jüt sargı ile üretilen kancalarımız, hem dayanıklılık hem de rustik estetik sunar.',
    moq: '300 adet',
    swatches: [['#8a7a6a', '#5a4a3a'], ['#99705b', '#69402b'], ['#7b7f7e', '#4b4f4e']],
  },
  {
    id: 5,
    name: 'Jüt Perde Bağı',
    category: 'Rustik',
    shortDescription: 'Kalın jüt ipinden el yapımı perde bağı.',
    description:
      'Kalın jüt iplerinden el işçiliğiyle üretilen perde bağları, rustik ve doğal bir görünüm kazandırır. Uçlarında ahşap boncuk detayı bulunur.',
    moq: '250 adet',
    swatches: [['#c4a882', '#8b7355'], ['#d39e73', '#9a6946'], ['#b5ad96', '#7c7869']],
  },
  {
    id: 6,
    name: 'Ahşap Perde Çubuğu',
    category: 'Rustik',
    shortDescription: 'Doğal ahşap perde çubuğu, various çaplarında.',
    description:
      'Doğal ahşaptan üretilen perde çubukları, rustik ve minimal dekorasyonlar için mükemmeldir. Farklı uzunluk ve çap seçenekleri mevcuttur.',
    moq: '100 adet',
    swatches: [['#9a7a5a', '#6b5040'], ['#a9704b', '#7a4631'], ['#8b7f6e', '#5c5554']],
  },
  {
    id: 7,
    name: 'Keten Dokuma Kordon',
    category: 'Rustik',
    shortDescription: 'İnce dokuma keten kordon, dekoratif kullanım için.',
    description:
      'İnce dokuma tekniğiyle üretilen keten kordonlarımız, zarif ve doğal bir görünüm sunar. Dekoratif perde bağları ve aksesuarlar için idealdir.',
    moq: '300 adet',
    swatches: [['#bfa888', '#887050'], ['#ce9e79', '#976641'], ['#b0ad9c', '#797564']],
  },

  // ── Saçak ──────────────────────────────────────────────
  {
    id: 8,
    name: 'Jüt Saçak',
    category: 'Saçak',
    shortDescription: 'Doğal jüt lifinden üretilen dekoratif saçak.',
    description:
      'Jüt lifinden üretilen saçaklarımız, perde kenarlarına doğal ve rustik bir görünüm kazandırır. Kolay uygulanabilir yapışkanlı bant seçeneği mevcuttur.',
    moq: '100 metre',
    swatches: [['#c2a070', '#8a6d45'], ['#d19661', '#996336'], ['#b3a584', '#7b7259']],
  },
  {
    id: 9,
    name: 'Pamuklu Saçak',
    category: 'Saçak',
    shortDescription: 'Yumuşak pamuklu iplikten üretilen saçak.',
    description:
      'Yumuşak pamuklu ipliklerden üretilen saçaklarımız, yumuşak dokusuyla hassas kumaşlarla uyumlu çalışır. Farklı renk seçenekleri mevcuttur.',
    moq: '150 metre',
    swatches: [['#e8dcc8', '#b8a888'], ['#f7d2b9', '#c79e79'], ['#d9e1dc', '#a9ad9c']],
  },
  {
    id: 10,
    name: 'Keten Saçak',
    category: 'Saçak',
    shortDescription: 'Doğal keten dokuma saçak, dayanıklı yapıda.',
    description:
      'Doğal keten liflerinden dokunan saçaklarımız, yüksek dayanıklılık ve şık görünüm sunar. Güneş ışığına karşı dayanıklıdır.',
    moq: '100 metre',
    swatches: [['#b8a078', '#7a6548'], ['#c79669', '#895b39'], ['#a9a58c', '#6b6a5c']],
  },
  {
    id: 11,
    name: 'Rustik Saçak Bandı',
    category: 'Saçak',
    shortDescription: 'Rustik saçak bandı, kolay uygulanabilir.',
    description:
      'Rustik görünümlü saçak bantlarımız, perde kenarlarına hızlıca uygulanabilir. Yapışkanlı arka yüzey sayesinde ekstra aksesuar gerektirmez.',
    moq: '200 metre',
    swatches: [['#a89070', '#6a5540'], ['#b78661', '#794b31'], ['#999584', '#5b5a54']],
  },
  {
    id: 12,
    name: 'Desenli Saçak',
    category: 'Saçak',
    shortDescription: 'Örgü desenli dekoratif saçak.',
    description:
      'Örgü desen tekniğiyle üretilen saçaklarımız, perde kenarına zarif bir doku kazandırır. Dekoratif amaçlı kullanıma uygundur.',
    moq: '150 metre',
    swatches: [['#c8b898', '#988060'], ['#d7ae89', '#a77651'], ['#b9bdac', '#898574']],
  },
  {
    id: 13,
    name: 'Çift Katlı Saçak',
    category: 'Saçak',
    shortDescription: 'Çift katlı密集 dokuma saçak.',
    description:
      'Çift katlı yoğun dokuma tekniğiyle üretilen saçaklarımız, premium görünüm ve yüksek dayanıklılık sunar. Toptan siparişlerde özel renk üretimi yapılabilir.',
    moq: '100 metre',
    swatches: [['#d0c0a0', '#a09070'], ['#dfb691', '#af8661'], ['#c1c5b4', '#919584']],
  },
  {
    id: 14,
    name: 'Fırfırlı Saçak',
    category: 'Saçak',
    shortDescription: 'Fırfır detaylı dekoratif saçak.',
    description:
      'Fırfır detayıyla zenginleştirilmiş saçaklarımız, perde kenarına hareketli ve şık bir görünüm kazandırır. Çeşitli renk seçenekleri mevcuttur.',
    moq: '150 metre',
    swatches: [['#e0d0b0', '#b0a080'], ['#efc6a1', '#bf9671'], ['#d1d5c4', '#a1a594']],
  },

  // ── Başlık ──────────────────────────────────────────────
  {
    id: 15,
    name: 'Perde Başlık Aparatı',
    category: 'Başlık',
    shortDescription: 'Çelik gövdeli perde başlık aparatı.',
    description:
      'Yüksek dayanıklı çelik gövdeden üretilen başlık aparatlarımız, tüm perde türleriyle uyumlu çalışır. Kolay montaj aparatı dahildir.',
    moq: '200 adet',
    swatches: [['#8a8a8a', '#5a5a5a'], ['#99807b', '#69504b'], ['#7b8f9e', '#4b5f6e']],
  },
  {
    id: 16,
    name: 'Ahşap Başlık Çubuğu',
    category: 'Başlık',
    shortDescription: 'Doğal ahşap başlık çubuğu, dekoratif.',
    description:
      'Doğal ahşaptan üretilen başlık çubukları, rustik ve doğal dekorasyonlar için mükemmeldir. Farklı uzunluk seçenekleri mevcuttur.',
    moq: '100 adet',
    swatches: [['#9a7a5a', '#6b5040'], ['#a9704b', '#7a4631'], ['#8b7f6e', '#5c5554']],
  },
  {
    id: 17,
    name: 'Metal Başlık Braketi',
    category: 'Başlık',
    shortDescription: 'Powder kaplı metal başlık braketi.',
    description:
      'Toz boya kaplamalı metal braketlerimiz, modern ve şık bir görünüm sunar. Çeşitli renk seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#6a6a6a', '#3a3a3a'], ['#79605b', '#49302b'], ['#5b6f7e', '#2b3f4e']],
  },
  {
    id: 18,
    name: 'Ayarlanabilir Başlık',
    category: 'Başlık',
    shortDescription: 'Genişletilebilir ayarlanabilir başlık aparatı.',
    description:
      'Ayarlanabilir mekanizması sayesinde farklı perde genişliklerine uyum sağlar. Tek beden çoklu kullanım avantajı sunar.',
    moq: '150 adet',
    swatches: [['#7a7a7a', '#4a4a4a'], ['#89706b', '#59403b'], ['#6b7f8e', '#3b4f5e']],
  },
  {
    id: 19,
    name: 'Çift Taraflı Başlık',
    category: 'Başlık',
    shortDescription: 'Çift taraflı kullanım imkanı sunan başlık.',
    description:
      'Çift taraflı tasarımı sayesinde farklı dekorasyonlara uyum sağlar. Her iki yüzeyinde de dekoratif detay bulunur.',
    moq: '150 adet',
    swatches: [['#8a7a6a', '#5a4a3a'], ['#99705b', '#69402b'], ['#7b7f7e', '#4b4f4e']],
  },
  {
    id: 20,
    name: 'Gizli Başlık Aparatı',
    category: 'Başlık',
    shortDescription: 'Gizli montaj aparatı, görünmez kurulum.',
    description:
      'Gizli montaj aparatıyla perde başlığı görünmeden kurulum yapılabilen özel tasarım. Minimalist dekorasyonlar için idealdir.',
    moq: '200 adet',
    swatches: [['#9a9a9a', '#6a6a6a'], ['#a9908b', '#79605b'], ['#8b9fae', '#5b6f7e']],
  },
  {
    id: 21,
    name: 'Dekoratif Başlık',
    category: 'Başlık',
    shortDescription: 'Dekoratif detaylara sahip başlık aparatı.',
    description:
      'Üzerinde dekoratif desenler bulunan başlık aparatlarımız, perdeye şık bir görünüm kazandırır. Farklı desen seçenekleri mevcuttur.',
    moq: '150 adet',
    swatches: [['#b8a080', '#8a7060'], ['#c79671', '#996651'], ['#a9a594', '#7b7574']],
  },

  // ── Dekorink ──────────────────────────────────────────────
  {
    id: 22,
    name: 'Dekoratif Jüt Kordon',
    category: 'Dekorink',
    shortDescription: 'Kalın jüt kordon, dekoratif kullanım için.',
    description:
      'Kalın jüt iplerinden üretilen dekoratif kordonlarımız, perde süslemeleri ve dekoratif amaçlar için mükemmeldir.',
    moq: '100 metre',
    swatches: [['#c8a878', '#987858'], ['#d79e69', '#a76e49'], ['#b9ad8c', '#897d6c']],
  },
  {
    id: 23,
    name: 'Renkli Kordon',
    category: 'Dekorink',
    shortDescription: 'Çeşitli renklerde dekoratif kordon.',
    description:
      'Çeşitli renk seçenekleriyle üretilen dekoratif kordonlarımız, farklı dekorasyon tarzlarına uyum sağlar. Doğal ve sentetik lif seçenekleri mevcuttur.',
    moq: '200 metre',
    swatches: [['#d8c8a8', '#a89878'], ['#e7be99', '#b78e69'], ['#c9cdbc', '#999d8c']],
  },
  {
    id: 24,
    name: 'Metal Kordon Ucu',
    category: 'Dekorink',
    shortDescription: 'Metal kordon ucu,Various desenlerde.',
    description:
      'Paslanmaz çelik veya pirinç malzemeden üretilen kordon ucularımız, kordonlara şık bir bitiş kazandırır. Çeşitli desen ve boyutlarda mevcuttur.',
    moq: '300 adet',
    swatches: [['#b8a888', '#887868'], ['#c79e79', '#976e59'], ['#a9ad9c', '#797d7c']],
  },
  {
    id: 25,
    name: 'Ahşap Kordon Ucu',
    category: 'Dekorink',
    shortDescription: 'Doğal ahşap kordon ucu, el yapımı.',
    description:
      'Doğal ahşaptan el işçiliğiyle üretilen kordon ucularımız, rustik ve doğal bir görünüm sunar. Her parça benzersiz dokuya sahiptir.',
    moq: '200 adet',
    swatches: [['#a89070', '#786050'], ['#b78661', '#875641'], ['#999584', '#696564']],
  },
  {
    id: 26,
    name: 'Desenli Kordon',
    category: 'Dekorink',
    shortDescription: 'Örgü desenli dekoratif kordon.',
    description:
      'Örgü desen tekniğiyle üretilen kordonlarımız, dekoratif amaçlı kullanıma uygundur. Farklı kalınlık seçenekleri mevcuttur.',
    moq: '150 metre',
    swatches: [['#c8b898', '#988878'], ['#d7ae89', '#a77e69'], ['#b9bdac', '#898d8c']],
  },
  {
    id: 27,
    name: 'Twisted Kordon',
    category: 'Dekorink',
    shortDescription: 'Bükülmüş desenli dekoratif kordon.',
    description:
      'Bükülmüş tekniğiyle üretilen kordonlarımız, modern ve şık bir görünüm sunar. Dekoratif perde bağları ve aksesuarlar için idealdir.',
    moq: '200 metre',
    swatches: [['#b8a888', '#887868'], ['#c79e79', '#976e59'], ['#a9ad9c', '#797d7c']],
  },

  // ── Sarkıt ──────────────────────────────────────────────
  {
    id: 28,
    name: 'Kristal Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Kristal cam sarkıt, dekoratif.',
    description:
      'Yüksek kaliteli kristal camdan üretilen sarkıtlarımız, ışığı yansıtarak odalara şık bir görünüm kazandırır. Farklı boyutlarda mevcuttur.',
    moq: '100 adet',
    swatches: [['#e8e0d8', '#c8c0b8'], ['#f7d6c9', '#d7b6a9'], ['#d9e5ec', '#b9c5cc']],
  },
  {
    id: 29,
    name: 'Ahşap Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Doğal ahşap sarkıt, rustik görünüm.',
    description:
      'Doğal ahşaptan üretilen sarkıtlarımız, rustik ve doğal dekorasyonlar için mükemmeldir. Her parça benzersiz dokuya sahiptir.',
    moq: '150 adet',
    swatches: [['#9a7a5a', '#6b5040'], ['#a9704b', '#7a4631'], ['#8b7f6e', '#5c5554']],
  },
  {
    id: 30,
    name: 'Metal Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Paslanmaz çelik sarkıt, modern görünüm.',
    description:
      'Paslanmaz çelikten üretilen sarkıtlarımız, modern ve endüstriyel dekorasyonlar için mükemmeldir. Toz boya kaplamalı renk seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#7a7a7a', '#4a4a4a'], ['#89706b', '#59403b'], ['#6b7f8e', '#3b4f5e']],
  },
  {
    id: 31,
    name: 'Jüt Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Jüt ipliğinden üretilen rustik sarkıt.',
    description:
      'Jüt ipliklerinden el işçiliğiyle üretilen sarkıtlarımız, doğal ve rustik bir görünüm sunar. Dekoratif perde aksesuarları için idealdir.',
    moq: '200 adet',
    swatches: [['#c8a878', '#987858'], ['#d79e69', '#a76e49'], ['#b9ad8c', '#897d6c']],
  },
  {
    id: 32,
    name: 'Dekoratif Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Özel tasarım dekoratif sarkıt.',
    description:
      'Özel tasarım detaylara sahip sarkıtlarımız, perdeye şık ve benzersiz bir görünüm kazandırır. Çeşitli desen ve boyutlarda mevcuttur.',
    moq: '100 adet',
    swatches: [['#d8c8a8', '#a89878'], ['#e7be99', '#b78e69'], ['#c9cdbc', '#999d8c']],
  },
  {
    id: 33,
    name: 'Toplu Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Toplu formda dekoratif sarkıt demeti.',
    description:
      'Toplu formda üretilen sarkıt demetlerimiz, perde kenarlarına zengin bir görünüm kazandırır. Kolay uygulanabilir yapıda.',
    moq: '150 adet',
    swatches: [['#c8b898', '#988878'], ['#d7ae89', '#a77e69'], ['#b9bdac', '#898d8c']],
  },

  // ── Braçol ──────────────────────────────────────────────
  {
    id: 34,
    name: 'Ahşap Braçol',
    category: 'Braçöl',
    shortDescription: 'Doğal ahşap braçol, rustik görünüm.',
    description:
      'Doğal ahşaptan üretilen braçollarımız, rustik ve doğal dekorasyonlar için mükemmeldir. Farklı çap seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#9a7a5a', '#6b5040'], ['#a9704b', '#7a4631'], ['#8b7f6e', '#5c5554']],
  },
  {
    id: 35,
    name: 'Metal Braçol',
    category: 'Braçöl',
    shortDescription: 'Paslanmaz çelik braçol, modern görünüm.',
    description:
      'Paslanmaz çelikten üretilen braçollarımız, modern ve endüstriyel dekorasyonlar için mükemmeldir. Toz boya kaplamalı renk seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#7a7a7a', '#4a4a4a'], ['#89706b', '#59403b'], ['#6b7f8e', '#3b4f5e']],
  },
  {
    id: 36,
    name: 'Jüt Braçol',
    category: 'Braçöl',
    shortDescription: 'Jüt kaplı braçol, rustik detay.',
    description:
      'Jüt iplikle kaplanmış braçollarımız, rustik ve doğal bir görünüm sunar. Dekoratif perde aksesuarları için idealdir.',
    moq: '200 adet',
    swatches: [['#c8a878', '#987858'], ['#d79e69', '#a76e49'], ['#b9ad8c', '#897d6c']],
  },
  {
    id: 37,
    name: 'Çift Braçol',
    category: 'Braçöl',
    shortDescription: 'Çift taraflı braçol, dekoratif.',
    description:
      'Çift taraflı tasarımı sayesinde farklı dekorasyonlara uyum sağlar. Her iki yüzeyinde de dekoratif detay bulunur.',
    moq: '150 adet',
    swatches: [['#8a7a6a', '#5a4a3a'], ['#99705b', '#69402b'], ['#7b7f7e', '#4b4f4e']],
  },
  {
    id: 38,
    name: 'Ayarlanabilir Braçol',
    category: 'Braçöl',
    shortDescription: 'Ayarlanabilir braçol, çok amaçlı.',
    description:
      'Ayarlanabilir mekanizması sayesinde farklı perde çaplarına uyum sağlar. Tek beden çoklu kullanım avantajı sunar.',
    moq: '150 adet',
    swatches: [['#7a7a7a', '#4a4a4a'], ['#89706b', '#59403b'], ['#6b7f8e', '#3b4f5e']],
  },
  {
    id: 39,
    name: 'Dekoratif Braçol',
    category: 'Braçöl',
    shortDescription: 'Dekoratif detaylı braçol.',
    description:
      'Üzerinde dekoratif desenler bulunan braçollarımız, perdeye şık bir görünüm kazandırır. Farklı desen seçenekleri mevcuttur.',
    moq: '150 adet',
    swatches: [['#b8a080', '#8a7060'], ['#c79671', '#996651'], ['#a9a594', '#7b7574']],
  },
  {
    id: 40,
    name: 'Rustik Braçol',
    category: 'Braçöl',
    shortDescription: 'Rustik tarzda dekoratif braçol.',
    description:
      'Rustik tarzda üretilen braçollarımız, doğal ve sıcak bir atmosfer yaratır. Ahşap ve jüt detaylarıyla zenginleştirilmiştir.',
    moq: '200 adet',
    swatches: [['#a89070', '#786050'], ['#b78661', '#875641'], ['#999584', '#696564']],
  },
]

export default products
