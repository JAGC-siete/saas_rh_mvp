import { VENTAS_BRAND as B } from '../ventas/brand-styles'
import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT, buildUnsubscribeUrl, getMarketingSiteUrl } from './unsubscribe'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function displayName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Equipo'
}

function firstName(raw?: string | null, email?: string): string {
  const full = displayName(raw, email)
  return full.split(/\s+/)[0] || full
}

function sectionBlock(title: string, innerHtml: string): string {
  return `
    <div style="background: white; padding: 18px 20px; border-radius: 10px; margin: 0 0 16px 0; border-left: 4px solid ${B.primary}; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);">
      <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: bold; color: ${B.primary}; text-transform: uppercase; letter-spacing: 0.06em;">${title}</h3>
      ${innerHtml}
    </div>
  `
}

function bulletList(items: string[]): string {
  return `
    <ul style="margin: 0; padding-left: 20px; color: ${B.textBody}; line-height: 1.65; font-size: 14px;">
      ${items.map((item) => `<li style="margin-bottom: 8px;">${item}</li>`).join('')}
    </ul>
  `
}

export function buildInfoPackEmailHtml(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
}): string {
  const name = displayName(params.nombre, params.email)
  const greeting = escapeHtml(firstName(params.nombre, params.email))
  const site = escapeHtml(getMarketingSiteUrl().replace(/\/$/, ''))
  const activarUrl = `${site}/activar`
  const ventasUrl = `${site}/ventas`
  const unsubscribeUrl = escapeHtml(buildUnsubscribeUrl(params.unsubscribeToken))

  const queEsSisu = bulletList([
    'Nómina (IHSS, RAP, ISR según país)',
    'Control de asistencia (incluye integración biométrica)',
    'Permisos y vacaciones',
    'Expedientes y reportes para gerencia',
  ])

  const comoFunciona = `
    <p style="margin: 0 0 14px 0; color: ${B.textBody}; font-size: 14px; line-height: 1.65;">
      El sistema se conecta por internet con un reloj biométrico inteligente.
    </p>
    <p style="margin: 0 0 10px 0; color: ${B.text}; font-size: 14px; font-weight: bold;">Esto permite dos cosas:</p>
    <ol style="margin: 0 0 14px 0; padding-left: 20px; color: ${B.textBody}; line-height: 1.65; font-size: 14px;">
      <li style="margin-bottom: 10px;">Visualización de asistencia en tiempo real desde cualquier dispositivo (celular, tablet, laptop, Mac, etc.).</li>
      <li style="margin-bottom: 0;">Cálculo de nóminas parametrizado y automatizado.</li>
    </ol>
    <p style="margin: 0; color: ${B.textBody}; font-size: 14px; line-height: 1.65;">
      El sistema cuenta además con módulos de <strong>ficha de personal</strong>, <strong>control de permisos y vacaciones</strong>, y generación de reportes en distintos formatos (<strong>Excel, PDF, TXT, CSV</strong>).
    </p>
  `

  const paraQuien = bulletList([
    'Empresas en Honduras, El Salvador o Guatemala',
    'Dueños, gerentes de RRHH o contadores que quieren un solo lugar para el dato del personal',
    'Equipos que buscan implementación ágil (días, no meses)',
  ])

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Humano SISU — Información</title>
  </head>
  <body style="margin: 0; padding: 0; background: #eef2f7; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${B.primary} 0%, #1976d2 100%); padding: 28px 26px; text-align: center; color: white; border-radius: 12px 12px 0 0;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9;">Más información</p>
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Humano SISU</h1>
        <p style="margin: 12px 0 0 0; font-size: 14px; opacity: 0.92; line-height: 1.5;">Software de RH para PyMEs en Centroamérica</p>
      </div>

      <div style="background: ${B.panelBgAlt}; padding: 26px 24px 28px 24px; border-radius: 0 0 12px 12px; border: 1px solid ${B.panelBorder}; border-top: none;">
        <p style="color: ${B.textBody}; margin: 0 0 14px 0; line-height: 1.6; font-size: 15px;">Hola ${greeting},</p>
        <p style="color: ${B.textBody}; margin: 0 0 20px 0; line-height: 1.6; font-size: 14px;">
          Gracias por pedir más información sobre Humano SISU. Te resumo en pocas líneas qué es y si te puede servir — <strong>sin activar trial ni cotización todavía</strong>.
        </p>

        ${sectionBlock(
          '¿Qué es SISU?',
          `<p style="margin: 0 0 12px 0; color: ${B.textBody}; font-size: 14px; line-height: 1.65;">
            Humano SISU centraliza lo que hoy suele estar repartido en Excel, WhatsApp y carpetas:
          </p>${queEsSisu}<p style="margin: 12px 0 0 0; color: ${B.textMuted}; font-size: 13px; line-height: 1.55;">
            Pensado para equipos de <strong>5 a 200 empleados</strong> que quieren dejar de calcular planilla a mano.
          </p>`
        )}

        ${sectionBlock('¿Cómo funciona?', comoFunciona)}

        ${sectionBlock('¿Para quién es?', paraQuien)}

        <div style="background: white; padding: 20px; border-radius: 10px; margin: 0 0 16px 0; border: 1px solid ${B.panelBorder}; text-align: center;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: ${B.text};">¿Cómo se empieza? (cuando estés listo)</p>
          <p style="margin: 0 0 18px 0; font-size: 13px; color: ${B.textMuted}; line-height: 1.5;">No tienes que decidir hoy.</p>
          <a href="${activarUrl}" style="display: inline-block; background: ${B.primary}; color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 0 6px 10px 6px;">Probar el sistema</a>
          <a href="${ventasUrl}" style="display: inline-block; background: white; color: ${B.primary}; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 2px solid ${B.primary}; margin: 0 6px 10px 6px;">Ver precios / cotización</a>
          <p style="margin: 14px 0 0 0; font-size: 12px; color: ${B.textMuted}; line-height: 1.5;">
            Si prefieres hablar con alguien, responde a este correo.
          </p>
        </div>

        <div style="background: ${B.panelBg}; border: 1px solid ${B.panelBorder}; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 13px; color: ${B.textMuted}; line-height: 1.55;">
            En los próximos días recibirás <strong>4 correos breves</strong> sobre errores comunes en la gestión de personal.
          </p>
        </div>

        <p style="margin: 0; text-align: center; font-size: 12px; color: ${B.textMuted}; line-height: 1.55;">
          Humano SISU · ${site}<br />
          ${MARKETING_UNSUBSCRIBE_FOOTER_TEXT}<br />
          <a href="${unsubscribeUrl}" style="color: ${B.primary};">${unsubscribeUrl}</a>
        </p>
      </div>
    </div>
  </body>
</html>`
}
