import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { generateDeductionPlanAuthPDF } from '../../../lib/payroll/deduction-plan-auth-pdf'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId: authCompanyId, role } = await requireCompanyAccess(req, res)
    const companyId = authCompanyId ?? (req.query.company_id as string)
    const planId = typeof req.query.plan_id === 'string' ? req.query.plan_id : ''

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID es requerido',
        message: 'company_id en query para super_admin',
      })
    }

    if (!planId) {
      return res.status(400).json({
        error: 'plan_id es requerido',
        message: 'Indique el plan de deducción a exportar',
      })
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar el PDF de autorización',
      })
    }

    const { data: plan, error } = await supabase
      .from('employee_deduction_plans')
      .select(
        `
        id,
        field_key,
        monto_total,
        plazos_totales,
        plazos_aplicados,
        monto_por_plazo,
        fecha_inicio,
        fecha_fin,
        activo,
        company_id,
        employees!employee_deduction_plans_employee_id_fkey(
          name,
          dni,
          employee_code,
          department,
          role
        )
      `
      )
      .eq('id', planId)
      .eq('company_id', companyId)
      .maybeSingle()

    if (error) {
      console.error('Error obteniendo plan para auth PDF:', error)
      return res.status(500).json({ error: 'Error obteniendo el plan de deducción' })
    }

    if (!plan) {
      return res.status(404).json({ error: 'Plan de deducción no encontrado' })
    }

    let fieldLabel = plan.field_key
    const { data: config } = await supabase
      .from('company_payroll_configs')
      .select('custom_fields')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    if (config?.custom_fields) {
      const cf = config.custom_fields as Record<string, { label?: string }>
      const def = cf[plan.field_key]
      if (def?.label) {
        fieldLabel = def.label
      } else {
        fieldLabel = plan.field_key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
      }
    } else {
      fieldLabel = plan.field_key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase())
    }

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    const emp = plan.employees as
      | {
          name?: string | null
          dni?: string | null
          employee_code?: string | null
          department?: string | null
          role?: string | null
        }
      | null
      | undefined

    const montoTotal = Number(plan.monto_total) || 0
    const plazosTotales = Number(plan.plazos_totales) || 0
    const montoPorPlazo =
      plan.monto_por_plazo != null
        ? Number(plan.monto_por_plazo)
        : plazosTotales > 0
          ? montoTotal / plazosTotales
          : 0

    const pdf = await generateDeductionPlanAuthPDF({
      company_name: company?.name || 'Empresa',
      employee_name: emp?.name || '',
      employee_code: emp?.employee_code,
      employee_dni: emp?.dni,
      department: emp?.department,
      position: emp?.role,
      field_key: plan.field_key,
      field_label: fieldLabel,
      monto_total: montoTotal,
      monto_por_plazo: montoPorPlazo,
      plazos_totales: plazosTotales,
      plazos_aplicados: Number(plan.plazos_aplicados) || 0,
      fecha_inicio: plan.fecha_inicio || '',
      fecha_fin: plan.fecha_fin || null,
      activo: !!plan.activo,
    })

    const safeConcept = fieldLabel
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 40)
    const filename = `autorizacion_deduccion_${safeConcept || 'plan'}_${planId.slice(0, 8)}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
    return res.send(pdf)
  } catch (error: unknown) {
    console.error('Error en deduction-plan-auth-pdf:', error)
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}

export default withExportRateLimit()(handler)
