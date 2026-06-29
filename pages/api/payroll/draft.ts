import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { withReportsRateLimit } from '../../../lib/security/rate-limiting'
import { resolvePayrollDeductionMode } from '../../../lib/payroll/deduction-mode'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN ESTANDARIZADA
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { year, month, quincena } = req.query
    
    // Validaciones
    if (!year || !month || !quincena) {
      return res.status(400).json({ error: 'year, month, y quincena son requeridos' })
    }
    
    const yearNum = parseInt(year as string)
    const monthNum = parseInt(month as string)
    const quincenaNum = parseInt(quincena as string)
    
    if (![1, 2].includes(quincenaNum)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('metadata, payment_frequency')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    const payrollMetadata = payrollConfig?.metadata || {}
    const paymentFrequency =
      payrollConfig?.payment_frequency || payrollMetadata.payment_frequency || 'quincenal'
    const tipoParam = resolvePayrollDeductionMode(payrollMetadata, paymentFrequency)

    // Buscar borrador existente para este período
    const { data: existingRun, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, status, created_at, updated_at, created_by')
      .eq('company_id', companyId)
      .eq('year', yearNum)
      .eq('month', monthNum)
      .eq('quincena', quincenaNum)
      .eq('tipo', tipoParam)
      .in('status', ['draft', 'edited'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (runError) {
      // Si no existe borrador, devolver null (no es un error)
      if (runError.code === 'PGRST116') {
        return res.status(200).json({ 
          exists: false,
          draft: null
        })
      }
      console.error('Error buscando borrador:', runError)
      return res.status(500).json({ error: 'Error buscando borrador' })
    }

    if (!existingRun) {
      return res.status(200).json({ 
        exists: false,
        draft: null
      })
    }

    // Obtener conteo de líneas editadas
    const { data: lines } = await supabase
      .from('payroll_run_lines')
      .select('id, edited')
      .eq('run_id', existingRun.id)
      .eq('company_id', companyId)

    const editedCount = lines?.filter((l: any) => l.edited).length || 0
    const totalLines = lines?.length || 0

    return res.status(200).json({
      exists: true,
      draft: {
        run_id: existingRun.id,
        status: existingRun.status,
        created_at: existingRun.created_at,
        updated_at: existingRun.updated_at,
        created_by: existingRun.created_by,
        edited_lines: editedCount,
        total_lines: totalLines
      }
    })

  } catch (error: any) {
    console.error('Payroll Draft API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error'
    })
  }
}

export default withReportsRateLimit(['GET'])(handler)

