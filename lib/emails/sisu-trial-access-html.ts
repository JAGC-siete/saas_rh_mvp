/**
 * HTML templates for SISU trial access emails.
 * - trial_welcome: sent after /activar with credentials (existing flow).
 * - lead_invite: one-time invite for migrated marketing leads without trial yet.
 */

import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT } from '../marketing/unsubscribe'

export const SISU_TRIAL_WARNING_TEXT =
  '⚠️ Acceso exclusivo y limitado: prueba gratuita por 7 días. SISU se integra con un biométrico en tiempo real y libera a tu equipo para enfocarse en lo que mueve tu empresa.'

const WHATSAPP_CONTRATAR_URL = `https://wa.me/50432226773?text=${encodeURIComponent('deseo contratar')}`

export type SisuTrialEmailVariant = 'trial_welcome' | 'lead_invite'

export type BuildSisuTrialAccessEmailHtmlInput = {
  variant: SisuTrialEmailVariant
  nombre: string
  email?: string
  password?: string
  loginUrl?: string
  activarUrl?: string
  unsubscribeUrl?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailStyles(): string {
  return `
            :root { color-scheme: light; }
            body {
              margin: 0;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #0b1020;
              color: #e2e8f0;
            }
            .outer {
              width: 100%;
              padding: 32px 16px;
              background: linear-gradient(135deg, #04070f 0%, #111a33 60%, #102040 100%);
            }
            .card {
              max-width: 640px;
              margin: 0 auto;
              background: rgba(11, 17, 31, 0.92);
              border-radius: 28px;
              border: 1px solid rgba(96, 165, 250, 0.25);
              box-shadow: 0 20px 60px rgba(15, 23, 42, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.03);
              overflow: hidden;
            }
            .hero {
              padding: 40px 40px 28px 40px;
              background: radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.45), transparent 60%),
                radial-gradient(circle at 80% 0%, rgba(236, 72, 153, 0.3), transparent 55%),
                linear-gradient(135deg, #111a33 0%, #1f2b4a 100%);
              text-align: center;
            }
            .hero h1 { margin: 0; font-size: 28px; color: #ffffff; letter-spacing: -0.5px; }
            .hero p { margin: 12px 0 0 0; font-size: 15px; color: #cbd5f5; }
            .hero .badge {
              display: inline-block;
              margin-bottom: 18px;
              padding: 6px 14px;
              border-radius: 999px;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              background: rgba(15, 118, 110, 0.15);
              color: #5eead4;
              border: 1px solid rgba(94, 234, 212, 0.3);
            }
            .content { padding: 32px 40px 40px 40px; }
            .section-title {
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: #93c5fd;
              margin: 24px 0 12px 0;
            }
            .credentials {
              background: rgba(15, 23, 42, 0.75);
              border: 1px solid rgba(96, 165, 250, 0.3);
              border-radius: 18px;
              padding: 24px;
              margin-bottom: 24px;
            }
            .credential-row + .credential-row { margin-top: 16px; }
            .label {
              font-size: 13px;
              letter-spacing: 0.08em;
              color: #94a3b8;
              text-transform: uppercase;
            }
            .value {
              margin-top: 8px;
              font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
              background: rgba(15, 118, 110, 0.12);
              border-radius: 10px;
              padding: 12px 14px;
              display: inline-block;
              color: #f8fafc;
            }
            .cta { text-align: center; margin: 32px 0 12px 0; }
            .cta a {
              display: inline-block;
              padding: 14px 32px;
              border-radius: 999px;
              font-weight: 600;
              text-decoration: none;
              background: linear-gradient(135deg, #22d3ee, #0ea5e9 60%, #6366f1);
              color: #0b1120;
              box-shadow: 0 15px 35px rgba(14, 165, 233, 0.35);
            }
            .cta p { margin-top: 12px; font-size: 13px; color: #94a3b8; }
            .grid { display: flex; flex-wrap: wrap; gap: 16px; }
            .grid > div {
              flex: 1 1 180px;
              background: rgba(15, 23, 42, 0.6);
              border: 1px solid rgba(99, 102, 241, 0.25);
              border-radius: 16px;
              padding: 16px;
            }
            .grid h4 { margin: 0 0 6px 0; font-size: 15px; color: #f8fafc; }
            .grid p { margin: 0; font-size: 13px; color: #cbd5f5; line-height: 1.5; }
            .warning {
              background: rgba(251, 191, 36, 0.12);
              border: 1px solid rgba(245, 158, 11, 0.3);
              border-radius: 16px;
              padding: 18px 20px;
              color: #fde68a;
              font-size: 14px;
              margin: 24px 0;
            }
            .footer {
              text-align: center;
              padding: 28px 24px 36px 24px;
              font-size: 12px;
              color: #94a3b8;
            }
            .footer hr {
              border: 0;
              border-top: 1px solid rgba(148, 163, 184, 0.2);
              margin-bottom: 18px;
            }
            @media (max-width: 520px) {
              .hero, .content { padding: 24px; }
              .grid { flex-direction: column; }
              .cta a { width: 100%; }
            }`
}

function heroTitle(input: BuildSisuTrialAccessEmailHtmlInput): string {
  const name = escapeHtml(input.nombre || 'Equipo')
  if (input.variant === 'lead_invite') {
    return `${name}, te invitamos a SISU`
  }
  return `${name}, te damos la bienvenida a SISU`
}

function credentialsBlock(input: BuildSisuTrialAccessEmailHtmlInput): string {
  if (input.variant !== 'trial_welcome' || !input.email || !input.password) {
    return ''
  }

  return `
                <div class="section-title">Credenciales seguras</div>
                <div class="credentials">
                  <div class="credential-row">
                    <div class="label">Email</div>
                    <div class="value">${escapeHtml(input.email)}</div>
                  </div>
                  <div class="credential-row">
                    <div class="label">Contraseña temporal</div>
                    <div class="value">${escapeHtml(input.password)}</div>
                  </div>
                </div>`
}

function ctaBlock(input: BuildSisuTrialAccessEmailHtmlInput): string {
  if (input.variant === 'lead_invite') {
    const activarUrl =
      input.activarUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/activar`
    return `
                <div class="cta">
                  <a href="${escapeHtml(activarUrl)}">Activar mi acceso gratuito</a>
                  <p>Si el botón no funciona, copia este enlace en tu navegador: ${escapeHtml(activarUrl)}</p>
                </div>`
  }

  const loginUrl = input.loginUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/app/login`
  return `
                <div class="cta">
                  <a href="${escapeHtml(loginUrl)}">Entrar al panel</a>
                  <p>Si el botón no funciona, copia este enlace en tu navegador: ${escapeHtml(loginUrl)}</p>
                </div>`
}

function featuresSectionTitle(input: BuildSisuTrialAccessEmailHtmlInput): string {
  if (input.variant === 'lead_invite') {
    return 'Descubrí SISU: Tu prueba gratuita te espera'
  }
  return 'Explora SISU: Tu entorno exclusivo ya está listo'
}

function footerBlock(input: BuildSisuTrialAccessEmailHtmlInput): string {
  const unsubscribeLine = input.unsubscribeUrl
    ? `<p style="margin-top: 12px;">${MARKETING_UNSUBSCRIBE_FOOTER_TEXT} <a href="${escapeHtml(input.unsubscribeUrl)}" style="color: #94a3b8;">${escapeHtml(input.unsubscribeUrl)}</a></p>`
    : ''

  return `
              <div class="footer">
                <hr />
                SISU · Plataforma de Recursos Humanos (El Salvador, Guatemala y Honduras). Si tú no solicitaste este acceso, podés ignorar el correo.
                ${unsubscribeLine}
              </div>`
}

export function buildSisuTrialAccessEmailHtml(input: BuildSisuTrialAccessEmailHtmlInput): string {
  const heroSubtitle =
    'El sistema regional de recursos humanos para El Salvador, Guatemala y Honduras, diseñado para transformar la forma en que gestionás tu equipo. Acceso exclusivo ilimitado gratuito por 7 días.'

  return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Acceso Exclusivo a SISU</title>
          <style>${emailStyles()}</style>
        </head>
        <body>
          <div class="outer">
            <div class="card">
              <div class="hero">
                <div class="badge">Acceso Exclusivo</div>
                <h1>${heroTitle(input)}</h1>
                <p>${heroSubtitle}</p>
              </div>
              <div class="content">
                ${credentialsBlock(input)}
                ${ctaBlock(input)}

                <div class="section-title">${featuresSectionTitle(input)}</div>
                <div class="grid">
                  <div>
                    <h4>Asistencia Digitalizada</h4>
                    <p>Registro por DNI, huella, rostro o tarjeta. Detecta retrasos y genera reportes automáticos.</p>
                  </div>
                  <div>
                    <h4>Operación Automatizada</h4>
                    <p>Fichas completas, cálculos IHSS/RAP/ISR exactos, ajustes y envíos automáticos de comprobantes.</p>
                  </div>
                  <div>
                    <h4>📊 Portal y Productividad</h4>
                    <p>Acceso self-service para empleados, dashboards ejecutivos y exportaciones precisas para decisiones rápidas.</p>
                  </div>
                </div>

                <div class="warning">
                  ${SISU_TRIAL_WARNING_TEXT}
                </div>

                <div class="section-title">Para contratar</div>
                <div class="grid">
                  <div>
                    <h4>📱 WhatsApp</h4>
                    <p><a href="${WHATSAPP_CONTRATAR_URL}" style="color: #5eead4; text-decoration: underline;">+504 3222-6773</a> · Respuesta en horario laboral. Tocá el número para enviar: «deseo contratar».</p>
                  </div>
                </div>
              </div>
              ${footerBlock(input)}
            </div>
          </div>
        </body>
      </html>`
}

export function getSisuTrialAccessEmailSubject(input: {
  variant: SisuTrialEmailVariant
  empresa?: string
}): string {
  if (input.variant === 'lead_invite') {
    return 'Te invitamos a SISU — prueba gratuita por 7 días'
  }
  return `🎉 ¡Bienvenido a SISU! - ${input.empresa || 'Tu empresa'}`
}
