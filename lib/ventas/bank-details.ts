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

export function buildPaymentConditionsPlainText(): string {
  return [
    'Condiciones de Implementación y Pago:',
    'El tiempo de implementación máximo es de 3 a 5 días hábiles una vez recibido el depósito. Al confirmar la decisión, el siguiente paso es realizar el depósito del adelanto del 50% sobre la primera cuota/suscripción inicial.',
  ].join('\n')
}

export function buildPaymentReportInstructionsPlainText(): string {
  return [
    '¿Cómo reportar tu pago para agendar la instalación?',
    'Puedes hacerlo de dos formas sumamente sencillas:',
    '1. Responde directamente a este correo adjuntando la foto o PDF de tu comprobante de depósito.',
    '2. Envía el comprobante directamente a tu asesor asignado por WhatsApp (enlace al final de este correo).',
  ].join('\n')
}

export function buildBankDetailsPlainText(bank: VentasBankDetails): string {
  const lines = [
    buildPaymentConditionsPlainText(),
    '',
    'Datos Bancarios para el Depósito:',
  ]

  if (bank.bacAccount) lines.push('• Banco: BAC Credomatic')
  if (bank.clientName) lines.push(`• Cliente: ${bank.clientName}`)
  if (bank.clientDni) lines.push(`• DNI: ${bank.clientDni}`)
  if (bank.bacAccount) lines.push(`• Número de cuenta BAC: ${bank.bacAccount}`)
  if (bank.banpaisAccount) lines.push(`• Número de cuenta Banpais: ${bank.banpaisAccount}`)
  if (bank.atlantidaAccount) lines.push(`• Número de cuenta Atlántida: ${bank.atlantidaAccount}`)
  lines.push('', buildPaymentReportInstructionsPlainText())

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
export function buildBankDetailsInlineHtml(bank: VentasBankDetails, _contactName?: string): string {
  return `
    <div style="background: #f8fafc; padding: 18px 20px; border-radius: 8px; margin: 22px 0; border-left: 4px solid #0b4fa1;">
      <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: bold; color: #111;">Condiciones de Implementación y Pago</p>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #333;">
        El tiempo de implementación máximo es de <strong>3 a 5 días hábiles</strong> una vez recibido el depósito. Al confirmar la decisión, el siguiente paso es realizar el depósito del <strong>adelanto del 50%</strong> sobre la primera cuota/suscripción inicial.
      </p>
      <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: bold; color: #111;">Datos Bancarios para el Depósito</p>
      <ul style="margin: 0 0 16px 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
        ${bank.bacAccount ? `<li style="margin-bottom: 6px;"><strong>Banco:</strong> BAC Credomatic</li>` : ''}
        ${bank.clientName ? `<li style="margin-bottom: 6px;"><strong>Cliente:</strong> ${escapeHtml(bank.clientName)}</li>` : ''}
        ${bank.clientDni ? `<li style="margin-bottom: 6px;"><strong>DNI:</strong> ${escapeHtml(bank.clientDni)}</li>` : ''}
        ${bank.bacAccount ? `<li style="margin-bottom: 6px;"><strong>Número de cuenta BAC:</strong> <span style="font-family: monospace;">${escapeHtml(bank.bacAccount)}</span></li>` : ''}
        ${bank.banpaisAccount ? `<li style="margin-bottom: 6px;"><strong>Número de cuenta Banpais:</strong> <span style="font-family: monospace;">${escapeHtml(bank.banpaisAccount)}</span></li>` : ''}
        ${bank.atlantidaAccount ? `<li style="margin-bottom: 6px;"><strong>Número de cuenta Atlántida:</strong> <span style="font-family: monospace;">${escapeHtml(bank.atlantidaAccount)}</span></li>` : ''}
      </ul>
      <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #111;">¿Cómo reportar tu pago para agendar la instalación?</p>
      <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.6; color: #333;">Puedes hacerlo de dos formas sumamente sencillas:</p>
      <ol style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
        <li style="margin-bottom: 6px;">Responde directamente a este correo adjuntando la foto o PDF de tu comprobante de depósito.</li>
        <li style="margin-bottom: 6px;">Envía el comprobante directamente a tu asesor asignado por WhatsApp haciendo clic en el botón de abajo.</li>
      </ol>
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
    return `${intro}${quoteScope} y tengo el comprobante del 50%. ¿Me orientas con los siguientes pasos?`
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
