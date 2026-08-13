import { z } from 'zod'

export const SUPPORT_MAX_PAYLOAD_BYTES = 200 * 1024

export const ticketCategorySchema = z.enum([
  'bug',
  'feature',
  'billing',
  'payroll',
  'attendance',
  'account',
  'other',
])
export type TicketCategory = z.infer<typeof ticketCategorySchema>

export const ticketStatusSchema = z.enum([
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
])
export type TicketStatus = z.infer<typeof ticketStatusSchema>

export const ticketPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])
export type TicketPriority = z.infer<typeof ticketPrioritySchema>

export const listTicketsQuerySchema = z.object({
  status: ticketStatusSchema.optional(),
  category: ticketCategorySchema.optional(),
  priority: ticketPrioritySchema.optional(),
  company_id: z.string().uuid().optional(),
  mine: z
    .union([z.literal('true'), z.literal('false')])
    .optional(),
})

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(5000),
  category: ticketCategorySchema.optional().default('other'),
  priority: ticketPrioritySchema.optional().default('normal'),
  module: z.string().trim().max(120).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// Owners may only change status (close/reopen). Agents may change everything.
export const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  category: ticketCategorySchema.optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  sla_due_at: z.string().min(1).nullable().optional(),
})

export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  is_internal: z.boolean().optional().default(false),
})

export interface SupportTicketRow {
  id: string
  company_id: string
  created_by: string
  employee_id: string | null
  subject: string
  description: string
  category: TicketCategory
  module: string | null
  status: TicketStatus
  priority: TicketPriority
  assigned_to: string | null
  sla_due_at: string | null
  first_response_at: string | null
  resolved_at: string | null
  closed_at: string | null
  sla_breached: boolean
  escalated_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TicketMessageRow {
  id: string
  ticket_id: string
  company_id: string
  author_id: string
  author_role: string
  body: string
  is_internal: boolean
  created_at: string
}

export interface TicketAttachmentRow {
  id: string
  ticket_id: string
  message_id: string | null
  company_id: string
  uploaded_by: string
  storage_path: string
  file_name: string
  file_type: string | null
  file_size: number | null
  created_at: string
  /** Signed URL injected by the API for client download. */
  url?: string | null
}

export function assertSupportPayloadSize(payload: unknown) {
  const bytes = Buffer.byteLength(JSON.stringify(payload ?? {}), 'utf8')
  if (bytes > SUPPORT_MAX_PAYLOAD_BYTES) throw new Error('PAYLOAD_TOO_LARGE')
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  waiting_customer: 'Esperando respuesta',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Error / Bug',
  feature: 'Sugerencia',
  billing: 'Facturación',
  payroll: 'Nómina',
  attendance: 'Asistencia',
  account: 'Cuenta',
  other: 'Otro',
}
