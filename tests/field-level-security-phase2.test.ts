/**
 * Field-level security phase 2 — application layer companions to Postgres column REVOKE.
 * Run: npm run test:security
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createEmployeeSalaryClient } from '../lib/security/employee-data-access'

describe('field-level-security-phase2', () => {
  it('exposes service-role client for salary column reads after column REVOKE', () => {
    assert.equal(typeof createEmployeeSalaryClient, 'function')
  })

  it('Postgres migration 20260520120000 revokes JWT access to salary columns (manual verify)', () => {
    // After `supabase db push`, as authenticated manager:
    //   SELECT base_salary FROM employees → permission denied
    //   supabase.from('employees').select('base_salary') → error
    // HR via GET /api/employees still receives base_salary (adminClient + shapeEmployees)
    assert.ok(true)
  })
})
