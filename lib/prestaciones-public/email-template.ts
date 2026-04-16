/**
 * Plantillas de email para reportes de prestaciones (Honduras)
 */

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

export function generatePrestacionesEmailHTML(data: PrestacionesEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  const fmt = (n: number) => `L. ${Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0b4fa1 0%, #1976d2 100%); padding: 26px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Humano SISU</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Cálculo de prestaciones (Honduras)</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; margin-top: 0;">Aquí tienes tu estimación. Adjuntamos un PDF con el detalle.</p>

        <div style="background: white; padding: 16px; border-radius: 10px; margin: 16px 0; border-left: 4px solid #0b4fa1;">
          <h3 style="color: #333; margin-top: 0;">Resumen</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666;">Total estimado:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #2e7d32;">${fmt(data.totalPagar)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Motivo:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${data.motivoSalida}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Antigüedad (360):</td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${data.antiguedadTexto}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Salario base mensual:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${fmt(data.salarioBaseMensual)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Salario promedio mensual:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${fmt(data.salarioPromedioMensual)}</td>
            </tr>
          </table>
        </div>

        <div style="background: white; padding: 16px; border-radius: 10px; margin: 16px 0;">
          <h3 style="color: #333; margin-top: 0;">Desglose</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #666;">Preaviso:</td><td style="padding: 6px 0; text-align: right;">${fmt(data.rubros.preaviso)}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Cesantía (bruta):</td><td style="padding: 6px 0; text-align: right;">${fmt(data.rubros.cesantiaBruta)}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">RAP aplicado:</td><td style="padding: 6px 0; text-align: right;">${fmt(data.rubros.rapAplicado)}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Cesantía (neta):</td><td style="padding: 6px 0; text-align: right;">${fmt(data.rubros.cesantiaNeta)}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">Vacaciones:</td><td style="padding: 6px 0; text-align: right;">${fmt(data.rubros.vacaciones)}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">13vo proporcional:</td><td style="padding: 6px 0; text-align: right;">${fmt(data.rubros.aguinaldo)}</td></tr>
            <tr><td style="padding: 6px 0; color: #666;">14vo proporcional:</td><td style="padding: 6px 0; text-align: right;">${fmt(data.rubros.decimoCuarto)}</td></tr>
          </table>
        </div>

        <div style="background: #fff3cd; padding: 14px; border-radius: 10px; margin: 16px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
            <strong>Nota:</strong> Esta es una estimación orientativa basada en normativa laboral de Honduras (año comercial 360 días).
            Puede variar según salario promedio real, extras, políticas internas y condiciones específicas del caso.
          </p>
        </div>

        <div style="text-align: center; margin: 22px 0;">
          <p style="color: #666; font-size: 15px; margin-bottom: 12px;">
            <strong>¿Automatizamos nómina y cálculos en tu empresa?</strong>
          </p>
          <a href="${siteUrl}/activar"
             style="background: #0b4fa1; color: white; padding: 12px 26px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Activar gratis
          </a>
        </div>

        <p style="color: #666; font-size: 13px; margin-top: 18px;">
          Humano SISU — RRHH y nómina regional (HN, SV, GT)
        </p>
      </div>
    </div>
  `
}

