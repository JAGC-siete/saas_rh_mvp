import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateEmployeeSeverance } from '../lib/payroll/severance-for-employee'

const employee = { hire_date: '2020-01-01', base_salary: 16000 }

describe('calculateEmployeeSeverance', () => {
  it('renuncia: sin cesantía ni preaviso; la reserva laboral la paga el RAP', () => {
    const calc = calculateEmployeeSeverance(employee, {
      fechaEgreso: '2026-10-09',
      motivoSalida: 'RENUNCIA',
    })
    assert.ok(calc.ok)
    const { rubros } = calc.result
    assert.equal(rubros.cesantiaBruta, 0)
    assert.equal(rubros.preaviso, 0)
    assert.ok(rubros.reservaLaboralEnTotal > 0)
    assert.equal(
      rubros.totalEmpresa,
      Number((rubros.vacaciones + rubros.aguinaldo + rubros.decimoCuarto).toFixed(2))
    )
    assert.equal(
      Number((rubros.totalPagar - rubros.reservaLaboralEnTotal).toFixed(2)),
      rubros.totalEmpresa
    )
  })

  it('despido injustificado: la empresa paga cesantía neta y preaviso', () => {
    const calc = calculateEmployeeSeverance(employee, {
      fechaEgreso: '2026-10-09',
      motivoSalida: 'DESPIDO_INJUSTIFICADO',
    })
    assert.ok(calc.ok)
    const { rubros } = calc.result
    assert.ok(rubros.cesantiaBruta > 0)
    assert.ok(rubros.preaviso > 0)
    const expected =
      rubros.preaviso + rubros.cesantiaNeta + rubros.vacaciones + rubros.aguinaldo + rubros.decimoCuarto
    assert.ok(Math.abs(rubros.totalEmpresa - expected) < 0.02)
  })

  it('usa el promedio base × 14/12, igual que la pantalla de cesantías sin 6 meses', () => {
    const calc = calculateEmployeeSeverance(employee, {
      fechaEgreso: '2026-10-09',
      motivoSalida: 'RENUNCIA',
    })
    assert.ok(calc.ok)
    assert.equal(calc.result.metadata.salaryAverageMode, 'proxy_14_12')
  })

  it('acepta hire_date con hora', () => {
    const calc = calculateEmployeeSeverance(
      { hire_date: '2020-01-01T00:00:00+00:00', base_salary: 16000 },
      { fechaEgreso: '2026-10-09', motivoSalida: 'RENUNCIA' }
    )
    assert.ok(calc.ok)
  })

  it('rechaza datos incompletos con un código claro', () => {
    const params = { fechaEgreso: '2026-10-09', motivoSalida: 'RENUNCIA' as const }
    assert.deepEqual(calculateEmployeeSeverance({ hire_date: null, base_salary: 16000 }, params), {
      ok: false,
      error: 'missing_hire_date',
    })
    assert.deepEqual(calculateEmployeeSeverance({ hire_date: '2020-01-01', base_salary: 0 }, params), {
      ok: false,
      error: 'missing_salary',
    })
    assert.deepEqual(
      calculateEmployeeSeverance({ hire_date: '2027-01-01', base_salary: 16000 }, params),
      { ok: false, error: 'termination_before_hire' }
    )
  })
})
