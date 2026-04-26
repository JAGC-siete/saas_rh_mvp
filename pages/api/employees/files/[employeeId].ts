import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { logger } from '../../../../lib/logger'

interface FileListItem {
  id: string
  employee_id: string
  company_id: string
  file_type: string
  document_category?: string
  storage_path: string
  file_name: string
  file_size_bytes: number
  mime_type: string
  uploaded_by: string
  is_active: boolean
  created_at: string
  updated_at: string
  signed_url?: string
}

interface FileListResponse {
  success: boolean
  files?: FileListItem[]
  error?: string
}

/**
 * GET: List files for an employee
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FileListResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Authenticate user
    const { companyId, userProfile } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company access required'
      })
    }

    const { employeeId } = req.query
    const { file_type } = req.query

    if (!employeeId || typeof employeeId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'employeeId is required'
      })
    }

    const adminSupabase = createAdminClient()

    // Verify employee belongs to user's company (unless super_admin)
    if (userProfile.role !== 'super_admin') {
      const { data: employee, error: empError } = await adminSupabase
        .from('employees')
        .select('id, company_id')
        .eq('id', employeeId)
        .single()

      if (empError || !employee) {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        })
      }

      // Check company access
      if (employee.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }

      // Employees can only view their own files
      if (userProfile.role === 'employee') {
        if (userProfile.employee_id !== employeeId) {
          return res.status(403).json({
            success: false,
            error: 'Employees can only view their own files'
          })
        }
      }
    }

    // Build query
    let query = adminSupabase
      .from('employee_files')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })

    // Filter by file type if specified
    if (file_type && typeof file_type === 'string') {
      if (file_type === 'profile_photo' || file_type === 'document') {
        query = query.eq('file_type', file_type)
      }
    }

    // Only show active files (or all if admin wants to see history)
    if (userProfile.role !== 'super_admin' && userProfile.role !== 'company_admin') {
      query = query.eq('is_active', true)
    }

    const { data: files, error } = await query

    if (error) {
      logger.error('Error fetching employee files', {
        error: error.message,
        employee_id: employeeId,
        company_id: companyId
      })
      return res.status(500).json({
        success: false,
        error: 'Error fetching files'
      })
    }

    // Generate signed URLs for reading files (valid for 1 hour)
    const filesWithUrls: FileListItem[] = []
    
    for (const file of files || []) {
      try {
        const { data: urlData } = await adminSupabase.storage
          .from('HR_BUCKET')
          .createSignedUrl(file.storage_path, 3600) // 1 hour

        filesWithUrls.push({
          ...file,
          signed_url: urlData?.signedUrl
        })
      } catch (urlError) {
        logger.warn('Failed to generate signed URL for file', {
          file_id: file.id,
          storage_path: file.storage_path,
          error: urlError
        })
        // Include file without URL
        filesWithUrls.push(file)
      }
    }

    logger.info('Employee files fetched successfully', {
      employee_id: employeeId,
      company_id: companyId,
      count: filesWithUrls.length
    })

    return res.status(200).json({
      success: true,
      files: filesWithUrls
    })

  } catch (error: any) {
    logger.error('Error in employee files list API', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}


