import { createServerFn } from '@tanstack/react-start'

const API_URL = process.env.API_URL || 'http://localhost:3001'

interface ContentBlock {
  id: string
  slug: string
  title: string
  body: string
  type: string
  metadata: Record<string, unknown>
}

export async function fetchContentBlock(
  slug: string,
): Promise<ContentBlock | null> {
  try {
    const res = await fetch(`${API_URL}/api/content/public/${slug}`)
    if (!res.ok) return null
    const json = await res.json()
    return json.data
  } catch {
    return null
  }
}

export const getSiteConfig = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Record<string, unknown>> => {
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
