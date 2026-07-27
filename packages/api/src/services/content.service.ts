import { db } from '../db/index.js'
import { contentBlocks } from '../db/schema.js'
import { eq, sql, desc } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'

interface UpdateContentInput {
  title?: string
  body?: string
  type?: 'text' | 'json' | 'image'
  metadata?: Record<string, unknown>
}

export async function getContentBySlug(slug: string) {
  const [content] = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.slug, slug))
    .limit(1)

  if (!content) {
    throw new AppError(404, 'Content not found')
  }

  return content
}

export async function listContent() {
  return db
    .select()
    .from(contentBlocks)
    .orderBy(desc(contentBlocks.updatedAt))
}

export async function upsertContent(
  slug: string,
  input: UpdateContentInput,
  updatedById: string
) {
  const existing = await db
    .select({ id: contentBlocks.id })
    .from(contentBlocks)
    .where(eq(contentBlocks.slug, slug))
    .limit(1)

  if (existing.length > 0) {
    const [updated] = await db
      .update(contentBlocks)
      .set({
        ...input,
        updatedBy: updatedById,
        updatedAt: new Date(),
      })
      .where(eq(contentBlocks.slug, slug))
      .returning()

    return updated
  }

  if (!input.title) {
    throw new AppError(400, 'Title is required for new content')
  }

  const [created] = await db
    .insert(contentBlocks)
    .values({
      slug,
      title: input.title,
      body: input.body || '',
      type: input.type || 'text',
      metadata: input.metadata || {},
      updatedBy: updatedById,
    })
    .returning()

  return created
}

export async function deleteContent(slug: string) {
  const [deleted] = await db
    .delete(contentBlocks)
    .where(eq(contentBlocks.slug, slug))
    .returning({ id: contentBlocks.id })

  if (!deleted) {
    throw new AppError(404, 'Content not found')
  }

  return deleted
}
