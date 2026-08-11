/**
 * Outreach cold email to ferretería leads via Resend.
 * Default: dry-run (prints payload, no send).
 *
 * Usage:
 *   npx tsx scripts/send-ferreteria-outreach.ts --ciudad "Siguatepeque" --emails "a@x.com,b@y.com"
 *   npx tsx scripts/send-ferreteria-outreach.ts --ciudad "Comayagua" --file leads.json --send
 *   railway run npx tsx scripts/send-ferreteria-outreach.ts --ciudad "Siguatepeque" --emails "…" --send
 */

import { readFileSync } from 'node:fs'
import { Resend } from 'resend'
import { getResendFromContact } from '../lib/resend-from'

const SUBJECT = '¿Problemas de recursos humanos?'

const BODY_TEMPLATE = `Hola, espero que estén teniendo una buena semana.

Encontré su ferretería mientras buscaba comercios en Siguatepeque y pensé en presentarme.

Desarrollamos un sistema simple de RRHH para comercios y ferreterías. Sirve para controlar asistencia, manejar vacaciones y tener la nómina y deducciones más ordenada, sin complicaciones manuales.

Si les interesa, puedo mostrarles cómo funciona en una demo rápida de 10 minutos (sin ningún compromiso). 

¿Les gustaría que les envíe más información o agendar una demostración en su comercio? Que tengan un gran día.`

type LeadRow = {
  comercio?: string
  email: string
  ciudad?: string
}

function buildBody(ciudad: string): string {
  if (ciudad.trim().toLowerCase() === 'siguatepeque') return BODY_TEMPLATE
  return BODY_TEMPLATE.replace('Siguatepeque', ciudad.trim())
}

function parseArgs(argv: string[]) {
  let ciudad = 'Siguatepeque'
  let emailsCsv = ''
  let filePath = ''
  let send = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--ciudad') {
      ciudad = argv[++i] ?? ciudad
    } else if (arg === '--emails') {
      emailsCsv = argv[++i] ?? ''
    } else if (arg === '--file') {
      filePath = argv[++i] ?? ''
    } else if (arg === '--send') {
      send = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  npx tsx scripts/send-ferreteria-outreach.ts --ciudad "Siguatepeque" --emails "a@x.com,b@y.com"
  npx tsx scripts/send-ferreteria-outreach.ts --ciudad "Comayagua" --file leads.json --send`)
      process.exit(0)
    }
  }

  return { ciudad, emailsCsv, filePath, send }
}

function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (!email || !email.includes('@') || email === 'sin_dato') return null
  return email
}

function loadLeads(opts: {
  emailsCsv: string
  filePath: string
  ciudad: string
}): LeadRow[] {
  const rows: LeadRow[] = []

  if (opts.filePath) {
    const parsed = JSON.parse(readFileSync(opts.filePath, 'utf8')) as LeadRow[]
    if (!Array.isArray(parsed)) {
      throw new Error('--file must contain a JSON array')
    }
    for (const row of parsed) {
      const email = normalizeEmail(row.email ?? '')
      if (!email) continue
      rows.push({
        comercio: row.comercio,
        email,
        ciudad: row.ciudad ?? opts.ciudad,
      })
    }
  }

  if (opts.emailsCsv.trim()) {
    for (const part of opts.emailsCsv.split(/[,;\s]+/)) {
      const email = normalizeEmail(part)
      if (!email) continue
      rows.push({ email, ciudad: opts.ciudad })
    }
  }

  const seen = new Set<string>()
  const deduped: LeadRow[] = []
  for (const row of rows) {
    if (seen.has(row.email)) continue
    seen.add(row.email)
    deduped.push(row)
  }
  return deduped
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const leads = loadLeads(opts)

  if (leads.length === 0) {
    console.error('No valid emails. Pass --emails or --file.')
    process.exit(1)
  }

  const body = buildBody(opts.ciudad)
  const from = getResendFromContact()
  const mode = opts.send ? 'live' : 'dry-run'

  console.log(`Mode: ${mode}`)
  console.log(`From: ${from}`)
  console.log(`Ciudad: ${opts.ciudad}`)
  console.log(`Subject: ${SUBJECT}`)
  console.log(`Recipients: ${leads.length}\n`)
  console.log('--- Body ---')
  console.log(body)
  console.log('------------\n')

  for (const [i, lead] of leads.entries()) {
    console.log(`${i + 1}. ${lead.email}${lead.comercio ? ` (${lead.comercio})` : ''}`)
  }
  console.log('')

  if (!opts.send) {
    console.log('Dry-run only. Re-run with --send to deliver via Resend.')
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is required for --send')
    process.exit(1)
  }

  const resend = new Resend(apiKey)
  let sent = 0
  let failed = 0

  for (const [i, lead] of leads.entries()) {
    const leadBody = lead.ciudad ? buildBody(lead.ciudad) : body
    process.stdout.write(`→ [${i + 1}/${leads.length}] ${lead.email} … `)

    try {
      const result = await resend.emails.send({
        from,
        to: lead.email,
        subject: SUBJECT,
        text: leadBody,
      })

      const err = (result as { error?: { message?: string } })?.error
      if (err) {
        failed += 1
        console.log(`ERROR ${err.message || 'send failed'}`)
      } else {
        sent += 1
        const id = (result as { data?: { id?: string }; id?: string })?.data?.id
          ?? (result as { id?: string })?.id
          ?? 'ok'
        console.log(`ok id=${id}`)
      }
    } catch (e) {
      failed += 1
      const message = e instanceof Error ? e.message : String(e)
      console.log(`ERROR ${message}`)
    }

    if (i < leads.length - 1) await sleep(800)
  }

  console.log(`\nDone — sent=${sent} failed=${failed} total=${leads.length}`)
  if (failed > 0) process.exit(1)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
