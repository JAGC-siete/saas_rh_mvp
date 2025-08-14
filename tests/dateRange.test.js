const test = require('node:test')
const assert = require('node:assert')
const { DateTime } = require('luxon')
const { getDateRange } = require('../lib/attendance.js')

test('fortnight first half', () => {
  const today = DateTime.fromISO('2024-05-10', { zone: 'America/Tegucigalpa' })
  const { from, to } = getDateRange('fortnight', today)
  assert.equal(from.slice(0,10), '2024-05-01')
  assert.equal(to.slice(0,10), '2024-05-16')
})

test('fortnight second half', () => {
  const today = DateTime.fromISO('2024-05-20', { zone: 'America/Tegucigalpa' })
  const { from, to } = getDateRange('fortnight', today)
  assert.equal(from.slice(0,10), '2024-05-16')
  assert.equal(to.slice(0,10), '2024-06-01')
})
