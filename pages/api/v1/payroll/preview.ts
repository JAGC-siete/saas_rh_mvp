// Next.js Pages API Route: Preview Payroll (IDEMPOTENT)
// Genera preview de nómina - operación SAFE e IDEMPOTENTE

import { NextApiRequest, NextApiResponse } from 'next'
import { validateRequest, validateResponse, createProblemDetails, ERROR_TYPES } from '../../../../lib/validation/ajv-validator'
import { calculatePayroll } from '../../../../lib/payroll/engine'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth'
import { createHash } from 'crypto'

// Tipos del contrato OpenAPI
interface PreviewInput {
  period_start: string
  period_end: string
  company_id: string
  pay_cycle: 'quincena'
  calculation_type?: 'CON' | 'SIN'
}

interface PreviewOutput {
  run_id: string
  status: 'draft' | 'edited' | 'authorized' | 'distributed'
  resumen: {
    empleados: number
    total_bruto: number
    total_deducciones: {
      IHSS: number
      RAP: number
      ISR: number
      otros: number
    }
    total_neto: number
    total_dias_trabajados: number
    total_horas_extras: number
  }
  planilla: Array<{
    employee_id: string
    name: string
    base_salary: number
    total_earnings: number
    IHSS: number
    RAP: number
    ISR: number
    total_deducciones: number
    total: number
    days_worked: number
    days_absent: number
    late_days: number
    department?: string | null
    line_id?: string | null
  }>
  generated_at: string
  etag: string
}

