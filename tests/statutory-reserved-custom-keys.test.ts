/**
 * Run: npx tsx --test tests/statutory-reserved-custom-keys.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isStatutoryReservedCustomKey,
  resolveReservedCustomColumnAmount,
} from '../lib/payroll/statutory-reserved-custom-keys'
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

describe('isStatutoryReservedCustomKey', () => {
  it('reserves exact statutory keys case-insensitively', () => {
    assert.equal(isStatutoryReservedCustomKey('isr'), true)
    assert.equal(isStatutoryReservedCustomKey('IHSS'), true)
    assert.equal(isStatutoryReservedCustomKey('Rap'), true)
    assert.equal(isStatutoryReservedCustomKey('isr_manual'), false)
    assert.equal(isStatutoryReservedCustomKey('seguro_medico'), false)
  })
})

describe('resolveReservedCustomColumnAmount', () => {
  it('maps custom_isr / isr to row.ISR even when metadata would be 0', () => {
    assert.equal(resolveReservedCustomColumnAmount('isr', { ISR: 920.16 }), 920.16)
    assert.equal(resolveReservedCustomColumnAmount('ISR', { ISR: 507.97 }), 507.97)
    assert.equal(resolveReservedCustomColumnAmount('ihss', { IHSS: 297.58 }), 297.58)
    assert.equal(resolveReservedCustomColumnAmount('rap', { RAP: 60.73 }), 60.73)
  })

  it('returns null for non-reserved custom keys', () => {
    assert.equal(resolveReservedCustomColumnAmount('cooperativa', { ISR: 100 }), null)
    assert.equal(resolveReservedCustomColumnAmount('isr_manual', { ISR: 100 }), null)
  })
})

describe('buildCustomDeductionsList statutory mirrors', () => {
  it('omits mirrored isr but keeps real manuals', async () => {
    const supabase = mockSupabase({
      isr: {
        label: 'Impuestos',
        type: 'number',
        category: 'deductions',
        required: false,
        default: 0,
      },
      seguro_medico: {
        label: 'Seguro Médico y Hospitalario',
        type: 'number',
        category: 'deductions',
        required: false,
        default: 0,
      },
      cooperativa: {
        label: 'Cooperativa Elga',
        type: 'number',
        category: 'deductions',
        required: false,
        default: 0,
      },
    })

    const list = await buildCustomDeductionsList(
      'company-test',
      { isr: 507.97, seguro_medico: 633.7, cooperativa: 0 },
      15000,
      supabase
    )

    assert.equal(list.length, 1)
    assert.equal(list[0].name, 'Seguro Médico y Hospitalario')
    assert.equal(list[0].amount, 633.7)
  })

  it('still lists isr_manual as a real custom deduction', async () => {
    const supabase = mockSupabase({
      isr_manual: {
        label: 'ISR manual',
        type: 'number',
        category: 'deductions',
        required: false,
        default: 0,
      },
    })

    const list = await buildCustomDeductionsList(
      'company-test',
      { isr_manual: 200 },
      10000,
      supabase
    )

    assert.equal(list.length, 1)
    assert.equal(list[0].name, 'ISR manual')
    assert.equal(list[0].amount, 200)
  })
})
