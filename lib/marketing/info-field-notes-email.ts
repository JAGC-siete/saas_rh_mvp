import { getMarketingSiteUrl } from './unsubscribe'
import { buildMissionActivarUrl, buildMissionTextFooter } from './mission-config'

export const INFO_PACK_SUBJECT_FIELD =
  'Lo prometido: el documento para dejar de pelear con Recursos Humanos'

/** /viernes entry: same Paper Bridge pack, opener “recuperar el viernes”. */
export const INFO_PACK_SUBJECT_VIERNES =
  'Lo prometido: cómo recuperar el viernes (y dejar de pelear con el cierre)'

export type InfoPackVariant = 'default' | 'viernes'

const INFO_FIELD_NOTE_SUBJECTS: Record<number, string> = {
  0: 'Clave #0: la guerra silenciosa que drena tu negocio',
  1: 'Clave #1: desarma "siempre lo hemos hecho así" (la mentira más cara)',
  2: 'Clave #2: derriba el mito de los seis meses',
  3: 'Clave #3: la duda que no te deja dormir el viernes',
  4: 'Clave #4: sal de la pseudo-digitalización (o por qué tu app de asistencia no sirve)',
  5: 'Clave #5: recupera la paz el lunes sin arriesgar la operación',
}

export function getInfoSequenceSubject(step: number): string {
  return INFO_FIELD_NOTE_SUBJECTS[step] ?? ''
}

function firstName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name.split(/\s+/)[0] || name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Equipo'
}

export function buildInfoPackEmailBody(params: {
  nombre?: string | null
  email: string
  variant?: InfoPackVariant
}): string {
  const name = firstName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')
  const variant = params.variant ?? 'default'

  const opener =
    variant === 'viernes'
      ? [
          `Hola ${name},`,
          '',
          'Pediste recuperar el viernes. Eso empieza por mirar de frente el cierre que te lo está robando.',
          '',
          'La mayoría cree que RR.HH. es ineficiente por naturaleza: persiguiendo papeles, calculando mal la nómina, tardando días en un permiso. El domingo se va en Excel. Otra vez.',
          '',
          'Pero recuperar el viernes no es cambiar de personal. Es destruir el puente de papel — digitalizar de verdad y automatizar el dato.',
        ]
      : [
          `Hola ${name},`,
          '',
          'Acabas de hacer algo que el 99% de los líderes evita: mirar de frente el departamento que más canas verdes saca en la empresa.',
          '',
          'Si viste la pantalla, ya entiendes el problema real. La mayoría de los directores cree que su equipo de RR.HH. es ineficiente por naturaleza. Piensan: "Es que se la pasan persiguiendo papeles, calculando mal las nóminas y tardando días en responder un permiso".',
          '',
          'Pero el secreto no es cambiar de personal. El secreto es destruir el puente de papel.',
        ]

  return [
    ...opener,
    '',
    'Casi todos los negocios de la región cometen este error fatal:',
    '• RR.HH. captura una incidencia en un reloj checador.',
    '• Alguien la copia a mano en un Excel.',
    '• El gerente de operaciones aprueba las horas por WhatsApp.',
    '• Y tú (o tu contador) terminas jugando al detective para cuadrar la quincena.',
    '',
    'Eso no es culpa de Recursos Humanos. Eso es someter a humanos a hacer el trabajo de un software. El costo real es el resentimiento interno, los errores de cálculo y las horas perdidas.',
    '',
    variant === 'viernes'
      ? 'Te dejo esto por escrito para el próximo cierre — cuando el viernes (o el domingo) te vuelva a quitar la calma.'
      : 'Te dejo esto por escrito para el próximo fin de mes, cuando la nómina te vuelva a quitar la calma.',
    '',
    'Si tienes curiosidad de ver cómo RR.HH. se vuelve tu aliado estratégico cuando el dato viaja solo, te dejo estos dos enlaces:',
    `→ Mira cómo automatizar el dolor en 30 segundos: ${site}/activar`,
    `→ Los precios de nuestra solución (sin llamadas molestas): ${site}/ventas`,
    '',
    'Abrazo,',
    '',
    'Jorge',
    '',
    variant === 'viernes'
      ? 'PD: Mañana empieza la serie de claves para digitalizar y automatizar — la forma real de recuperar el viernes. La Clave #1 desarma la mentira más cara: "siempre lo hemos hecho así".'
      : 'PD: Mañana te enviaré la Clave #1 sobre la mentira corporativa más peligrosa del mundo. Si quieres dejar de perder dinero en fricción interna, te sugiero leerla.',
  ].join('\n')
}

export function buildInfoWelcomeText(): string {
  return [
    'Hola,',
    '',
    'Te quedaste. Eso significa que estás harto de la fricción diaria entre tu operación y Recursos Humanos.',
    '',
    'Mañana te escribo sobre la frase que destruye el crecimiento de cualquier empresa. La escucho en el 90% de las consultorías que doy:',
    '',
    '"Es que en Recursos Humanos siempre lo hemos hecho así."',
    '',
    'No lo dicen por maldad. Lo dicen por inercia. Pero esa inercia es la que hace que tu equipo pase el 80% de su tiempo operando archivos huérfanos en lugar de retener al talento que te genera dinero.',
    '',
    'Hoy no tienes que comprar nada. Solo entiende esto: tu enemigo no es tu gente de RR.HH. Tu enemigo es el sistema medieval que los obligas a usar.',
    '',
    'Mañana, la primera clave.',
    '',
    '— Jorge',
  ].join('\n')
}

