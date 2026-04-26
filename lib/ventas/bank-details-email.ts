function escapeHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

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

export function generateVentasBankDetailsEmailSubject(companyName?: string): string {
  const suffix = companyName?.trim() ? ` — ${companyName.trim()}` : ''
  return `Datos bancarios para continuar${suffix}`
}

export function generateVentasBankDetailsEmailHTML(params: {
  contactName?: string
  companyName?: string
  bank: VentasBankDetails
}) {
  const greeting = params.contactName?.trim()
    ? `Gracias por su interés${params.companyName?.trim() ? `, ${escapeHtml(params.contactName.trim())}` : ''}.`
    : 'Gracias por su interés en el servicio Hondureño de RRHH.'

  const clientNameLine = params.bank.clientName ? escapeHtml(params.bank.clientName) : '—'
  const clientDniLine = params.bank.clientDni ? escapeHtml(params.bank.clientDni) : '—'

  const row = (label: string, value?: string) => {
    if (!value?.trim()) return ''
    return `
      <tr>
        <td style="padding: 8px 0; color: #666;">${escapeHtml(label)}</td>
        <td style="padding: 8px 0; text-align: right; color: #111;"><code>${escapeHtml(value.trim())}</code></td>
      </tr>
    `
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: #0b4fa1; padding: 26px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">Humano SISU</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Datos bancarios</p>
      </div>
      <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; margin-top: 0;">${greeting}</p>
        <p style="color: #333; margin: 0 0 14px 0;">
          A continuación compartimos los datos bancarios para continuar.
        </p>

        <div style="background: white; padding: 16px; border-radius: 10px; margin: 16px 0; border-left: 4px solid #0b4fa1;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Cliente</td>
              <td style="padding: 8px 0; text-align: right; color: #111;">${clientNameLine}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">DNI</td>
              <td style="padding: 8px 0; text-align: right; color: #111;">${clientDniLine}</td>
            </tr>
            ${row('Número de cuenta BAC', params.bank.bacAccount)}
            ${row('Número de cuenta Banpais', params.bank.banpaisAccount)}
            ${row('Número de cuenta Atlántida', params.bank.atlantidaAccount)}
          </table>
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 18px;">
          Si necesitas factura o validación de datos, responde a este correo y un asesor te apoya.
        </p>
      </div>
    </div>
  `
}

