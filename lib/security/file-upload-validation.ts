/**
 * File Upload Validation Helpers
 * Provides secure validation functions for employee file uploads
 */

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  profile_photo: ['image/jpeg', 'image/png'],
  document: ['image/jpeg', 'image/png', 'application/pdf']
} as const

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
  profile_photo: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024 // 10MB
} as const

// Document categories
export const DOCUMENT_CATEGORIES = [
  'contrato',
  'identidad',
  'certificado',
  'diploma',
  'otro'
] as const

export type FileType = 'profile_photo' | 'document'
export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number]

/**
 * Validates MIME type against allowed types for file type
 */
export function validateFileType(
  mimeType: string,
  fileType: FileType
): { valid: boolean; error?: string } {
  const allowedTypes = ALLOWED_MIME_TYPES[fileType]
  
  if (!allowedTypes.includes(mimeType as any)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types for ${fileType}: ${allowedTypes.join(', ')}`
    }
  }
  
  return { valid: true }
}

/**
 * Validates file size against maximum for file type
 */
export function validateFileSize(
  size: number,
  fileType: FileType
): { valid: boolean; error?: string } {
  const maxSize = MAX_FILE_SIZES[fileType]
  
  if (size <= 0) {
    return {
      valid: false,
      error: 'File size must be greater than 0'
    }
  }
  
  if (size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `File too large. Maximum size for ${fileType} is ${maxSizeMB}MB`
    }
  }
  
  return { valid: true }
}

/**
 * Sanitizes filename to prevent path traversal and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename must be a non-empty string')
  }
  
  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[\/\\]/g, '_') // Replace slashes
    .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Replace dangerous chars
    .replace(/\.\./g, '_') // Replace parent directory references
    .trim()
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'))
    sanitized = sanitized.substring(0, 255 - ext.length) + ext
  }
  
  return sanitized
}

/**
 * Generates storage path for employee file
 * Format: companies/{company_id}/employees/{employee_id}/profile.jpg
 *         companies/{company_id}/employees/{employee_id}/documents/{category}_{timestamp}.{ext}
 */
export function generateStoragePath(
  companyId: string,
  employeeId: string,
  fileType: FileType,
  filename: string,
  category?: string
): string {
  // Validate UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(companyId) || !uuidRegex.test(employeeId)) {
    throw new Error('Invalid company_id or employee_id format')
  }
  
  // Sanitize filename
  const sanitized = sanitizeFilename(filename)
  
  // Extract extension
  const ext = sanitized.substring(sanitized.lastIndexOf('.')).toLowerCase()
  
  if (fileType === 'profile_photo') {
    // Profile photos: companies/{company_id}/employees/{employee_id}/profile.{ext}
    return `companies/${companyId}/employees/${employeeId}/profile${ext}`
  } else {
    // Documents: companies/{company_id}/employees/{employee_id}/documents/{category}_{timestamp}.{ext}
    if (!category) {
      throw new Error('Document category is required for document files')
    }
    const timestamp = Date.now()
    const safeCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '_')
    return `companies/${companyId}/employees/${employeeId}/documents/${safeCategory}_${timestamp}${ext}`
  }
}

/**
 * Validates that employee belongs to the specified company
 */
export async function validateEmployeeAccess(
  supabase: any,
  employeeId: string,
  companyId: string
): Promise<{ valid: boolean; error?: string; employee?: any }> {
  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, company_id, name, status')
      .eq('id', employeeId)
      .single()
    
    if (error || !employee) {
      return {
        valid: false,
        error: 'Employee not found'
      }
    }
    
    if (employee.company_id !== companyId) {
      return {
        valid: false,
        error: 'Employee does not belong to the specified company'
      }
    }
    
    if (employee.status !== 'active') {
      return {
        valid: false,
        error: 'Employee is not active'
      }
    }
    
    return {
      valid: true,
      employee
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Error validating employee access'
    }
  }
}

/**
 * Validates document category
 */
export function validateDocumentCategory(category: string): { valid: boolean; error?: string } {
  if (!category || typeof category !== 'string') {
    return {
      valid: false,
      error: 'Document category is required'
    }
  }
  
  const normalized = category.toLowerCase().trim()
  
  if (!DOCUMENT_CATEGORIES.includes(normalized as DocumentCategory)) {
    return {
      valid: false,
      error: `Invalid document category. Allowed: ${DOCUMENT_CATEGORIES.join(', ')}`
    }
  }
  
  return { valid: true }
}

/**
 * Gets MIME type from filename extension
 */
export function getMimeTypeFromFilename(filename: string): string | null {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1)
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'pdf': 'application/pdf'
  }
  
  return mimeTypes[ext] || null
}

/**
 * Validates complete file upload request
 */
export async function validateFileUploadRequest(
  supabase: any,
  employeeId: string,
  companyId: string,
  fileType: FileType,
  filename: string,
  fileSize: number,
  mimeType: string,
  documentCategory?: string
): Promise<{ valid: boolean; error?: string; employee?: any }> {
  // Validate employee access
  const accessCheck = await validateEmployeeAccess(supabase, employeeId, companyId)
  if (!accessCheck.valid) {
    return accessCheck
  }
  
  // Validate file type
  const typeCheck = validateFileType(mimeType, fileType)
  if (!typeCheck.valid) {
    return typeCheck
  }
  
  // Validate file size
  const sizeCheck = validateFileSize(fileSize, fileType)
  if (!sizeCheck.valid) {
    return sizeCheck
  }
  
  // Validate document category if document type
  if (fileType === 'document') {
    if (!documentCategory) {
      return {
        valid: false,
        error: 'Document category is required for document files'
      }
    }
    const categoryCheck = validateDocumentCategory(documentCategory)
    if (!categoryCheck.valid) {
      return categoryCheck
    }
  }
  
  return {
    valid: true,
    employee: accessCheck.employee
  }
}






