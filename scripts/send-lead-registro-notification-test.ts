/**
 * Dry-run: send internal lead summary emails for all 3 sources.
 * Usage: railway run npx tsx scripts/send-lead-registro-notification-test.ts
 *    or: npx tsx scripts/send-lead-registro-notification-test.ts  (with env vars set)
 */

import { sendLeadRegistroNotification } from '../lib/leads/registro-notification'

const TEST_DESTINATION = 'jorge7gomez@gmail.com'

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is required')
    process.exit(1)
  }

  process.env.REGISTRO_NOTIFICATION_EMAIL = TEST_DESTINATION

  const cases = [
    {
      label: 'activar',
      data: {
        source: 'activar' as const,
        nombre: '[DRY RUN] Jorge Test Activar',
        empresa: 'Empresa Prueba Activar S.A.',
        email: 'lead-activar-test@example.com',
        whatsapp: '98765432',
        country_code: 'HND' as const,
        empleados: 25,
        tenant_id: 'dry-run-activar-tenant-001',
      },
    },
    {
      label: 'ventas',
      data: {
        source: 'ventas' as const,
        nombre: '[DRY RUN] Jorge Test Ventas',
        empresa: 'Empresa Prueba Ventas S.A.',
        email: 'lead-ventas-test@example.com',
        whatsapp: '87654321',
        country_code: 'HND' as const,
        empleados: 40,
        quote_id: 'dry-run-quote-001',
        billing_modality: 'monthly',
        monthly_total: 12500,
        currency: 'HNL',
      },
    },
    {
      label: 'suscripcion',
      data: {
        source: 'suscripcion' as const,
        nombre: '[DRY RUN] Suscriptor Test',
        email: 'lead-suscripcion-test@example.com',
      },
    },
  ]

  console.log(`Sending ${cases.length} dry-run notifications to ${TEST_DESTINATION}...\n`)

  for (const { label, data } of cases) {
    console.log(`→ ${label}...`)
    await sendLeadRegistroNotification(data)
    console.log(`  done (${label})\n`)
  }

  console.log('All dry-run notifications dispatched.')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
