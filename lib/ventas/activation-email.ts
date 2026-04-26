export function generateVentasActivationEmailSubject(companyName?: string): string {
  const suffix = companyName?.trim() ? ` — ${companyName.trim()}` : ''
  return `Acceso temporal a SISU${suffix}`
}

export function generateVentasActivationEmailHTML(params: {
  contactName?: string
  companyName?: string
  email: string
  password: string
  loginUrl: string
}) {
  const greeting = params.contactName?.trim()
    ? `Hola, ${escapeHtml(params.contactName.trim())}`
    : 'Hola'

  const companyLine = params.companyName?.trim()
    ? `para <strong>${escapeHtml(params.companyName.trim())}</strong>`
    : 'para tu empresa'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0b4fa1 0%, #1976d2 100%); padding: 26px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Humano SISU</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Acceso temporal</p>
      </div>

      <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; margin-top: 0;">${greeting}, habilitamos un acceso temporal ${companyLine}.</p>
        <p style="color: #333; margin: 0 0 14px 0;">
          Puedes entrar al panel y revisar el entorno de prueba con tus parámetros.
        </p>

        <div style="background: white; padding: 16px; border-radius: 10px; margin: 16px 0; border-left: 4px solid #0b4fa1;">
          <h3 style="color: #333; margin-top: 0;">Credenciales temporales</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666;">Email:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;"><code>${escapeHtml(params.email)}</code></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Contraseña temporal:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;"><code>${escapeHtml(params.password)}</code></td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 22px 0;">
          <a href="${escapeHtml(params.loginUrl)}"
             style="background: #0b4fa1; color: white; padding: 12px 26px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Entrar al panel
          </a>
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 18px;">
          Por seguridad, cambia la contraseña al ingresar.
        </p>
      </div>
    </div>
  `
}

function escapeHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

