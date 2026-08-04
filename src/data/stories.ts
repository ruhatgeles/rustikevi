export interface StorySlide {
  type: 'image' | 'video'
  /** Gradient background (placeholder for real media) */
  gradient: string
  /** Overlay text shown on the slide */
  caption?: string
  /** Duration in ms for this slide (default 5000) */
  duration?: number
}

export interface Story {
  id: number
  title: string
  /** Ring gradient colors [from, to] */
  ring: [string, string]
  slides: StorySlide[]
}

const stories: Story[] = [
  {
    id: 1,
    title: 'Rustik',
    ring: ['#c9a876', '#6d4527'],
    slides: [
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #c9a876, #8a6d43)',
        caption: 'Jüt Kordon – Doğal lif, el örgüsü',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #a0785a, #5c3d28)',
        caption: 'Ahşap Halka – Dayanıklı doğal ahşap',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #b8a080, #7a6548)',
        caption: 'Keten Bağcık – Zarif dokuma',
      },
    ],
  },
  {
    id: 2,
    title: 'Saçak',
    ring: ['#d89e67', '#996334'],
    slides: [
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #c2a070, #8a6d45)',
        caption: 'Jüt Saçak – Doğal dekoratif kenar',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #e8dcc8, #b8a888)',
        caption: 'Pamuklu Saçak – Yumuşak doku',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #d0c0a0, #a09070)',
        caption: 'Çift Katlı Saçak – Premium görünüm',
      },
    ],
  },
  {
    id: 3,
    title: 'Başlık',
    ring: ['#8a8a8a', '#3a3a3a'],
    slides: [
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #8a8a8a, #5a5a5a)',
        caption: 'Başlık Aparatı – Çelik gövde',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #9a7a5a, #6b5040)',
        caption: 'Ahşap Başlık Çubuğu – Doğal ahşap',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #6a6a6a, #3a3a3a)',
        caption: 'Metal Braket – Powder kaplama',
      },
    ],
  },
  {
    id: 4,
    title: 'Sarkıt',
    ring: ['#e8e0d8', '#c8c0b8'],
    slides: [
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #e8e0d8, #c8c0b8)',
        caption: 'Kristal Sarkıt – Işığı yansıtan cam',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #9a7a5a, #6b5040)',
        caption: 'Ahşap Sarkıt – Rustik doğal',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #c8a878, #987858)',
        caption: 'Jüt Sarkıt – El işçiliği',
      },
    ],
  },
  {
    id: 5,
    title: 'Braçöl',
    ring: ['#b8a888', '#887868'],
    slides: [
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #9a7a5a, #6b5040)',
        caption: 'Ahşap Braçöl – Doğal çubuk',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #7a7a7a, #4a4a4a)',
        caption: 'Metal Braçöl – Modern çizgi',
      },
      {
        type: 'image',
        gradient: 'linear-gradient(150deg, #a89070, #786050)',
        caption: 'Rustik Braçöl – Ahşap & jüt',
      },
    ],
  },
]

export default stories
