import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { logger } from '../../../../lib/logger'
import {
  validateFileUploadRequest,
  generateStoragePath,
  sanitizeFilename,
  getMimeTypeFromFilename,
  FileType
} from '../../../../lib/security/file-upload-validation'

interface UploadUrlRequest {
  employee_id: string
  file_type: FileType
  filename: string
  file_size: number
  mime_type?: string
  document_category?: string
}

interface UploadUrlResponse {
  success: boolean
  uploadUrl?: string
  fileId?: string
  storagePath?: string
  error?: string
  message?: string
}

interface FileMetadataResponse {
  success: boolean
  file?: {
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
  }
  error?: string
}

/**
 * POST: Generate signed URL for uploading file directly to Supabase Storage
 */
async function handleGetUploadUrl(
  req: NextApiRequest,
  res: NextApiResponse<UploadUrlResponse>
) {
  try {
    // Authenticate user
    const { companyId, user, userProfile } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company access required'
      })
    }

    const body = req.body as UploadUrlRequest
    const {
      employee_id,
      file_type,
      filename,
      file_size,
      mime_type,
      document_category
    } = body

    // Validate required fields
    if (!employee_id || typeof employee_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'employee_id is required'
      })
    }

    if (!file_type || !['profile_photo', 'document'].includes(file_type)) {
      return res.status(400).json({
        success: false,
        error: 'file_type must be "profile_photo" or "document"'
      })
    }

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'filename is required'
      })
    }

    if (!file_size || typeof file_size !== 'number' || file_size <= 0) {
      return res.status(400).json({
        success: false,
        error: 'file_size must be a positive number'
      })
    }

    // Determine MIME type if not provided
    const finalMimeType = mime_type || getMimeTypeFromFilename(filename)
    if (!finalMimeType) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine file type. Please specify mime_type or use a valid file extension.'
      })
    }

    // Use admin client for database operations
    const adminSupabase = createAdminClient()

    // Validate file upload request (includes employee access check)
    const validation = await validateFileUploadRequest(
      adminSupabase,
      employee_id,
      companyId,
      file_type,
      filename,
      file_size,
      finalMimeType,
      document_category
    )

    if (!validation.valid) {
      logger.warn('File upload validation failed', {
        employee_id,
        company_id: companyId,
        file_type,
        error: validation.error
      })
      return res.status(400).json({
        success: false,
        error: validation.error
      })
    }

    // Check permissions: employees can only upload their own profile photos
    if (userProfile.role === 'employee') {
      if (file_type !== 'profile_photo') {
        return res.status(403).json({
          success: false,
          error: 'Employees can only upload their own profile photos'
        })
      }
      if (userProfile.employee_id !== employee_id) {
        return res.status(403).json({
          success: false,
          error: 'Employees can only upload their own profile photos'
        })
      }
    }

    // For profile photos, check if there's already an active one (we'll deactivate it)
    if (file_type === 'profile_photo') {
      const { data: existingPhoto } = await adminSupabase
        .from('employee_files')
        .select('id')
        .eq('employee_id', employee_id)
        .eq('file_type', 'profile_photo')
        .eq('is_active', true)
        .maybeSingle()

      if (existingPhoto) {
        // Deactivate old photo (trigger will handle this, but we do it explicitly for clarity)
        await adminSupabase
          .from('employee_files')
          .update({ is_active: false })
          .eq('id', existingPhoto.id)
      }
    }

    // Generate storage path
    const sanitizedFilename = sanitizeFilename(filename)
    const storagePath = generateStoragePath(
      companyId,
      employee_id,
      file_type,
      sanitizedFilename,
      document_category
    )

    logger.info('Creating file upload record', {
      employee_id,
      company_id: companyId,
      file_type,
      storage_path: storagePath
    })

    // Create file record in database
    const { data: fileRecord, error: insertError } = await adminSupabase
      .from('employee_files')
      .insert({
        employee_id,
        company_id: companyId,
        file_type,
        document_category: file_type === 'document' ? document_category : null,
        storage_path: storagePath,
        file_name: sanitizedFilename,
        file_size_bytes: file_size,
        mime_type: finalMimeType,
        uploaded_by: user.id,
        is_active: true
      })
      .select()
      .single()

    if (insertError || !fileRecord) {
      logger.error('Failed to create file record', {
        error: insertError,
        employee_id,
        company_id: companyId
      })
      return res.status(500).json({
        success: false,
        error: 'Failed to create file record'
      })
    }

    logger.info('Generating signed URL', {
      file_id: fileRecord.id,
      storage_path: storagePath
    })

    // Generate signed URL for upload (valid for 1 hour)
    const { data: urlData, error: urlError } = await adminSupabase.storage
      .from('HR_BUCKET')
      .createSignedUploadUrl(storagePath)

    if (urlError || !urlData) {
      logger.error('Failed to generate signed URL', {
        error: urlError,
        storage_path: storagePath
      })
      // Cleanup file record
      await adminSupabase
        .from('employee_files')
        .delete()
        .eq('id', fileRecord.id)
      return res.status(500).json({
        success: false,
        error: 'Failed to generate upload URL'
      })
    }

    logger.info('Upload URL generated successfully', {
      file_id: fileRecord.id,
      employee_id,
      company_id: companyId,
      filename: sanitizedFilename,
      storage_path: storagePath
    })

    return res.status(200).json({
      success: true,
      uploadUrl: urlData.signedUrl,
      fileId: fileRecord.id,
      storagePath,
      message: 'Upload URL generated. Use this URL to upload your file directly.'
    })

  } catch (error: any) {
    logger.error('Error generating upload URL', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * GET: Get metadata for a file
 */
async function handleGetFileMetadata(
  req: NextApiRequest,
  res: NextApiResponse<FileMetadataResponse>
) {
  try {
    // Authenticate user
    const { companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company access required'
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
    const { data: file, error } = await adminSupabase
      .from('employee_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (error || !file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      })
    }

    // Verify user has access to this file (belongs to their company)
    if (file.company_id !== companyId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }

    return res.status(200).json({
      success: true,
      file
    })

  } catch (error: any) {
    logger.error('Error getting file metadata', {
      error: error instanceof Error ? error.message : String(error)
    })
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Main handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadUrlResponse | FileMetadataResponse>
) {
  if (req.method === 'POST') {
    return handleGetUploadUrl(req, res)
  } else if (req.method === 'GET') {
    return handleGetFileMetadata(req, res)
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    } as any)
  }
}

