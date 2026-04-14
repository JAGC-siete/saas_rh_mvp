import { recursosAdapter as recursosAdapterFiles } from './adapter'
import { recursosAdapterSupabase } from './adapter-supabase'

const source = typeof process !== 'undefined' && process.env.RECURSOS_SOURCE === 'supabase' ? 'supabase' : 'files'
export const recursosAdapter = source === 'supabase' ? recursosAdapterSupabase : recursosAdapterFiles

export type { RecursoMeta, RecursoListItem, IRecursosAdapter } from './types'
