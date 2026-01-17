import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'

export interface AffiliateCredentialsEmailData {
  to: string
  email: string
  password: string
  referralCode: string
  loginUrl: string
}

export async function sendAffiliateCredentialsEmail(data: AffiliateCredentialsEmailData) {
  // Get default config since this is a public subscription
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'

  const content = {
    to: data.to,
    subject: '🎉 ¡Bienvenido al Programa de Afiliados! - Humano SISU',
    text: `¡Felicitaciones!

Tu solicitud de afiliación ha sido aprobada. Ya eres parte del Programa de Afiliados de Humano SISU.

TUS CREDENCIALES DE ACCESO:
Email: ${data.email}
Contraseña: ${data.password}

CÓDIGO DE REFERIDO:
${data.referralCode}

INSTRUCCIONES:
1. Inicia sesión en: ${data.loginUrl}
2. Cambia tu contraseña después del primer inicio de sesión
3. Comparte tu código de referido con empresas interesadas
4. Gana comisiones por cada cliente que refieras

¿Cómo cambiar tu contraseña?
1. Inicia sesión con las credenciales proporcionadas
2. Ve a tu perfil de usuario
3. Selecciona "Cambiar contraseña"
4. Ingresa tu nueva contraseña

IMPORTANTE: Guarda este email en un lugar seguro. Tu contraseña es temporal y debes cambiarla después del primer inicio de sesión.

¡Bienvenido al equipo!

El equipo de Humano SISU`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🎉 ¡Bienvenido al Programa!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu solicitud ha sido aprobada</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">¡Felicitaciones!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Tu solicitud de afiliación ha sido <strong>aprobada</strong>. 
            Ya eres parte del <strong>Programa de Afiliados de Humano SISU</strong>.
          </p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #667eea;">
            <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">🔐 Tus Credenciales de Acceso</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
              <p style="margin: 5px 0; color: #666;">
                <strong style="color: #333;">Email:</strong> 
                <span style="font-family: monospace; color: #667eea;">${data.email}</span>
              </p>
              <p style="margin: 5px 0; color: #666;">
                <strong style="color: #333;">Contraseña:</strong> 
                <span style="font-family: monospace; color: #667eea; font-weight: bold;">${data.password}</span>
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <a href="${data.loginUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Iniciar Sesión
              </a>
            </div>
          </div>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #333; margin-top: 0;">🎯 Tu Código de Referido</h3>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; margin-top: 10px;">
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #667eea; font-family: monospace; letter-spacing: 2px;">
                ${data.referralCode}
              </p>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 10px; margin-bottom: 0;">
              Comparte este código con empresas interesadas. Cada vez que una empresa se registre usando tu código, 
              ganarás comisiones recurrentes.
            </p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #333; margin-top: 0;">📋 Próximos Pasos</h3>
            <ol style="color: #666; line-height: 1.8; padding-left: 20px;">
              <li>Inicia sesión con las credenciales proporcionadas</li>
              <li><strong>Cambia tu contraseña</strong> después del primer inicio de sesión</li>
              <li>Comparte tu código de referido con empresas interesadas</li>
              <li>Gana comisiones por cada cliente que refieras</li>
            </ol>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">🔒 ¿Cómo cambiar tu contraseña?</h3>
            <ol style="color: #856404; line-height: 1.8; padding-left: 20px; margin-bottom: 0;">
              <li>Inicia sesión con las credenciales proporcionadas</li>
              <li>Ve a tu perfil de usuario</li>
              <li>Selecciona "Cambiar contraseña"</li>
              <li>Ingresa tu nueva contraseña</li>
            </ol>
          </div>
          
          <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
            <p style="margin: 0; color: #c62828; font-size: 14px;">
              <strong>⚠️ IMPORTANTE:</strong> Guarda este email en un lugar seguro. 
              Tu contraseña es temporal y <strong>debes cambiarla</strong> después del primer inicio de sesión.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ¿Preguntas? Responde este email o contáctanos.<br>
            <strong>¡Bienvenido al equipo y mucho éxito!</strong>
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© 2025 Humano SISU. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  }

  return await emailService.sendEmail(config, content)
}








