/**
 * Holiday check - uses company_metadata.custom_holidays first, then labor_laws
 */

import { createAdminClient } from '../supabase/server'

/**
 * Check if a date is a holiday for a company
 * Uses is_holiday_date SQL function
 */
export async function isHolidayDate(
  date: string,
  companyId: string,
  supabase?: any
): Promise<boolean> {
  const client = supabase ?? createAdminClient()

  const { data, error } = await client.rpc('is_holiday_date', {
    p_date: date,
    p_company_id: companyId,
  })

  if (error) {
    return false
  }

  return Boolean(data)
}
