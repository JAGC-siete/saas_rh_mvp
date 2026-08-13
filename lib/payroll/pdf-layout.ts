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

export type ExecutiveBreakdownEntry = {
  key: string
  count: number
  net: number
}

/**
 * Lines for PDF page-1 executive breakdown.
 * Stable alpha order; if entries exceed maxLines, last line is "+N más …".
 */
export function buildExecutiveBreakdownLines(
  entries: ExecutiveBreakdownEntry[],
  options: { maxLines: number; formatNet: (net: number) => string }
): string[] {
  const maxLines = Math.max(1, Math.floor(options.maxLines))
  const sorted = [...entries].sort((a, b) => a.key.localeCompare(b.key, 'es'))
  const fmt = (e: ExecutiveBreakdownEntry) =>
    `${e.key}: ${e.count} emp. - ${options.formatNet(e.net)}`

  if (sorted.length <= maxLines) {
    return sorted.map(fmt)
  }

  const showCount = Math.max(1, maxLines - 1)
  const shown = sorted.slice(0, showCount)
  const rest = sorted.slice(showCount)
  const restEmployees = rest.reduce((s, e) => s + e.count, 0)
  const restNet = rest.reduce((s, e) => s + e.net, 0)
  return [
    ...shown.map(fmt),
    `+${rest.length} más (${restEmployees} emp.) - ${options.formatNet(restNet)}`,
  ]
}

