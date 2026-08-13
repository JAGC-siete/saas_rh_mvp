import type { BiometricMode } from './attendance-metadata'

/**
 * Maps ordered biometric punch timestamps to attendance record fields.
 *
 * Modes define the *expected* punch pattern at cierre diario:
 * - STRICT_2: entrada + salida (2 marcas)
 * - STRICT_4: entrada + inicio almuerzo + fin almuerzo + salida (4 marcas)
 * - FLEXIBLE: acepta 2 o 4 marcas sin reglas de fallback entre modos
 *
 * When the received count differs from the mode expectation, fallback rules still
 * produce check_in/check_out when chronology allows it. Those rows carry
 * `anomaly_types` so HR can review without losing hours in reports.
 *
 * Preconditions: `punches` must be sorted ascending by timestamp (see daily-close).
 */

export const PUNCH_ANOMALY_TYPES = {
  ABSENT_NO_PUNCH: 'absent_no_punch',
  MISSING_PUNCH: 'missing_punch',
  EXTRA_PUNCHES: 'extra_punches',
  ODD_PUNCH_COUNT: 'odd_punch_count',
  /** STRICT_4 expected 4 marks; received 2 → mapped as entrada/salida */
  TWO_PUNCHES_IN_STRICT_4: 'two_punches_in_strict_4',
  /** STRICT_2 expected 2 marks; received 4 → middle marks used as almuerzo */
  FOUR_PUNCHES_IN_STRICT_2: 'four_punches_in_strict_2',
} as const

export type PunchAnomalyType = (typeof PUNCH_ANOMALY_TYPES)[keyof typeof PUNCH_ANOMALY_TYPES]

export interface MappedPunchDay {
  check_in: string | null
  check_out: string | null
  lunch_start: string | null
  lunch_end: string | null
  anomalyTypes: PunchAnomalyType[]
  status: 'present' | 'partial' | 'absent'
}

const EMPTY_DAY: MappedPunchDay = {
  check_in: null,
  check_out: null,
  lunch_start: null,
  lunch_end: null,
  anomalyTypes: [],
  status: 'present',
}

function twoMarkWorkday(first: string, last: string): Omit<MappedPunchDay, 'anomalyTypes' | 'status'> {
  return {
    check_in: first,
    check_out: last,
    lunch_start: null,
    lunch_end: null,
  }
}

function fourMarkWorkday(
  p0: string,
  p1: string,
  p2: string,
  p3: string
): Omit<MappedPunchDay, 'anomalyTypes' | 'status'> {
  return {
    check_in: p0,
    lunch_start: p1,
    lunch_end: p2,
    check_out: p3,
  }
}

function mapStrictTwo(punches: string[]): MappedPunchDay {
  const n = punches.length

  if (n === 1) {
    return {
      check_in: punches[0],
      check_out: null,
      lunch_start: null,
      lunch_end: null,
      anomalyTypes: [PUNCH_ANOMALY_TYPES.MISSING_PUNCH],
      status: 'partial',
    }
  }

  if (n === 2) {
    return {
      ...twoMarkWorkday(punches[0], punches[1]),
      anomalyTypes: [],
      status: 'present',
    }
  }

  if (n === 4) {
    return {
      ...fourMarkWorkday(punches[0], punches[1], punches[2], punches[3]),
      anomalyTypes: [PUNCH_ANOMALY_TYPES.FOUR_PUNCHES_IN_STRICT_2],
      status: 'present',
    }
  }

  if (n === 3) {
    return {
      check_in: punches[0],
      check_out: punches[2],
      lunch_start: punches[1],
      lunch_end: null,
      anomalyTypes: [PUNCH_ANOMALY_TYPES.ODD_PUNCH_COUNT, PUNCH_ANOMALY_TYPES.MISSING_PUNCH],
      status: 'partial',
    }
  }

  // n > 4: earliest in, latest out; ignore intermediate marks
  return {
    ...twoMarkWorkday(punches[0], punches[n - 1]),
    anomalyTypes: [PUNCH_ANOMALY_TYPES.EXTRA_PUNCHES],
    status: 'present',
  }
}

