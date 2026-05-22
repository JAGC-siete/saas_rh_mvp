/**
 * Plantillas de email para reportes de deducciones
 */

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
}

/**
 * Genera el HTML del email con el reporte de deducciones
 */
export function generateDeductionEmailHTML(data: DeductionEmailData): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  const supportWhatsAppUrl = `https://api.whatsapp.com/send/?phone=50432226773&text=${encodeURIComponent(
    'Hola Jorge, tengo una consulta sobre la validación de deducciones de mi nómina.'
  )}`

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0b4fa1 0%, #1976d2 100%); padding: 30px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Humano SISU</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Reporte de Validación de Deducciones</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="color: #333; margin-top: 0;">Estimado/a usuario,</p>
        
        <p style="color: #666; line-height: 1.6;">
          Adjunto encontrará el reporte detallado de validación de deducciones de nómina para el año ${data.year}.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0b4fa1;">
          <h3 style="color: #333; margin-top: 0;">Resumen del Cálculo:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Salario ${data.paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual'}:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">L. ${data.grossSalary.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">IHSS:</td>
              <td style="padding: 8px 0; text-align: right; color: #333;">L. ${data.ihss.toFixed(2)} (${data.ihssPercentage.toFixed(2)}%)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">RAP:</td>
              <td style="padding: 8px 0; text-align: right; color: #333;">L. ${data.rap.toFixed(2)} (${data.rapPercentage.toFixed(2)}%)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">ISR:</td>
              <td style="padding: 8px 0; text-align: right; color: #333;">L. ${data.isr.toFixed(2)} (${data.isrPercentage.toFixed(2)}%)</td>
            </tr>
            <tr style="border-top: 2px solid #ddd;">
              <td style="padding: 12px 0; color: #666; font-weight: bold;">Total Deducciones:</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #d32f2f;">L. ${data.totalDeductions.toFixed(2)}</td>
            </tr>
            <tr style="background: #e8f5e9;">
              <td style="padding: 12px 0; color: #2e7d32; font-weight: bold;">Salario Neto:</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #2e7d32;">L. ${data.netSalary.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>Nota:</strong> Estos cálculos están basados en las leyes vigentes de Honduras para el año ${data.year}.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #666; font-size: 16px; margin-bottom: 15px;">
            <strong>¿Automatizamos esto para tu empresa?</strong>
          </p>
          <a href="${siteUrl}/activar" 
             style="background: #0b4fa1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Prueba Gratis 30 Días
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Si tiene alguna pregunta, no dude en contactarnos.<br>
          <strong>Humano SISU</strong> — RRHH y nómina regional (El Salvador, Guatemala y Honduras)
        </p>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${supportWhatsAppUrl}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: Arial, sans-serif;">
            💬 Contactar vía WhatsApp
          </a>
        </div>
      </div>
      
      <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px; border-radius: 8px; margin-top: 20px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Humano SISU. Todos los derechos reservados.</p>
        <p style="margin: 5px 0 0 0;">
          <a href="${siteUrl}" style="color: #999; text-decoration: none;">${siteUrl}</a>
        </p>
      </div>
    </div>
  `
}

/**
 * Genera el asunto del email
 */
export function generateDeductionEmailSubject(year: number): string {
  return `Reporte de Deducciones de Nómina - ${year} - Humano SISU`
}
