import type { CurrencyCode, QuotationQuote } from './types'
import { buildQuotationPlanSummary } from './quote-display'
import type { VentasBankDetails } from './bank-details'
import {
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
} from './bank-details'
import { buildVentasRefLabel, buildTerminalsDisplayLabel } from './brand-styles'
import {
  buildClientFichaHtml,
  buildEmailHeaderBlock,
  buildPriceCardHtml,
  escapeVentasHtml,
} from './email-template-parts'
import { VENTAS_BRAND as B } from './brand-styles'
import { getVentasModalityDefinition } from './modality-includes'
import { employeesCountFromQuote } from './quote-display'
import { quoteIncludesBiometricTerminals, resolveHardwareMode } from './business-rules'
import { wrapLiquidEmailFragment } from '../emails/liquid-layout'

function firstNameFromContact(contactName?: string): string {
  const trimmed = contactName?.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] || trimmed
}

export function generateVentasQuotationEmailSubject(params: {
  contactName?: string
  companyName?: string
}): string {
  const company = params.companyName?.trim()
  const firstName = firstNameFromContact(params.contactName)
  if (firstName) return `Tu cotización Humano SISU, ${firstName}`
  if (company) return `Tu cotización de Humano SISU para ${company} está lista`
  return 'Tu cotización Humano SISU'
}

export function generateVentasQuotationEmailHTML(params: {
  quote: QuotationQuote
  contactName?: string
  companyName?: string
  countryLabel: string
  sentAt?: Date
  now?: Date
  bankDetails?: VentasBankDetails | null
}) {
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), now } = params

  const supportWhatsAppUrl = buildVentasSupportWhatsAppUrl(
    buildQuotationAcquisitionWhatsAppText({
      contactName,
      companyName,
      includeBankPrompt: false,
    })
  )

  const firstName = firstNameFromContact(contactName)
  const opening = firstName
    ? `${escapeVentasHtml(firstName)}, aquí están tus números.`
    : 'Aquí están tus números.'

  const companyLabel = companyName?.trim() || 'tu empresa'
  const isAnnual = quote.billing_modality === 'annual'
  const employees = employeesCountFromQuote(quote)
  const includesTerminals = quoteIncludesBiometricTerminals(quote.billing_modality, employees)
  const hardwareMode = resolveHardwareMode(quote.billing_modality, employees)
  const summary = buildQuotationPlanSummary({ quote, sentAt, now })
  const quoteLabel = isAnnual ? 'COTIZACIÓN ANUAL' : 'COTIZACIÓN MENSUAL'
  const refLabel = buildVentasRefLabel(companyName, contactName)

  const body = `
      ${buildEmailHeaderBlock(quoteLabel, refLabel)}
      ${buildClientFichaHtml({
        companyName: companyLabel,
        contactName: contactName?.trim() || 'Estimado cliente',
        countryLabel,
        tierLabel: summary.tierLabel,
        terminalsCount: quote.terminals_count,
        includesTerminals,
        hardwareMode,
      })}
      <p style="margin: 0 0 14px 0; font-size: 18px; line-height: 1.4; font-weight: bold; color: ${B.emailText};">${opening}</p>
      ${buildPriceCardHtml({ quote, sentAt, now })}
      <div style="text-align: center; margin: 8px 0 0 0;">
        <a href="${supportWhatsAppUrl}" style="display: inline-block; padding: 14px 28px; background-color: ${B.accent}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; font-family: Montserrat, Arial, Helvetica, sans-serif;">Continuar por WhatsApp</a>
      </div>
  `

  return wrapLiquidEmailFragment(body)
}

export function generateVentasQuotationEmailText(params: {
  quote: QuotationQuote
  contactName?: string
  companyName?: string
  countryLabel: string
  sentAt?: Date
  now?: Date
  bankDetails?: VentasBankDetails | null
}): string {
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), now } = params

  const firstName = firstNameFromContact(contactName)
  const opening = firstName ? `${firstName}, aquí están tus números.` : 'Aquí están tus números.'
  const companyLabel = companyName?.trim() || 'tu empresa'
  const summary = buildQuotationPlanSummary({ quote, sentAt, now })
  const employees = employeesCountFromQuote(quote)
  const modalityLabel = getVentasModalityDefinition(quote.billing_modality, {
    employeesCount: employees,
  }).label
  const isAnnual = quote.billing_modality === 'annual'
  const quoteLabel = isAnnual ? 'COTIZACIÓN ANUAL' : 'COTIZACIÓN MENSUAL'
  const refLabel = buildVentasRefLabel(companyName, contactName)
  const terminals = buildTerminalsDisplayLabel({
    terminalsCount: quote.terminals_count,
    includesTerminals: quoteIncludesBiometricTerminals(quote.billing_modality, employees),
    hardwareMode: resolveHardwareMode(quote.billing_modality, employees),
  })

  const lines: string[] = [
    'Humano SISU',
    `${quoteLabel} // REF: ${refLabel}`,
    '',
    `Atención: ${contactName?.trim() || 'Estimado cliente'}`,
    `Empresa: ${companyLabel}`,
    `Alcance: ${summary.tierLabel}`,
    `País: ${countryLabel}`,
    `# de terminales: ${terminals}`,
    '',
    opening,
    '',
    modalityLabel,
  ]

  for (const line of summary.lines) {
    lines.push(`${line.label}: ${line.value}`)
  }
  lines.push(`${summary.totalLabel}: ${summary.totalValue}`)

  lines.push('', 'Comparativa de modalidades, condiciones y datos bancarios: PDF adjunto.')

  const waText = buildQuotationAcquisitionWhatsAppText({
    contactName,
    companyName,
    includeBankPrompt: false,
  })

  lines.push('', 'Continuar por WhatsApp:', buildVentasSupportWhatsAppUrl(waText))

  return lines.join('\n')
}
