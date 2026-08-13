import { z } from 'zod'

export const COMM_MAX_PAYLOAD_BYTES = 200 * 1024
export const COMM_MAX_BLOCKS = 20

export const commSegmentSchema = z.enum(['active_admins', 'new_admins'])
export type CommSegment = z.infer<typeof commSegmentSchema>

export const commStatusSchema = z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed'])
export type CommStatus = z.infer<typeof commStatusSchema>

export const commActionSchema = z.enum(['draft', 'schedule', 'send'])
export type CommAction = z.infer<typeof commActionSchema>

export const blockSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
})
export type CommBlock = z.infer<typeof blockSchema>

const baseCampaignFields = {
  subject: z.string().trim().min(3).max(200),
  intro: z.string().trim().max(1000).optional().nullable(),
  blocks: z.array(blockSchema).max(COMM_MAX_BLOCKS),
  segment: commSegmentSchema,
  cta_url: z.string().url().max(500).optional().nullable(),
  cta_label: z.string().trim().max(60).optional().nullable(),
  scheduled_at: z.string().min(1).optional().nullable(),
  source_commits: z.array(z.string().max(64)).max(COMM_MAX_BLOCKS).optional().nullable(),
}

export const createCampaignSchema = z
  .object({
    ...baseCampaignFields,
    action: commActionSchema,
  })
  .refine(
    (v) => v.action !== 'schedule' || (!!v.scheduled_at && !Number.isNaN(Date.parse(v.scheduled_at))),
    { message: 'scheduled_at válido es requerido para programar', path: ['scheduled_at'] }
  )
  .refine((v) => v.action === 'draft' || v.blocks.length > 0, {
    message: 'Agrega al menos un bloque de contenido',
    path: ['blocks'],
  })

export const updateCampaignSchema = z
  .object({
    ...baseCampaignFields,
    action: commActionSchema,
  })
  .partial({
    subject: true,
    blocks: true,
    segment: true,
  })

export interface CampaignRow {
  id: string
  subject: string
  body: string
  intro: string | null
  blocks: CommBlock[]
  cta_url: string | null
  cta_label: string | null
  target_segment: CommSegment | null
  status: CommStatus
  scheduled_at: string | null
  source_commits: unknown
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

export interface AudienceStats {
  segment: CommSegment
  profilesMatched: number
  authUsersLoaded: number
  recipientsResolved: number
  skippedNoEmail: number
  skippedDuplicateEmail: number
  listUsersFailed: boolean
  profilesQueryError?: string
  listUsersError?: string
}

export interface AudiencePreview {
  segment: CommSegment
  recipientCount: number
  profilesMatched: number
  skippedNoEmail: number
  warnings: string[]
  sampleCompanies: string[]
  ready: boolean
}

export const STATUS_LABELS: Record<CommStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programado',
  sending: 'Enviando',
  sent: 'Enviado',
  failed: 'Fallido',
}

export function assertCommPayloadSize(payload: unknown) {
  const bytes = Buffer.byteLength(JSON.stringify(payload ?? {}), 'utf8')
  if (bytes > COMM_MAX_PAYLOAD_BYTES) throw new Error('PAYLOAD_TOO_LARGE')
}
