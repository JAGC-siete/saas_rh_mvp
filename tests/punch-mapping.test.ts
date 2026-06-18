import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  mapPunchesToDay,
  PUNCH_ANOMALY_TYPES,
  formatPunchAnomalyLabel,
} from '../lib/attendance/punch-mapping'

const T = [
  '2026-06-01T13:00:00.000Z',
  '2026-06-01T17:00:00.000Z',
  '2026-06-01T18:00:00.000Z',
  '2026-06-01T22:00:00.000Z',
]

describe('mapPunchesToDay STRICT_4', () => {
  it('4 marcas → secuencia entrada / almuerzo / salida', () => {
    const r = mapPunchesToDay(T, 'STRICT_4')
    assert.equal(r.check_in, T[0])
    assert.equal(r.lunch_start, T[1])
    assert.equal(r.lunch_end, T[2])
    assert.equal(r.check_out, T[3])
    assert.deepEqual(r.anomalyTypes, [])
    assert.equal(r.status, 'present')
  })

  it('2 marcas → entrada/salida con anomalía two_punches_in_strict_4', () => {
    const r = mapPunchesToDay([T[0], T[3]], 'STRICT_4')
    assert.equal(r.check_in, T[0])
    assert.equal(r.check_out, T[3])
    assert.equal(r.lunch_start, null)
    assert.equal(r.lunch_end, null)
    assert.deepEqual(r.anomalyTypes, [PUNCH_ANOMALY_TYPES.TWO_PUNCHES_IN_STRICT_4])
    assert.equal(r.status, 'present')
  })

  it('1 marca → parcial sin salida', () => {
    const r = mapPunchesToDay([T[0]], 'STRICT_4')
    assert.equal(r.check_out, null)
    assert.equal(r.status, 'partial')
    assert.ok(r.anomalyTypes.includes(PUNCH_ANOMALY_TYPES.MISSING_PUNCH))
  })
})

describe('mapPunchesToDay STRICT_2', () => {
  it('2 marcas → entrada/salida sin anomalía', () => {
    const r = mapPunchesToDay([T[0], T[3]], 'STRICT_2')
    assert.equal(r.check_in, T[0])
    assert.equal(r.check_out, T[3])
    assert.equal(r.lunch_start, null)
    assert.deepEqual(r.anomalyTypes, [])
    assert.equal(r.status, 'present')
  })

  it('4 marcas → primera/última + almuerzo intermedio con anomalía four_punches_in_strict_2', () => {
    const r = mapPunchesToDay(T, 'STRICT_2')
    assert.equal(r.check_in, T[0])
    assert.equal(r.lunch_start, T[1])
    assert.equal(r.lunch_end, T[2])
    assert.equal(r.check_out, T[3])
    assert.deepEqual(r.anomalyTypes, [PUNCH_ANOMALY_TYPES.FOUR_PUNCHES_IN_STRICT_2])
    assert.equal(r.status, 'present')
  })

  it('>4 marcas → primera y última con extra_punches', () => {
    const punches = [...T, '2026-06-01T23:00:00.000Z']
    const r = mapPunchesToDay(punches, 'STRICT_2')
    assert.equal(r.check_in, punches[0])
    assert.equal(r.check_out, punches[punches.length - 1])
    assert.deepEqual(r.anomalyTypes, [PUNCH_ANOMALY_TYPES.EXTRA_PUNCHES])
  })
})

describe('mapPunchesToDay FLEXIBLE', () => {
  it('acepta 2 y 4 marcas sin fallback de modo', () => {
    assert.deepEqual(mapPunchesToDay([T[0], T[3]], 'FLEXIBLE').anomalyTypes, [])
    assert.deepEqual(mapPunchesToDay(T, 'FLEXIBLE').anomalyTypes, [])
  })
})

describe('formatPunchAnomalyLabel', () => {
  it('traduce tipos conocidos', () => {
    assert.match(formatPunchAnomalyLabel(PUNCH_ANOMALY_TYPES.TWO_PUNCHES_IN_STRICT_4), /2 marcas/)
    assert.match(formatPunchAnomalyLabel(PUNCH_ANOMALY_TYPES.FOUR_PUNCHES_IN_STRICT_2), /4 marcas/)
  })
})
