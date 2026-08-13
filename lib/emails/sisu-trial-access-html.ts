/**
 * HTML templates for SISU trial access emails.
 * - trial_welcome: sent after /activar with credentials (existing flow).
 * - lead_invite: one-time invite for migrated marketing leads without trial yet.
 */

import { LIQUID } from '../brand/liquid-tokens'
import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT } from '../marketing/unsubscribe'
import { escapeHtml, wrapLiquidEmail } from './liquid-layout'

export const SISU_TRIAL_WARNING_TEXT =
  '☁️ Acceso exclusivo y limitado: prueba gratuita por 7 días. SISU integra biométrico en tiempo real para que tu equipo deje el Excel atrás y alcance la paz operativa.'

const WHATSAPP_CONTRATAR_URL = `https://wa.me/50432226773?text=${encodeURIComponent('deseo contratar')}`

const T = LIQUID

const TRIAL_EXTRA_CSS = `
  .section-title {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: ${T.textAccent};
    margin: 24px 0 12px 0;
  }
  .credentials {
    background: ${T.glassBgLight};
    border: 1px solid ${T.glassBorderLight};
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .credential-row + .credential-row { margin-top: 16px; }
  .label {
    font-size: 12px;
    letter-spacing: 0.08em;
    color: ${T.textSoft};
    text-transform: uppercase;
  }
  .value {
    margin-top: 8px;
    font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
    background: rgba(59, 130, 246, 0.12);
    border-radius: 10px;
    padding: 12px 14px;
    display: inline-block;
    color: ${T.text};
  }
  .cta p { margin-top: 12px; font-size: 13px; color: ${T.textSoft}; opacity: 0.85; }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; }
  .grid > div {
    flex: 1 1 180px;
    background: ${T.glassBgLight};
    border: 1px solid ${T.glassBorderLight};
    border-radius: 16px;
    padding: 16px;
  }
  .grid h4 { margin: 0 0 6px 0; font-size: 15px; color: ${T.text}; font-weight: 600; }
  .grid p { margin: 0; font-size: 13px; color: ${T.textSoft}; line-height: 1.5; }
  .warning {
    background: ${T.warningBg};
    border: 1px solid ${T.warningBorder};
    border-radius: 16px;
    padding: 18px 20px;
    color: ${T.warning};
    font-size: 14px;
    line-height: 1.5;
    margin: 24px 0;
  }
  @media (max-width: 520px) {
    .grid { flex-direction: column; }
  }
`

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

function heroTitle(input: BuildSisuTrialAccessEmailHtmlInput): string {
  const name = escapeHtml(input.nombre || 'Equipo')
  if (input.variant === 'lead_invite') {
    return `${name}, te invitamos a tocar el cielo`
  }
  return `${name}, ya podés tocar el cielo`
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
        <a href="${escapeHtml(activarUrl)}">Tocar las nubes</a>
        <p>Si el botón no funciona, copia este enlace en tu navegador: ${escapeHtml(activarUrl)}</p>
      </div>`
  }

  const loginUrl = input.loginUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/app/login`
  return `
    <div class="cta">
      <a href="${escapeHtml(loginUrl)}">Tocar el cielo</a>
      <p>Si el botón no funciona, copia este enlace en tu navegador: ${escapeHtml(loginUrl)}</p>
    </div>`
}

function featuresSectionTitle(input: BuildSisuTrialAccessEmailHtmlInput): string {
  if (input.variant === 'lead_invite') {
    return 'Descubrí SISU: tu cielo de prueba te espera'
  }
  return 'Tu cielo privado ya está listo'
}

function footerNote(input: BuildSisuTrialAccessEmailHtmlInput): string {
  const base =
    'SISU · Plataforma de Recursos Humanos (El Salvador, Guatemala y Honduras). Si tú no solicitaste este acceso, podés ignorar el correo.'
  if (!input.unsubscribeUrl) return base
  return `${base} ${MARKETING_UNSUBSCRIBE_FOOTER_TEXT} ${input.unsubscribeUrl}`
}

export function buildSisuTrialAccessEmailHtml(input: BuildSisuTrialAccessEmailHtmlInput): string {
  const heroSubtitle =
    'La ayuda está a tan solo un paso. El descanso es real, y también la plataforma. Accedé a tu entorno de prueba en El Salvador, Guatemala y Honduras — 7 días gratis para alcanzar la paz contable.'

  const bodyHtml = `
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

    <div class="warning">${SISU_TRIAL_WARNING_TEXT}</div>

    <div class="section-title">Para contratar</div>
    <div class="grid">
      <div>
        <h4>📱 WhatsApp</h4>
        <p><a href="${WHATSAPP_CONTRATAR_URL}" style="color: ${T.textAccent}; text-decoration: underline;">+504 3222-6773</a> · Tap y te atendemos personalmente (cero bots)</p>
      </div>
    </div>`

  return wrapLiquidEmail({
    title: heroTitle(input),
    subtitle: heroSubtitle,
    badge: 'Activa SISU',
    bodyHtml,
    footerNote: footerNote(input),
    extraCss: TRIAL_EXTRA_CSS,
  })
}

export function getSisuTrialAccessEmailSubject(input: {
  variant: SisuTrialEmailVariant
  empresa?: string
}): string {
  if (input.variant === 'lead_invite') {
    return 'Te invitamos a tocar el cielo — prueba gratuita por 7 días'
  }
  return `☁️ Toca el cielo — credenciales para ${input.empresa || 'tu empresa'}`
}
