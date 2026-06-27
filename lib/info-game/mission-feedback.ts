import { buildMissionActivarUrl, type MissionId } from '../marketing/mission-config'
import { normalizeLeadSource } from '../marketing/email-sequence-ledger'

export type MissionFeedback = {
  title: string
  headline: string
  body: string
  stat?: { value: string; label: string }
  cta?: { label: string; href: string }
}

function hoursPerMonthToDaysPerYear(hoursPerMonth: number): number {
  const hoursPerYear = hoursPerMonth * 12
  return Math.round(hoursPerYear / 8)
}

export function getMissionFeedback(
  missionId: MissionId,
  choice: string,
  firstName: string,
  leadToken: string,
  source?: string | null
): MissionFeedback {
  const name = firstName || 'Curioso'

  if (normalizeLeadSource(source) === 'suscripcion') {
    return getSuscripcionMissionFeedback(missionId, choice, name)
  }

  if (missionId === 1) {
    const map: Record<string, { hours: number; headline: string; body: string }> = {
      '0-5': {
        hours: 3,
        headline: 'Aún así, son días que podrías recuperar.',
        body: `${name}, aunque pierdas "poco" tiempo en lo repetitivo, ese tiempo se acumula. Son horas que no vuelven — y que la tecnología puede hacer por ti mientras tú te enfocas en lo importante.`,
      },
      '5-15': {
        hours: 10,
        headline: 'Estás regalando semanas enteras al papeleo.',
        body: `${name}, lo que hoy sientes como "parte del trabajo" es en realidad una fuga silenciosa. Delegar lo repetitivo no es lujo: es devolverte aire.`,
      },
      '15plus': {
        hours: 20,
        headline: 'Eso ya es un segundo trabajo sin paga.',
        body: `${name}, más de 15 horas al mes en lo manual es una señal clara: el sistema debería trabajar por ti, no al revés. El truco del sobre existe precisamente para esto.`,
      },
    }
    const row = map[choice] ?? map['5-15']
    const days = hoursPerMonthToDaysPerYear(row.hours)
    return {
      title: 'Misión 1 completada',
      headline: row.headline,
      body: row.body,
      stat: {
        value: String(days),
        label: `días al año regalados al papeleo (estimado)`,
      },
    }
  }

  if (missionId === 2) {
    const map: Record<string, MissionFeedback> = {
      difficult: {
        title: 'Misión 2 completada',
        headline: 'Normal sentir que "es complicado".',
        body: `${name}, la mayoría piensa igual antes de probar. SISU está pensado para gente ocupada, no para expertos en sistemas. En 72 horas o menos puedes ver resultados sin volverte técnico.`,
      },
      expensive: {
        title: 'Misión 2 completada',
        headline: 'El miedo al costo es el más común.',
        body: `${name}, una hora mal calculada en planilla suele costar más que un mes de software. Automatizar lo aburrido es la inversión más barata que existe: tiempo devuelto.`,
      },
      control: {
        title: 'Misión 2 completada',
        headline: 'Querer control legal es señal de buen criterio.',
        body: `${name}, digitalizar no es soltar el timón: es tener deducciones, asistencia y constancias con trazabilidad. Menos "yo creo que está bien" y más datos exactos.`,
      },
    }
    return map[choice] ?? map.difficult
  }

  if (missionId === 3) {
    const map: Record<string, MissionFeedback> = {
      attendance: {
        title: 'Misión 3 completada',
        headline: 'Las firmas son el agujero negro clásico.',
        body: `${name}, perseguir hojas de asistencia a fin de mes es trabajo doble. Un reloj biométrico conectado elimina la discusión de quién llegó y cuándo.`,
      },
      payroll: {
        title: 'Misión 3 completada',
        headline: 'Ahí es donde más se paga el error.',
        body: `${name}, un decimal mal en IHSS o ISR no avisa — cobra. El motor legal de SISU calcula igual que nuestras calculadoras públicas, sin sumas a mano.`,
      },
      permissions: {
        title: 'Misión 3 completada',
        headline: 'WhatsApp no es un sistema de RRHH.',
        body: `${name}, permisos perdidos en chats se convierten en conflictos. Centralizar vacaciones y permisos en un solo lugar evita el "yo no sabía".`,
      },
    }
    return map[choice] ?? map.payroll
  }

  if (missionId === 4) {
    if (choice === 'yes-bomb') {
      return {
        title: 'Misión 4 completada',
        headline: 'Honestidad rara. Y valiosa.',
        body: `${name}, admitir que Excel es una bomba de tiempo es el primer paso. La pseudo digitalización (Excel + reloj desconectado) hace el trabajo doble, no más rápido.`,
        cta: {
          label: 'Validar con calculadora gratis',
          href: '/calculadora?utm_source=info&utm_medium=mission&utm_campaign=m4',
        },
      }
    }
    return {
      title: 'Misión 4 completada',
      headline: 'Confianza ciega es el riesgo más caro.',
      body: `${name}, "confío ciegamente" funciona hasta el día que no cuadra una planilla. Un sistema que valida por ti duerme mejor que una hoja sin revisar.`,
      cta: {
        label: 'Probar el motor legal gratis',
        href: '/calculadora?utm_source=info&utm_medium=mission&utm_campaign=m4',
      },
    }
  }

  return {
    title: 'Misión final completada',
    headline: 'La prueba en la sombra te espera.',
    body: `${name}, sin borrar lo que ya funciona: deja que el sistema calcule por unos días y compara con tus propios ojos. Cero presión de ventas.`,
    cta: {
      label: 'Iniciar la prueba en la sombra',
      href: buildMissionActivarUrl(leadToken),
    },
  }
}

