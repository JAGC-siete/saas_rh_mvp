import { buildMissionActivarUrl, type MissionId } from '../marketing/mission-config'

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
  leadToken: string
): MissionFeedback {
  const name = firstName || 'Curioso'

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
