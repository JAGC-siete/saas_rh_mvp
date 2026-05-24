import {
  escapeHtml,
  transactionalInfoBox,
  transactionalKeyValueTable,
  transactionalParagraph,
  wrapTransactionalEmail,
} from './transactional-layout'

export interface PayrollReceiptEmailData {
  employeeName: string
  periodLabel: string
  hoursWorked?: number
  grossSalary: number
  ihss: number
  rap: number
  isr: number
  netSalary: number
}

function formatLempiras(amount: number): string {
  return `L. ${amount.toFixed(2)}`
}

export function buildPayrollReceiptEmailSubject(periodLabel: string): string {
  return `Recibo de Nómina — ${periodLabel}`
}

export function buildPayrollReceiptEmailText(data: PayrollReceiptEmailData): string {
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
  lines.push(
    `• Salario bruto: ${formatLempiras(data.grossSalary)}`,
    `• IHSS: ${formatLempiras(data.ihss)}`,
    `• RAP: ${formatLempiras(data.rap)}`,
    `• ISR: ${formatLempiras(data.isr)}`,
    `• Salario neto: ${formatLempiras(data.netSalary)}`,
    '',
    'Si tiene alguna pregunta, contacte a su manager de recursos humanos.',
    '',
    'Departamento de Recursos Humanos',
    'Humano SISU'
  )

  return lines.join('\n')
}

export function buildPayrollReceiptEmailHtml(data: PayrollReceiptEmailData): string {
  const rows = []

  if (data.hoursWorked != null) {
    rows.push({ label: 'Horas trabajadas', value: String(data.hoursWorked) })
  }

  rows.push(
    { label: 'Salario bruto', value: formatLempiras(data.grossSalary) },
    { label: 'IHSS', value: formatLempiras(data.ihss) },
    { label: 'RAP', value: formatLempiras(data.rap) },
    { label: 'ISR', value: formatLempiras(data.isr) },
    { label: 'Salario neto', value: formatLempiras(data.netSalary), emphasize: true }
  )

  const bodyHtml = [
    transactionalParagraph(`Estimado/a <strong style="color: #1a1a1a;">${escapeHtml(data.employeeName)}</strong>,`),
    transactionalParagraph(
      `Adjunto encontrará su recibo de nómina correspondiente al período <strong style="color: #1a1a1a;">${escapeHtml(data.periodLabel)}</strong>.`
    ),
    `<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b;">Resumen</p>`,
    transactionalKeyValueTable(rows),
    transactionalInfoBox(
      '<strong>¿Preguntas?</strong> Contacte a su manager de recursos humanos.',
      'neutral'
    ),
    transactionalParagraph('Saludos cordiales,<br><strong style="color: #1a1a1a;">Departamento de Recursos Humanos</strong>'),
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
    transactionalParagraph(`Hola <strong style="color: #1a1a1a;">${escapeHtml(data.employeeName)}</strong>,`),
    transactionalParagraph('Su voucher de pago individual está listo para descargar.'),
    transactionalKeyValueTable([
      { label: 'Código de empleado', value: data.employeeCode },
      { label: 'Período', value: data.periodLabel },
    ]),
    `<div style="text-align: center; margin: 24px 0;">
      <a href="${data.downloadUrl}" style="background: #0b4fa1; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 700; font-size: 15px;">Descargar voucher</a>
    </div>`,
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