// Función para generar ETag determinístico basado en input
function generateETag(input: PreviewInput, employeesHash: string): string {
  const content = JSON.stringify({
    period_start: input.period_start,
    period_end: input.period_end,
    company_id: input.company_id,
    calculation_type: input.calculation_type || 'CON',
    employees_hash: employeesHash
  })
  const hash = createHash('sha256').update(content).digest('hex')
  return `"${hash.substring(0, 16)}"`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validar autenticación y permisos
    const { supabase: client, companyId, role } = await requireCompanyAccess(req, res)
    
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json(
        createProblemDetails(
          ERROR_TYPES.FORBIDDEN,
          'Insufficient permissions',
          403,
          'Payroll preview requires hr_manager role or higher',
          req.url || '',
          'INSUFFICIENT_PERMISSIONS'
        )
      )
    }

    // Parsear y validar request body
    const validatedInput = validateRequest<PreviewInput>(req.body, 'previewInput')

    // Validar que el company_id coincide
    if (validatedInput.company_id !== companyId) {
      return res.status(403).json(
        createProblemDetails(
          ERROR_TYPES.FORBIDDEN,
          'Company mismatch',
          403,
          'Requested company does not match user company',
          req.url || '',
          'COMPANY_MISMATCH'
        )
      )
    }

    // Parsear fechas
    const periodStart = new Date(validatedInput.period_start)
    const periodEnd = new Date(validatedInput.period_end)
    const calculationType = validatedInput.calculation_type || 'CON'

    // Validar fechas
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return res.status(400).json(
        createProblemDetails(
          ERROR_TYPES.VALIDATION_FAILED,
          'Invalid date format',
          400,
          'period_start and period_end must be valid RFC 3339 date-time strings',
          req.url || '',
          'INVALID_DATE_FORMAT'
        )
      )
    }

    if (periodStart >= periodEnd) {
      return res.status(400).json(
        createProblemDetails(
          ERROR_TYPES.VALIDATION_FAILED,
          'Invalid period',
          400,
          'period_start must be before period_end',
          req.url || '',
          'INVALID_PERIOD'
        )
      )
    }

    // Obtener empleados activos
    const { data: employees, error: employeesError } = await client
      .from('employees')
      .select(`
        id,
        name,
        base_salary,
        status,
        departments(name)
      `)
      .eq('company_id', companyId)
      .eq('status', 'active')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return res.status(500).json(
        createProblemDetails(
          ERROR_TYPES.INTERNAL_SERVER_ERROR,
          'Database error',
          500,
          'Failed to fetch employees',
          req.url || '',
          'DATABASE_ERROR'
        )
      )
    }

    if (!employees || employees.length === 0) {
      return res.status(404).json(
        createProblemDetails(
          ERROR_TYPES.NOT_FOUND,
          'No active employees',
          404,
          'No active employees found for company',
          req.url || '',
          'NO_EMPLOYEES_FOUND'
        )
      )
    }

    // Generar hash de empleados para ETag determinístico
    const employeesHash = createHash('sha256')
      .update(JSON.stringify(employees.map(emp => ({ id: emp.id, salary: emp.base_salary }))))
      .digest('hex')
      .substring(0, 8)

    // Generar ETag determinístico
    const etag = generateETag(validatedInput, employeesHash)

    // Verificar If-None-Match para cache semántico
    const ifNoneMatch = req.headers['if-none-match']
    if (ifNoneMatch === etag) {
      return res.status(304).end()
    }

    // Obtener registros de asistencia para el período
    const { data: attendanceRecords, error: attendanceError } = await client
      .from('attendance_records')
      .select('employee_id, date, status')
      .in('employee_id', employees.map(emp => emp.id))
      .gte('date', periodStart.toISOString().split('T')[0])
      .lte('date', periodEnd.toISOString().split('T')[0])

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError)
      // Continuar sin asistencia - asumir días trabajados
    }

    // Calcular días trabajados por empleado
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    const employeeData = employees.map(emp => {
      const records = attendanceRecords?.filter(record => record.employee_id === emp.id) || []
      const daysWorked = records.length > 0 ? records.length : totalDays
      const daysAbsent = totalDays - daysWorked

      return {
        id: emp.id,
        name: emp.name,
        base_salary: Number(emp.base_salary),
        days_worked: daysWorked,
        days_absent: daysAbsent,
        late_days: 0, // TODO: Calcular llegadas tardías
        department: emp.departments?.name
      }
    })

    // Calcular nómina usando el motor
    const { calculations, summary } = await calculatePayroll(
      employeeData,
      periodStart,
      periodEnd,
      calculationType
    )

    // Generar run_id determinístico para idempotencia
    const runId = createHash('sha256')
      .update(JSON.stringify({
        company_id: companyId,
        period_start: validatedInput.period_start,
        period_end: validatedInput.period_end,
        calculation_type: calculationType,
        employees_hash: employeesHash
      }))
      .digest('hex')
      .substring(0, 32)

    // Crear respuesta según contrato OpenAPI
    const response: PreviewOutput = {
      run_id: runId,
      status: 'draft',
      resumen: {
        empleados: summary.empleados,
        total_bruto: Math.round(summary.total_bruto * 100) / 100,
        total_deducciones: {
          IHSS: Math.round(summary.total_deducciones.IHSS * 100) / 100,
          RAP: Math.round(summary.total_deducciones.RAP * 100) / 100,
          ISR: Math.round(summary.total_deducciones.ISR * 100) / 100,
          otros: Math.round(summary.total_deducciones.otros * 100) / 100
        },
        total_neto: Math.round(summary.total_neto * 100) / 100,
        total_dias_trabajados: summary.total_dias_trabajados,
        total_horas_extras: summary.total_horas_extras
      },
      planilla: calculations.map(calc => ({
        employee_id: calc.employee_id,
        name: calc.name,
        base_salary: Math.round(calc.base_salary * 100) / 100,
        total_earnings: Math.round(calc.total_earnings * 100) / 100,
        IHSS: Math.round(calc.IHSS * 100) / 100,
        RAP: Math.round(calc.RAP * 100) / 100,
        ISR: Math.round(calc.ISR * 100) / 100,
        total_deducciones: Math.round(calc.total_deducciones * 100) / 100,
        total: Math.round(calc.total * 100) / 100,
        days_worked: calc.days_worked,
        days_absent: calc.days_absent,
        late_days: calc.late_days,
        department: calc.department || null,
        line_id: null // Preview no tiene line_id
      })),
      generated_at: new Date().toISOString(),
      etag
    }

    // Validar response contra schema
    validateResponse<PreviewOutput>(response, 'previewOutput')

    // Retornar respuesta con headers apropiados para operación SAFE
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('ETag', etag)
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate')
    res.setHeader('Vary', 'Authorization, If-None-Match')
    
    return res.status(200).json(response)

  } catch (error: any) {
    console.error('Preview payroll error:', error)

    if (error.name === 'ValidationError') {
      return res.status(400).json(
        error.toProblemDetails(req.url || '')
      )
    }

    return res.status(500).json(
      createProblemDetails(
        ERROR_TYPES.INTERNAL_SERVER_ERROR,
        'Internal server error',
        500,
        error.message || 'An unexpected error occurred',
        req.url || '',
        'INTERNAL_ERROR'
      )
    )
  }
}
