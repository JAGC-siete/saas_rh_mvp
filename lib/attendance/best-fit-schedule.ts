/**
 * Best Fit: encuentra el horario cuya start_time (check-in) o end_time (check-out)
 * sea más cercana a la marca actual. Usado para horarios rotativos.
 */

import { convertToHondurasTime } from '../timezone';

const DAY_COLUMNS = [
  'sunday_start',
  'monday_start',
  'tuesday_start',
  'wednesday_start',
  'thursday_start',
  'friday_start',
  'saturday_start',
] as const;

/** Umbral en minutos: 1.5 horas = 90 min */
export const BEST_FIT_THRESHOLD_MINUTES = 90;

/**
 * Convierte "HH:MM" o "HH:MM:SS" a minutos desde medianoche
 */
function timeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2) return null;
  const [h, m] = parts;
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Diferencia mínima en minutos entre dos horas (considera wrap-around 24h)
 */
function minDiffMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 24 * 60 - diff);
}

export interface BestFitResult {
  matched: boolean;
  dayName?: string;
  expectedCheckIn?: string;
  expectedCheckOut?: string;
  lateMinutes?: number;
  earlyDepartureMinutes?: number;
  horarioNoDetectado?: boolean;
  /** Razón por la que se activó Capa 1 (para UI/alertas) */
  capa1Razon?: 'distancia_horario_excedida' | 'sin_horario_asignado' | 'error_fetch_horario';
  /** Gap en minutos al horario más cercano (cuando distancia excedida) */
  gapMinutos?: number;
}

type MatchMode = 'check_in' | 'check_out';

/**
 * Busca el horario más cercano al punch. Para check_in compara con start_time,
 * para check_out compara con end_time.
 * @param punchTimestamp - Timestamp del evento (se convierte a Honduras para comparar)
 */
export function findBestFitSchedule(
  schedule: Record<string, unknown>,
  punchTimestamp: Date,
  punchDateStr: string,
  mode: MatchMode = 'check_in'
): BestFitResult {
  const hn = convertToHondurasTime(punchTimestamp);
  const punchMinutes = hn.getHours() * 60 + hn.getMinutes();

  let bestDay: string | null = null;
  let bestStartStr: string | null = null;
  let bestEndStr: string | null = null;
  let bestDiff = Infinity;

  for (const col of DAY_COLUMNS) {
    const startStr = schedule[col] as string | null | undefined;
    const endCol = col.replace('_start', '_end') as keyof typeof schedule;
    const endStr = (schedule[endCol] as string) || null;

    const refStr = mode === 'check_in' ? startStr : endStr;
    if (!refStr) continue;

    const refMinutes = timeToMinutes(refStr);
    if (refMinutes === null) continue;

    const diff = minDiffMinutes(punchMinutes, refMinutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestDay = col.replace('_start', '');
      bestStartStr = startStr || '08:00';
      bestEndStr = endStr || '17:00';
    }
  }

  if (
    bestDay == null ||
    bestStartStr == null ||
    bestDiff > BEST_FIT_THRESHOLD_MINUTES
  ) {
    return {
      matched: false,
      horarioNoDetectado: true,
      capa1Razon: bestDiff !== Infinity ? 'distancia_horario_excedida' : 'sin_horario_asignado',
      gapMinutos: bestDiff !== Infinity ? Math.round(bestDiff) : undefined,
    };
  }

  const [y, m, d] = punchDateStr.split('-').map(Number);
  const HONDURAS_UTC_OFFSET = 6;
  const [startH, startM] = bestStartStr.split(':').map(Number);
  const expectedCheckInDate = new Date(Date.UTC(y, m - 1, d, startH + HONDURAS_UTC_OFFSET, startM, 0));

  const expectedCheckOutStr = bestEndStr || '17:00';
  const [endH, endM] = expectedCheckOutStr.split(':').map(Number);
  const endMinutes = endH * 60 + endM;
  const startMinutes = startH * 60 + startM;
  const crossesMidnight = endMinutes <= startMinutes;
  const expectedCheckOutDate = new Date(
    Date.UTC(y, m - 1, d + (crossesMidnight ? 1 : 0), endH + HONDURAS_UTC_OFFSET, endM, 0)
  );

  const lateMinutes = Math.max(
    0,
    Math.floor((punchTimestamp.getTime() - expectedCheckInDate.getTime()) / 60000)
  );
  const earlyDepartureMinutes = Math.max(
    0,
    Math.floor(
      (expectedCheckOutDate.getTime() - punchTimestamp.getTime()) / 60000
    )
  );

  return {
    matched: true,
    dayName: bestDay,
    expectedCheckIn: bestStartStr,
    expectedCheckOut: expectedCheckOutStr,
    lateMinutes: lateMinutes > 0 ? lateMinutes : undefined,
    earlyDepartureMinutes: earlyDepartureMinutes > 0 ? earlyDepartureMinutes : undefined,
  };
}
