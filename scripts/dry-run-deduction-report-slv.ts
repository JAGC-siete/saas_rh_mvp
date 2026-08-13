/**
 * Dry-run: genera el PDF El Salvador (mismos números del reporte adjunto)
 * y lo envía por Resend. Uso:
 *   railway run -- npx tsx scripts/dry-run-deduction-report-slv.ts
 *   # o con RESEND_API_KEY en el entorno
 */
import { writeFileSync } from 'fs'
import { join } from 'path'
import { generateDeductionReportPDF } from '../lib/deduction-validator/pdf-report'
import {
  generateDeductionEmailHTML,
  generateDeductionEmailSubject,
} from '../lib/deduction-validator/email-template'
import { getResendFromContact, getResendContactEmail } from '../lib/resend-from'

const TO = process.env.DRY_RUN_TO || 'jorge7gomez@gmail.com'

/** Mismos montos del PDF adjunto (usuario El Salvador, salario 408). */
const payload = {
  salary: 408,
  grossSalary: 408,
  monthlyGrossSalary: 408,
  paymentModality: 'mensual' as const,
  year: 2026,
  ihss: 0,
  ihssPercentage: 0,
  rap: 29.58,
  rapPercentage: 7.25,
  isr: 0,
  isrPercentage: 0,
  totalDeductions: 29.58,
  netSalary: 378.42,
  constants: {
    minimumWage: 262,
    ihssCeiling: 1000,
  },
  countryCode: 'SLV' as const,
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY missing. Run with: railway run -- npx tsx scripts/dry-run-deduction-report-slv.ts')
    process.exit(1)
  }

  console.log('Generating SLV deduction PDF…')
  const pdfBuffer = await generateDeductionReportPDF(payload)
  const outPath = join('/tmp', 'deduction-report-slv-dry-run.pdf')
  writeFileSync(outPath, pdfBuffer)
  console.log(`PDF written: ${outPath} (${pdfBuffer.length} bytes)`)

  const html = generateDeductionEmailHTML({
    year: payload.year,
    paymentModality: payload.paymentModality,
    grossSalary: payload.grossSalary,
    ihss: payload.ihss,
    ihssPercentage: payload.ihssPercentage,
    rap: payload.rap,
    rapPercentage: payload.rapPercentage,
    isr: payload.isr,
    isrPercentage: payload.isrPercentage,
    totalDeductions: payload.totalDeductions,
    netSalary: payload.netSalary,
    countryCode: payload.countryCode,
    audience: 'empleado',
  })
  const subject = `[DRY-RUN] ${generateDeductionEmailSubject(payload.year)} — El Salvador`

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const from = getResendFromContact()
  const replyTo = getResendContactEmail()

  console.log(`Sending to ${TO} from ${from}…`)
  const result = await resend.emails.send({
    from,
    to: TO,
    replyTo,
    subject,
    html,
    attachments: [
      {
        filename: `reporte-deducciones-SLV-${payload.year}-dry-run.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  })

  if (result.error) {
    console.error('Resend error:', result.error)
    process.exit(1)
  }

  console.log('Sent OK. id=', result.data?.id ?? '(no id)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
