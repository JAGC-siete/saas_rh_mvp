// Next.js v1 API Route: Authorize Payroll
// Autoriza nómina con control de concurrencia via ETag

import { NextRequest, NextResponse } from 'next/server'
import { validateRequest, validateResponse, createProblemDetails, ERROR_TYPES } from '../../../../lib/validation/ajv-validator'
// import { supabase } from '../../../../lib/supabase' // Not used in this route
import { requireCompanyAccess } from '../../../../lib/auth/api-auth'

// Tipos del contrato OpenAPI
interface AuthorizeInput {
  run_id: string
}

interface AuthorizeOutput {
  run_id: string
  status: 'authorized'
  artifact_url: string
  vouchers_count: number
  authorized_at: string
  etag: string
  summary?: {
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
          'Payroll authorization requires hr_manager role or higher',
          request.url,
          'INSUFFICIENT_PERMISSIONS'
        ),
        { status: 403 }
      )
    }

    // Validar If-Match header para control de concurrencia
    const ifMatch = request.headers.get('If-Match')
    if (!ifMatch) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.VALIDATION_FAILED,
          'Missing If-Match header',
          400,
          'If-Match header is required for authorization',
          request.url,
          'MISSING_IF_MATCH'
        ),
        { status: 400 }
      )
    }

    // Parsear y validar request body
    const body = await request.json()
    const validatedInput = validateRequest<AuthorizeInput>(body, 'authorizeInput')

    // Verificar que la corrida existe y pertenece a la empresa
    const { data: payrollRun, error: runError } = await client
      .from('payroll_runs')
      .select(`
        id,
        company_uuid,
        status,
        created_at,
        authorized_by,
        authorized_at
      `)
      .eq('id', validatedInput.run_id)
      .single()

    if (runError || !payrollRun) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.NOT_FOUND,
          'Payroll run not found',
          404,
          'The specified payroll run does not exist',
          request.url,
          'PAYROLL_RUN_NOT_FOUND'
        ),
        { status: 404 }
      )
    }

    // Validar que pertenece a la empresa del usuario
    if (payrollRun.company_uuid !== companyId) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.FORBIDDEN,
          'Company mismatch',
          403,
          'Payroll run does not belong to your company',
          request.url,
          'COMPANY_MISMATCH'
        ),
        { status: 403 }
      )
    }

    // Validar estado actual
    if (payrollRun.status === 'authorized') {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.CONFLICT,
          'Already authorized',
          409,
          'Payroll run has already been authorized',
          request.url,
          'ALREADY_AUTHORIZED'
        ),
        { status: 409 }
      )
    }

    if (payrollRun.status === 'distributed') {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.CONFLICT,
          'Already distributed',
          409,
          'Payroll run has already been distributed',
          request.url,
          'ALREADY_DISTRIBUTED'
        ),
        { status: 409 }
      )
    }

    if (!['draft', 'edited'].includes(payrollRun.status)) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.INVALID_STATE_TRANSITION,
          'Invalid state transition',
          409,
          `Cannot authorize from status '${payrollRun.status}'. Must be 'draft' or 'edited'`,
          request.url,
          'INVALID_STATE_TRANSITION'
        ),
        { status: 409 }
      )
    }

    // Validar ETag real usando función de base de datos
    const { data: etagData, error: etagError } = await client
      .rpc('get_payroll_etag', { p_run_id: validatedInput.run_id })

    if (etagError || !etagData) {
      console.error('Error getting ETag:', etagError)
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.INTERNAL_SERVER_ERROR,
          'Database error',
          500,
          'Failed to get ETag for payroll run',
          request.url,
          'DATABASE_ERROR'
        ),
        { status: 500 }
      )
    }

    const currentETag = etagData
    if (ifMatch !== currentETag) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.PRECONDITION_FAILED,
          'Precondition Failed',
          412,
          'ETag does not match. The resource may have been modified by another request',
          request.url,
          'ETAG_MISMATCH'
        ),
        { status: 412 }
      )
    }

    // Obtener líneas de nómina
    const { data: payrollLines, error: linesError } = await client
      .from('payroll_run_lines')
      .select(`
        id,
        employee_id,
        eff_bruto,
        eff_ihss,
        eff_rap,
        eff_isr,
        eff_neto,
        edited
      `)
      .eq('run_id', validatedInput.run_id)

    if (linesError) {
      console.error('Error fetching payroll lines:', linesError)
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.INTERNAL_SERVER_ERROR,
          'Database error',
          500,
          'Failed to fetch payroll lines',
          request.url,
          'DATABASE_ERROR'
        ),
        { status: 500 }
      )
    }

    if (!payrollLines || payrollLines.length === 0) {
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.NOT_FOUND,
          'No payroll lines found',
          404,
          'No payroll lines found for the specified run',
          request.url,
          'NO_PAYROLL_LINES'
        ),
        { status: 404 }
      )
    }

    // Actualizar estado de la corrida
    const authorizedAt = new Date().toISOString()
    const { error: updateError } = await client
      .from('payroll_runs')
      .update({
        status: 'authorized',
        authorized_by: userId,
        authorized_at: authorizedAt,
        updated_at: authorizedAt
      })
      .eq('id', validatedInput.run_id)

    if (updateError) {
      console.error('Error updating payroll run:', updateError)
      return NextResponse.json(
        createProblemDetails(
          ERROR_TYPES.INTERNAL_SERVER_ERROR,
          'Database error',
          500,
          'Failed to authorize payroll run',
          request.url,
          'DATABASE_ERROR'
        ),
        { status: 500 }
      )
    }

    // Generar URL del PDF
    const artifactUrl = `/api/v1/payroll/generate-pdf-from-run?run_id=${validatedInput.run_id}`
    
    // Calcular resumen
    const summary = {
      empleados: payrollLines.length,
      total_bruto: Math.round(payrollLines.reduce((sum, line) => sum + Number(line.eff_bruto), 0) * 100) / 100,
      total_deducciones: {
        IHSS: Math.round(payrollLines.reduce((sum, line) => sum + Number(line.eff_ihss), 0) * 100) / 100,
        RAP: Math.round(payrollLines.reduce((sum, line) => sum + Number(line.eff_rap), 0) * 100) / 100,
        ISR: Math.round(payrollLines.reduce((sum, line) => sum + Number(line.eff_isr), 0) * 100) / 100,
        otros: 0
      },
      total_neto: Math.round(payrollLines.reduce((sum, line) => sum + Number(line.eff_neto), 0) * 100) / 100,
      total_dias_trabajados: 0, // TODO: Calcular desde asistencia
      total_horas_extras: 0
    }

    // Generar nuevo ETag
    const newETag = `"${validatedInput.run_id}-${Date.now()}"`

    // Crear respuesta según contrato OpenAPI
    const response: AuthorizeOutput = {
      run_id: validatedInput.run_id,
      status: 'authorized',
      artifact_url: artifactUrl,
      vouchers_count: payrollLines.length,
      authorized_at: authorizedAt,
      etag: newETag,
      summary
    }

    // Validar response contra schema
    validateResponse<AuthorizeOutput>(response, 'authorizeOutput')

    // Log de auditoría
    console.log(`Payroll run ${validatedInput.run_id} authorized by ${userId} at ${authorizedAt}`)

    // Retornar respuesta con headers apropiados
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'ETag': newETag,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error: any) {
    console.error('Authorize payroll error:', error)

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