type InfoPainPointParams = {
  nombre?: string | null
  email?: string
  leadToken?: string | null
}

export function buildInfoPainPoint1Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Ayer te prometí la primera clave para hacer las paces con RR.HH. Empieza por desarmar esta mentira: "Siempre lo hemos hecho así y funciona".',
    '',
    'Mentira. No funciona. Solo sobrevive.',
    '',
    'El "más o menos" corporativo te está costando miles de dólares en horas hombre. Cada vez que RR.HH. tiene que re-confirmar un permiso, cruzar un Excel de asistencia o corregir manualmente un día festivo, estás pagando por un error de diseño.',
    '',
    'Hacer las paces con RR.HH. empieza por aceptar que el riesgo no es probar una tecnología nueva. El riesgo real es seguir perdiendo paz, tiempo y dinero por defender el pasado.',
    '',
    'Mañana te cuento por qué "el software pesado" te mintió.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(1, params.leadToken, 'info')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildInfoPainPoint2Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Hablemos de otra excusa muy común: "Es que implementar un sistema de Recursos Humanos toma meses, es un dolor de cabeza y nadie lo va a usar".',
    '',
    'Tienen razón... si compras software obsoleto de la década pasada.',
    '',
    'Ese miedo paraliza a los dueños de negocio y los condena a seguir usando WhatsApp, libretas y correos como su "sistema operativo de personal".',
    '',
    'Una herramienta moderna no requiere un máster en ingeniería. Si la solución no le devuelve la paz a tu equipo en la primera semana, no es una solución, es una carga. Hacer las paces con RR.HH. es darles herramientas que amen usar, no castigos digitales.',
    '',
    'Mañana te muestro el costo psicológico de la duda.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(2, params.leadToken, 'info')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildInfoPainPoint3Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Cuando los horarios, las vacaciones, las faltas y los bonos viven dispersos en la mente de tres personas distintas y dos archivos de Excel, pasa lo inevitable: se escapan errores.',
    '',
    'Cinco minutos mal cobrados aquí. Un día de vacaciones que no se registró allá. Una prima dominical mal calculada por las prisas del cierre.',
    '',
    'Al final del mes, el problema no es solo el dinero que se fuga. Es la desconfianza. El empleado cree que le roban, tú crees que RR.HH. no sabe trabajar, y RR.HH. se siente frustrado.',
    '',
    'Esa duda constante destruye la cultura de tu empresa. Y la paz no regresa hasta que los datos son irrefutables para todos.',
    '',
    'Mañana te revelo el engaño de la "pantalla bonita".',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(3, params.leadToken, 'info')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildInfoPainPoint4Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)

  let body = [
    `Hola ${name},`,
    '',
    'Esto da risa, si no fuera porque cuesta dinero. Veo empresas con tablets de reconocimiento facial de última generación en la entrada... pero la secretaria sigue bajando los datos a un USB para meterlos a un Excel a fin de mes.',
    '',
    'Eso no es transformación digital. Eso es ponerle una pantalla a la burocracia de siempre.',
    '',
    'Si tu equipo gasta más tiempo moviendo el dato de un sistema a otro que analizando el rendimiento de la empresa, estás atrapado en la pseudo-digitalización. Es doble trabajo, pero con luces LED.',
    '',
    'Hacer las paces con RR.HH. es conectar los puntos para que ellos dejen de digitar y empiecen a gestionar.',
    '',
    'Mañana cerramos la serie con la forma inteligente de probar esto sin romper nada.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(4, params.leadToken, 'info')
  } else {
    body += '\n\n— Jorge'
  }

  return body
}

export function buildInfoPainPoint5Text(params: InfoPainPointParams): string {
  const name = firstName(params.nombre, params.email)
  const site = getMarketingSiteUrl().replace(/\/$/, '')

  let body = [
    `Hola ${name},`,
    '',
    'Llegamos al final. Y la pregunta lógica que tienes ahora mismo es: "Suena espectacular, Jorge... pero no puedo darme el lujo de parar la operación para experimentar".',
    '',
    'Tiene todo el sentido del mundo. Cuidar el flujo de caja es tu prioridad.',
    '',
    'Por eso, el secreto definitivo para hacer las paces con Recursos Humanos no es una revolución de un día para otro. Es una transición en paralelo.',
    '',
    'Pon a prueba nuestro motor durante una quincena mientras tú sigues haciendo la nómina con tu método viejo y lento. Compara los resultados con tus propios ojos. Descubre los errores que se te estaban escapando y mira cuánto tiempo libre le queda a tu equipo.',
    '',
    'Sin llamadas de ventas agresivas. Sin contratos forzosos. Solo tú, viendo cómo la fricción desaparece.',
  ].join('\n')

  if (params.leadToken) {
    body += buildMissionTextFooter(5, params.leadToken, 'info')
    body += `\n\nSi prefieres ir directo al motor (30 seg):\n${buildMissionActivarUrl(params.leadToken)}`
    body +=
      '\n\nPD: Esta fue la serie completa. Si estás listo para automatizar el caos y transformar a RR.HH. en el motor más eficiente de tu empresa, responde a este correo. Si no, no pasa nada; al menos ya sabes exactamente por dónde se está fugando tu paz.'
  } else {
    body += `\n\nSi quieres ver el motor funcionando en 30 segundos, entra aquí: ${site}/activar\n\n— Jorge`
  }

  return body
}
