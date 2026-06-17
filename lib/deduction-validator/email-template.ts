/**
 * Plantillas de email para reportes de deducciones — Infraestructura Líquida.
 */

import {
  liquidCta,
  liquidCtaWhatsApp,
  liquidEmphasis,
  liquidInfoBox,
  liquidKeyValueTable,
  liquidParagraph,
  wrapLiquidEmail,
} from '../emails/liquid-layout'

export interface DeductionEmailData {
  year: number
  paymentModality: 'quincenal' | 'mensual'
  grossSalary: number
  ihss: number
  ihssPercentage: number
  rap: number
  rapPercentage: number
  isr: number
  isrPercentage: number
  totalDeductions: number
  netSalary: number
}

function formatL(value: number): string {
  return `L. ${value.toFixed(2)}`
}

export function generateDeductionEmailHTML(data: DeductionEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  const activarUrl = `${siteUrl}/activar?country=HND&utm_source=calculadora-deducciones-hnd&utm_medium=email&utm_campaign=deduction-report`
  const demoWhatsAppUrl = `https://wa.me/50432226773?text=${encodeURIComponent(
    'Hola, calculé deducciones en Humano SISU (Honduras) y me gustaría una demo personalizada.'
  )}`
  const supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=50432226773&text=${encodeURIComponent(
    'Hola Jorge, tengo una consulta sobre la validación de deducciones de mi nómina.'
  )}`

  const summaryTable = liquidKeyValueTable([
    {
      label: `Salario ${data.paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual'}`,
      value: formatL(data.grossSalary),
    },
    { label: 'IHSS', value: `${formatL(data.ihss)} (${data.ihssPercentage.toFixed(2)}%)` },
    { label: 'RAP', value: `${formatL(data.rap)} (${data.rapPercentage.toFixed(2)}%)` },
    { label: 'ISR', value: `${formatL(data.isr)} (${data.isrPercentage.toFixed(2)}%)` },
    { label: 'Total Deducciones', value: formatL(data.totalDeductions) },
    { label: 'Salario Neto', value: formatL(data.netSalary), emphasize: true },
  ])

  const bodyHtml = [
    liquidParagraph('Estimado/a usuario,'),
    liquidParagraph(
      `Adjunto encontrará el reporte detallado de validación de deducciones de nómina para el año ${data.year}.`
    ),
    summaryTable,
    liquidInfoBox(
      `<strong>Nota:</strong> Estos cálculos están basados en las leyes vigentes de Honduras para el año ${data.year}.`,
      'warning'
    ),
    liquidParagraph(
      `${liquidEmphasis('Deja de calcular en Excel.')} Humano SISU automatiza IHSS, RAP e ISR con el mismo motor que usaste aquí.`
    ),
    liquidParagraph('Sin errores manuales — del reloj biométrico al comprobante de pago.'),
    liquidCta(activarUrl, 'Activar gratis 30 días'),
    liquidCtaWhatsApp(demoWhatsAppUrl, 'Agendar demo'),
    liquidParagraph(
      'Si tiene alguna pregunta, no dude en contactarnos.<br><strong>Humano SISU</strong> — RRHH y nómina regional (El Salvador, Guatemala y Honduras)'
    ),
    liquidCtaWhatsApp(supportWhatsAppUrl, '💬 Contactar vía WhatsApp'),
  ].join('')

  return wrapLiquidEmail({
    title: 'Reporte de Validación de Deducciones',
    subtitle: `Año fiscal ${data.year}`,
    badge: 'Calculadora',
    bodyHtml,
  })
}

export function generateDeductionEmailSubject(year: number): string {
  return `Reporte de Deducciones de Nómina - ${year} - Humano SISU`
}
