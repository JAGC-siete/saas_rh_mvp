import { recursosAdapter as recursosAdapterFiles } from './adapter'
import { recursosAdapterSupabase } from './adapter-supabase'
import type { IRecursosAdapter } from './types'

export type { RecursoMeta, RecursoListItem, IRecursosAdapter, RecursoCategory } from './types'
export { RECURSO_CATEGORY_META, RECURSO_CATEGORIES } from './categories'

export function getRecursosSource(): 'supabase' | 'files' {
  return process.env.RECURSOS_SOURCE === 'supabase' ? 'supabase' : 'files'
}

function resolveAdapter(): IRecursosAdapter {
  return getRecursosSource() === 'supabase' ? recursosAdapterSupabase : recursosAdapterFiles
}

/** Resolves adapter at call time so RECURSOS_SOURCE changes apply without redeploying the module cache. */
export const recursosAdapter: IRecursosAdapter = {
  getAllSlugs: () => resolveAdapter().getAllSlugs(),
  getRecursoBySlug: (slug) => resolveAdapter().getRecursoBySlug(slug),
  getRecursosList: (options) => resolveAdapter().getRecursosList(options),
  getRecursosCountByCategory: () => resolveAdapter().getRecursosCountByCategory(),
}
