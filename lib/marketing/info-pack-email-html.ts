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

  const bodyHtml = [
    liquidParagraph(`Hola ${greeting},`),
    liquidParagraph(
      'Si acabas de ver el extracto confidencial en nuestra pantalla, ya sabes de qué hablo. El gran error de la mayoría de empresas en <strong>Honduras, El Salvador y Guatemala</strong> es caer en la trampa de la <strong>"pseudo-digitalización"</strong>.'
    ),
    liquidParagraph(
      'Ponen un reloj biométrico en la entrada (digitalizan), pero siguen usando Excel para procesar la planilla a mano (no automatizan). Al final, terminan atrapados en el <strong>círculo del reprocesamiento</strong>: descargar datos a una USB, subirlos a la computadora, pelear con fórmulas de Excel que se rompen y perseguir permisos por WhatsApp. Sigue siendo trabajo manual, solo que más caro.'
    ),
    liquidParagraph(
      'El verdadero "truco" de Humano SISU no es venderte un software; es <strong>conectar la captura con la ejecución</strong> para que puedas <strong>DELEGAR</strong>.'
    ),
    liquidPanel(
      liquidBulletList([
        '<strong>Conexión directa en la nube:</strong> El empleado pone su huella o rostro en el reloj inteligente y el dato viaja directo a tu cuenta. No más archivos CSV, no más memorias USB, no más hojas de firmas impresas.',
        '<strong>El motor legal calcula solo:</strong> Te olvidas de las sumas a mano. El sistema procesa la asistencia y calcula los pagos exactos (incluyendo deducciones de IHSS, RAP, ISR, ISSS o IGSS según tu país).',
        '<strong>Todo centralizado en un clic:</strong> Permisos, vacaciones y constancias de trabajo se generan de forma automática basados en la asistencia real, sin que tengas que digitar nada dos veces.',
      ]),
      'En pocas palabras, así es como eliminamos el reprocesamiento'
    ),
    liquidPanel(
      liquidParagraph(
        'Está pensado exclusivamente para dueños, contadores o encargados de equipos de <strong>5 a 200 personas</strong> en la región que están cansados de ser el "puente humano" que traslada datos de un sistema a otro, y quieren recuperar la paz de sus semanas.'
      ),
      '¿Para quién funciona este truco?'
    ),
    liquidPanel(
      `${liquidParagraph('Como leíste en el dossier: <strong>cero venta</strong>. No tienes que decidir nada hoy ni hablar con ningún vendedor molesto. Tu atención es valiosa.')}
      ${liquidParagraph('Pero si tienes curiosidad de ver cómo luce el motor legal por dentro sin interactuar con humanos, aquí tienes los accesos directos:')}`,
      '¿Qué sigue ahora?'
    ),
    `<div style="text-align: center; margin: 18px 0;">
      <a href="${activarUrl}" style="display: inline-block; background: linear-gradient(135deg, ${B.emailAccent}, #2563eb); color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 0 6px 10px 6px;">Quiero ver el motor en funcionamiento (30 seg)</a>
      <a href="${ventasUrl}" style="display: inline-block; background: transparent; color: ${B.emailAccent}; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 2px solid ${B.emailAccent}; margin: 0 6px 10px 6px;">Ver tablas de precios transparentes</a>
    </div>`,
    liquidParagraph('Un saludo,<br /><strong>Jorge</strong> · Humano SISU'),
    liquidInfoBox(
      'Acabas de completar la <strong>Misión 0</strong>. En las próximas horas se activará la <strong>Misión 1</strong> en tu bandeja de entrada. Te voy a contar sobre "La trampa de: siempre lo hemos hecho así" y el costo invisible que estás pagando hoy por mantener procesos manuales. ¡Nos leemos pronto!',
      'neutral'
    ),
    `<p style="margin: 0; text-align: center; font-size: 12px; color: ${B.emailTextMuted}; line-height: 1.55;">
      ${MARKETING_UNSUBSCRIBE_FOOTER_TEXT}<br />
      <a href="${unsubscribeUrl}" style="color: ${B.emailAccent};">${unsubscribeUrl}</a>
    </p>`,
  ].join('')

  return wrapLiquidEmail({
    title: 'Humano SISU',
    subtitle: 'El truco para que el trabajo aburrido se haga solo',
    badge: 'Lo prometido',
    bodyHtml,
    footerNote: `Humano SISU · ${site}`,
  })
}
