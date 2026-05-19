import { createAdminClient } from '../supabase/server'

/**
 * Service-role client for employee queries that include base_salary or hourly_rate_reference.
 * After column REVOKE (FLS phase 2), JWT clients cannot read/write those columns.
 * Always scope queries with company_id — this client bypasses RLS.
 */
export function createEmployeeSalaryClient() {
  return createAdminClient()
}
