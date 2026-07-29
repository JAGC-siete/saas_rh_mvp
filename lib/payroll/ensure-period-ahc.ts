/**
 * Ensure AHC rows exist and are fresher than attendance_records for a period.
 * Preview must call this before aggregating hours — it does not write AHC itself.
 */

import { calculateAttendanceHoursBatch } from '../attendance/calculate-hours'

const DEFAULT_CHUNK = 200

export type AttendanceRecordForAhc = {
  id: string
  updated_at?: string | null
}

export type AhcRowForFreshness = {
  attendance_record_id: string
  updated_at?: string | null
}

export type EnsurePeriodAhcResult = {
  complete: number
  missing: number
  stale: number
  refreshed: number
  refreshIds: string[]
  error?: string
}

export function collectAhcRefreshIds(
  completeRecords: AttendanceRecordForAhc[],
  ahcRows: AhcRowForFreshness[]
): { missingIds: string[]; staleIds: string[]; refreshIds: string[] } {
  const ahcByRecord = new Map<string, AhcRowForFreshness>()
  for (const row of ahcRows) {
    if (row.attendance_record_id) ahcByRecord.set(row.attendance_record_id, row)
  }

  const missingIds: string[] = []
  const staleIds: string[] = []

  for (const rec of completeRecords) {
    if (!rec?.id) continue
    const ahc = ahcByRecord.get(rec.id)
    if (!ahc) {
      missingIds.push(rec.id)
      continue
    }
    const arUpdated = rec.updated_at ? Date.parse(rec.updated_at) : NaN
    const ahcUpdated = ahc.updated_at ? Date.parse(ahc.updated_at) : NaN
    if (Number.isFinite(arUpdated) && (!Number.isFinite(ahcUpdated) || arUpdated > ahcUpdated)) {
      staleIds.push(rec.id)
    }
  }

  const refreshIds = [...new Set([...missingIds, ...staleIds])]
  return { missingIds, staleIds, refreshIds }
}

function chunkIds(ids: string[], size: number): string[][] {
  if (ids.length === 0) return []
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size))
  }
  return out
}

/**
 * Backfill missing AHC and recompute rows where attendance was edited after AHC.
 */
export async function ensurePeriodAhcFresh(input: {
  supabase: any
  completeRecords: AttendanceRecordForAhc[]
  lawYear: number
  chunkSize?: number
}): Promise<EnsurePeriodAhcResult> {
  const complete = input.completeRecords.filter((r) => r?.id)
  if (complete.length === 0) {
    return { complete: 0, missing: 0, stale: 0, refreshed: 0, refreshIds: [] }
  }

  const completeIds = complete.map((r) => r.id)
  const chunkSize = input.chunkSize ?? DEFAULT_CHUNK
  const ahcRows: AhcRowForFreshness[] = []

  for (const chunk of chunkIds(completeIds, chunkSize)) {
    const { data, error: ahcErr } = await input.supabase
      .from('attendance_hours_calculation')
      .select('attendance_record_id, updated_at')
      .in('attendance_record_id', chunk)

    if (ahcErr) {
      return {
        complete: complete.length,
        missing: 0,
        stale: 0,
        refreshed: 0,
        refreshIds: [],
        error: ahcErr.message,
      }
    }
    ahcRows.push(...((data || []) as AhcRowForFreshness[]))
  }

  const { missingIds, staleIds, refreshIds } = collectAhcRefreshIds(complete, ahcRows)

  if (refreshIds.length === 0) {
    return {
      complete: complete.length,
      missing: 0,
      stale: 0,
      refreshed: 0,
      refreshIds: [],
    }
  }

  let refreshed = 0
  try {
    for (const chunk of chunkIds(refreshIds, chunkSize)) {
      const results = await calculateAttendanceHoursBatch(
        chunk,
        input.lawYear,
        input.supabase
      )
      refreshed += results.length
    }
  } catch (e) {
    return {
      complete: complete.length,
      missing: missingIds.length,
      stale: staleIds.length,
      refreshed,
      refreshIds,
      error: e instanceof Error ? e.message : String(e),
    }
  }

  return {
    complete: complete.length,
    missing: missingIds.length,
    stale: staleIds.length,
    refreshed,
    refreshIds,
  }
}
