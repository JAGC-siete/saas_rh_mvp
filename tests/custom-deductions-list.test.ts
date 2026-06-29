import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { buildCustomDeductionsList } from '../lib/payroll/custom-deductions-list'

function mockSupabase(customFields: Record<string, unknown> | null) {
  return {
    from(table: string) {
      if (table === 'company_payroll_configs') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: customFields
                    ? {
                        calculation_type: 'standard',
                        custom_fields: customFields,
                        calculation_config: {},
                      }
                    : null,
                  error: customFields ? null : { message: 'missing' },
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'employee_deduction_plans') {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({ data: [], error: null }),
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

describe('buildCustomDeductionsList', () => {
  it('ignores earnings and system keys from legacy metadata', async () => {
    const supabase = mockSupabase(null)
    const list = await buildCustomDeductionsList(
      'company-test',
      {
        edited: true,
        horas_extras: 450,
        feriado_trabajado: 200,
        comedor: 75,
        deduccion_especial: 105,
        tax_year: 2026,
      },
      7500,
      supabase
    )

    const names = list.map((item) => item.name.toLowerCase())
    assert.ok(names.includes('comedor'))
    assert.ok(names.some((n) => n.includes('deduccion especial')))
    assert.equal(names.some((n) => n.includes('horas')), false)
    assert.equal(names.some((n) => n.includes('edited')), false)
  })

  it('reads deduction amount from metadata when formula calc is zero', async () => {
    const supabase = mockSupabase({
      deduccion_especial: {
        label: 'Deducción especial',
        type: 'number',
        category: 'deductions',
        required: false,
        default: 0,
        formula: '0',
      },
    })

    const list = await buildCustomDeductionsList(
      'company-test',
      { deduccion_especial: 105 },
      7500,
      supabase
    )

    assert.equal(list.length, 1)
    assert.equal(list[0].name, 'Deducción especial')
    assert.equal(list[0].amount, 105)
  })
})
