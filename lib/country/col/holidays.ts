/**
 * Festivos de Colombia (Ley 51 de 1983, "Ley Emiliani").
 * Varios festivos se trasladan al lunes siguiente; los de Semana Santa dependen de la Pascua.
 * Mismo formato que `labor_laws.holidays`: { date, name, movable }.
 */

export type ColHoliday = { date: string; name: string; movable: boolean }

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000)
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Domingo de Pascua (algoritmo gregoriano anónimo / Meeus). */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return utcDate(year, month, day)
}

/** Lunes igual o siguiente (si ya cae lunes, se queda). */
function nextMondayOrSame(d: Date): Date {
  const dow = d.getUTCDay()
  return dow === 1 ? d : addDays(d, (8 - dow) % 7)
}

export function colombiaHolidays(year: number): ColHoliday[] {
  const easter = easterSunday(year)
  const fixed = (month: number, day: number, name: string): ColHoliday => ({
    date: toYmd(utcDate(year, month, day)),
    name,
    movable: false,
  })
  const moved = (d: Date, name: string): ColHoliday => ({ date: toYmd(nextMondayOrSame(d)), name, movable: true })

  const list: ColHoliday[] = [
    fixed(1, 1, 'Año Nuevo'),
    moved(utcDate(year, 1, 6), 'Día de los Reyes Magos'),
    moved(utcDate(year, 3, 19), 'Día de San José'),
    { date: toYmd(addDays(easter, -3)), name: 'Jueves Santo', movable: true },
    { date: toYmd(addDays(easter, -2)), name: 'Viernes Santo', movable: true },
    fixed(5, 1, 'Día del Trabajo'),
    moved(addDays(easter, 39), 'Ascensión del Señor'),
    moved(addDays(easter, 60), 'Corpus Christi'),
    moved(addDays(easter, 68), 'Sagrado Corazón de Jesús'),
    moved(utcDate(year, 6, 29), 'San Pedro y San Pablo'),
    fixed(7, 20, 'Día de la Independencia'),
    fixed(8, 7, 'Batalla de Boyacá'),
    moved(utcDate(year, 8, 15), 'Asunción de la Virgen'),
    moved(utcDate(year, 10, 12), 'Día de la Raza'),
    moved(utcDate(year, 11, 1), 'Día de Todos los Santos'),
    moved(utcDate(year, 11, 11), 'Independencia de Cartagena'),
    fixed(12, 8, 'Inmaculada Concepción'),
    fixed(12, 25, 'Navidad'),
  ]
  return list.sort((x, y) => x.date.localeCompare(y.date))
}
