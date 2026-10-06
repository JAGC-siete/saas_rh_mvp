import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateVacacionesHn } from '../lib/public-calculator/calc/vacaciones-hn'
import { calculateHorasExtraHn } from '../lib/public-calculator/calc/horas-extra-hn'

describe('calculadora pública vacaciones Honduras (Art. 346 CT)', () => {
  it('3 años completos exactos: 15 días × (15,000 ÷ 30) = L 7,500', () => {
    const r = calculateVacacionesHn({ salarioMensual: 15000, fechaIngreso: '2023-01-01', fechaCalculo: '2025-12-30' })
    assert.equal(r.diasLaborados, 1080)
    assert.equal(r.anosCompletos, 3)
    assert.equal(r.salarioDiario, 500)
    assert.equal(r.diasUltimoAno, 15)
    assert.equal(r.valorUltimoAno, 7500)
    assert.equal(r.diasProporcionales, 0)
    assert.equal(r.diasProximoAno, 20)
  })

  it('primer año incompleto: 180 días ÷ 36 = 5 días × L 400 = L 2,000', () => {
    const r = calculateVacacionesHn({ salarioMensual: 12000, fechaIngreso: '2026-01-01', fechaCalculo: '2026-06-30' })
    assert.equal(r.anosCompletos, 0)
    assert.equal(r.diasUltimoAno, 0)
    assert.equal(r.valorUltimoAno, 0)
    assert.equal(r.diasProporcionales, 5)
    assert.equal(r.valorProporcional, 2000)
    assert.equal(r.diasProximoAno, 10)
  })

  it('6 años y medio: 20 días del último año + 180 ÷ 18 = 10 días proporcionales', () => {
    const r = calculateVacacionesHn({ salarioMensual: 18000, fechaIngreso: '2020-01-01', fechaCalculo: '2026-06-30' })
    assert.equal(r.anosCompletos, 6)
    assert.equal(r.valorUltimoAno, 12000)
    assert.equal(r.diasProporcionales, 10)
    assert.equal(r.valorProporcional, 6000)
  })
})

describe('calculadora pública horas extra Honduras (motor de planilla, ÷240)', () => {
  it('L 24,000: tarifa L 100; 10 h al 25% = L 1,250', () => {
    const r = calculateHorasExtraHn({ salarioMensual: 24000, horas: { pct_25: 10 } })
    assert.equal(r.tarifaHora, 100)
    assert.equal(r.total, 1250)
  })

  it('todas las franjas: 10h×125 + 4h×150 + 2h×175 + 8h×200 = L 3,800', () => {
    const r = calculateHorasExtraHn({
      salarioMensual: 24000,
      horas: { pct_25: 10, night_50: 4, late_75: 2, holiday_100: 8 },
    })
    assert.deepEqual(
      r.lineas.map((l) => l.monto),
      [1250, 600, 350, 1600]
    )
    assert.equal(r.totalHoras, 24)
    assert.equal(r.total, 3800)
  })

  it('redondea a centavos: L 15,000 → L 62.50/h; 3 h al 25% = L 234.38', () => {
    const r = calculateHorasExtraHn({ salarioMensual: 15000, horas: { pct_25: 3 } })
    assert.equal(r.tarifaHora, 62.5)
    assert.equal(r.total, 234.38)
  })

  it('ignora horas negativas o vacías', () => {
    const r = calculateHorasExtraHn({ salarioMensual: 24000, horas: { pct_25: -5 } })
    assert.equal(r.total, 0)
  })
})
