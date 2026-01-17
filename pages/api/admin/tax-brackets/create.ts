import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

interface TaxBracketInput {
  year: number
  country_code?: string
  is_active?: boolean
  minimum_wage: number
  ihss_ceiling: number
  ihss_employee_rate: number
  rap_rate: number
  isr_brackets: Array<{
    limit: number
    rate: number
    base: number
    lower: number
  }>
  source?: string
  notes?: string
}

function validateTaxBracket(data: TaxBracketInput): { valid: boolean; error?: string } {
  // Validate year
  if (!data.year || data.year < 2000 || data.year > 2100) {
    return { valid: false, error: 'Year must be between 2000 and 2100' }
  }
  
  // Validate rates
  if (data.ihss_employee_rate < 0 || data.ihss_employee_rate > 1) {
    return { valid: false, error: 'IHSS rate must be between 0 and 1' }
  }
  
  if (data.rap_rate < 0 || data.rap_rate > 1) {
    return { valid: false, error: 'RAP rate must be between 0 and 1' }
  }
  
  // Validate brackets
  if (!Array.isArray(data.isr_brackets) || data.isr_brackets.length === 0) {
    return { valid: false, error: 'ISR brackets must be a non-empty array' }
  }
  
  // Validate bracket structure and ordering
  let prevLimit = 0
  for (let i = 0; i < data.isr_brackets.length; i++) {
    const bracket = data.isr_brackets[i]
    
    if (typeof bracket.limit !== 'number' || bracket.limit <= prevLimit) {
      return { valid: false, error: `Bracket ${i + 1}: limit must be greater than previous limit` }
    }
    
    if (typeof bracket.rate !== 'number' || bracket.rate < 0 || bracket.rate > 1) {
      return { valid: false, error: `Bracket ${i + 1}: rate must be between 0 and 1` }
    }
    
    if (typeof bracket.base !== 'number' || bracket.base < 0) {
      return { valid: false, error: `Bracket ${i + 1}: base must be a non-negative number` }
    }
    
    if (typeof bracket.lower !== 'number' || bracket.lower < 0) {
      return { valid: false, error: `Bracket ${i + 1}: lower must be a non-negative number` }
    }
    
    prevLimit = bracket.limit === Infinity ? 999999999 : bracket.limit
  }
  
  return { valid: true }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify super admin
    const { user } = await requireSuperAdmin(req, res)
    
    const supabase = createAdminClient()
    
    const bracketData: TaxBracketInput = req.body
    
    // Validate input
    const validation = validateTaxBracket(bracketData)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }
    
    // Check if year already exists
    const { data: existing } = await supabase
      .from('tax_brackets')
      .select('id')
      .eq('year', bracketData.year)
      .single()
    
    if (existing) {
      return res.status(409).json({ error: `Tax bracket for year ${bracketData.year} already exists` })
    }
    
    // Prepare data for insertion
    const insertData = {
      year: bracketData.year,
      country_code: bracketData.country_code || 'HND',
      is_active: bracketData.is_active !== undefined ? bracketData.is_active : true,
      minimum_wage: bracketData.minimum_wage,
      ihss_ceiling: bracketData.ihss_ceiling,
      ihss_employee_rate: bracketData.ihss_employee_rate,
      rap_rate: bracketData.rap_rate,
      isr_brackets: bracketData.isr_brackets.map(b => ({
        ...b,
        limit: b.limit === Infinity ? 999999999 : b.limit
      })),
      source: bracketData.source || 'manual',
      notes: bracketData.notes || null,
      created_by: user.id
    }
    
    // Insert new tax bracket
    const { data, error } = await supabase
      .from('tax_brackets')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating tax bracket:', error)
      return res.status(500).json({ error: 'Error creating tax bracket' })
    }
    
    return res.status(201).json({ 
      success: true,
      bracket: data
    })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }
    console.error('Error in tax-brackets create:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

