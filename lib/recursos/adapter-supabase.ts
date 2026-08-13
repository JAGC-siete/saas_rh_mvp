import { createAdminClient } from '../supabase/admin-client'
import { markdownToHtml } from './markdown'
import {
  inferCategoryFromSlug,
  isValidRecursoCategory,
  type RecursoCategory,
} from './categories'
import type { IRecursosAdapter, RecursoMeta, RecursoListItem, RecursosListOptions } from './types'

function toIsoDate(ts: string | null | undefined): string | undefined {
  if (ts == null) return undefined
  return ts
}

function parseCategory(value: unknown, slug: string): RecursoCategory {
  if (isValidRecursoCategory(value)) return value
  return inferCategoryFromSlug(slug)
}

function emptyCounts(): Record<RecursoCategory, number> {
  return { rrhh: 0, 'responsabilidad-individual': 0 }
}

export const recursosAdapterSupabase: IRecursosAdapter = {
  async getAllSlugs(): Promise<{ slug: string }[]> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('recursos')
      .select('slug')
      .eq('status', 'published')
      .order('date_published', { ascending: false })
    if (error) {
      console.error('[recursos/adapter-supabase] getAllSlugs error:', error.message)
      return []
    }
    return (data ?? []).map((row) => ({ slug: row.slug }))
  },

  async getRecursoBySlug(slug: string): Promise<RecursoMeta | null> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('recursos')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
    if (error || !data) {
      if (error?.code !== 'PGRST116') {
        console.error('[recursos/adapter-supabase] getRecursoBySlug error:', error?.message)
      }
      return null
    }
    const contentHtml = markdownToHtml(data.content ?? '')
    return {
      slug: data.slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      content: contentHtml,
      datePublished: data.date_published ?? new Date().toISOString(),
      dateModified: toIsoDate(data.date_modified),
      image: data.image ?? undefined,
      author: data.author ?? undefined,
      category: parseCategory(data.category, data.slug),
    }
  },

  async getRecursosList(options?: RecursosListOptions): Promise<RecursoListItem[]> {
    const supabase = createAdminClient()
    let query = supabase
      .from('recursos')
      .select('slug, title, description, date_published, date_modified, image, author, category')
      .eq('status', 'published')
      .order('date_published', { ascending: false })

    if (options?.category) {
      query = query.eq('category', options.category)
    }

    const { data, error } = await query
    if (error) {
      console.error('[recursos/adapter-supabase] getRecursosList error:', error.message)
      return []
    }
    return (data ?? []).map((row) => ({
      slug: row.slug,
      title: row.title ?? row.slug,
      description: row.description ?? '',
      datePublished: row.date_published ?? new Date().toISOString(),
      dateModified: toIsoDate(row.date_modified),
      image: row.image ?? undefined,
      author: row.author ?? undefined,
      category: parseCategory(row.category, row.slug),
    }))
  },

  async getRecursosCountByCategory(): Promise<Record<RecursoCategory, number>> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('recursos')
      .select('category')
      .eq('status', 'published')

    if (error) {
      console.error('[recursos/adapter-supabase] getRecursosCountByCategory error:', error.message)
      return emptyCounts()
    }

    const counts = emptyCounts()
    for (const row of data ?? []) {
      const cat = parseCategory(row.category, '')
      counts[cat] += 1
    }
    return counts
  },
}
