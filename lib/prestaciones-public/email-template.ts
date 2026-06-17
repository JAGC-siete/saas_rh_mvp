/**
 * Plantillas de email para reportes de prestaciones (Honduras) — Infraestructura Líquida.
 */

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

export interface PrestacionesEmailData {
  totalPagar: number
  motivoSalida: string
  preavisoGozado: boolean
  salarioBaseMensual: number
  salarioPromedioMensual: number
  antiguedadTexto: string
  rubros: {
    preaviso: number
    cesantiaBruta: number
    rapAplicado: number
    cesantiaNeta: number
    vacaciones: number
    aguinaldo: number
    decimoCuarto: number
  }
}

export function generatePrestacionesEmailSubject(): string {
  return 'Tu cálculo de prestaciones (Honduras) — Humano SISU'
}

function fmt(n: number): string {
  return `L. ${Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generatePrestacionesEmailHTML(data: PrestacionesEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  const supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=50432226773&text=${encodeURIComponent(
    'Hola Jorge, revisé mi cálculo de prestaciones laborales y tengo una pregunta.'
  )}`

  const summaryTable = liquidKeyValueTable([
    { label: 'Total estimado', value: fmt(data.totalPagar), emphasize: true },
    { label: 'Motivo', value: data.motivoSalida },
    { label: 'Antigüedad (360)', value: data.antiguedadTexto },
    { label: 'Salario base mensual', value: fmt(data.salarioBaseMensual) },
    { label: 'Salario promedio mensual', value: fmt(data.salarioPromedioMensual) },
  ])

  const desgloseTable = liquidKeyValueTable([
    { label: 'Preaviso', value: fmt(data.rubros.preaviso) },
    { label: 'Cesantía (bruta)', value: fmt(data.rubros.cesantiaBruta) },
    { label: 'RAP aplicado', value: fmt(data.rubros.rapAplicado) },
    { label: 'Cesantía (neta)', value: fmt(data.rubros.cesantiaNeta) },
    { label: 'Vacaciones', value: fmt(data.rubros.vacaciones) },
    { label: '13vo proporcional', value: fmt(data.rubros.aguinaldo) },
    { label: '14vo proporcional', value: fmt(data.rubros.decimoCuarto) },
  ])

  const bodyHtml = [
    liquidParagraph('Aquí tienes tu estimación. Adjuntamos un PDF con el detalle.'),
    liquidPanel(summaryTable, 'Resumen'),
    liquidPanel(desgloseTable, 'Desglose'),
    liquidInfoBox(
      '<strong>Nota:</strong> Esta es una estimación orientativa basada en normativa laboral de Honduras (año comercial 360 días). Puede variar según salario promedio real, extras, políticas internas y condiciones específicas del caso.',
      'warning'
    ),
    liquidParagraph(`${liquidEmphasis('¿Automatizamos nómina y cálculos en tu empresa?')}`),
    liquidCta(`${siteUrl}/activar`, 'Activar gratis'),
    liquidParagraph('Humano SISU — RRHH y nómina regional (HN, SV, GT)'),
    liquidCtaWhatsApp(supportWhatsAppUrl, '💬 Contactar vía WhatsApp'),
  ].join('')

  return wrapLiquidEmail({
    title: 'Cálculo de prestaciones',
    subtitle: 'Honduras — estimación orientativa',
    badge: 'Calculadora',
    bodyHtml,
  })
}
