import 'dotenv/config'
import { db } from './index.js'
import { users, products, contentBlocks } from './schema.js'
import { hashSync } from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'

const productData = [
  // ── Rustik ──────────────────────────────────────────────
  {
    name: 'Jüt Kordon',
    category: 'Rustik',
    shortDescription: 'Doğal jüt lifinden üretilen rustik perde bağı.',
    description:
      'El örgüsü jüt lifinden üretilen kordonlarımız, rustik tarzdaki perde dekorasyonlarıyla mükemmel uyum sağlar. Kopmaya karşı güçlendirilmiş iç örgüsü sayesinde günlük kullanıma uygundur.',
    moq: '200 adet',
    swatches: [['#c9a876', '#8a6d43'], ['#d89e67', '#996334'], ['#baad8a', '#7b7257']],
    featured: true,
    sortOrder: 1,
  },
  {
    name: 'Ahşap Halka',
    category: 'Rustik',
    shortDescription: 'Doğal ahşaptan üretilen dekoratif perde halkası.',
    description:
      'Dayanıklı doğal ahşaptan üretilen halkalarımız, rustik ve doğal tarzdaki dekorasyonlar için idealdir. Farklı çap seçenekleri mevcuttur.',
    moq: '150 adet',
    swatches: [['#a0785a', '#5c3d28'], ['#af6e4b', '#6b3319'], ['#917d6e', '#4d423c']],
    sortOrder: 2,
  },
  {
    name: 'Keten Bağcık',
    category: 'Rustik',
    shortDescription: 'Doğal keten dokuma perde bağcığı.',
    description:
      'Doğal keten liflerinden dokunan bağcıklarımız, dayanıklılığı ve şık görünümü bir arada sunar. Renk seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#b8a080', '#7a6548'], ['#c79671', '#895b39'], ['#a9a594', '#6b6a5c']],
    sortOrder: 3,
  },
  {
    name: 'Rustik Perde Kancası',
    category: 'Rustik',
    shortDescription: 'Paslanmaz çelik gövdeli rustik perde kancası.',
    description:
      'Paslanmaz çelik gövde üzerine doğal jüt sargı ile üretilen kancalarımız, hem dayanıklılık hem de rustik estetik sunar.',
    moq: '300 adet',
    swatches: [['#8a7a6a', '#5a4a3a'], ['#99705b', '#69402b'], ['#7b7f7e', '#4b4f4e']],
    sortOrder: 4,
  },
  {
    name: 'Jüt Perde Bağı',
    category: 'Rustik',
    shortDescription: 'Kalın jüt ipinden el yapımı perde bağı.',
    description:
      'Kalın jüt iplerinden el işçiliğiyle üretilen perde bağları, rustik ve doğal bir görünüm kazandırır. Uçlarında ahşap boncuk detayı bulunur.',
    moq: '250 adet',
    swatches: [['#c4a882', '#8b7355'], ['#d39e73', '#9a6946'], ['#b5ad96', '#7c7869']],
    sortOrder: 5,
  },
  {
    name: 'Ahşap Perde Çubuğu',
    category: 'Rustik',
    shortDescription: 'Doğal ahşap perde çubuğu, çeşitli çaplarında.',
    description:
      'Doğal ahşaptan üretilen perde çubukları, rustik ve minimal dekorasyonlar için mükemmeldir. Farklı uzunluk ve çap seçenekleri mevcuttur.',
    moq: '100 adet',
    swatches: [['#9a7a5a', '#6b5040'], ['#a9704b', '#7a4631'], ['#8b7f6e', '#5c5554']],
    sortOrder: 6,
  },
  {
    name: 'Keten Dokuma Kordon',
    category: 'Rustik',
    shortDescription: 'İnce dokuma keten kordon, dekoratif kullanım için.',
    description:
      'İnce dokuma tekniğiyle üretilen keten kordonlarımız, zarif ve doğal bir görünüm sunar. Dekoratif perde bağları ve aksesuarlar için idealdir.',
    moq: '300 adet',
    swatches: [['#bfa888', '#887050'], ['#ce9e79', '#976641'], ['#b0ad9c', '#797564']],
    sortOrder: 7,
  },

  // ── Saçak ──────────────────────────────────────────────
  {
    name: 'Jüt Saçak',
    category: 'Saçak',
    shortDescription: 'Doğal jüt lifinden üretilen dekoratif saçak.',
    description:
      'Jüt lifinden üretilen saçaklarımız, perde kenarlarına doğal ve rustik bir görünüm kazandırır. Kolay uygulanabilir yapışkanlı bant seçeneği mevcuttur.',
    moq: '100 metre',
    swatches: [['#c2a070', '#8a6d45'], ['#d19661', '#996336'], ['#b3a584', '#7b7259']],
    featured: true,
    sortOrder: 8,
  },
  {
    name: 'Pamuklu Saçak',
    category: 'Saçak',
    shortDescription: 'Yumuşak pamuklu iplikten üretilen saçak.',
    description:
      'Yumuşak pamuklu ipliklerden üretilen saçaklarımız, yumuşak dokusuyla hassas kumaşlarla uyumlu çalışır. Farklı renk seçenekleri mevcuttur.',
    moq: '150 metre',
    swatches: [['#e8dcc8', '#b8a888'], ['#f7d2b9', '#c79e79'], ['#d9e1dc', '#a9ad9c']],
    sortOrder: 9,
  },
  {
    name: 'Keten Saçak',
    category: 'Saçak',
    shortDescription: 'Doğal keten dokuma saçak, dayanıklı yapıda.',
    description:
      'Doğal keten liflerinden dokunan saçaklarımız, yüksek dayanıklılık ve şık görünüm sunar. Güneş ışığına karşı dayanıklıdır.',
    moq: '100 metre',
    swatches: [['#b8a078', '#7a6548'], ['#c79669', '#895b39'], ['#a9a58c', '#6b6a5c']],
    sortOrder: 10,
  },
  {
    name: 'Rustik Saçak Bandı',
    category: 'Saçak',
    shortDescription: 'Rustik saçak bandı, kolay uygulanabilir.',
    description:
      'Rustik görünümlü saçak bantlarımız, perde kenarlarına hızlıca uygulanabilir. Yapışkanlı arka yüzey sayesinde ekstra aksesuar gerektirmez.',
    moq: '200 metre',
    swatches: [['#a89070', '#6a5540'], ['#b78661', '#794b31'], ['#999584', '#5b5a54']],
    sortOrder: 11,
  },
  {
    name: 'Desenli Saçak',
    category: 'Saçak',
    shortDescription: 'Örgü desenli dekoratif saçak.',
    description:
      'Örgü desen tekniğiyle üretilen saçaklarımız, perde kenarına zarif bir doku kazandırır. Dekoratif amaçlı kullanıma uygundur.',
    moq: '150 metre',
    swatches: [['#c8b898', '#988060'], ['#d7ae89', '#a77651'], ['#b9bdac', '#898574']],
    sortOrder: 12,
  },
  {
    name: 'Çift Katlı Saçak',
    category: 'Saçak',
    shortDescription: 'Çift katlı yoğun dokuma saçak.',
    description:
      'Çift katlı yoğun dokuma tekniğiyle üretilen saçaklarımız, premium görünüm ve yüksek dayanıklılık sunar. Toptan siparişlerde özel renk üretimi yapılabilir.',
    moq: '100 metre',
    swatches: [['#d0c0a0', '#a09070'], ['#dfb691', '#af8661'], ['#c1c5b4', '#919584']],
    sortOrder: 13,
  },
  {
    name: 'Fırfırlı Saçak',
    category: 'Saçak',
    shortDescription: 'Fırfır detaylı dekoratif saçak.',
    description:
      'Fırfır detayıyla zenginleştirilmiş saçaklarımız, perde kenarına hareketli ve şık bir görünüm kazandırır. Çeşitli renk seçenekleri mevcuttur.',
    moq: '150 metre',
    swatches: [['#e0d0b0', '#b0a080'], ['#efc6a1', '#bf9671'], ['#d1d5c4', '#a1a594']],
    sortOrder: 14,
  },

  // ── Başlık ──────────────────────────────────────────────
  {
    name: 'Perde Başlık Aparatı',
    category: 'Başlık',
    shortDescription: 'Çelik gövdeli perde başlık aparatı.',
    description:
      'Yüksek dayanıklı çelik gövdeden üretilen başlık aparatlarımız, tüm perde türleriyle uyumlu çalışır. Kolay montaj aparatı dahildir.',
    moq: '200 adet',
    swatches: [['#8a8a8a', '#5a5a5a'], ['#99807b', '#69504b'], ['#7b8f9e', '#4b5f6e']],
    sortOrder: 15,
  },
  {
    name: 'Ahşap Başlık Çubuğu',
    category: 'Başlık',
    shortDescription: 'Doğal ahşap başlık çubuğu, dekoratif.',
    description:
      'Doğal ahşaptan üretilen başlık çubukları, rustik ve doğal dekorasyonlar için mükemmeldir. Farklı uzunluk seçenekleri mevcuttur.',
    moq: '100 adet',
    swatches: [['#9a7a5a', '#6b5040'], ['#a9704b', '#7a4631'], ['#8b7f6e', '#5c5554']],
    sortOrder: 16,
  },
  {
    name: 'Metal Başlık Braketi',
    category: 'Başlık',
    shortDescription: 'Powder kaplı metal başlık braketi.',
    description:
      'Toz boya kaplamalı metal braketlerimiz, modern ve şık bir görünüm sunar. Çeşitli renk seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#6a6a6a', '#3a3a3a'], ['#79605b', '#49302b'], ['#5b6f7e', '#2b3f4e']],
    sortOrder: 17,
  },
  {
    name: 'Ayarlanabilir Başlık',
    category: 'Başlık',
    shortDescription: 'Genişletilebilir ayarlanabilir başlık aparatı.',
    description:
      'Ayarlanabilir mekanizması sayesinde farklı perde genişliklerine uyum sağlar. Tek beden çoklu kullanım avantajı sunar.',
    moq: '150 adet',
    swatches: [['#7a7a7a', '#4a4a4a'], ['#89706b', '#59403b'], ['#6b7f8e', '#3b4f5e']],
    sortOrder: 18,
  },
  {
    name: 'Çift Taraflı Başlık',
    category: 'Başlık',
    shortDescription: 'Çift taraflı kullanım imkanı sunan başlık.',
    description:
      'Çift taraflı tasarımı sayesinde farklı dekorasyonlara uyum sağlar. Her iki yüzeyinde de dekoratif detay bulunur.',
    moq: '150 adet',
    swatches: [['#8a7a6a', '#5a4a3a'], ['#99705b', '#69402b'], ['#7b7f7e', '#4b4f4e']],
    sortOrder: 19,
  },
  {
    name: 'Gizli Başlık Aparatı',
    category: 'Başlık',
    shortDescription: 'Gizli montaj aparatı, görünmez kurulum.',
    description:
      'Gizli montaj aparatıyla perde başlığı görünmeden kurulum yapılabilen özel tasarım. Minimalist dekorasyonlar için idealdir.',
    moq: '200 adet',
    swatches: [['#9a9a9a', '#6a6a6a'], ['#a9908b', '#79605b'], ['#8b9fae', '#5b6f7e']],
    sortOrder: 20,
  },
  {
    name: 'Dekoratif Başlık',
    category: 'Başlık',
    shortDescription: 'Dekoratif detaylara sahip başlık aparatı.',
    description:
      'Üzerinde dekoratif desenler bulunan başlık aparatlarımız, perdeye şık bir görünüm kazandırır. Farklı desen seçenekleri mevcuttur.',
    moq: '150 adet',
    swatches: [['#b8a080', '#8a7060'], ['#c79671', '#996651'], ['#a9a594', '#7b7574']],
    sortOrder: 21,
  },

  // ── Dekorink ──────────────────────────────────────────────
  {
    name: 'Dekoratif Jüt Kordon',
    category: 'Dekorink',
    shortDescription: 'Kalın jüt kordon, dekoratif kullanım için.',
    description:
      'Kalın jüt iplerinden üretilen dekoratif kordonlarımız, perde süslemeleri ve dekoratif amaçlar için mükemmeldir.',
    moq: '100 metre',
    swatches: [['#c8a878', '#987858'], ['#d79e69', '#a76e49'], ['#b9ad8c', '#897d6c']],
    sortOrder: 22,
  },
  {
    name: 'Renkli Kordon',
    category: 'Dekorink',
    shortDescription: 'Çeşitli renklerde dekoratif kordon.',
    description:
      'Çeşitli renk seçenekleriyle üretilen dekoratif kordonlarımız, farklı dekorasyon tarzlarına uyum sağlar. Doğal ve sentetik lif seçenekleri mevcuttur.',
    moq: '200 metre',
    swatches: [['#d8c8a8', '#a89878'], ['#e7be99', '#b78e69'], ['#c9cdbc', '#999d8c']],
    sortOrder: 23,
  },
  {
    name: 'Metal Kordon Ucu',
    category: 'Dekorink',
    shortDescription: 'Metal kordon ucu, çeşitli desenlerde.',
    description:
      'Paslanmaz çelik veya pirinç malzemeden üretilen kordon ucularımız, kordonlara şık bir bitiş kazandırır. Çeşitli desen ve boyutlarda mevcuttur.',
    moq: '300 adet',
    swatches: [['#b8a888', '#887868'], ['#c79e79', '#976e59'], ['#a9ad9c', '#797d7c']],
    sortOrder: 24,
  },
  {
    name: 'Ahşap Kordon Ucu',
    category: 'Dekorink',
    shortDescription: 'Doğal ahşap kordon ucu, el yapımı.',
    description:
      'Doğal ahşaptan el işçiliğiyle üretilen kordon ucularımız, rustik ve doğal bir görünüm sunar. Her parça benzersiz dokuya sahiptir.',
    moq: '200 adet',
    swatches: [['#a89070', '#786050'], ['#b78661', '#875641'], ['#999584', '#696564']],
    sortOrder: 25,
  },
  {
    name: 'Desenli Kordon',
    category: 'Dekorink',
    shortDescription: 'Örgü desenli dekoratif kordon.',
    description:
      'Örgü desen tekniğiyle üretilen kordonlarımız, dekoratif amaçlı kullanıma uygundur. Farklı kalınlık seçenekleri mevcuttur.',
    moq: '150 metre',
    swatches: [['#c8b898', '#988878'], ['#d7ae89', '#a77e69'], ['#b9bdac', '#898d8c']],
    sortOrder: 26,
  },
  {
    name: 'Twisted Kordon',
    category: 'Dekorink',
    shortDescription: 'Bükülmüş desenli dekoratif kordon.',
    description:
      'Bükülmüş tekniğiyle üretilen kordonlarımız, modern ve şık bir görünüm sunar. Dekoratif perde bağları ve aksesuarlar için idealdir.',
    moq: '200 metre',
    swatches: [['#b8a888', '#887868'], ['#c79e79', '#976e59'], ['#a9ad9c', '#797d7c']],
    sortOrder: 27,
  },

  // ── Sarkıt ──────────────────────────────────────────────
  {
    name: 'Kristal Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Kristal cam sarkıt, dekoratif.',
    description:
      'Yüksek kaliteli kristal camdan üretilen sarkıtlarımız, ışığı yansıtarak odalara şık bir görünüm kazandırır. Farklı boyutlarda mevcuttur.',
    moq: '100 adet',
    swatches: [['#e8e0d8', '#c8c0b8'], ['#f7d6c9', '#d7b6a9'], ['#d9e5ec', '#b9c5cc']],
    featured: true,
    sortOrder: 28,
  },
  {
    name: 'Ahşap Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Doğal ahşap sarkıt, rustik görünüm.',
    description:
      'Doğal ahşaptan üretilen sarkıtlarımız, rustik ve doğal dekorasyonlar için mükemmeldir. Her parça benzersiz dokuya sahiptir.',
    moq: '150 adet',
    swatches: [['#9a7a5a', '#6b5040'], ['#a9704b', '#7a4631'], ['#8b7f6e', '#5c5554']],
    sortOrder: 29,
  },
  {
    name: 'Metal Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Paslanmaz çelik sarkıt, modern görünüm.',
    description:
      'Paslanmaz çelikten üretilen sarkıtlarımız, modern ve endüstriyel dekorasyonlar için mükemmeldir. Toz boya kaplamalı renk seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#7a7a7a', '#4a4a4a'], ['#89706b', '#59403b'], ['#6b7f8e', '#3b4f5e']],
    sortOrder: 30,
  },
  {
    name: 'Jüt Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Jüt ipliğinden üretilen rustik sarkıt.',
    description:
      'Jüt ipliklerinden el işçiliğiyle üretilen sarkıtlarımız, doğal ve rustik bir görünüm sunar. Dekoratif perde aksesuarları için idealdir.',
    moq: '200 adet',
    swatches: [['#c8a878', '#987858'], ['#d79e69', '#a76e49'], ['#b9ad8c', '#897d6c']],
    sortOrder: 31,
  },
  {
    name: 'Dekoratif Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Özel tasarım dekoratif sarkıt.',
    description:
      'Özel tasarım detaylara sahip sarkıtlarımız, perdeye şık ve benzersiz bir görünüm kazandırır. Çeşitli desen ve boyutlarda mevcuttur.',
    moq: '100 adet',
    swatches: [['#d8c8a8', '#a89878'], ['#e7be99', '#b78e69'], ['#c9cdbc', '#999d8c']],
    sortOrder: 32,
  },
  {
    name: 'Toplu Sarkıt',
    category: 'Sarkıt',
    shortDescription: 'Toplu formda dekoratif sarkıt demeti.',
    description:
      'Toplu formda üretilen sarkıt demetlerimiz, perde kenarlarına zengin bir görünüm kazandırır. Kolay uygulanabilir yapıda.',
    moq: '150 adet',
    swatches: [['#c8b898', '#988878'], ['#d7ae89', '#a77e69'], ['#b9bdac', '#898d8c']],
    sortOrder: 33,
  },

  // ── Braçol ──────────────────────────────────────────────
  {
    name: 'Ahşap Braçol',
    category: 'Braçöl',
    shortDescription: 'Doğal ahşap braçol, rustik görünüm.',
    description:
      'Doğal ahşaptan üretilen braçollarımız, rustik ve doğal dekorasyonlar için mükemmeldir. Farklı çap seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#9a7a5a', '#6b5040'], ['#a9704b', '#7a4631'], ['#8b7f6e', '#5c5554']],
    sortOrder: 34,
  },
  {
    name: 'Metal Braçol',
    category: 'Braçöl',
    shortDescription: 'Paslanmaz çelik braçol, modern görünüm.',
    description:
      'Paslanmaz çelikten üretilen braçollarımız, modern ve endüstriyel dekorasyonlar için mükemmeldir. Toz boya kaplamalı renk seçenekleri mevcuttur.',
    moq: '200 adet',
    swatches: [['#7a7a7a', '#4a4a4a'], ['#89706b', '#59403b'], ['#6b7f8e', '#3b4f5e']],
    sortOrder: 35,
  },
  {
    name: 'Jüt Braçol',
    category: 'Braçöl',
    shortDescription: 'Jüt kaplı braçol, rustik detay.',
    description:
      'Jüt iplikle kaplanmış braçollarımız, rustik ve doğal bir görünüm sunar. Dekoratif perde aksesuarları için idealdir.',
    moq: '200 adet',
    swatches: [['#c8a878', '#987858'], ['#d79e69', '#a76e49'], ['#b9ad8c', '#897d6c']],
    sortOrder: 36,
  },
  {
    name: 'Çift Braçol',
    category: 'Braçöl',
    shortDescription: 'Çift taraflı braçol, dekoratif.',
    description:
      'Çift taraflı tasarımı sayesinde farklı dekorasyonlara uyum sağlar. Her iki yüzeyinde de dekoratif detay bulunur.',
    moq: '150 adet',
    swatches: [['#8a7a6a', '#5a4a3a'], ['#99705b', '#69402b'], ['#7b7f7e', '#4b4f4e']],
    sortOrder: 37,
  },
  {
    name: 'Ayarlanabilir Braçol',
    category: 'Braçöl',
    shortDescription: 'Ayarlanabilir braçol, çok amaçlı.',
    description:
      'Ayarlanabilir mekanizması sayesinde farklı perde çaplarına uyum sağlar. Tek beden çoklu kullanım avantajı sunar.',
    moq: '150 adet',
    swatches: [['#7a7a7a', '#4a4a4a'], ['#89706b', '#59403b'], ['#6b7f8e', '#3b4f5e']],
    sortOrder: 38,
  },
  {
    name: 'Dekoratif Braçol',
    category: 'Braçöl',
    shortDescription: 'Dekoratif detaylı braçol.',
    description:
      'Üzerinde dekoratif desenler bulunan braçollarımız, perdeye şık bir görünüm kazandırır. Farklı desen seçenekleri mevcuttur.',
    moq: '150 adet',
    swatches: [['#b8a080', '#8a7060'], ['#c79671', '#996651'], ['#a9a594', '#7b7574']],
    sortOrder: 39,
  },
  {
    name: 'Rustik Braçol',
    category: 'Braçöl',
    shortDescription: 'Rustik tarzda dekoratif braçol.',
    description:
      'Rustik tarzda üretilen braçollarımız, doğal ve sıcak bir atmosfer yaratır. Ahşap ve jüt detaylarıyla zenginleştirilmiştir.',
    moq: '200 adet',
    swatches: [['#a89070', '#786050'], ['#b78661', '#875641'], ['#999584', '#696564']],
    sortOrder: 40,
  },
]

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@rustikevi.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123'

  // ── Seed admin user ───────────────────────────────────────
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1)

  if (existing) {
    console.log(`Admin user ${adminEmail} already exists, skipping.`)
  } else {
    const passwordHash = hashSync(adminPassword, 12)
    const [admin] = await db
      .insert(users)
      .values({
        email: adminEmail,
        passwordHash,
        name: 'Admin',
        role: 'admin',
        isActive: true,
      })
      .returning({ id: users.id, email: users.email })
    console.log(`✅ Admin user created: ${admin.email} (id: ${admin.id})`)
  }

  // ── Seed products ─────────────────────────────────────────
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)

  if (countResult.count > 0) {
    console.log(`Products table already has ${countResult.count} rows, skipping.`)
    process.exit(0)
  }

  for (const p of productData) {
    await db.insert(products).values({
      name: p.name,
      category: p.category,
      description: p.description,
      shortDescription: p.shortDescription,
      moq: p.moq,
      swatches: p.swatches,
      featured: p.featured || false,
      isActive: true,
      sortOrder: p.sortOrder,
    })
  }

  console.log(`✅ ${productData.length} products seeded.`)

  // ── Seed content blocks ────────────────────────────────────
  const [contentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contentBlocks)

  if (contentCount.count > 0) {
    console.log(`Content blocks already has ${contentCount.count} rows, skipping.`)
  } else {
    const contentData = [
      {
        slug: 'site-config',
        type: 'json' as const,
        title: 'Site Yapılandırması',
        body: '',
        metadata: {
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
        },
      },
      {
        slug: 'about-hero',
        type: 'json' as const,
        title: 'Hakkında — Hero',
        body: '',
        metadata: {
          badge: 'Hikayemiz',
          heading: 'Hakkında',
          description:
            'Rustik Evi, perde satışıyla başlayan bir aile işletmesi olarak Gaziantep\'te yola çıktı; bugün kendi atölyesinde ürettiği perde aksesuarlarıyla Türkiye\'nin dört bir yanındaki perde mağazalarının toptan tedarikçisi olmanın gururunu yaşıyor.',
        },
      },
      {
        slug: 'about-values',
        type: 'json' as const,
        title: 'Hakkında — Değerler',
        body: '',
        metadata: {
          items: [
            {
              icon: 'Factory',
              title: 'Kendi Atölyemizde Üretim',
              text: 'Ürünlerimizin tamamı hazır parça değil, kendi atölyemizde elle üretilen özgün tasarımlardır.',
            },
            {
              icon: 'Hammer',
              title: 'El İşçiliği',
              text: 'Aksesuarlarımızın büyük bölümü, yılların verdiği tecrübeyle çalışan ustalarımızın elinden çıkıyor.',
            },
            {
              icon: 'Users2',
              title: 'Toptan Ortaklık',
              text: 'Toptan müşterilerimizi sadece alıcı değil, uzun soluklu iş ortağı olarak görüyoruz.',
            },
          ],
        },
      },
      {
        slug: 'about-timeline',
        type: 'json' as const,
        title: 'Hakkında — Zaman Çizelgesi',
        body: '',
        metadata: {
          items: [
            {
              year: '2019',
              title: 'Perde satışıyla başladı',
              text: 'Gaziantep\'te küçük bir perde mağazası olarak yola çıktık ve zamanla rustik perde aksesuarları üretimine yöneldik.',
            },
            {
              year: '2020',
              title: 'Perde aksesuarı üretimine geçiş',
              text: 'Deri detaylı halka ve kordon üretimini bünyemize katarak ürün yelpazemizi genişlettik.',
            },
            {
              year: '2023',
              title: '23 ilde toptan mağaza ağı',
              text: 'Türkiye genelinde 180\'in üzerinde perde mağazasına düzenli toptan sevkiyat yapmaya başladık.',
            },
            {
              year: '2026',
              title: 'Dijital katalog ve genişleme',
              text: 'Anlaşmalı mağazalarımızla daha hızlı iletişim kurmak için dijital kataloğumuzu ve WhatsApp sipariş hattımızı hayata geçirdik.',
            },
          ],
        },
      },
      {
        slug: 'about-cta',
        type: 'json' as const,
        title: 'Hakkında — CTA',
        body: '',
        metadata: {
          heading: 'Toptan iş ortağımız olmak ister misiniz?',
          description:
            'Toptan iş birliği koşullarımız, güncel fiyat listemiz ve numune talepleriniz için bizimle iletişime geçin.',
          buttonText: 'İletişime Geç',
        },
      },
      {
        slug: 'contact-intro',
        type: 'json' as const,
        title: 'İletişim — Giriş',
        body: '',
        metadata: {
          badge: 'Sipariş & İletişim',
          heading: 'İletişim',
          description:
            'Toptan sipariş taleplerinizi en hızlı şekilde WhatsApp sipariş hattımızdan alıyoruz. Aşağıdaki formu doldurmanız yeterli.',
        },
      },
      {
        slug: 'contact-social',
        type: 'json' as const,
        title: 'İletişim — Sosyal Medya',
        body: '',
        metadata: {
          heading: 'Sosyal Medya',
          description: 'Yeni koleksiyonlarımızı ve toptan kampanyalarımızı takip edin.',
        },
      },
    ]

    for (const block of contentData) {
      await db.insert(contentBlocks).values(block)
    }
    console.log(`✅ ${contentData.length} content blocks seeded.`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
