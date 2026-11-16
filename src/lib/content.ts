import { createServerFn } from '@tanstack/react-start'

const API_URL = process.env.API_URL || 'http://localhost:3001'

type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

interface ContentBlock {
  id: string
  slug: string
  title: string
  body: string
  type: string
  metadata: { [key: string]: Json }
}

export async function fetchContentBlock(
  slug: string,
): Promise<ContentBlock | null> {
  try {
    // API asılı kalırsa SSR'ı bloklamasın → zaman aşımında fallback
    const res = await fetch(`${API_URL}/api/content/public/${slug}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export const getSiteConfig = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ [key: string]: Json }> => {
    const block = await fetchContentBlock('site-config')
    if (block?.metadata) return block.metadata
    return {}
  },
)

export const getAboutHero = createServerFn({ method: 'GET' }).handler(
  async () => fetchContentBlock('about-hero'),
)

export const getAboutValues = createServerFn({ method: 'GET' }).handler(
  async () => fetchContentBlock('about-values'),
)

export const getAboutTimeline = createServerFn({ method: 'GET' }).handler(
  async () => fetchContentBlock('about-timeline'),
)

export const getAboutCta = createServerFn({ method: 'GET' }).handler(
  async () => fetchContentBlock('about-cta'),
)

export const getContactIntro = createServerFn({ method: 'GET' }).handler(
  async () => fetchContentBlock('contact-intro'),
)

export const getContactSocial = createServerFn({ method: 'GET' }).handler(
  async () => fetchContentBlock('contact-social'),
)
