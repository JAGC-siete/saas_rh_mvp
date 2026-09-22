import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Helper to get company-scoped data with automatic filtering
 * @param supabase - Supabase client instance
 * @param tableName - Table to query
 * @param companyId - Company ID to filter by
 * @param select - Fields to select (default: '*')
 * @param additionalFilters - Additional filters to apply
 * @returns Query builder with company filtering applied
 */
export function getCompanyData(
  supabase: SupabaseClient,
  tableName: string,
  companyId: string,
  select: string = '*',
  additionalFilters: Record<string, any> = {}
) {
  let query = supabase
    .from(tableName)
    .select(select)
    .eq('company_id', companyId)
  
  // Apply additional filters
  Object.entries(additionalFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        query = query.in(key, value)
      } else if (typeof value === 'object' && value.gte !== undefined) {
        // Handle range filters like { gte: '2024-01-01', lte: '2024-01-31' }
        if (value.gte) query = query.gte(key, value.gte)
        if (value.lte) query = query.lte(key, value.lte)
      } else {
        query = query.eq(key, value)
      }
    }
  })
  
  return query
}

/**
 * Helper to create company-scoped insert data
 * Automatically adds company_id to insert data
 * @param data - Data to insert
 * @param companyId - Company ID to add
 * @returns Data with company_id added
 */
export function addCompanyToInsertData(data: any, companyId: string) {
  if (Array.isArray(data)) {
    return data.map(item => ({ ...item, company_id: companyId }))
  }
  
  return { ...data, company_id: companyId }
}
