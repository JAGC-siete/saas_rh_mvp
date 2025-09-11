import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Company filtering helper for automatic data scoping
 * Ensures all queries are automatically filtered by the user's company
 */

export interface CompanyFilterOptions {
  companyId: string
  tableName: string
  additionalFilters?: Record<string, any>
}

/**
 * Creates a company-filtered query builder
 * @param supabase - Supabase client instance
 * @param options - Filtering options
 * @returns Filtered query builder
 */
export function createCompanyFilteredQuery(
  supabase: SupabaseClient,
  options: CompanyFilterOptions
) {
  const { companyId, tableName, additionalFilters = {} } = options
  
  let query = supabase.from(tableName).select('*')
  
  // Always filter by company_id
  query = query.eq('company_id', companyId)
  
  // Apply additional filters if provided
  Object.entries(additionalFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        query = query.in(key, value)
      } else {
        query = query.eq(key, value)
      }
    }
  })
  
  return query
}

/**
 * Helper to add company filtering to any existing query
 * @param query - Existing Supabase query
 * @param companyId - Company ID to filter by
 * @returns Query with company filtering applied
 */
export function addCompanyFilter(query: any, companyId: string) {
  return query.eq('company_id', companyId)
}

/**
 * Helper to validate that a resource belongs to the user's company
 * @param supabase - Supabase client instance
 * @param tableName - Table to check
 * @param resourceId - ID of the resource to validate
 * @param companyId - Company ID to validate against
 * @returns Promise<boolean> - Whether the resource belongs to the company
 */
export async function validateCompanyResource(
  supabase: SupabaseClient,
  tableName: string,
  resourceId: string,
  companyId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('company_id')
      .eq('id', resourceId)
      .eq('company_id', companyId)
      .single()
    
    return !error && !!data
  } catch {
    return false
  }
}

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

/**
 * Helper to create company-scoped update data
 * Ensures company_id cannot be changed in updates
 * @param data - Data to update
 * @param companyId - Company ID to validate against
 * @returns Data with company_id removed (to prevent changes)
 */
export function prepareCompanyUpdateData(data: any, companyId: string) {
  const { company_id, ...updateData } = data
  
  // Log warning if someone tries to change company_id
  if (company_id && company_id !== companyId) {
    console.warn('Attempted to change company_id in update, ignoring:', {
      original: companyId,
      attempted: company_id
    })
  }
  
  return updateData
}

/**
 * RLS (Row Level Security) helper for database functions
 * Ensures all RPC calls include company filtering
 * @param supabase - Supabase client instance
 * @param functionName - RPC function name
 * @param params - Function parameters
 * @param companyId - Company ID to filter by
 * @returns RPC call with company filtering
 */
export function createCompanyFilteredRPC(
  supabase: SupabaseClient,
  functionName: string,
  params: Record<string, any>,
  companyId: string
) {
  // Add company_id to parameters if not already present
  const filteredParams = {
    ...params,
    p_company_id: companyId
  }
  
  return supabase.rpc(functionName, filteredParams)
}

/**
 * Batch company validation for multiple resources
 * @param supabase - Supabase client instance
 * @param tableName - Table to check
 * @param resourceIds - Array of resource IDs to validate
 * @param companyId - Company ID to validate against
 * @returns Promise<{valid: string[], invalid: string[]}>
 */
export async function validateCompanyResources(
  supabase: SupabaseClient,
  tableName: string,
  resourceIds: string[],
  companyId: string
): Promise<{valid: string[], invalid: string[]}> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .in('id', resourceIds)
      .eq('company_id', companyId)
    
    if (error) {
      return { valid: [], invalid: resourceIds }
    }
    
    const validIds = data?.map(item => item.id) || []
    const invalidIds = resourceIds.filter(id => !validIds.includes(id))
    
    return { valid: validIds, invalid: invalidIds }
  } catch {
    return { valid: [], invalid: resourceIds }
  }
}
