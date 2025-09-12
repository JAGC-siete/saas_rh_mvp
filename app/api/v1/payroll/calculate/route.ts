// Next.js v1 API Route: Calculate Payroll
// Calcula y guarda nómina en la base de datos

import { NextRequest, NextResponse } from 'next/server'
import { validateRequest, validateResponse, createProblemDetails, ERROR_TYPES } from '../../../../lib/validation/ajv-validator'
import { calculatePayroll } from '../../../../lib/payroll/engine'
// import { supabase } from '../../../../lib/supabase' // Not used in this route
import { requireCompanyAccess } from '../../../../lib/auth/api-auth'

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validar autenticación y permisos
    const { supabase: client, companyId, role, userId } = await requireCompanyAccess(request)
    
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.FORBIDDEN,
          'Insufficient permissions',
          403,
          'Payroll calculation requires hr_manager role or higher',
          request.url,
          'INSUFFICIENT_PERMISSIONS'
        ),
        { status: 403 }
      )
    }

    // Parsear y validar request body
    const body = await request.json()
    const validatedInput = validateRequest<PreviewInput>(body, 'previewInput')

    // Validar que el company_id coincide
    if (validatedInput.company_id !== companyId) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.FORBIDDEN,
          'Company mismatch',
          403,
          'Requested company does not match user company',
          request.url,
          'COMPANY_MISMATCH'
        ),
        { status: 403 }
      )
    }

    // Parsear fechas
    const periodStart = new Date(validatedInput.period_start)
    const periodEnd = new Date(validatedInput.period_end)
    const calculationType = validatedInput.calculation_type || 'CON'

    // Validar fechas
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.VALIDATION_FAILED,
          'Invalid date format',
          400,
          'period_start and period_end must be valid RFC 3339 date-time strings',
          request.url,
          'INVALID_DATE_FORMAT'
        ),
        { status: 400 }
      )
    }

    if (periodStart >= periodEnd) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.VALIDATION_FAILED,
          'Invalid period',
          400,
          'period_start must be before period_end',
          request.url,
          'INVALID_PERIOD'
        ),
        { status: 400 }
      )
    }

    // Verificar si ya existe una corrida para este período
    const year = periodStart.getFullYear()
    const month = periodStart.getMonth() + 1
    const quincena = periodStart.getDate() <= 15 ? 1 : 2

    const { data: existingRun, error: existingRunError } = await client
      .from('payroll_runs')
      .select('id, status')
      .eq('company_uuid', companyId)
      .eq('year', year)
      .eq('month', month)
      .eq('quincena', quincena)
      .eq('tipo', calculationType)
      .single()

    if (existingRunError && existingRunError.code !== 'PGRST116') {
      console.error('Error checking existing run:', existingRunError)
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.INTERNAL_SERVER_ERROR,
          'Database error',
          500,
          'Failed to check existing payroll run',
          request.url,
          'DATABASE_ERROR'
        ),
        { status: 500 }
      )
    }

    if (existingRun) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.CONFLICT,
          'Payroll run already exists',
          409,
          `Payroll run already exists for ${year}-${month.toString().padStart(2, '0')} Q${quincena} ${calculationType}`,
          request.url,
          'PAYROLL_RUN_EXISTS'
        ),
        { status: 409 }
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
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.INTERNAL_SERVER_ERROR,
          'Database error',
          500,
          'Failed to fetch employees',
          request.url,
          'DATABASE_ERROR'
        ),
        { status: 500 }
      )
    }

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.NOT_FOUND,
          'No active employees',
          404,
          'No active employees found for company',
          request.url,
          'NO_EMPLOYEES_FOUND'
        ),
        { status: 404 }
      )
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

    // Generar run_id único
    const runId = crypto.randomUUID()
    
    // Crear corrida de nómina y líneas en una transacción
    const payrollLines = calculations.map(calc => ({
      run_id: runId,
      company_uuid: companyId,
      employee_id: calc.employee_id,
      calc_hours: 0, // TODO: Calcular horas reales
      calc_bruto: calc.total_earnings,
      calc_ihss: calc.IHSS,
      calc_rap: calc.RAP,
      calc_isr: calc.ISR,
      calc_neto: calc.total,
      eff_hours: 0,
      eff_bruto: calc.total_earnings,
      eff_ihss: calc.IHSS,
      eff_rap: calc.RAP,
      eff_isr: calc.ISR,
      eff_neto: calc.total,
      edited: false
    }))

    // Ejecutar en transacción
    const { error: transactionError } = await client.rpc('create_payroll_with_lines', {
      p_run_id: runId,
      p_company_uuid: companyId,
      p_year: year,
      p_month: month,
      p_quincena: quincena,
      p_tipo: calculationType,
      p_created_by: userId,
      p_payroll_lines: payrollLines
    })

    if (transactionError) {
      console.error('Error creating payroll in transaction:', transactionError)
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.INTERNAL_SERVER_ERROR,
          'Database error',
          500,
          'Failed to create payroll run and lines',
          request.url,
          'DATABASE_ERROR'
        ),
        { status: 500 }
      )
    }

    // Generar ETag
    const etag = `"${runId}-${Date.now()}"`

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
        line_id: runId // Ahora tiene line_id real
      })),
      generated_at: new Date().toISOString(),
      etag
    }

    // Validar response contra schema
    validateResponse<PreviewOutput>(response, 'previewOutput')

    // Retornar respuesta con headers apropiados
    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'ETag': etag,
        'Location': `/api/v1/payroll/calculate/${runId}`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error: any) {
    console.error('Calculate payroll error:', error)

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        error.toProblemDetails(request.url),
        { status: 400 }
      )
    }

    return NextResponse.json(
      createProblemDetails(
        ERROR_TYPES.INTERNAL_SERVER_ERROR,
        'Internal server error',
        500,
        error.message || 'An unexpected error occurred',
        request.url,
        'INTERNAL_ERROR'
      ),
      { status: 500 }
    )
  }
}
