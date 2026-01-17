import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

interface TaxBracketUpdate {
  country_code?: string
  is_active?: boolean
  minimum_wage?: number
  ihss_ceiling?: number
  ihss_employee_rate?: number
  rap_rate?: number
  isr_brackets?: Array<{
    limit: number
    rate: number
    base: number
    lower: number
  }>
  source?: string
  notes?: string
}

function validateTaxBracketUpdate(data: TaxBracketUpdate): { valid: boolean; error?: string } {
  // Validate rates if provided
  if (data.ihss_employee_rate !== undefined) {
    if (data.ihss_employee_rate < 0 || data.ihss_employee_rate > 1) {
      return { valid: false, error: 'IHSS rate must be between 0 and 1' }
    }
  }
  
  if (data.rap_rate !== undefined) {
    if (data.rap_rate < 0 || data.rap_rate > 1) {
      return { valid: false, error: 'RAP rate must be between 0 and 1' }
    }
  }
  
  // Validate brackets if provided
  if (data.isr_brackets !== undefined) {
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
  }
  
  return { valid: true }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify super admin
    await requireSuperAdmin(req, res)
    
    const { year } = req.query
    
    if (!year || isNaN(Number(year))) {
      return res.status(400).json({ error: 'Year parameter is required and must be a number' })
    }
    
    const supabase = createAdminClient()
    
    // Check if bracket exists
    const { data: existing, error: fetchError } = await supabase
      .from('tax_brackets')
      .select('id')
      .eq('year', Number(year))
      .single()
    
    if (fetchError || !existing) {
      return res.status(404).json({ error: `Tax bracket for year ${year} not found` })
    }
    
    const updateData: TaxBracketUpdate = req.body
    
    // Validate input
    const validation = validateTaxBracketUpdate(updateData)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }
    
    // Prepare update data
    const updatePayload: any = {}
    
    if (updateData.country_code !== undefined) updatePayload.country_code = updateData.country_code
    if (updateData.is_active !== undefined) updatePayload.is_active = updateData.is_active
    if (updateData.minimum_wage !== undefined) updatePayload.minimum_wage = updateData.minimum_wage
    if (updateData.ihss_ceiling !== undefined) updatePayload.ihss_ceiling = updateData.ihss_ceiling
    if (updateData.ihss_employee_rate !== undefined) updatePayload.ihss_employee_rate = updateData.ihss_employee_rate
    if (updateData.rap_rate !== undefined) updatePayload.rap_rate = updateData.rap_rate
    if (updateData.isr_brackets !== undefined) {
      updatePayload.isr_brackets = updateData.isr_brackets.map(b => ({
        ...b,
        limit: b.limit === Infinity ? 999999999 : b.limit
      }))
    }
    if (updateData.source !== undefined) updatePayload.source = updateData.source
    if (updateData.notes !== undefined) updatePayload.notes = updateData.notes
    
    // Update tax bracket
    const { data, error } = await supabase
      .from('tax_brackets')
      .update(updatePayload)
      .eq('year', Number(year))
      .select()
      .single()
    
    if (error) {
      console.error('Error updating tax bracket:', error)
      return res.status(500).json({ error: 'Error updating tax bracket' })
    }
    
    return res.status(200).json({ 
      success: true,
      bracket: data
    })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }
    console.error('Error in tax-brackets update:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

