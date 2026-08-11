/**
 * B2B outbound prospection helpers (SuperAdmin).
 * Separate from inbound marketing_leads sequence.
 */

export const B2B_PROSPECT_RUN_STATUSES = [
  'draft',
  'researching',
  'reviewed',
  'ready',
  'sending',
  'sent',
  'archived',
] as const

export type B2bProspectRunStatus = (typeof B2B_PROSPECT_RUN_STATUSES)[number]

export const B2B_PROSPECT_CONFIDENCES = ['alta', 'media', 'baja', 'descartado'] as const

export type B2bProspectConfidence = (typeof B2B_PROSPECT_CONFIDENCES)[number]

export const DEFAULT_OUTREACH_SUBJECT = '¿Problemas de recursos humanos?'

/** Default body. Use {{ciudad}} — substituted at send/preview time. */
export const DEFAULT_OUTREACH_BODY = `Hola, espero que estén teniendo una buena semana.

Encontré su ferretería mientras buscaba comercios en {{ciudad}} y pensé en presentarme.

Desarrollamos un sistema simple de RRHH para comercios y ferreterías. Sirve para controlar asistencia, manejar vacaciones y tener la nómina y deducciones más ordenada, sin complicaciones manuales.

Si les interesa, puedo mostrarles cómo funciona en una demo rápida de 10 minutos (sin ningún compromiso). 

¿Les gustaría que les envíe más información o agendar una demostración en su comercio? Que tengan un gran día.`

export type B2bProspectRun = {
  id: string
  ciudad: string
  departamento: string | null
  pais: string
  rubros: string[]
  status: B2bProspectRunStatus
  email_subject: string
  email_body: string
  research_status?: string | null
  research_error?: string | null
  research_completed_at?: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type B2bProspectCandidate = {
  id: string
  run_id: string
  comercio: string
  rubro: string | null
  telefono: string | null
  email: string | null
  email_normalized: string | null
  direccion: string | null
  confianza: B2bProspectConfidence
  fuentes: string | null
  notas: string | null
  selected: boolean
  loaded_at: string | null
  created_at: string
  updated_at: string
}

export type B2bProspectContact = {
  id: string
  run_id: string
  comercio: string
  rubro: string | null
  telefono: string | null
  email: string | null
  email_normalized: string | null
  direccion: string | null
  confianza: B2bProspectConfidence
  fuentes: string | null
  notas: string | null
  whatsapp_link?: string | null
  whatsapp_message?: string | null
  whatsapp_generated_at?: string | null
  created_at: string
  updated_at: string
}

export type B2bProspectEmailLedgerRow = {
  id: string
  run_id: string
  contact_id: string
  subject: string
  body: string
  to_email: string
  status: 'dry_run' | 'sent' | 'error' | 'skipped'
  resend_id: string | null
  error: string | null
  sent_at: string
}

/** Loose but safer than includes('@'): local@domain.tld */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MAX_PROSPECTION_SEND_BATCH = 20

/** Prefer these for bulk select (skill guidance). */
export const PREFERRED_SEND_CONFIDENCES: readonly B2bProspectConfidence[] = [
  'alta',
  'media',
]

export function normalizeProspectEmail(raw: string | null | undefined): string | null {
  if (!raw) return null
  const email = raw.trim().toLowerCase()
  if (!email || email === 'sin_dato') return null
  if (!EMAIL_RE.test(email)) return null
  return email
}

export function isRateLimitError(message: string | null | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('429') || m.includes('rate limit') || m.includes('too many requests')
}

export function contactAlreadySent(
  ledgerRows: Array<{ contact_id: string; status: string }>,
  contactId: string
): boolean {
  return ledgerRows.some((row) => row.contact_id === contactId && row.status === 'sent')
}

export function isStuckSending(run: {
  status: string
  updated_at: string
}, nowMs = Date.now(), stuckAfterMs = 5 * 60 * 1000): boolean {
  if (run.status !== 'sending') return false
  const updated = Date.parse(run.updated_at)
  if (Number.isNaN(updated)) return true
  return nowMs - updated >= stuckAfterMs
}

export function renderOutreachBody(template: string, ciudad: string): string {
  const city = ciudad.trim() || 'la ciudad'
  return template
    .replaceAll('{{ciudad}}', city)
    .replaceAll('{{CIUDAD}}', city)
}

export function parseRubrosInput(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((r) => String(r).trim())
      .filter(Boolean)
  }
  if (typeof input === 'string') {
    return input
      .split(/[,;|]/)
      .map((r) => r.trim())
      .filter(Boolean)
  }
  return []
}

export function isValidConfidence(value: unknown): value is B2bProspectConfidence {
  return (
    typeof value === 'string' &&
    (B2B_PROSPECT_CONFIDENCES as readonly string[]).includes(value)
  )
}

export type ImportContactInput = {
  comercio?: string
  rubro?: string | null
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  confianza?: string | null
  fuentes?: string | null
  notas?: string | null
}

export function normalizeImportContact(row: ImportContactInput): {
  comercio: string
  rubro: string | null
  telefono: string | null
  email: string | null
  email_normalized: string | null
  direccion: string | null
  confianza: B2bProspectConfidence
  fuentes: string | null
  notas: string | null
} | null {
  const comercio = (row.comercio || '').trim()
  if (!comercio) return null

  const emailRaw = row.email?.trim() || null
  const email_normalized = normalizeProspectEmail(emailRaw)
  const confianza = isValidConfidence(row.confianza) ? row.confianza : 'media'

  return {
    comercio,
    rubro: row.rubro?.trim() || null,
    telefono: row.telefono?.trim() || null,
    email: email_normalized ? emailRaw!.trim() : emailRaw,
    email_normalized,
    direccion: row.direccion?.trim() || null,
    confianza,
    fuentes: row.fuentes?.trim() || null,
    notas: row.notas?.trim() || null,
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
