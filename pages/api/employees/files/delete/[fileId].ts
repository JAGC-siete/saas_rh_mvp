import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { requireCompanyAccess } from '../../../../../lib/auth/api-auth-fixed'
import { logger } from '../../../../../lib/logger'

interface DeleteFileResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * DELETE: Delete (soft delete) an employee file
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteFileResponse>
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    // Authenticate user - only admins can delete
    const { companyId, userProfile } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company access required'
      })
    }

    // Check permissions: only admins/HR can delete files
    const allowedRoles = ['super_admin', 'company_admin', 'hr_manager']
    if (!allowedRoles.includes(userProfile.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only admins and HR managers can delete files.'
      })
    }

    const { fileId } = req.query

    if (!fileId || typeof fileId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'fileId is required'
      })
    }

    const adminSupabase = createAdminClient()

    // Get file metadata
    const { data: file, error: fetchError } = await adminSupabase
      .from('employee_files')
      .select('*, employees!inner(id, company_id)')
      .eq('id', fileId)
      .single()

    if (fetchError || !file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      })
    }

    // Verify file belongs to user's company (unless super_admin)
    if (userProfile.role !== 'super_admin') {
      if (file.company_id !== companyId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        })
      }
    }

    logger.info('Deleting employee file', {
      file_id: fileId,
      employee_id: file.employee_id,
      company_id: companyId,
      storage_path: file.storage_path,
      file_type: file.file_type
    })

    // Soft delete: mark as inactive
    const { error: updateError } = await adminSupabase
      .from('employee_files')
      .update({ is_active: false })
      .eq('id', fileId)

    if (updateError) {
      logger.error('Failed to soft delete file record', {
        error: updateError,
        file_id: fileId
      })
      return res.status(500).json({
        success: false,
        error: 'Failed to delete file record'
      })
    }

    // If it's a profile photo, update employees.profile_image_path
    if (file.file_type === 'profile_photo' && file.is_active) {
      // Check if there's another active profile photo
      const { data: otherPhotos } = await adminSupabase
        .from('employee_files')
        .select('storage_path')
        .eq('employee_id', file.employee_id)
        .eq('file_type', 'profile_photo')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      const newProfilePath = otherPhotos?.storage_path || null

      // Update employee's profile_image_path
      const { error: empUpdateError } = await adminSupabase
        .from('employees')
        .update({ profile_image_path: newProfilePath })
        .eq('id', file.employee_id)

      if (empUpdateError) {
        logger.warn('Failed to update employee profile_image_path', {
          error: empUpdateError,
          employee_id: file.employee_id
        })
        // Don't fail the request, just log the warning
      }
    }

    // Optionally delete from Storage (hard delete)
    // For now, we'll keep the file in Storage but mark it as inactive in DB
    // This allows recovery if needed. Uncomment below for hard delete:
    /*
    const { error: storageError } = await adminSupabase.storage
      .from('HR_BUCKET')
      .remove([file.storage_path])

    if (storageError) {
      logger.warn('Failed to delete file from Storage', {
        error: storageError,
        storage_path: file.storage_path
      })
      // Don't fail the request, file is already soft-deleted in DB
    }
    */

    logger.info('File deleted successfully', {
      file_id: fileId,
      employee_id: file.employee_id,
      company_id: companyId
    })

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error: any) {
    logger.error('Error deleting file', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}


