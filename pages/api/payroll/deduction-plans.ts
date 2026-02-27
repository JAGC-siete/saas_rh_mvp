import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'

/**
 * API: CRUD for employee_deduction_plans
 * POST: Create plan
 * GET: List active plans for employee
 * PATCH: Cancel plan (activo = false)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId: authCompanyId, role } = await requireCompanyAccess(req, res)

    // Para super_admin sin company_id, usar company_id del body/query
    const companyId = authCompanyId ?? req.body?.company_id ?? req.query?.company_id
    if (!companyId) {
      return res.status(400).json({ error: 'company_id es requerido (o en body/query para super_admin)' })
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para gestionar planes de deducción'
      })
    }

    switch (req.method) {
      case 'POST':
        return handlePost(req, res, supabase, companyId)
      case 'GET':
        return handleGet(req, res, supabase, companyId)
      case 'PATCH':
        return handlePatch(req, res, supabase, companyId)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Error en deduction-plans:', error)
    return res.status(500).json({
      error: error?.message || 'Error interno del servidor'
    })
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  companyId: string
) {
  const { employee_id, field_key, monto_total, plazos_totales, fecha_inicio, fecha_fin } = req.body || {}

  if (!employee_id || !field_key || monto_total == null || !plazos_totales) {
    return res.status(400).json({
      error: 'Datos incompletos',
      message: 'employee_id, field_key, monto_total y plazos_totales son requeridos'
    })
  }

  const monto = Number(monto_total)
  const plazos = parseInt(String(plazos_totales), 10)
  if (isNaN(monto) || monto <= 0 || isNaN(plazos) || plazos <= 0) {
    return res.status(400).json({
      error: 'Valores inválidos',
      message: 'monto_total y plazos_totales deben ser números positivos'
    })
  }

  const startDate = fecha_inicio ? new Date(fecha_inicio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  const endDate = fecha_fin ? new Date(fecha_fin).toISOString().split('T')[0] : null

  // Validar que el empleado pertenece a la empresa
  const { data: emp, error: empError } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', employee_id)
    .single()

  if (empError || !emp) {
    return res.status(404).json({ error: 'Empleado no encontrado' })
  }
  if (emp.company_id !== companyId) {
    return res.status(403).json({
      error: 'Empleado no pertenece a su empresa'
    })
  }

  // Validar que field_key existe en config y tiene track_plazos
  const { data: config, error: configError } = await supabase
    .from('company_payroll_configs')
    .select('custom_fields')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (configError || !config?.custom_fields) {
    return res.status(400).json({
      error: 'Configuración no encontrada',
      message: 'No hay configuración de payroll para esta empresa'
    })
  }

  const fieldDef = (config.custom_fields as Record<string, any>)[field_key]
  if (!fieldDef) {
    return res.status(400).json({
      error: 'Campo no configurado',
      message: `El campo "${field_key}" no existe en la configuración`
    })
  }
  if (!fieldDef.track_plazos) {
    return res.status(400).json({
      error: 'Campo sin seguimiento de plazos',
      message: `El campo "${field_key}" no tiene track_plazos habilitado`
    })
  }

  // Validar que no exista plan activo para ese empleado+campo
  const { data: existing } = await supabase
    .from('employee_deduction_plans')
    .select('id')
    .eq('employee_id', employee_id)
    .eq('company_id', companyId)
    .eq('field_key', field_key)
    .eq('activo', true)
    .maybeSingle()

  if (existing) {
    return res.status(400).json({
      error: 'Plan activo existente',
      message: 'Ya existe un plan activo para este empleado y campo'
    })
  }

  const insertPayload: Record<string, unknown> = {
    employee_id,
    company_id: companyId,
    field_key,
    monto_total: monto,
    plazos_totales: plazos,
    fecha_inicio: startDate,
    activo: true
  }
  if (endDate) insertPayload.fecha_fin = endDate

  const { data: plan, error } = await supabase
    .from('employee_deduction_plans')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    console.error('Error creando plan:', error)
    return res.status(500).json({ error: 'Error creando plan de deducción' })
  }

  return res.status(201).json(plan)
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  companyId: string
) {
  const { employee_id } = req.query

  if (employee_id && typeof employee_id === 'string') {
    return handleGetByEmployee(req, res, supabase, companyId, employee_id)
  }

  return handleGetByCompany(req, res, supabase, companyId)
}

async function handleGetByEmployee(
  _req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  companyId: string,
  employeeId: string
) {
  const { data: emp } = await supabase
    .from('employees')
    .select('id, company_id')
    .eq('id', employeeId)
    .single()

  if (!emp || emp.company_id !== companyId) {
    return res.status(404).json({ error: 'Empleado no encontrado' })
  }

  const { data: plans, error } = await supabase
    .from('employee_deduction_plans')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: 'Error obteniendo planes' })
  }

  return res.status(200).json({ plans: plans || [] })
}

async function handleGetByCompany(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  companyId: string
) {
  const includeInactive = req.query.include_inactive === 'true'
  let query = supabase
    .from('employee_deduction_plans')
    .select(`
      *,
      employees!employee_deduction_plans_employee_id_fkey(name, dni, employee_code)
    `)
    .eq('company_id', companyId)
  if (!includeInactive) query = query.eq('activo', true)
  const { data: plans, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: 'Error obteniendo planes' })
  }

  const enriched = (plans || []).map((p: any) => {
    const { employees, ...rest } = p
    return {
      ...rest,
      plazos_restantes: (p.plazos_totales || 0) - (p.plazos_aplicados || 0),
      monto_pendiente: Math.round(((p.plazos_totales || 0) - (p.plazos_aplicados || 0)) * Number(p.monto_por_plazo || 0) * 100) / 100,
      employee_name: employees?.name,
      employee_dni: employees?.dni,
      employee_code: employees?.employee_code
    }
  })

  return res.status(200).json({ plans: enriched })
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  supabase: any,
  companyId: string
) {
  const { plan_id } = req.body || {}
  if (!plan_id) {
    return res.status(400).json({ error: 'plan_id es requerido' })
  }

  const { data: plan, error: fetchError } = await supabase
    .from('employee_deduction_plans')
    .select('id, company_id, activo')
    .eq('id', plan_id)
    .single()

  if (fetchError || !plan) {
    return res.status(404).json({ error: 'Plan no encontrado' })
  }
  if (plan.company_id !== companyId) {
    return res.status(403).json({ error: 'Plan no pertenece a su empresa' })
  }

  const { error: updateError } = await supabase
    .from('employee_deduction_plans')
    .update({
      activo: false,
      fecha_fin: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', plan_id)
    .eq('company_id', companyId)

  if (updateError) {
    return res.status(500).json({ error: 'Error cancelando plan' })
  }

  return res.status(200).json({ success: true, message: 'Plan cancelado' })
}
