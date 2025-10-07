import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { createAdminApiHandler, AdminApiHandler, AdminApiContext } from '../../../lib/auth/admin-api-wrapper'
import { ADMIN_OPERATIONS, ADMIN_RESOURCES } from '../../../lib/logging/admin-logger'

interface ConversionResponse {
  success: boolean
  conversionId?: string
  message?: string
  error?: string
}

interface ConversionStatusResponse {
  success: boolean
  conversion?: any
  progress?: number
  status?: string
  error?: string
}

const conversionHandler: AdminApiHandler = {
  POST: async (req: NextApiRequest, res: NextApiResponse<ConversionResponse>, context: AdminApiContext) => {
    try {
      const { supabase, userProfile } = context
      const { uploadId, tenantId } = req.body

      if (!uploadId || !tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Upload ID and Tenant ID are required'
        })
      }

      // Get upload details
      const { data: upload, error: uploadError } = await supabase
        .from('payroll_uploads')
        .select(`
          *,
          payroll_extracted_employees(*)
        `)
        .eq('id', uploadId)
        .single()

      if (uploadError || !upload) {
        logger.error('Upload not found for conversion', { uploadId, error: uploadError })
        return res.status(404).json({
          success: false,
          error: 'Upload not found'
        })
      }

      if (upload.upload_status !== 'processed') {
        return res.status(400).json({
          success: false,
          error: 'Upload must be processed before conversion'
        })
      }

      // Get original company
      const { data: originalCompany, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('subdomain', tenantId)
        .single()

      if (companyError || !originalCompany) {
        logger.error('Original company not found', { tenantId, error: companyError })
        return res.status(404).json({
          success: false,
          error: 'Original company not found'
        })
      }

      // Create conversion record
      const { data: conversion, error: conversionError } = await supabase
        .from('trial_conversions')
        .insert({
          tenant_id: tenantId,
          original_company_id: originalCompany.id,
          upload_id: uploadId,
          status: 'initiated',
          total_employees_expected: upload.payroll_extracted_employees?.length || 0
        })
        .select()
        .single()

      if (conversionError) {
        logger.error('Failed to create conversion record', { error: conversionError })
        return res.status(500).json({
          success: false,
          error: 'Failed to initiate conversion'
        })
      }

      // Start conversion process in background (pass supabase client)
      processConversion(conversion.id, upload, originalCompany, supabase).catch(error => {
        logger.error('Background conversion failed', { conversionId: conversion.id, error })
      })

      logger.info('Conversion initiated successfully', {
        userId: userProfile.id,
        conversionId: conversion.id,
        tenantId,
        uploadId,
        expectedEmployees: upload.payroll_extracted_employees?.length || 0
      })

      return res.status(200).json({
        success: true,
        conversionId: conversion.id,
        message: 'Conversion process initiated successfully'
      })

    } catch (error) {
      logger.error('Error initiating conversion', {
        userId: context.userProfile.id,
        error: error instanceof Error ? error.message : String(error)
      })
      return res.status(500).json({
        success: false,
        error: 'Internal server error during conversion initiation'
      })
    }
  },

  GET: async (req: NextApiRequest, res: NextApiResponse<ConversionStatusResponse>, context: AdminApiContext) => {
    try {
      const { supabase } = context
      const { conversionId } = req.query

      if (!conversionId || typeof conversionId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Conversion ID is required'
        })
      }

      // Get conversion status
      const { data: conversion, error } = await supabase
        .from('trial_conversions')
        .select(`
          *,
          payroll_uploads!inner(*),
          companies!trial_conversions_converted_company_id_fkey(*)
        `)
        .eq('id', conversionId)
        .single()

      if (error || !conversion) {
        return res.status(404).json({
          success: false,
          error: 'Conversion not found'
        })
      }

      return res.status(200).json({
        success: true,
        conversion,
        progress: conversion.progress_percentage,
        status: conversion.status
      })

    } catch (error) {
      logger.error('Error getting conversion status', {
        userId: context.userProfile.id,
        error: error instanceof Error ? error.message : String(error)
      })
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

// Background conversion processing
async function processConversion(conversionId: string, upload: any, originalCompany: any, supabase: any) {
  
  try {
    logger.info('Starting conversion process', { conversionId })

    // Update status to processing
    await supabase
      .from('trial_conversions')
      .update({ 
        status: 'in_progress',
        conversion_started_at: new Date().toISOString(),
        progress_percentage: 10
      })
      .eq('id', conversionId)

    // Create new company for converted environment
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: `${originalCompany.name} - Producción`,
        subdomain: `${originalCompany.subdomain}-prod`,
        plan_type: 'basic',
        is_active: true
      })
      .select()
      .single()

    if (companyError) {
      throw new Error(`Failed to create new company: ${companyError.message}`)
    }

    await supabase.rpc('update_conversion_progress', {
      p_conversion_id: conversionId,
      p_progress_percentage: 25
    })

    // Create departments from extracted data
    const departments = new Set<string>()
    upload.payroll_extracted_employees?.forEach((emp: any) => {
      if (emp.extracted_department) {
        departments.add(emp.extracted_department)
      }
    })

    const departmentMap = new Map<string, string>()
    for (const deptName of departments) {
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .insert({
          company_id: newCompany.id,
          name: deptName,
          description: `Departamento ${deptName} migrado desde trial`
        })
        .select()
        .single()

      if (!deptError && department) {
        departmentMap.set(deptName, department.id)
      }
    }

    await supabase.rpc('update_conversion_progress', {
      p_conversion_id: conversionId,
      p_progress_percentage: 50,
      p_departments_created: departments.size
    })

    // Create employees
    let employeesCreated = 0
    for (const emp of upload.payroll_extracted_employees || []) {
      try {
        const departmentId = emp.extracted_department ? departmentMap.get(emp.extracted_department) : null
        
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .insert({
            company_id: newCompany.id,
            department_id: departmentId,
            name: emp.extracted_name || 'Empleado Sin Nombre',
            dni: emp.extracted_dni || `TEMP-${Date.now()}-${Math.random()}`,
            base_salary: emp.extracted_salary || 0,
            role: emp.extracted_position || 'Empleado',
            status: 'active',
            hire_date: new Date().toISOString().split('T')[0]
          })
          .select()
          .single()

        if (!empError && employee) {
          employeesCreated++
          
          // Update extracted employee record
          await supabase
            .from('payroll_extracted_employees')
            .update({ 
              processed_employee_id: employee.id,
              validation_status: 'validated'
            })
            .eq('id', emp.id)
        }
      } catch (empError) {
        logger.warn('Failed to create employee', { 
          conversionId, 
          employeeData: emp, 
          error: empError 
        })
      }
    }

    await supabase.rpc('update_conversion_progress', {
      p_conversion_id: conversionId,
      p_progress_percentage: 80,
      p_employees_created: employeesCreated
    })

    // Create admin user for the new company
    const adminEmail = `admin-${newCompany.subdomain}@sisu.com`
    const { data: adminUser, error: userError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: 'TempPassword123!',
      email_confirm: true,
      user_metadata: {
        company_id: newCompany.id,
        role: 'company_admin'
      }
    })

    if (!userError && adminUser) {
      // Create user profile
      await supabase
        .from('user_profiles')
        .insert({
          id: adminUser.user.id,
          company_id: newCompany.id,
          role: 'company_admin',
          is_active: true
        })
    }

    // Complete conversion
    await supabase.rpc('complete_conversion', {
      p_conversion_id: conversionId,
      p_converted_company_id: newCompany.id,
      p_total_employees: employeesCreated,
      p_total_departments: departments.size
    })

    // Update upload status
    await supabase
      .from('payroll_uploads')
      .update({ 
        upload_status: 'converted',
        converted_company_id: newCompany.id
      })
      .eq('id', upload.id)

    // Create notification
    await supabase
      .from('conversion_notifications')
      .insert({
        conversion_id: conversionId,
        notification_type: 'email',
        recipient: adminEmail,
        message_template: 'conversion_completed',
        message_content: `Tu entorno de producción está listo! Accede con: ${adminEmail} / TempPassword123!`,
        status: 'pending'
      })

    logger.info('Conversion completed successfully', {
      conversionId,
      newCompanyId: newCompany.id,
      employeesCreated,
      departmentsCreated: departments.size
    })

  } catch (error) {
    logger.error('Conversion process failed', { 
      conversionId, 
      error: error instanceof Error ? error.message : String(error) 
    })
    
    await supabase.rpc('fail_conversion', {
      p_conversion_id: conversionId,
      p_error_details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    })
  }
}

// Export the handler with automatic logging and validation
export default createAdminApiHandler({
  operation: ADMIN_OPERATIONS.CREATE,
  resource: ADMIN_RESOURCES.COMPANY,
  requireSuperAdmin: true,
  allowedMethods: ['POST', 'GET']
}, conversionHandler)