function mapStrictFour(punches: string[]): MappedPunchDay {
  const n = punches.length

  if (n === 4) {
    return {
      ...fourMarkWorkday(punches[0], punches[1], punches[2], punches[3]),
      anomalyTypes: [],
      status: 'present',
    }
  }

  if (n === 2) {
    return {
      ...twoMarkWorkday(punches[0], punches[1]),
      anomalyTypes: [PUNCH_ANOMALY_TYPES.TWO_PUNCHES_IN_STRICT_4],
      status: 'present',
    }
  }

  if (n === 1) {
    return {
      check_in: punches[0],
      check_out: null,
      lunch_start: null,
      lunch_end: null,
      anomalyTypes: [PUNCH_ANOMALY_TYPES.MISSING_PUNCH],
      status: 'partial',
    }
  }

  if (n === 3) {
    return {
      check_in: punches[0],
      lunch_start: punches[1],
      lunch_end: null,
      check_out: punches[2],
      anomalyTypes: [PUNCH_ANOMALY_TYPES.ODD_PUNCH_COUNT, PUNCH_ANOMALY_TYPES.MISSING_PUNCH],
      status: 'partial',
    }
  }

  // n > 4: use first four chronological marks; flag extras
  return {
    ...fourMarkWorkday(punches[0], punches[1], punches[2], punches[3]),
    anomalyTypes: [PUNCH_ANOMALY_TYPES.EXTRA_PUNCHES],
    status: 'present',
  }
}

function mapFlexible(punches: string[]): MappedPunchDay {
  const n = punches.length

  if (n === 2) {
    return {
      ...twoMarkWorkday(punches[0], punches[1]),
      anomalyTypes: [],
      status: 'present',
    }
  }

  if (n === 4) {
    return {
      ...fourMarkWorkday(punches[0], punches[1], punches[2], punches[3]),
      anomalyTypes: [],
      status: 'present',
    }
  }

  if (n === 1) {
    return {
      check_in: punches[0],
      check_out: null,
      lunch_start: null,
      lunch_end: null,
      anomalyTypes: [PUNCH_ANOMALY_TYPES.MISSING_PUNCH],
      status: 'partial',
    }
  }

  if (n === 3) {
    return {
      check_in: punches[0],
      lunch_start: punches[1],
      lunch_end: null,
      check_out: punches[2],
      anomalyTypes: [PUNCH_ANOMALY_TYPES.ODD_PUNCH_COUNT, PUNCH_ANOMALY_TYPES.MISSING_PUNCH],
      status: 'partial',
    }
  }

  if (n > 4) {
    return {
      ...fourMarkWorkday(punches[0], punches[1], punches[2], punches[3]),
      anomalyTypes: [PUNCH_ANOMALY_TYPES.EXTRA_PUNCHES],
      status: 'present',
    }
  }

  return { ...EMPTY_DAY }
}

/** Human-readable label for anomaly chips in UI. */
export function formatPunchAnomalyLabel(type: string): string {
  switch (type) {
    case PUNCH_ANOMALY_TYPES.TWO_PUNCHES_IN_STRICT_4:
      return '2 marcas (esperaba 4)'
    case PUNCH_ANOMALY_TYPES.FOUR_PUNCHES_IN_STRICT_2:
      return '4 marcas (esperaba 2)'
    case PUNCH_ANOMALY_TYPES.MISSING_PUNCH:
      return 'Marca faltante'
    case PUNCH_ANOMALY_TYPES.EXTRA_PUNCHES:
      return 'Marcas extra'
    case PUNCH_ANOMALY_TYPES.ODD_PUNCH_COUNT:
      return 'Cantidad impar'
    case PUNCH_ANOMALY_TYPES.ABSENT_NO_PUNCH:
      return 'Sin marcas'
    default:
      return type.replace(/_/g, ' ')
  }
}

/**
 * Map ordered punch timestamps to attendance fields + anomaly list.
 */
export function mapPunchesToDay(punches: string[], mode: BiometricMode): MappedPunchDay {
  if (punches.length === 0) {
    return {
      ...EMPTY_DAY,
      status: 'absent',
      anomalyTypes: [PUNCH_ANOMALY_TYPES.ABSENT_NO_PUNCH],
    }
  }

  switch (mode) {
    case 'STRICT_2':
      return mapStrictTwo(punches)
    case 'STRICT_4':
      return mapStrictFour(punches)
    case 'FLEXIBLE':
      return mapFlexible(punches)
    default:
      return mapStrictTwo(punches)
  }
}
