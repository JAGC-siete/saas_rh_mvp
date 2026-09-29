/**
 * Run: npx tsx --test tests/payroll-calculation-engine.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { calculatePayrollFromConfig } from '../lib/payroll-calculation-engine'

function mockSupabase(customFields: Record<string, unknown> | null) {
  return {
    from(table: string) {
      if (table === 'company_payroll_configs') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: customFields ? { custom_fields: customFields } : null,
                  error: customFields ? null : { message: 'missing' },
                }),
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }
    },
  }
}

const EXTRA_CUSTOM_FIELDS = {
  incapacidad: {
    label: 'Pago por incapacidad',
    type: 'number',
    category: 'earnings',
    required: false,
    default: 0,
  },
  prestamo_banrural: {
    label: 'Préstamo BANRURAL',
    type: 'number',
    category: 'deductions',
    required: false,
    default: 0,
  },
  prestamo_celular: {
    label: 'Préstamo celular',
    type: 'number',
    category: 'deductions',
    required: false,
    default: 0,
  },
  anticipo_prestamo: {
    label: 'Anticipo/Préstamo',
    type: 'number',
    category: 'deductions',
    required: false,
    default: 0,
  },
  impuesto_vecinal: {
    label: 'Impuesto vecinal',
    type: 'number',
    category: 'deductions',
    required: false,
    default: 0,
  },
  dias_faltados: {
    label: 'Días faltados',
    type: 'number',
    category: 'calculation_helper',
    required: false,
    default: 0,
  },
}

describe('calculatePayrollFromConfig', () => {
  it('real Extra draft line (empty metadata) yields 0 custom extras', async () => {
    const result = await calculatePayrollFromConfig(
      'company-extra',
      8000,
      {},
      mockSupabase(EXTRA_CUSTOM_FIELDS)
    )
    assert.equal(result.totalIngresosAdicionales, 0)
    assert.equal(result.totalDeduccionesAdicionales, 0)
  })

  it('sums Extra-style custom fields once (no formula_based double count)', async () => {
    const result = await calculatePayrollFromConfig(
      'company-extra',
      8000,
      {
        incapacidad: 500,
        prestamo_banrural: 200,
        prestamo_celular: 50,
        anticipo_prestamo: 100,
        impuesto_vecinal: 25,
        dias_faltados: 2,
      },
      mockSupabase(EXTRA_CUSTOM_FIELDS)
    )
    assert.equal(result.totalIngresosAdicionales, 500)
    assert.equal(result.totalDeduccionesAdicionales, 375)
    assert.equal(result.calculatedFields.dias_faltados, undefined)
  })

  it('evaluates fieldDef.formula via formula-evaluator', async () => {
    const result = await calculatePayrollFromConfig(
      'company-formula',
      10000,
      { monto_factura: 1000, plazos: 4 },
      mockSupabase({
        cuota: {
          label: 'Cuota',
          type: 'number',
          category: 'deductions',
          required: false,
          default: 0,
          formula: 'monto_factura / plazos',
        },
      })
    )
    assert.equal(result.totalDeduccionesAdicionales, 250)
    assert.equal(result.calculatedFields.cuota, 250)
  })

  it('skips custom horas_extras when overtime_pay is already in metadata', async () => {
    const result = await calculatePayrollFromConfig(
      'company-ot',
      10000,
      { horas_extras: 8, overtime_pay: 450, bono: 100 },
      mockSupabase({
        horas_extras: {
          label: 'Horas extras',
          type: 'number',
          category: 'earnings',
          required: false,
          default: 0,
        },
        bono: {
          label: 'Bono',
          type: 'number',
          category: 'earnings',
          required: false,
          default: 0,
        },
      })
    )
    assert.equal(result.totalIngresosAdicionales, 100)
    assert.equal(result.calculatedFields.horas_extras, undefined)
  })

  it('engine source has no Function() or eval()', () => {
    const src = readFileSync(join(process.cwd(), 'lib/payroll-calculation-engine.ts'), 'utf8')
    assert.equal(src.includes('Function('), false)
    assert.equal(src.includes('eval('), false)
    assert.equal(src.includes('executeCalculationScript'), false)
    assert.equal(src.includes('formula_based'), false)
  })
})
