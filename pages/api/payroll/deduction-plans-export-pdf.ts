import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { generateDeductionPlansReportPDF, type DeductionPlanPDFItem } from '../../../lib/payroll/deduction-plans-report'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId: authCompanyId, role, user } = await requireCompanyAccess(req, res)
    const companyId = authCompanyId ?? (req.query.company_id as string)

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID es requerido',
        message: 'company_id en query para super_admin'
      })
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para exportar el reporte de deducciones'
      })
    }

    const { data: plans, error } = await supabase
      .from('employee_deduction_plans')
      .select(`
        field_key,
        monto_total,
        plazos_totales,
        plazos_aplicados,
        fecha_inicio,
        fecha_fin,
        activo,
        employees!employee_deduction_plans_employee_id_fkey(name, employee_code)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: 'Error obteniendo planes' })
    }

    // Obtener labels de custom_fields
    let fieldLabels: Record<string, string> = {}
    const { data: config } = await supabase
      .from('company_payroll_configs')
      .select('custom_fields')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single()

    if (config?.custom_fields) {
      const cf = config.custom_fields as Record<string, { label?: string }>
      for (const [key, def] of Object.entries(cf)) {
        fieldLabels[key] = def?.label || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      }
    }

    const formatFieldKey = (key: string) =>
      fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    const pdfItems: DeductionPlanPDFItem[] = (plans || []).map((p: any) => {
      const plazosRestantes = (p.plazos_totales || 0) - (p.plazos_aplicados || 0)
      return {
        field_key: p.field_key,
        field_label: formatFieldKey(p.field_key),
        employee_name: p.employees?.name || '',
        employee_code: p.employees?.employee_code,
        activo: !!p.activo,
        monto_total: Number(p.monto_total) || 0,
        plazos_totales: p.plazos_totales || 0,
        plazos_aplicados: p.plazos_aplicados || 0,
        plazos_restantes: plazosRestantes,
        fecha_inicio: p.fecha_inicio || '',
        fecha_fin: p.fecha_fin || null
      }
    })

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    const pdf = await generateDeductionPlansReportPDF(
      pdfItems,
      company?.name,
      user?.email
    )

    const filename = `reporte_deducciones_${new Date().toISOString().split('T')[0]}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
    return res.send(pdf)
  } catch (error: unknown) {
    console.error('Error en deduction-plans-export-pdf:', error)
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default withExportRateLimit()(handler)
