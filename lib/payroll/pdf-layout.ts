import { z } from 'zod'

export const payrollPdfGroupBySchema = z.enum(['none', 'department', 'team', 'position'])
export type PayrollPdfGroupBy = z.infer<typeof payrollPdfGroupBySchema>

export function parsePayrollPdfGroupByQuery(value: unknown): PayrollPdfGroupBy {
  if (value === undefined || value === null || value === '') return 'none'
  const s = Array.isArray(value) ? value[0] : value
  const r = payrollPdfGroupBySchema.safeParse(typeof s === 'string' ? s : String(s))
  return r.success ? r.data : 'none'
}

export type PlanillaRowForGrouping = {
  department?: string
  team?: string | null
  position?: string | null
  role?: string | null
}

export function groupKeyForRow(row: PlanillaRowForGrouping, groupBy: PayrollPdfGroupBy): string {
  if (groupBy === 'none') return ''
  if (groupBy === 'department') {
    return (row.department && String(row.department).trim()) || 'Sin Departamento'
  }
  if (groupBy === 'team') {
    return (row.team && String(row.team).trim()) || 'Sin equipo'
  }
  const pos = (row.position && String(row.position).trim()) || (row.role && String(row.role).trim()) || ''
  return pos || 'Sin posición'
}

export function groupPlanillaLikeRows<T extends PlanillaRowForGrouping>(
  rows: T[],
  groupBy: PayrollPdfGroupBy
): [string, T[]][] {
  if (groupBy === 'none') {
    return [['', rows]]
  }
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = groupKeyForRow(row, groupBy)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(row)
  }
  const keys = [...map.keys()].sort((a, b) => a.localeCompare(b, 'es'))
  return keys.map((k) => [k, map.get(k)!])
}

export function payrollPdfGroupByFilenameSuffix(groupBy: PayrollPdfGroupBy): string {
  if (groupBy === 'department') return '_por_departamento'
  if (groupBy === 'team') return '_por_equipo'
  if (groupBy === 'position') return '_por_posicion'
  return ''
}

export function executiveBreakdownLabel(groupBy: PayrollPdfGroupBy): string {
  if (groupBy === 'team') return 'TOTALES POR EQUIPO:'
  if (groupBy === 'position') return 'TOTALES POR POSICIÓN:'
  return 'TOTALES POR DEPARTAMENTO:'
}
