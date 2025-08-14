const { DateTime } = require('luxon')

function getDateRange(preset, today = DateTime.now().setZone('America/Tegucigalpa')) {
  switch (preset) {
    case 'today': {
      const from = today.startOf('day')
      const to = from.plus({ days: 1 })
      return { from: from.toISO(), to: to.toISO() }
    }
    case 'week': {
      const from = today.startOf('week')
      const to = from.plus({ weeks: 1 })
      return { from: from.toISO(), to: to.toISO() }
    }
    case 'fortnight': {
      const day = today.day
      const from = day <= 15 ? today.startOf('month') : today.startOf('month').plus({ days: 15 })
      const to = day <= 15 ? from.plus({ days: 15 }) : from.endOf('month').plus({ days: 1 })
      return { from: from.toISO(), to: to.toISO() }
    }
    case 'month': {
      const from = today.startOf('month')
      const to = from.plus({ months: 1 })
      return { from: from.toISO(), to: to.toISO() }
    }
    case 'year': {
      const from = today.startOf('year')
      const to = from.plus({ years: 1 })
      return { from: from.toISO(), to: to.toISO() }
    }
    default:
      return { from: today.toISO(), to: today.toISO() }
  }
}

module.exports = { getDateRange }
