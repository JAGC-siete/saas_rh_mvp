import { describe, expect, it } from 'vitest'
import { resolveCanonicalVoucherRunLineId } from '../lib/payroll/resolve-voucher-run-line'

describe('resolveCanonicalVoucherRunLineId', () => {
  it('keeps line when run tipo matches company mode', async () => {
    const supabase = {
      from: (table: string) => {
        const chain: Record<string, unknown> = {}
        const self = () => chain
        chain.select = () => self()
        chain.eq = () => self()
        chain.maybeSingle = async () => {
          if (table === 'payroll_run_lines') {
            return {
              data: {
                id: 'line-2p',
                employee_id: 'emp-1',
                payroll_runs: {
                  year: 2026,
                  month: 6,
                  quincena: 2,
                  tipo: '2PAGOS',
                  status: 'authorized',
                },
              },
              error: null,
            }
          }
          if (table === 'company_payroll_configs') {
            return {
              data: {
                metadata: { payroll_deduction_mode: '2PAGOS' },
                payment_frequency: 'quincenal',
              },
              error: null,
            }
          }
          return { data: null, error: null }
        }
        return chain
      },
    }

    const result = await resolveCanonicalVoucherRunLineId(
      supabase as any,
      'company-1',
      'line-2p'
    )
    expect(result).toBe('line-2p')
  })

  it('returns requested id when line is missing', async () => {
    const supabase = {
      from: () => {
        const chain: Record<string, unknown> = {}
        const self = () => chain
        chain.select = () => self()
        chain.eq = () => self()
        chain.maybeSingle = async () => ({ data: null, error: null })
        return chain
      },
    }

    const result = await resolveCanonicalVoucherRunLineId(
      supabase as any,
      'company-1',
      'missing-line'
    )
    expect(result).toBe('missing-line')
  })
})
