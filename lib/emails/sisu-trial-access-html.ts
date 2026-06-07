/**
 * HTML templates for SISU trial access emails.
 * - trial_welcome: sent after /activar with credentials (existing flow).
 * - lead_invite: one-time invite for migrated marketing leads without trial yet.
 */

import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT } from '../marketing/unsubscribe'

export const SISU_TRIAL_WARNING_TEXT =
  '⚠️ Acceso exclusivo y limitado: prueba gratuita por 7 días. SISU se integra con un biométrico en tiempo real y libera a tu equipo para enfocarse en lo que mueve tu empresa.'

const WHATSAPP_CONTRATAR_URL = `https://wa.me/50432226773?text=${encodeURIComponent('deseo contratar')}`

/** Matches landing `app-gradient` + brand palette (tailwind.config.js / globals.css). */
const LANDING = {
  bgStart: '#0f172a',
  bgMid: '#1e3a8a',
  bgEnd: '#312e81',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  textMuted: '#bfdbfe',
  textSoft: '#93c5fd',
  glassBg: 'rgba(255,255,255,0.10)',
  glassBorder: 'rgba(255,255,255,0.22)',
} as const

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
  const { bgStart, bgMid, bgEnd, primary, primaryHover, textMuted, textSoft, glassBg, glassBorder } =
    LANDING

  return `
            :root { color-scheme: dark; }
            body {
              margin: 0;
              font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: ${bgStart};
              color: #f8fafc;
            }
            .outer {
              width: 100%;
              padding: 32px 16px;
              background-color: ${bgStart};
              background-image:
                radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.06), transparent 60%),
                radial-gradient(1000px 500px at 80% 90%, rgba(255,255,255,0.04), transparent 60%),
                linear-gradient(160deg, ${bgStart}, ${bgMid} 50%, ${bgEnd});
            }
            .card {
              max-width: 640px;
              margin: 0 auto;
              background: ${glassBg};
              border-radius: 20px;
              border: 1px solid ${glassBorder};
              box-shadow: 0 8px 30px rgba(0,0,0,0.20);
              overflow: hidden;
            }
            .hero {
              padding: 40px 40px 28px 40px;
              background: linear-gradient(160deg, rgba(30,58,138,0.55), rgba(49,46,129,0.35));
              border-bottom: 1px solid ${glassBorder};
              text-align: center;
            }
            .hero h1 { margin: 0; font-size: 28px; color: #ffffff; letter-spacing: -0.5px; font-weight: 700; }
            .hero p { margin: 12px 0 0 0; font-size: 15px; color: ${textMuted}; line-height: 1.55; }
            .hero .badge {
              display: inline-block;
              margin-bottom: 18px;
              padding: 6px 14px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              background: rgba(59, 130, 246, 0.18);
              color: ${textSoft};
              border: 1px solid rgba(59, 130, 246, 0.35);
            }
            .content { padding: 32px 40px 40px 40px; }
            .section-title {
              font-size: 13px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: ${textSoft};
              margin: 24px 0 12px 0;
            }
            .credentials {
              background: rgba(255,255,255,0.06);
              border: 1px solid ${glassBorder};
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 24px;
            }
            .credential-row + .credential-row { margin-top: 16px; }
            .label {
              font-size: 12px;
              letter-spacing: 0.08em;
              color: ${textMuted};
              text-transform: uppercase;
            }
            .value {
              margin-top: 8px;
              font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
              background: rgba(59, 130, 246, 0.12);
              border-radius: 10px;
              padding: 12px 14px;
              display: inline-block;
              color: #f8fafc;
            }
            .cta { text-align: center; margin: 32px 0 12px 0; }
            .cta a {
              display: inline-block;
              padding: 14px 32px;
              border-radius: 8px;
              font-weight: 600;
              text-decoration: none;
              background: linear-gradient(135deg, ${primary}, ${primaryHover});
              color: #ffffff;
              box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
            }
            .cta p { margin-top: 12px; font-size: 13px; color: ${textMuted}; opacity: 0.85; }
            .grid { display: flex; flex-wrap: wrap; gap: 16px; }
            .grid > div {
              flex: 1 1 180px;
              background: rgba(255,255,255,0.06);
              border: 1px solid ${glassBorder};
              border-radius: 16px;
              padding: 16px;
            }
            .grid h4 { margin: 0 0 6px 0; font-size: 15px; color: #f8fafc; font-weight: 600; }
            .grid p { margin: 0; font-size: 13px; color: ${textMuted}; line-height: 1.5; }
            .warning {
              background: rgba(251, 191, 36, 0.10);
              border: 1px solid rgba(245, 158, 11, 0.28);
              border-radius: 16px;
              padding: 18px 20px;
              color: #fde68a;
              font-size: 14px;
              line-height: 1.5;
              margin: 24px 0;
            }
            .footer {
              text-align: center;
              padding: 28px 24px 36px 24px;
              font-size: 12px;
              color: ${textMuted};
              opacity: 0.9;
            }
            .footer hr {
              border: 0;
              border-top: 1px solid ${glassBorder};
              margin-bottom: 18px;
            }
            @media (max-width: 520px) {
              .hero, .content { padding: 24px; }
              .grid { flex-direction: column; }
              .cta a { width: 100%; box-sizing: border-box; }
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
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" />
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
                    <p><a href="${WHATSAPP_CONTRATAR_URL}" style="color: #93c5fd; text-decoration: underline;">+504 3222-6773</a> · Tap y te atendemos personalmente (cero bots)</p>
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