function getSuscripcionMissionFeedback(
  missionId: MissionId,
  choice: string,
  name: string
): MissionFeedback {
  if (missionId === 1) {
    const map: Record<string, MissionFeedback> = {
      'yes-often': {
        title: 'Nota #1 · registrada',
        headline: 'No sos la única persona.',
        body: `${name}, si te pasó más de una vez, vale la pena anotar la diferencia y comparar el próximo mes con la calculadora.`,
      },
      'yes-once': {
        title: 'Nota #1 · registrada',
        headline: 'Una vez ya es señal.',
        body: `${name}, no hace falta que sea habitual para merecer una revisión. Guardá el cálculo y el recibo.`,
      },
      never: {
        title: 'Nota #1 · registrada',
        headline: 'Qué bueno que cuadre.',
        body: `${name}, igual conviene revisar cada cierto tiempo — a veces cambian deducciones sin que te avisen claro.`,
      },
    }
    return map[choice] ?? map['yes-once']
  }

  if (missionId === 2) {
    const map: Record<string, MissionFeedback> = {
      'yes-clear': {
        title: 'Nota #2 · registrada',
        headline: 'Vas adelantado/a.',
        body: `${name}, entender tu recibo te protege cuando algo cambia sin explicación clara.`,
      },
      some: {
        title: 'Nota #2 · registrada',
        headline: 'Es lo más común.',
        body: `${name}, casi nadie entiende cada línea. Por eso mandamos explicaciones en lenguaje simple.`,
      },
      'no-idea': {
        title: 'Nota #2 · registrada',
        headline: 'Honestidad útil.',
        body: `${name}, no pasa nada. En las próximas notas vamos desglosando siglas sin jerga de RRHH.`,
      },
    }
    return map[choice] ?? map.some
  }

  if (missionId === 3) {
    const map: Record<string, MissionFeedback> = {
      yes: {
        title: 'Nota #3 · registrada',
        headline: 'Mejor prevenir.',
        body: `${name}, saber las fechas te evita sorpresas de último momento.`,
      },
      approx: {
        title: 'Nota #3 · registrada',
        headline: 'Casi cuenta.',
        body: `${name}, te mandamos recordatorios para afinar fechas según tu país.`,
      },
      no: {
        title: 'Nota #3 · registrada',
        headline: 'Para eso están las alertas.',
        body: `${name}, aguinaldo y catorceavo tienen plazos legales — te avisamos antes.`,
      },
    }
    return map[choice] ?? map.no
  }

  if (missionId === 4) {
    const map: Record<string, MissionFeedback> = {
      'ask-hr': {
        title: 'Nota #4 · registrada',
        headline: 'Buen primer paso.',
        body: `${name}, llegar con números en mano hace la conversación más fácil y concreta.`,
      },
      recalc: {
        title: 'Nota #4 · registrada',
        headline: 'También funciona.',
        body: `${name}, volvé a calcular con los mismos datos del recibo antes de asumir un error.`,
        cta: {
          label: 'Volver a la calculadora',
          href: '/calculadora?utm_source=email&utm_medium=mission&utm_campaign=subs_m4',
        },
      },
      'stay-quiet': {
        title: 'Nota #4 · registrada',
        headline: 'Entiendo la duda.',
        body: `${name}, aunque no preguntes hoy, guardar el cálculo te da referencia para el próximo mes.`,
      },
    }
    return map[choice] ?? map.recalc
  }

  return {
    title: 'Nota #5 · registrada',
    headline: choice === 'yes-alerts' ? 'Perfecto — seguís en la lista.' : 'Sin presión.',
    body: `${name}, seguirás recibiendo alertas legales cuando haya cambios que afecten tu sueldo.`,
    cta: {
      label: 'Explorar calculadoras',
      href: '/calculadora?utm_source=email&utm_medium=mission&utm_campaign=subs_m5',
    },
  }
}
