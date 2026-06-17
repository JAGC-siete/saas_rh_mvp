import { VENTAS_BRAND as B } from '../ventas/brand-styles'
import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT, buildUnsubscribeUrl, getMarketingSiteUrl } from './unsubscribe'
import {
  liquidBulletList,
  liquidInfoBox,
  liquidParagraph,
  liquidPanel,
  wrapLiquidEmail,
  escapeHtml,
} from '../emails/liquid-layout'

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

export function buildInfoPackEmailHtml(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
}): string {
  const greeting = escapeHtml(firstName(params.nombre, params.email))
  const site = getMarketingSiteUrl().replace(/\/$/, '')
  const activarUrl = `${site}/activar`
  const ventasUrl = `${site}/ventas`
  const unsubscribeUrl = escapeHtml(buildUnsubscribeUrl(params.unsubscribeToken))

  const queEsSisu = liquidBulletList([
    'Nómina (IHSS, RAP, ISR según país)',
    'Control de asistencia (incluye integración biométrica)',
    'Permisos y vacaciones',
    'Expedientes y reportes para gerencia',
  ])

  const comoFunciona = `
    ${liquidParagraph('El sistema se conecta por internet con un reloj biométrico inteligente.')}
    <p style="margin: 0 0 10px 0; color: ${B.emailText}; font-size: 14px; font-weight: bold;">Esto permite dos cosas:</p>
    <ol style="margin: 0 0 14px 0; padding-left: 20px; color: ${B.emailTextSoft}; line-height: 1.65; font-size: 14px;">
      <li style="margin-bottom: 10px;">Visualización de asistencia en tiempo real desde cualquier dispositivo (celular, tablet, laptop, Mac, etc.).</li>
      <li style="margin-bottom: 0;">Cálculo de nóminas parametrizado y automatizado.</li>
    </ol>
    ${liquidParagraph('El sistema cuenta además con módulos de <strong>ficha de personal</strong>, <strong>control de permisos y vacaciones</strong>, y generación de reportes en distintos formatos (<strong>Excel, PDF, TXT, CSV</strong>).')}
  `

  const bodyHtml = [
    liquidParagraph(`Hola ${greeting},`),
    liquidParagraph(
      'Gracias por pedir más información sobre Humano SISU. Te resumo en pocas líneas qué es y si te puede servir — <strong>sin activar trial ni cotización todavía</strong>.'
    ),
    liquidPanel(
      `${liquidParagraph('Humano SISU centraliza lo que hoy suele estar repartido en Excel, WhatsApp y carpetas:')}${queEsSisu}<p style="margin: 12px 0 0 0; color: ${B.emailTextMuted}; font-size: 13px; line-height: 1.55;">Pensado para equipos de <strong>5 a 200 empleados</strong> que quieren dejar de calcular planilla a mano.</p>`,
      '¿Qué es SISU?'
    ),
    liquidPanel(comoFunciona, '¿Cómo funciona?'),
    liquidPanel(
      liquidBulletList([
        'Empresas en Honduras, El Salvador o Guatemala',
        'Dueños, gerentes de RRHH o contadores que quieren un solo lugar para el dato del personal',
        'Equipos que buscan implementación ágil (días, no meses)',
      ]),
      '¿Para quién es?'
    ),
    `<div style="text-align: center; margin: 18px 0;">
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: ${B.emailText};">¿Cómo se empieza? (cuando estés listo)</p>
      <p style="margin: 0 0 18px 0; font-size: 13px; color: ${B.emailTextMuted};">No tienes que decidir hoy.</p>
      <a href="${activarUrl}" style="display: inline-block; background: linear-gradient(135deg, ${B.emailAccent}, #2563eb); color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 0 6px 10px 6px;">Probar el sistema</a>
      <a href="${ventasUrl}" style="display: inline-block; background: transparent; color: ${B.emailAccent}; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 2px solid ${B.emailAccent}; margin: 0 6px 10px 6px;">Ver precios / cotización</a>
    </div>`,
    liquidInfoBox(
      'En los próximos días recibirás <strong>4 correos breves</strong> sobre errores comunes en la gestión de personal.',
      'neutral'
    ),
    `<p style="margin: 0; text-align: center; font-size: 12px; color: ${B.emailTextMuted}; line-height: 1.55;">
      ${MARKETING_UNSUBSCRIBE_FOOTER_TEXT}<br />
      <a href="${unsubscribeUrl}" style="color: ${B.emailAccent};">${unsubscribeUrl}</a>
    </p>`,
  ].join('')

  return wrapLiquidEmail({
    title: 'Humano SISU',
    subtitle: 'Software de RH para PyMEs en Centroamérica',
    badge: 'Más información',
    bodyHtml,
    footerNote: `Humano SISU · ${site}`,
  })
}
