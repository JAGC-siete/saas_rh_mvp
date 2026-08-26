import {
  escapeHtml,
  transactionalCta,
  transactionalEmphasis,
  transactionalInfoBox,
  transactionalKeyValueTable,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './transactional-layout'
import {
  formatPdfMoney,
  resolvePayrollDisplayCurrency,
  statutoryUiLabels,
} from '../country/display-money'

export interface PayrollReceiptEmailData {
  employeeName: string
  periodLabel: string
  hoursWorked?: number
  grossSalary: number
  ihss: number
  rap: number
  isr: number
  netSalary: number
  countryCode?: string | null
}

function money(amount: number, countryCode?: string | null): string {
  return formatPdfMoney(amount, resolvePayrollDisplayCurrency(countryCode))
}

export function buildPayrollReceiptEmailSubject(periodLabel: string): string {
  return `Recibo de Nómina — ${periodLabel}`
}

export function buildPayrollReceiptEmailText(data: PayrollReceiptEmailData): string {
  const labels = statutoryUiLabels(data.countryCode)
  const lines = [
    `Estimado/a ${data.employeeName},`,
    '',
    `Adjunto encontrará su recibo de nómina correspondiente al período ${data.periodLabel}.`,
    '',
    'Resumen:',
  ]

  if (data.hoursWorked != null) {
    lines.push(`• Horas trabajadas: ${data.hoursWorked}`)
  }
  lines.push(`• Salario bruto: ${money(data.grossSalary, data.countryCode)}`)
  lines.push(`• ${labels.primarySocial}: ${money(data.ihss, data.countryCode)}`)
  if (labels.secondarySocial !== '—') {
    lines.push(`• ${labels.secondarySocial}: ${money(data.rap, data.countryCode)}`)
  }
  lines.push(
    `• ${labels.incomeTax}: ${money(data.isr, data.countryCode)}`,
    `• Salario neto: ${money(data.netSalary, data.countryCode)}`,
    '',
    'Si tiene alguna pregunta, contacte a su manager de recursos humanos.',
    '',
    'Departamento de Recursos Humanos',
    'Humano SISU'
  )

  return lines.join('\n')
}

export function buildPayrollReceiptEmailHtml(data: PayrollReceiptEmailData): string {
  const labels = statutoryUiLabels(data.countryCode)
  const rows: Array<{ label: string; value: string; emphasize?: boolean }> = []

  if (data.hoursWorked != null) {
    rows.push({ label: 'Horas trabajadas', value: String(data.hoursWorked) })
  }

  rows.push({ label: 'Salario bruto', value: money(data.grossSalary, data.countryCode) })
  rows.push({ label: labels.primarySocial, value: money(data.ihss, data.countryCode) })
  if (labels.secondarySocial !== '—') {
    rows.push({ label: labels.secondarySocial, value: money(data.rap, data.countryCode) })
  }
  rows.push(
    { label: labels.incomeTax, value: money(data.isr, data.countryCode) },
    { label: 'Salario neto', value: money(data.netSalary, data.countryCode), emphasize: true }
  )

  const bodyHtml = [
    transactionalParagraph(`Estimado/a ${transactionalEmphasis(escapeHtml(data.employeeName))},`),
    transactionalParagraph(
      `Adjunto encontrará su recibo de nómina correspondiente al período ${transactionalEmphasis(escapeHtml(data.periodLabel))}.`
    ),
    `<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b;">Resumen</p>`,
    transactionalKeyValueTable(rows),
    transactionalInfoBox(
      '<strong>¿Preguntas?</strong> Contacte a su manager de recursos humanos.',
      'neutral'
    ),
    transactionalParagraph(`Saludos cordiales,<br>${transactionalEmphasis('Departamento de Recursos Humanos')}`),
  ].join('')

  return wrapTransactionalEmail({
    title: 'Recibo de Nómina',
    subtitle: data.periodLabel,
    bodyHtml,
    footerNote: 'Correo automático de nómina. No responda a este mensaje.',
  })
}

export interface VoucherLinkEmailData {
  employeeName: string
  employeeCode: string
  periodLabel: string
  downloadUrl: string
}

export function buildVoucherLinkEmailSubject(data: Pick<VoucherLinkEmailData, 'periodLabel' | 'employeeName'>): string {
  return `Voucher de Pago — ${data.periodLabel} — ${data.employeeName}`
}

export function buildVoucherLinkEmailText(data: VoucherLinkEmailData): string {
  return [
    `Hola ${data.employeeName},`,
    '',
    'Has recibido el voucher de pago individual:',
    `• Empleado: ${data.employeeName}`,
    `• Código: ${data.employeeCode}`,
    `• Período: ${data.periodLabel}`,
    '',
    `Descargar voucher: ${data.downloadUrl}`,
    '',
    'Si tiene alguna pregunta, contacte a su manager de recursos humanos.',
    '',
    'Departamento de Recursos Humanos',
  ].join('\n')
}

export function buildVoucherLinkEmailHtml(data: VoucherLinkEmailData): string {
  const bodyHtml = [
    transactionalParagraph(`Hola ${transactionalEmphasis(escapeHtml(data.employeeName))},`),
    transactionalParagraph('Su voucher de pago individual está listo para descargar.'),
    transactionalKeyValueTable([
      { label: 'Código de empleado', value: data.employeeCode },
      { label: 'Período', value: data.periodLabel },
    ]),
    transactionalCta(data.downloadUrl, 'Descargar voucher'),
    transactionalInfoBox(
      'Este enlace es válido solo para usuarios autorizados de la empresa.',
      'warning'
    ),
    transactionalInfoBox(
      '<strong>¿Preguntas?</strong> Contacte a su manager de recursos humanos.',
      'neutral'
    ),
  ].join('')

  return wrapTransactionalEmail({
    title: 'Voucher de Pago',
    subtitle: data.periodLabel,
    bodyHtml,
    footerNote: 'Correo automático de nómina. No responda a este mensaje.',
  })
}

