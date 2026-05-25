export type VentasBankDetails = {
  clientName?: string
  clientDni?: string
  bacAccount?: string
  banpaisAccount?: string
  atlantidaAccount?: string
}

export function getVentasBankDetailsFromEnv(): VentasBankDetails | null {
  const clientName = (process.env.VENTAS_BANK_CLIENT_NAME || '').trim()
  const clientDni = (process.env.VENTAS_BANK_CLIENT_DNI || '').trim()
  const bacAccount = (process.env.VENTAS_BANK_BAC_ACCOUNT || '').trim()
  const banpaisAccount = (process.env.VENTAS_BANK_BANPAIS_ACCOUNT || '').trim()
  const atlantidaAccount = (process.env.VENTAS_BANK_ATLANTIDA_ACCOUNT || '').trim()

  const hasAnyAccount = !!(bacAccount || banpaisAccount || atlantidaAccount)
  if (!hasAnyAccount) return null

  return {
    clientName: clientName || undefined,
    clientDni: clientDni || undefined,
    bacAccount: bacAccount || undefined,
    banpaisAccount: banpaisAccount || undefined,
    atlantidaAccount: atlantidaAccount || undefined,
  }
}

export function buildBankDetailsPlainText(bank: VentasBankDetails): string {
  const lines = [
    'Gracias por su interés en el servicio Hondureño de RRHH.',
    '',
    'Le comparto las cuentas de banco disponibles.',
    '',
  ]

  if (bank.clientName) lines.push(`Cliente: ${bank.clientName}`)
  if (bank.clientDni) lines.push(`DNI: ${bank.clientDni}`)
  lines.push('')
  if (bank.bacAccount) lines.push(`Número de cuenta BAC: ${bank.bacAccount}`)
  if (bank.banpaisAccount) lines.push(`Número de cuenta Banpais: ${bank.banpaisAccount}`)
  if (bank.atlantidaAccount) lines.push(`Número de cuenta Atlántida: ${bank.atlantidaAccount}`)
  lines.push('', 'Será un gusto ayudarlo en su proceso de autorización de RRHH.')

  return lines.join('\n')
}

function escapeHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function bankRow(label: string, value?: string): string {
  if (!value?.trim()) return ''
  return `
    <tr>
      <td style="padding: 8px 0; color: #5c6570; font-size: 14px;">${escapeHtml(label)}</td>
      <td style="padding: 8px 0; text-align: right; color: #1a1a1a; font-family: monospace;">${escapeHtml(value.trim())}</td>
    </tr>
  `
}

/** Bloque HTML para incrustar en cotización u otros correos comerciales. */
export function buildBankDetailsInlineHtml(bank: VentasBankDetails, contactName?: string): string {
  const greeting = contactName?.trim()
    ? `Gracias por su interés, ${escapeHtml(contactName.trim())}.`
    : 'Gracias por su interés en el servicio Hondureño de RRHH.'

  return `
    <div style="background: #f8fafc; padding: 18px 20px; border-radius: 8px; margin: 22px 0; border-left: 4px solid #0b4fa1;">
      <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: bold; color: #111;">Datos bancarios para continuar</p>
      <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.55; color: #333;">${greeting} Le comparto las cuentas de banco disponibles.</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${bank.clientName ? bankRow('Cliente', bank.clientName) : ''}
        ${bank.clientDni ? bankRow('DNI', bank.clientDni) : ''}
        ${bankRow('Número de cuenta BAC', bank.bacAccount)}
        ${bankRow('Número de cuenta Banpais', bank.banpaisAccount)}
        ${bankRow('Número de cuenta Atlántida', bank.atlantidaAccount)}
      </table>
      <p style="margin: 14px 0 0 0; font-size: 13px; color: #555;">Será un gusto ayudarlo en su proceso de autorización de RRHH.</p>
    </div>
  `
}

export function getVentasSupportFirstNameFromEnv(): string {
  const fromPublic = (process.env.NEXT_PUBLIC_VENTAS_SUPPORT_FIRST_NAME || '').trim()
  const fromServer = (process.env.VENTAS_SUPPORT_FIRST_NAME || '').trim()
  return fromPublic || fromServer || 'Jorge'
}

export function buildQuotationAcquisitionWhatsAppText(params: {
  contactName?: string
  companyName?: string
  includeBankPrompt?: boolean
  supportFirstName?: string
  context?: 'quote' | 'activation'
}): string {
  const support = (params.supportFirstName || getVentasSupportFirstNameFromEnv()).trim() || 'Jorge'
  const company = params.companyName?.trim()
  const contactFirst = params.contactName?.trim()?.split(/\s+/)[0]

  const intro = contactFirst
    ? `Hola ${support}, soy ${contactFirst}.`
    : `Hola ${support},`

  if (params.context === 'activation') {
    const scope = company ? ` para ${company}` : ''
    const bankPart = params.includeBankPrompt
      ? ' Quiero confirmar los datos bancarios y los pasos para formalizar la contratación.'
      : ' Quiero continuar con el proceso de contratación. ¿Me orientas con los siguientes pasos?'
    return `${intro} Ya recibí mis accesos al panel de Humano SISU${scope}.${bankPart}`
  }

  const quoteScope = company
    ? ` ya revisé mi cotización de Humano SISU para ${company}.`
    : ' ya revisé mi cotización de Humano SISU.'

  if (params.includeBankPrompt) {
    return `${intro}${quoteScope} Quiero confirmar los datos bancarios y los pasos para formalizar la contratación.`
  }

  return `${intro}${quoteScope} Quiero continuar con el proceso de contratación. ¿Me orientas con los siguientes pasos?`
}

export function getVentasSupportWhatsAppNumber(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || '').replace(/[^\d]/g, '')
  return fromEnv || '50432226773'
}

export function buildVentasSupportWhatsAppUrl(text: string): string {
  const phone = getVentasSupportWhatsAppNumber()
  return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(text)}`
}
