import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

interface UploadUrlResponse {
  success: boolean
  uploadUrl?: string
  uploadId?: string
  storagePath?: string
  error?: string
  message?: string
}

interface StatusResponse {
  success: boolean
  upload?: any
  extractedEmployees?: any[]
  totalRows?: number
  confidenceScore?: number
  status?: string
  error?: string
}

/**
 * API for Payroll Upload using Supabase Storage
 * 
 * POST /api/trial/payroll-upload-storage
 * - Creates upload record and returns signed URL for direct upload to Storage
 * 
 * GET /api/trial/payroll-upload-storage?uploadId=xxx
 * - Returns status of processing and extracted data
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadUrlResponse | StatusResponse>
) {
  if (req.method === 'POST') {
    return handleGetUploadUrl(req, res)
  } else if (req.method === 'GET') {
    return handleGetUploadStatus(req, res)
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}

/**
 * POST: Get signed URL for uploading file directly to Supabase Storage
 */
async function handleGetUploadUrl(
  req: NextApiRequest,
  res: NextApiResponse<UploadUrlResponse>
) {
  try {
    // Use admin client so this validation and record creation works for unauthenticated trial users
    const supabase = createAdminClient()

    const { tenant, filename, fileType, fileSize } = req.body

    // Validate required fields
    if (!tenant || typeof tenant !== 'string') {
      logger.warn('Missing tenant in request', { body: req.body })
      return res.status(400).json({ success: false, error: 'Tenant ID is required' })
    }

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ success: false, error: 'Filename is required' })
    }

    // Validate file type
    const allowedExtensions = ['.xlsx', '.xls', '.pdf']
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(extension)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only Excel (.xlsx, .xls) and PDF files are allowed.'
      })
    }

    // Validate file size (50MB limit)
    if (fileSize && fileSize > 50 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 50MB.'
      })
    }

    logger.info('Validating trial tenant', { tenant })

    // Validate trial tenant
    const { data: trialAccess, error: trialError } = await supabase
      .from('trial_access_users')
      .select('*, companies!inner(id, subdomain, is_active)')
      .eq('tenant_id', tenant)
      .eq('is_active', true)
      .single()

    if (trialError) {
      logger.error('Trial validation query failed', { 
        tenant, 
        error: trialError,
        code: trialError.code,
        message: trialError.message,
        details: trialError.details
      })
      return res.status(403).json({ success: false, error: 'Invalid trial access' })
    }

    if (!trialAccess) {
      logger.warn('No trial access found for tenant', { tenant })
      return res.status(403).json({ success: false, error: 'Invalid trial access' })
    }

    const company = trialAccess.companies
    if (!company || !company.is_active) {
      logger.warn('Trial company is inactive', { tenant, companyId: company?.id, companyActive: company?.is_active })
      return res.status(403).json({ success: false, error: 'Trial company is not active' })
    }

    logger.info('Trial validation successful', { tenant, companyId: company.id })

    // Check for existing active uploads
    const { data: existingUpload } = await supabase
      .from('payroll_uploads')
      .select('id, upload_status')
      .eq('tenant_id', tenant)
      .in('upload_status', ['uploaded', 'processing', 'processed'])
      .limit(1)

    if (existingUpload && existingUpload.length > 0) {
      logger.warn('Trial already has active upload', { tenant, existingUploadId: existingUpload[0].id })
      return res.status(409).json({
        success: false,
        error: 'Ya tienes una planilla en proceso. Por favor espera o contacta soporte.'
      })
    }

    // Generate unique filename to prevent collisions
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFilename = `${timestamp}-${sanitizedFilename}`

    // Storage path: payroll-uploads/{tenant_id}/{unique_filename}
    const storagePath = `payroll-uploads/${tenant}/${uniqueFilename}`

    logger.info('Creating upload record', { tenant, companyId: company.id, storagePath })

    // Create upload record in database
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('payroll_uploads')
      .insert({
        company_id: company.id,
        tenant_id: tenant,
        file_name: filename,
        file_type: extension === '.pdf' ? 'pdf' : 'excel',
        file_size_bytes: fileSize || 0,
        file_url: `/storage/v1/object/public/HR_BUCKET/${storagePath}`,
        storage_path: storagePath,
        storage_bucket: 'HR_BUCKET',
        upload_status: 'uploaded'
      })
      .select()
      .single()

    if (uploadError) {
      logger.error('Failed to create upload record', { error: uploadError, tenant, companyId: company.id })
      return res.status(500).json({ success: false, error: 'Failed to create upload record' })
    }

    logger.info('Generating signed URL', { uploadId: uploadRecord.id, storagePath })

    // Generate signed URL for upload (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('HR_BUCKET')
      .createSignedUploadUrl(storagePath)

    if (urlError || !urlData) {
      logger.error('Failed to generate signed URL', { error: urlError, storagePath })
      // Cleanup upload record
      await supabase.from('payroll_uploads').delete().eq('id', uploadRecord.id)
      return res.status(500).json({ success: false, error: 'Failed to generate upload URL' })
    }

    logger.info('Upload URL generated successfully', {
      uploadId: uploadRecord.id,
      tenantId: tenant,
      companyId: company.id,
      filename,
      storagePath
    })

    return res.status(200).json({
      success: true,
      uploadUrl: urlData.signedUrl,
      uploadId: uploadRecord.id,
      storagePath,
      message: 'Upload URL generated. Use this URL to upload your file directly.'
    })

  } catch (error) {
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
 * GET: Get status of upload and extracted data
 */
async function handleGetUploadStatus(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  try {
    const supabase = createAdminClient()
    const { uploadId } = req.query

    if (!uploadId || typeof uploadId !== 'string') {
      return res.status(400).json({ success: false, error: 'Upload ID is required' })
    }

    // Get upload with extracted employees
    const { data: upload, error } = await supabase
      .from('payroll_uploads')
      .select(`
        *,
        payroll_extracted_employees(*)
      `)
      .eq('id', uploadId)
      .single()

    if (error || !upload) {
      return res.status(404).json({ success: false, error: 'Upload not found' })
    }

    return res.status(200).json({
      success: true,
      upload,
      extractedEmployees: upload.payroll_extracted_employees || [],
      totalRows: upload.payroll_extracted_employees?.length || 0,
      confidenceScore: upload.extracted_data?.confidence_score || 0,
      status: upload.upload_status
    })

  } catch (error) {
    logger.error('Error getting upload status', {
      error: error instanceof Error ? error.message : String(error)
    })
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}
