import { DateTime } from 'luxon'

export interface DateRange {
  from: string
  to: string
}

function toIsoStringOrDate(dateTime: DateTime): string {
  // Luxon DateTime#toISO() is typed as string | null; ensure a non-null string
  return (
    dateTime.toISO() ??
    dateTime.toUTC().toISO() ??
    dateTime.toISODate() ??
    dateTime.toJSDate().toISOString()
  )
}

export function getDateRange(preset: string, today: DateTime = DateTime.now().setZone('America/Tegucigalpa')): DateRange {
  switch (preset) {
    case 'today': {
      const from = today.startOf('day')
      const to = from.plus({ days: 1 })
      return { from: toIsoStringOrDate(from), to: toIsoStringOrDate(to) }
    }
    case 'week': {
      const from = today.startOf('week')
      const to = from.plus({ weeks: 1 })
      return { from: toIsoStringOrDate(from), to: toIsoStringOrDate(to) }
    }
    case 'fortnight': {
      const day = today.day
      const from = day <= 15 ? today.startOf('month') : today.startOf('month').plus({ days: 15 })
      const to = day <= 15 ? from.plus({ days: 15 }) : from.endOf('month').plus({ days: 1 })
      return { from: toIsoStringOrDate(from), to: toIsoStringOrDate(to) }
    }
    case 'month': {
      const from = today.startOf('month')
      const to = from.plus({ months: 1 })
      return { from: toIsoStringOrDate(from), to: toIsoStringOrDate(to) }
    }
    case 'year': {
      const from = today.startOf('year')
      const to = from.plus({ years: 1 })
      return { from: toIsoStringOrDate(from), to: toIsoStringOrDate(to) }
    }
    default:
      return { from: toIsoStringOrDate(today), to: toIsoStringOrDate(today) }
  }
}
