/**
 * Plantillas de email para reportes de deducciones — Infraestructura Líquida.
 */

import type { CountryCode } from '../country/supported'
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
  countryCode?: CountryCode
  useGodfatherFunnel?: boolean
  godfatherKeyword?: string
  audience?: 'empleado' | 'empresa'
}

const COUNTRY_META: Record<
  CountryCode,
  { currencyPrefix: string; legalName: string; deductionsPitch: string; secondaryLabel: string }
> = {
  HND: {
    currencyPrefix: 'L.',
    legalName: 'Honduras',
    deductionsPitch: 'Seguro Social, RAP e ISR',
    secondaryLabel: 'RAP',
  },
  SLV: {
    currencyPrefix: '$',
    legalName: 'El Salvador',
    deductionsPitch: 'ISSS, AFP e ISR',
    secondaryLabel: 'AFP',
  },
  GTM: {
    currencyPrefix: 'Q',
    legalName: 'Guatemala',
    deductionsPitch: 'IGSS e ISR',
    secondaryLabel: 'RAP',
  },
}

function formatMoney(country: CountryCode, value: number): string {
  const prefix = COUNTRY_META[country].currencyPrefix
  return `${prefix}${value.toFixed(2)}`
}

function utmSource(country: CountryCode): string {
  return `calculadora-deducciones-${country.toLowerCase()}`
}

export function generateDeductionEmailHTML(data: DeductionEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  const country: CountryCode = data.countryCode ?? 'HND'
  const meta = COUNTRY_META[country]
  const source = utmSource(country)

  const activarUrl = `${siteUrl}/activar?country=${country}&utm_source=${source}&utm_medium=email&utm_campaign=pdf-report`
  const ventasUrl = `${siteUrl}/ventas?utm_source=${source}&utm_medium=email&utm_campaign=empresa-pdf`
  const demoWhatsAppUrl = `https://wa.me/50432226773?text=${encodeURIComponent(
    `Hola, calculé deducciones en Humano SISU (${meta.legalName}) y me gustaría una demo personalizada.`
  )}`
  const supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=50432226773&text=${encodeURIComponent(
    `Hola, tengo una consulta sobre la validación de deducciones de mi nómina (${meta.legalName}).`
  )}`

  const summaryRows: Array<{ label: string; value: string; emphasize?: boolean }> = [
    {
      label: `Salario ${data.paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual'}`,
      value: formatMoney(country, data.grossSalary),
    },
    {
      label: 'Seguro Social',
      value: `${formatMoney(country, data.ihss)} (${data.ihssPercentage.toFixed(2)}%)`,
    },
  ]

  if (data.rap > 0 || country === 'HND' || country === 'SLV') {
    summaryRows.push({
      label: meta.secondaryLabel,
      value: `${formatMoney(country, data.rap)} (${data.rapPercentage.toFixed(2)}%)`,
    })
  }

  summaryRows.push(
    { label: 'ISR', value: `${formatMoney(country, data.isr)} (${data.isrPercentage.toFixed(2)}%)` },
    { label: 'Total Deducciones', value: formatMoney(country, data.totalDeductions) },
    { label: 'Salario Neto', value: formatMoney(country, data.netSalary), emphasize: true }
  )

  const summaryTable = liquidKeyValueTable(summaryRows)

  const keyword = data.godfatherKeyword ?? 'MI CONSTANCIA TARDA UNA ETERNIDAD'
  const isEmpresa = data.audience === 'empresa'

  const godfatherBlocks =
    data.useGodfatherFunnel && !isEmpresa
      ? [
          liquidParagraph('Tu desglose está adjunto. Pero aquí va la verdad:'),
          liquidParagraph(
            `Si me contestas este correo diciendo <strong>"${keyword}"</strong>, te voy a enviar un PDF de una sola página que puedes dejar "olvidado" en la impresora de tu oficina o enviárselo a tu jefe.`
          ),
          liquidParagraph(
            'Es una comparativa de cuánto dinero está perdiendo tu empresa por no usar tecnología. Tú no pides nada, solo estás "ayudando" a la empresa a ser más rentable.'
          ),
          liquidParagraph(`<strong>P.D.</strong> ¿Cuánto tardan realmente en darte una constancia hoy?`),
        ]
      : []

  const empresaPitch = isEmpresa
    ? [
        liquidParagraph(
          `${liquidEmphasis('¿Validas deducciones de 1 empleado aquí, pero tienes toda una planilla?')}`
        ),
        liquidParagraph(
          `Humano SISU automatiza ${meta.deductionsPitch} para todo tu equipo — desde asistencia biométrica hasta comprobantes.`
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
            liquidParagraph(`${liquidEmphasis('¿Tus compañeros también quieren validar su sueldo?')}`),
            liquidCtaWhatsApp(demoWhatsAppUrl, 'Compartir calculadora por WhatsApp'),
          ]
        : []

  const standardPitch =
    data.useGodfatherFunnel || isEmpresa
      ? []
      : [
          liquidParagraph(
            `${liquidEmphasis('Deja de calcular en Excel.')} Humano SISU automatiza ${meta.deductionsPitch} con el mismo motor que usaste aquí.`
          ),
          liquidParagraph('Sin errores manuales — del reloj biométrico al comprobante de pago.'),
          liquidCta(activarUrl, 'Activar gratis 30 días'),
          liquidCtaWhatsApp(demoWhatsAppUrl, 'Agendar demo'),
        ]

  const bodyHtml = [
    liquidParagraph('Estimado/a usuario,'),
    liquidParagraph(
      data.useGodfatherFunnel
        ? `Adjunto encontrarás tu reporte de deducciones (${data.year}).`
        : `Adjunto encontrará el reporte detallado de validación de deducciones de nómina para el año ${data.year}.`
    ),
    summaryTable,
    liquidInfoBox(
      `<strong>Nota:</strong> Estos cálculos están basados en las leyes vigentes de ${meta.legalName} para el año ${data.year}.`,
      'warning'
    ),
    ...godfatherBlocks,
    ...empresaPitch,
    ...employeeSharePitch,
    ...standardPitch,
    ...(data.useGodfatherFunnel && !isEmpresa
      ? [
          liquidParagraph(
            `<a href="${activarUrl}" style="color:#64748b;font-size:13px;">¿Gestionas planilla? Activar Humano SISU</a>`
          ),
        ]
      : []),
    liquidParagraph(
      'Si tiene alguna pregunta, no dude en contactarnos.<br><strong>Humano SISU</strong> — RRHH y nómina regional (El Salvador, Guatemala y Honduras)'
    ),
    ...(data.useGodfatherFunnel && !isEmpresa ? [] : [liquidCtaWhatsApp(supportWhatsAppUrl, '💬 Contactar vía WhatsApp')]),
  ].join('')

  return wrapLiquidEmail({
    title: data.useGodfatherFunnel ? 'Secreto enviado...' : 'Reporte de Validación de Deducciones',
    subtitle: `Año fiscal ${data.year}`,
    badge: 'Calculadora',
    bodyHtml,
  })
}

export function generateDeductionEmailSubject(year: number, useGodfatherFunnel?: boolean): string {
  if (useGodfatherFunnel) {
    return `Secreto enviado... — tu desglose ${year} | Humano SISU`
  }
  return `Reporte de Deducciones de Nómina - ${year} - Humano SISU`
}
