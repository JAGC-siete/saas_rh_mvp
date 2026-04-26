import { useState, useRef, useCallback } from 'react'

export type FileUploadType = 'profile_photo' | 'document'
export type DocumentCategory = 'contrato' | 'identidad' | 'certificado' | 'diploma' | 'otro'

interface EmployeeFileUploadProps {
  employeeId: string
  fileType: FileUploadType
  documentCategory?: DocumentCategory
  onUploadComplete?: (fileId: string, storagePath: string) => void
  onUploadError?: (error: string) => void
  maxSizeMB?: number
  allowedTypes?: string[]
  variant?: 'full' | 'compact' | 'dark'
  label?: string
}

interface UploadStatus {
  status: 'idle' | 'requesting' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  message: string
  fileId?: string
}

export default function EmployeeFileUpload({
  employeeId,
  fileType,
  documentCategory,
  onUploadComplete,
  onUploadError,
  maxSizeMB,
  allowedTypes,
  variant = 'full',
  label
}: EmployeeFileUploadProps) {
  const isDark = variant === 'dark'
  const displayVariant = variant === 'compact' ? 'compact' : 'full'
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Default allowed types based on file type
  const defaultAllowedTypes = fileType === 'profile_photo'
    ? ['image/jpeg', 'image/png']
    : ['image/jpeg', 'image/png', 'application/pdf']

  const finalAllowedTypes = allowedTypes || defaultAllowedTypes
  const finalMaxSizeMB = maxSizeMB || (fileType === 'profile_photo' ? 5 : 10)

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!finalAllowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no válido. Tipos permitidos: ${finalAllowedTypes.map(t => {
          if (t === 'image/jpeg') return 'JPG'
          if (t === 'image/png') return 'PNG'
          if (t === 'application/pdf') return 'PDF'
          return t
        }).join(', ')}`
      }
    }

    // Check file size
    const maxSizeBytes = finalMaxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `El archivo es demasiado grande. El límite es ${finalMaxSizeMB}MB.`
      }
    }

    return { valid: true }
  }

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: validation.error || 'Archivo inválido'
      })
      onUploadError?.(validation.error || 'Archivo inválido')
      return
    }

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }

    setUploadStatus({
      status: 'requesting',
      progress: 10,
      message: 'Solicitando permiso de carga...'
    })

    try {
      // Step 1: Get signed upload URL
      const response = await fetch('/api/employees/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          file_type: fileType,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          document_category: fileType === 'document' ? documentCategory : undefined
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error solicitando URL de carga')
      }

      const { uploadUrl, fileId, storagePath } = result

      setUploadStatus({
        status: 'uploading',
        progress: 30,
        message: 'Subiendo archivo...',
        fileId
      })

      // Step 2: Upload file directly to Supabase Storage using signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-upsert': 'true'
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('Error subiendo archivo a Storage')
      }

      setUploadStatus({
        status: 'success',
        progress: 100,
        message: 'Archivo subido exitosamente',
        fileId
      })

      onUploadComplete?.(fileId, storagePath)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: errorMessage
      })
      onUploadError?.(errorMessage)
    }
    }, [employeeId, fileType, documentCategory, finalAllowedTypes, finalMaxSizeMB, onUploadComplete, onUploadError])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }, [handleFileSelect])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const resetUpload = useCallback(() => {
    setUploadStatus({ status: 'idle', progress: 0, message: '' })
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  if (displayVariant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={finalAllowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        <button
          onClick={handleClick}
          disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'requesting'}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadStatus.status === 'uploading' ? 'Subiendo...' : label || 'Subir archivo'}
        </button>
        {uploadStatus.status === 'error' && (
          <span className="text-sm text-red-600">{uploadStatus.message}</span>
        )}
        {uploadStatus.status === 'success' && (
          <span className="text-sm text-green-600">✓ Subido</span>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={finalAllowedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? (isDark ? 'border-blue-500 bg-blue-500/20' : 'border-blue-500 bg-blue-50') : (isDark ? 'border-white/20 bg-white/5' : 'border-gray-300')}
          ${uploadStatus.status === 'uploading' ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        `}
        onClick={handleClick}
      >
        {uploadStatus.status === 'idle' && (
          <>
            <svg
              className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <span className="font-semibold">Click para seleccionar</span> o arrastra y suelta
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {finalAllowedTypes.map(t => {
                if (t === 'image/jpeg') return 'JPG'
                if (t === 'image/png') return 'PNG'
                if (t === 'application/pdf') return 'PDF'
                return t
              }).join(', ')} hasta {finalMaxSizeMB}MB
            </p>
          </>
        )}

        {uploadStatus.status === 'requesting' && (
          <div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{uploadStatus.message}</p>
          </div>
        )}

        {uploadStatus.status === 'uploading' && (
          <div>
            <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-white/20' : 'bg-gray-200'}`}>
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadStatus.progress}%` }}
              ></div>
            </div>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{uploadStatus.message}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{uploadStatus.progress}%</p>
          </div>
        )}

        {uploadStatus.status === 'success' && (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className={`mt-2 text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{uploadStatus.message}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                resetUpload()
              }}
              className={`mt-2 text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
            >
              Subir otro archivo
            </button>
          </div>
        )}

        {uploadStatus.status === 'error' && (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{uploadStatus.message}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                resetUpload()
              }}
              className={`mt-2 text-xs ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>

      {preview && fileType === 'profile_photo' && (
        <div className="mt-4">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Vista previa:</p>
          <img
            src={preview}
            alt="Preview"
            className={`max-w-xs max-h-48 rounded-lg border ${isDark ? 'border-white/20' : 'border-gray-300'}`}
          />
        </div>
      )}
    </div>
  )
}

