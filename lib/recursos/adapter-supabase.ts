/**
 * Supabase adapter for /recursos content.
 * Reads from public.recursos table; content column is markdown, converted to HTML on read.
 */

import { createAdminClient } from '../supabase/admin-client'
import { markdownToHtml } from './markdown'
import type { IRecursosAdapter, RecursoMeta, RecursoListItem } from './types'

function toIsoDate(ts: string | null | undefined): string | undefined {
  if (ts == null) return undefined
  return ts
}

export const recursosAdapterSupabase: IRecursosAdapter = {
  async getAllSlugs(): Promise<{ slug: string }[]> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('recursos')
      .select('slug')
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
      author: data.author ?? undefined
    }
  },

  async getRecursosList(): Promise<RecursoListItem[]> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('recursos')
      .select('slug, title, description, date_published, date_modified, image, author')
      .order('date_published', { ascending: false })
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
      author: row.author ?? undefined
    }))
  }
}
