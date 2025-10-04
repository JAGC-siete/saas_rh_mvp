import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getDateRange } from '../../../lib/attendance'
import { createSecureQueryBuilder } from '../../../lib/security/secure-queries'
import { generateAttendancePDF } from '../../../lib/pdf/attendance-pdf-generator'

/**
 * Divine PDF Generation Endpoint
 * 
 * This endpoint generates professional attendance PDF reports with:
 * - Comprehensive error handling
 * - Input validation
 * - Permission checks
 * - Secure data fetching
 * - Professional formatting
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Method validation
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are allowed for PDF generation'
    })
  }

  try {
    // Authentication and authorization
    const { supabase, companyId, role: userRole, user } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({
        error: 'Company access required',
        message: 'No se encontró una empresa asociada a tu cuenta'
      })
    }

    // Permission validation for PDF generation
    const allowedRoles = ['admin', 'hr_manager', 'super_admin']
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'No tienes permisos para generar reportes PDF. Roles permitidos: ' + allowedRoles.join(', ')
      })
    }

    // Parameter normalization and validation
    const normalizeParam = (param: string | string[] | undefined): string | undefined => {
      if (Array.isArray(param)) return param[0]
      return param
    }

    const preset = normalizeParam(req.query.preset) || 'today'
    const roleFilter = normalizeParam(req.query.role)
    const employee_id = normalizeParam(req.query.employee_id)

    // Validate preset
    const validPresets = ['today', 'week', 'fortnight', 'month', 'year']
    if (!validPresets.includes(preset)) {
      return res.status(400).json({
        error: 'Invalid preset',
        message: `Preset must be one of: ${validPresets.join(', ')}`,
        received: preset
      })
    }

    console.log('🔍 PDF Generation Request:', {
      preset, 
      roleFilter, 
      employee_id, 
      companyId, 
      userEmail: user.email,
      userRole
    })

    // Calculate date range using the same resolver as other endpoints
    const range = getDateRange(preset)
    const startDate = range.from.split('T')[0]
    const endDate = range.to.split('T')[0]

    console.log('📅 Date range for PDF:', {
      preset, 
      startDate, 
      endDate, 
      from: range.from, 
      to: range.to
    })

    // Fetch attendance records using secure query builder
    const queryBuilder = createSecureQueryBuilder(supabase, {
      id: user.id,
      company_id: companyId,
      role: userRole,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    console.log('📊 Fetching attendance records...')
    const attendanceRecords = await queryBuilder.getAttendanceRecords({
      startDate,
      endDate,
      formato: 'pdf',
      employee_id: employee_id || undefined,
      role: roleFilter || undefined,
      company_id: companyId
    })

    console.log('📊 Records fetched for PDF:', {
      count: attendanceRecords.length,
      sample: attendanceRecords.slice(0, 2).map((r: any) => ({
        id: r.id,
        date: r.date,
        status: r.status,
        employee: r.employees?.name
      }))
    })

    // Generate PDF using the divine generator
    console.log('🎨 Generating PDF...')
    const pdfBuffer = await generateAttendancePDF({
      attendanceRecords,
      startDate,
      endDate,
      userEmail: user.email,
      preset,
      role: roleFilter,
      employeeName: employee_id ? `Employee ID: ${employee_id}` : undefined
    })

    console.log('✅ PDF Generated Successfully:', { 
      size: pdfBuffer.length,
      sizeKB: Math.round(pdfBuffer.length / 1024)
    })

    // Set headers for PDF download
    const filename = `reporte-asistencia-${startDate}-${endDate}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length.toString())
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

    // Send PDF
    res.send(pdfBuffer)

  } catch (error: any) {
    console.error('❌ Error generating attendance PDF:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })

    // Return appropriate error response
    const statusCode = error?.status || 500
    const errorMessage = error?.message || 'Error desconocido al generar el PDF'
    
    return res.status(statusCode).json({
      error: 'Error generando PDF de asistencia',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString()
    })
  }
}