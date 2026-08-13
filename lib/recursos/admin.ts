/**
 * Admin CRUD for public.recursos (markdown stored in DB).
 */

import { createAdminClient } from '../supabase/admin-client'
import type { Database } from '../database.types'
import {
  validateRecursoInput,
  type RecursoAdminItem,
  type RecursoInput,
  type RecursoStatus,
} from './validation'

type RecursoRow = Database['public']['Tables']['recursos']['Row']

function mapRowToAdminItem(row: RecursoRow): RecursoAdminItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    content: row.content ?? '',
    datePublished: row.date_published,
    dateModified: row.date_modified ?? undefined,
    image: row.image ?? undefined,
    author: row.author ?? undefined,
    status: (row.status === 'published' ? 'published' : 'draft') as RecursoStatus,
    category: row.category === 'responsabilidad-individual' ? 'responsabilidad-individual' : 'rrhh',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function inputToInsert(input: RecursoInput): Database['public']['Tables']['recursos']['Insert'] {
  return {
    slug: input.slug,
    title: input.title,
    description: input.description,
    content: input.content,
    date_published: input.datePublished ?? new Date().toISOString(),
    date_modified: input.dateModified ?? null,
    image: input.image ?? null,
    author: input.author ?? null,
    status: input.status,
    category: input.category,
  }
}

function inputToUpdate(input: RecursoInput): Database['public']['Tables']['recursos']['Update'] {
  return {
    title: input.title,
    description: input.description,
    content: input.content,
    date_published: input.datePublished,
    date_modified: input.dateModified ?? new Date().toISOString(),
    image: input.image ?? null,
    author: input.author ?? null,
    status: input.status,
    category: input.category,
  }
}

export async function listRecursosAdmin(): Promise<RecursoAdminItem[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('recursos')
    .select('*')
    .order('date_published', { ascending: false })

  if (error) {
    console.error('[recursos/admin] listRecursosAdmin error:', error.message)
    throw new Error('Error al listar recursos')
  }

  return (data ?? []).map(mapRowToAdminItem)
}

export async function getRecursoAdmin(slug: string): Promise<RecursoAdminItem | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('recursos')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[recursos/admin] getRecursoAdmin error:', error.message)
    throw new Error('Error al obtener recurso')
  }

  return data ? mapRowToAdminItem(data) : null
}

export async function createRecurso(input: RecursoInput): Promise<RecursoAdminItem> {
  const validation = validateRecursoInput(input)
  if (!validation.valid) {
    throw new ValidationError(validation.error)
  }

  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('recursos')
    .select('id')
    .eq('slug', validation.data.slug)
    .maybeSingle()

  if (existing) {
    throw new ConflictError(`Ya existe un artículo con el slug "${validation.data.slug}"`)
  }

  const { data, error } = await supabase
    .from('recursos')
    .insert(inputToInsert(validation.data))
    .select('*')
    .single()

  if (error || !data) {
    console.error('[recursos/admin] createRecurso error:', error?.message)
    throw new Error('Error al crear recurso')
  }

  return mapRowToAdminItem(data)
}

export async function updateRecurso(slug: string, input: Partial<RecursoInput>): Promise<RecursoAdminItem> {
  const existing = await getRecursoAdmin(slug)
  if (!existing) {
    throw new NotFoundError(`Artículo "${slug}" no encontrado`)
  }

  const merged: Partial<RecursoInput> = {
    slug: existing.slug,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    content: input.content ?? existing.content,
    datePublished: input.datePublished ?? existing.datePublished,
    dateModified: new Date().toISOString(),
    image: input.image !== undefined ? input.image : existing.image,
    author: input.author !== undefined ? input.author : existing.author,
    status: input.status ?? existing.status,
    category: input.category ?? existing.category,
  }

  const validation = validateRecursoInput(merged)
  if (!validation.valid) {
    throw new ValidationError(validation.error)
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('recursos')
    .update(inputToUpdate(validation.data))
    .eq('slug', slug)
    .select('*')
    .single()

  if (error || !data) {
    console.error('[recursos/admin] updateRecurso error:', error?.message)
    throw new Error('Error al actualizar recurso')
  }

  return mapRowToAdminItem(data)
}

export async function deleteRecurso(slug: string): Promise<void> {
  const existing = await getRecursoAdmin(slug)
  if (!existing) {
    throw new NotFoundError(`Artículo "${slug}" no encontrado`)
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('recursos').delete().eq('slug', slug)

  if (error) {
    console.error('[recursos/admin] deleteRecurso error:', error.message)
    throw new Error('Error al eliminar recurso')
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export type { RecursoAdminItem, RecursoInput, RecursoStatus }
