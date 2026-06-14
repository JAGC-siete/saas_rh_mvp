import { z } from 'zod'

export const COMM_MAX_PAYLOAD_BYTES = 200 * 1024

export const commSegmentSchema = z.enum(['active_admins', 'new_admins'])
export type CommSegment = z.infer<typeof commSegmentSchema>

export const commStatusSchema = z.enum(['draft', 'sending', 'sent', 'failed'])
export type CommStatus = z.infer<typeof commStatusSchema>

export const createCampaignSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(5).max(50_000),
  segment: commSegmentSchema,
})

export interface CampaignRow {
  id: string
  subject: string
  body: string
  target_segment: CommSegment | null
  status: CommStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CampaignRecipient {
  id: string
  email: string
}

export const SEGMENT_LABELS: Record<CommSegment, string> = {
  active_admins: 'Administradores activos',
  new_admins: 'Nuevos administradores (últimos 7 días)',
}

export function assertCommPayloadSize(payload: unknown) {
  const bytes = Buffer.byteLength(JSON.stringify(payload ?? {}), 'utf8')
  if (bytes > COMM_MAX_PAYLOAD_BYTES) throw new Error('PAYLOAD_TOO_LARGE')
}
