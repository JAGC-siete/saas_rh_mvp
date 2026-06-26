import {
  liquidCta,
  liquidCtaWhatsApp,
  liquidEmphasis,
  liquidInfoBox,
  liquidKeyValueTable,
  liquidParagraph,
  liquidPanel,
  wrapLiquidEmail,
} from '../emails/liquid-layout'
import type { BenefitCalculationResult } from '../payroll/thirteenth-fourteenth/calculate'

export type BenefitEmailAudience = 'empleado' | 'empresa'

export interface BenefitEmailData extends BenefitCalculationResult {
  label: string
  audience?: BenefitEmailAudience
}

function fmt(n: number): string {
  return `L. ${Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generateBenefitEmailSubject(label: string): string {
  return `Tu cálculo de ${label} (Honduras) — Humano SISU`
}

export function generateBenefitEmailHTML(data: BenefitEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  const activarUrl = `${siteUrl}/activar?country=HND&utm_source=calculadora-beneficio&utm_medium=email`
  const supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=50432226773&text=${encodeURIComponent(
    `Hola, calculé mi ${data.label} en Humano SISU y tengo una consulta.`
  )}`

  const summaryTable = liquidKeyValueTable([
    { label: data.label, value: fmt(data.monto), emphasize: true },
    { label: 'Período', value: `${data.periodo.inicio} → ${data.periodo.fin}` },
    { label: 'Días (360)', value: String(data.diasEnPeriodo) },
    { label: 'Salario usado', value: fmt(data.salarioUsado) },
    { label: 'Modo', value: data.modoCalculo === 'anual' ? 'Pago anual' : 'Proporcional' },
  ])

  const isEmpresa = data.audience === 'empresa'
  const ventasUrl = `${siteUrl}/ventas?utm_source=calculadora-beneficio&utm_medium=email&utm_campaign=empresa-pdf`

  const audienceBlock = isEmpresa
    ? [
        liquidParagraph(
          `${liquidEmphasis('¿Calculas el beneficio de 1 empleado aquí, pero tienes toda una planilla?')}`
        ),
        liquidParagraph(
          'Con Humano SISU calculas 13vo, 14vo y nómina completa para todo tu equipo en un clic — desde asistencia biométrica.'
        ),
        liquidCta(ventasUrl, 'Agendar demo corta'),
        liquidCta(activarUrl, 'Activar Humano SISU gratis'),
      ].join('')
    : [
        liquidParagraph(`${liquidEmphasis('¿Tus compañeros también necesitan validar su beneficio?')}`),
        liquidParagraph('Comparte la calculadora gratuita de Humano SISU con tu equipo por WhatsApp.'),
        liquidCtaWhatsApp(supportWhatsAppUrl, 'Compartir calculadora por WhatsApp'),
      ].join('')

  const bodyHtml = [
    liquidParagraph(`Adjunto encontrarás el detalle de tu cálculo de ${data.label}.`),
    liquidPanel(summaryTable, 'Resumen'),
    liquidInfoBox(
      '<strong>Sin deducciones:</strong> el aguinaldo y catorceavo no llevan ISR, Seguro Social ni RAP (salvo pensión alimenticia ordenada por juez).',
      'warning'
    ),
    audienceBlock,
    !isEmpresa
      ? liquidParagraph(`${liquidEmphasis('¿Tu empresa gestiona planilla?')}`)
      : '',
    !isEmpresa ? liquidCta(activarUrl, 'Activar Humano SISU gratis') : '',
    !isEmpresa ? liquidCtaWhatsApp(supportWhatsAppUrl, 'Consultar por WhatsApp') : '',
  ]
    .filter(Boolean)
    .join('')

  return wrapLiquidEmail({
    title: `Cálculo de ${data.label}`,
    subtitle: `Monto estimado: ${fmt(data.monto)}`,
    bodyHtml,
  })
}
