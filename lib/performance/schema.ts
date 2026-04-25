import { z } from 'zod'

export const PERF_MAX_ITEMS = 50
export const PERF_MAX_PAYLOAD_BYTES = 500 * 1024

export const perfRatingSchema = z.enum(['no_cumple', 'cumple', 'supera'])
export type PerfRating = z.infer<typeof perfRatingSchema>

export const perfItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  function: z.string().trim().max(2000).optional().default(''),
  indicator: z.string().trim().max(1000).optional().default(''),
  weight: z.number().min(0).max(100).optional().default(0),
  rating: perfRatingSchema.optional(),
  comment: z.string().trim().max(2000).optional().default('')
})

export const perfItemsSchema = z.array(perfItemSchema).max(PERF_MAX_ITEMS)

export const perfStatusSchema = z.enum(['draft', 'in_progress', 'completed', 'archived'])
export type PerfStatus = z.infer<typeof perfStatusSchema>

export const createPerformanceEvaluationSchema = z.object({
  employee_id: z.string().uuid(),
  mtp_draft_id: z.string().uuid().nullable().optional(),
  cycle_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cycle_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: perfStatusSchema.optional().default('draft'),
  items: perfItemsSchema.optional().default([])
})

export const updatePerformanceEvaluationSchema = z.object({
  id: z.string().uuid(),
  status: perfStatusSchema.optional(),
  items: perfItemsSchema.optional()
})

export interface PerformanceEvaluationRow {
  id: string
  company_id: string
  employee_id: string
  mtp_draft_id: string | null
  cycle_start: string
  cycle_end: string
  status: PerfStatus
  items: z.infer<typeof perfItemsSchema>
  overall_score: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export function assertPerfPayloadSize(payload: unknown) {
  const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8')
  if (bytes > PERF_MAX_PAYLOAD_BYTES) throw new Error('PAYLOAD_TOO_LARGE')
}

