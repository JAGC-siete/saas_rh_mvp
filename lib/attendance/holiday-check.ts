/**
 * Holiday check - uses company_metadata.custom_holidays first, then labor_laws
 */

import { createAdminClient } from '../supabase/server'

/**
 * Obtiene el conjunto de fechas festivas en un rango (para Capa 3 nómina).
 * Eficiente: una sola consulta en lugar de N llamadas a is_holiday_date.
 */
export async function getHolidayDatesInRange(
  startDate: string,
  endDate: string,
  companyId: string,
  supabase?: any
): Promise<Set<string>> {
  const client = supabase ?? createAdminClient()
  const result = new Set<string>()

  const { data: custom } = await client
    .from('company_metadata')
    .select('custom_holidays')
    .eq('company_id', companyId)
    .maybeSingle()

  const customHolidays = (custom?.custom_holidays as Array<{ date?: string }>) || []
  for (const h of customHolidays) {
    if (h?.date && h.date >= startDate && h.date <= endDate) result.add(h.date)
  }

  const year = parseInt(startDate.slice(0, 4), 10)
  const { data: law } = await client
    .from('labor_laws')
    .select('holidays')
    .eq('country_code', 'HND')
    .eq('year', year)
    .eq('is_active', true)
    .maybeSingle()

  const lawHolidays = (law?.holidays as Array<{ date?: string }>) || []
  for (const h of lawHolidays) {
    if (h?.date && h.date >= startDate && h.date <= endDate) result.add(h.date)
  }

  return result
}

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
