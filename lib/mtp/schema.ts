import { z } from 'zod'

export const MTP_MAX_ITEMS = 50
export const MTP_MAX_PAYLOAD_BYTES = 500 * 1024

export const mtpItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  rawIdea: z.string().trim().max(1000).optional().default(''),
  actionVerb: z.string().trim().max(80).optional().default(''),
  task: z.string().trim().max(1000).optional().default(''),
  standard: z.string().trim().max(1000).optional().default(''),
  indicator: z.string().trim().max(1000).optional().default(''),
  finalFunction: z.string().trim().max(2000).optional().default(''),
  status: z.enum(['draft', 'ready']).optional().default('draft')
})

export const mtpItemsSchema = z
  .array(mtpItemSchema)
  .max(MTP_MAX_ITEMS, `No puede exceder ${MTP_MAX_ITEMS} funciones por borrador`)

export const mtpDraftStatusSchema = z.enum(['draft', 'archived'])

export const createMtpDraftSchema = z.object({
  title: z.string().trim().min(1, 'El título es requerido').max(160),
  role_name: z.string().trim().min(1, 'El rol es requerido').max(160),
  department_id: z.string().uuid().nullable().optional(),
  status: mtpDraftStatusSchema.optional().default('draft'),
  items: mtpItemsSchema.default([])
})

export const updateMtpDraftSchema = createMtpDraftSchema.partial().extend({
  id: z.string().uuid('ID de borrador inválido')
})

export type MTPItem = z.infer<typeof mtpItemSchema>
export type MTPDraftStatus = z.infer<typeof mtpDraftStatusSchema>
export type CreateMTPDraftInput = z.infer<typeof createMtpDraftSchema>
export type UpdateMTPDraftInput = z.infer<typeof updateMtpDraftSchema>

export interface MTPDraft {
  id: string
  company_id: string
  title: string
  role_name: string
  department_id: string | null
  items: MTPItem[]
  status: MTPDraftStatus
  version: number
  previous_items: MTPItem[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export function assertMtpPayloadSize(payload: unknown) {
  const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8')
  if (bytes > MTP_MAX_PAYLOAD_BYTES) {
    throw new Error('PAYLOAD_TOO_LARGE')
  }
}
