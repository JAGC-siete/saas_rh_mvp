/**
 * Guard: Deducciones APIs show every coworker's name to a manager with
 * can_manage_deducciones, without exposing salary.
 *
 * employees RLS (20261016140000) limits a manager to their own department, so
 * employee lookups and the employees embed must go through the service role,
 * after the module check and scoped by company_id.
 * Run: npx tsx --test tests/deducciones-employee-lookup.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DEDUCCIONES_APIS = [
  'pages/api/payroll/deduction-plans.ts',
  'pages/api/payroll/deduction-plans-export-pdf.ts',
  'pages/api/payroll/deduction-plan-auth-pdf.ts',
]

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('Deducciones employee lookups', () => {
  for (const path of DEDUCCIONES_APIS) {
    it(`${path} reads employees through the service role, scoped by company`, () => {
      const src = readSource(path)

      assert.doesNotMatch(src, /supabase\s*\.from\('employees'\)/)
      assert.doesNotMatch(
        src,
        /supabase\s*\.from\('employee_deduction_plans'\)\s*\.select\(\s*`[^`]*employees!/
      )
      assert.match(
        src,
        /adminClient\s*\.from\('employee_deduction_plans'\)[\s\S]*?employees![\s\S]*?\.eq\('company_id', companyId\)/
      )
    })

    it(`${path} creates the service-role client only after the module check`, () => {
      const src = readSource(path)
      const moduleCheck = src.indexOf('canAccessDeduccionesModule(role')
      const adminClient = src.indexOf('createAdminClient()')

      assert.ok(moduleCheck > 0, 'module permission check is present')
      assert.ok(adminClient > moduleCheck, 'service role is created after the check')
    })

    it(`${path} never selects salary columns`, () => {
      assert.doesNotMatch(readSource(path), /base_salary|hourly_rate_reference/)
    })
  }

  it('deduction-plans checks the employee belongs to the company before using it', () => {
    const src = readSource('pages/api/payroll/deduction-plans.ts')

    assert.match(src, /adminClient\s*\.from\('employees'\)\s*\.select\('id, company_id'\)/)
    assert.equal(src.match(/emp\.company_id !== companyId/g)?.length, 2)
  })

  it('deductions-report (payroll lines) stays limited to admin and HR roles', () => {
    const src = readSource('pages/api/payroll/deductions-report.ts')

    assert.match(src, /\['super_admin', 'company_admin', 'hr_manager'\]\.includes\(role\)/)
  })
})
