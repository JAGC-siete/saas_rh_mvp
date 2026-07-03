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
import { PUBLIC_PRESTACIONES_CONFIG } from '../public-calculator/prestaciones-config'

export type PrestacionesEmailAudience = 'empleado' | 'empresa'

export interface PrestacionesEmailData {
  totalPagar: number
  motivoSalida: string
  preavisoGozado: boolean
  salarioBaseMensual: number
  salarioPromedioMensual: number
  antiguedadTexto: string
  audience?: PrestacionesEmailAudience
  useGodfatherFunnel?: boolean
  godfatherKeyword?: string
  rubros: {
    preaviso: number
    cesantiaBruta: number
    rapAplicado: number
    cesantiaNeta: number
    vacaciones: number
    aguinaldo: number
    decimoCuarto: number
    reservaLaboralEnTotal: number
  }
  reservaLaboralDisclaimer?: string
}

export function generatePrestacionesEmailSubject(): string {
  return 'Tu cálculo de prestaciones (Honduras) — Humano SISU'
}

function fmt(n: number): string {
  return `L. ${Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function generatePrestacionesEmailHTML(data: PrestacionesEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  const source = 'calculadora-prestaciones'
  const activarUrl = `${siteUrl}/activar?country=HND&utm_source=${source}&utm_medium=email&utm_campaign=pdf-report`
  const ventasUrl = `${siteUrl}/ventas?utm_source=${source}&utm_medium=email&utm_campaign=empresa-pdf`
  const supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=50432226773&text=${encodeURIComponent(
    'Hola, revisé mi cálculo de prestaciones laborales en Humano SISU y tengo una pregunta.'
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
    { label: 'Reserva laboral', value: fmt(data.rubros.reservaLaboralEnTotal) },
  ])

  const isEmpresa = data.audience === 'empresa'
  const keyword =
    data.godfatherKeyword ?? PUBLIC_PRESTACIONES_CONFIG.funnel.godfatherKeyword

  const godfatherBlocks =
    data.useGodfatherFunnel && !isEmpresa
      ? [
          liquidParagraph('Tu liquidación está adjunta. Pero aquí va la verdad:'),
          liquidParagraph(
            `Si me contestas este correo diciendo <strong>"${keyword}"</strong>, te envío un PDF de una sola página que puedes dejar "olvidado" en la impresora de tu oficina o enviárselo a tu jefe.`
          ),
          liquidParagraph(
            'Es una comparativa de cuánto dinero pierde la empresa por liquidar finiquitos a mano. Tú no pides nada — solo "ayudas" a que la empresa sea más eficiente.'
          ),
          liquidParagraph('<strong>P.D.</strong> ¿Cuánto tardan en liquidarte cuando renuncias o te despiden?'),
        ]
      : []

  const empresaPitch = isEmpresa
    ? [
        liquidParagraph(
          `${liquidEmphasis('¿Liquidas a 1 empleado aquí, pero tienes toda una planilla?')}`
        ),
        liquidParagraph(
          'Humano SISU automatiza cesantía, preaviso, vacaciones, 13vo y 14vo para todo tu equipo — desde asistencia biométrica hasta comprobantes.'
        ),
        liquidCta(ventasUrl, 'Agendar demo corta'),
        liquidCta(activarUrl, 'Activar Humano SISU gratis'),
      ]
    : []

  const employeeSharePitch =
    data.useGodfatherFunnel && !isEmpresa
      ? []
      : !isEmpresa
        ? [
            liquidParagraph(`${liquidEmphasis('¿Tus compañeros también están saliendo de la empresa?')}`),
            liquidCtaWhatsApp(supportWhatsAppUrl, 'Compartir calculadora por WhatsApp'),
          ]
        : []

  const standardPitch =
    data.useGodfatherFunnel || isEmpresa
      ? []
      : [
          liquidParagraph(
            `${liquidEmphasis('Deja de calcular finiquitos en Excel.')} Humano SISU automatiza liquidaciones con el mismo motor que usaste aquí.`
          ),
          liquidCta(activarUrl, 'Activar gratis 30 días'),
          liquidCtaWhatsApp(supportWhatsAppUrl, 'Agendar demo'),
        ]

  const bodyHtml = [
    liquidParagraph('Aquí tienes tu estimación. Adjuntamos un PDF con el detalle.'),
    liquidPanel(summaryTable, 'Resumen'),
    liquidPanel(desgloseTable, 'Desglose'),
    liquidInfoBox(
      '<strong>Nota:</strong> Estimación orientativa según normativa laboral de Honduras (año comercial 360 días). Puede variar según salario promedio real, extras y condiciones del caso.',
      'warning'
    ),
    data.reservaLaboralDisclaimer
      ? liquidInfoBox(`<strong>Reserva laboral:</strong> ${data.reservaLaboralDisclaimer}`, 'warning')
      : '',
    ...godfatherBlocks,
    ...empresaPitch,
    ...employeeSharePitch,
    ...standardPitch,
    liquidParagraph('<strong>Humano SISU</strong> — RRHH y nómina regional (El Salvador, Guatemala y Honduras)'),
  ].join('')

  return wrapLiquidEmail({
    title: 'Cálculo de prestaciones',
    subtitle: 'Honduras — estimación orientativa',
    badge: 'Calculadora',
    bodyHtml,
  })
}
