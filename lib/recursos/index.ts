import { recursosAdapter as recursosAdapterFiles } from './adapter'
import { recursosAdapterSupabase } from './adapter-supabase'
import { env } from '../env'

const source = env.RECURSOS_SOURCE === 'supabase' ? 'supabase' : 'files'
export const recursosAdapter = source === 'supabase' ? recursosAdapterSupabase : recursosAdapterFiles

export type { RecursoMeta, RecursoListItem, IRecursosAdapter } from './types'
