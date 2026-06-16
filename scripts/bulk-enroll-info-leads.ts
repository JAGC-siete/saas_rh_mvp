/**
 * Bulk enroll for /info leads (e.g. from business cards).
 *
 * Usage:
 *   railway run npx tsx scripts/bulk-enroll-info-leads.ts scripts/data/info-leads.json
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { enrollMarketingLead } from '../lib/marketing/enroll-lead'
import { sendLeadRegistroNotification } from '../lib/leads/registro-notification'

type LeadInput = {
  fullName: string
  email: string
  phone?: string
}

function loadLeads(filePath: string): LeadInput[] {
  const raw = readFileSync(resolve(filePath), 'utf8')
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('JSON must be a non-empty array of { fullName, email, phone? }')
  }
  for (const [i, item] of parsed.entries()) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as LeadInput).fullName !== 'string' ||
      typeof (item as LeadInput).email !== 'string' ||
      ((item as LeadInput).phone !== undefined && typeof (item as LeadInput).phone !== 'string')
    ) {
      throw new Error(`Invalid lead at index ${i}: expected { fullName, email, phone? }`)
    }
  }
  return parsed as LeadInput[]
}

async function run() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: npx tsx scripts/bulk-enroll-info-leads.ts <leads.json>')
    process.exit(1)
  }

  const leads = loadLeads(filePath)
  const results: Array<{ name: string; email: string; ok: boolean; detail: string }> = []

  for (const lead of leads) {
    const email = lead.email.trim().toLowerCase()
    const phone = lead.phone?.trim() || null
    try {
      console.log(`\nEnrolling: ${lead.fullName} <${email}>`)
      const result = await enrollMarketingLead({
        email,
        source: 'info',
        fullName: lead.fullName,
        phone,
      })
      console.log('  Result:', result)

      if (result.skippedReason !== 'excluded') {
        await sendLeadRegistroNotification({
          source: 'info',
          nombre: lead.fullName,
          email,
          whatsapp: phone,
          country_code: 'HND',
        })
        console.log('  Notification sent.')
      }

      results.push({
        name: lead.fullName,
        email,
        ok: true,
        detail: result.skippedReason ?? (result.infoPackSent ? 'info_pack_sent' : 'enrolled'),
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  Error: ${message}`)
      results.push({ name: lead.fullName, email, ok: false, detail: message })
    }
  }

  console.log('\n--- Summary ---')
  for (const row of results) {
    console.log(`${row.ok ? 'OK' : 'FAIL'}  ${row.name}  ${row.email}  (${row.detail})`)
  }

  const failed = results.filter((r) => !r.ok).length
  if (failed > 0) process.exit(1)
}

run()
