import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '../lib/supabase/client'

interface PayrollUploadStorageProps {
  tenantId: string
  onUploadComplete?: (uploadId: string) => void
}

interface UploadStatus {
  status: 'idle' | 'requesting' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  uploadId?: string
  extractedEmployees?: any[]
}

export default function PayrollUploadStorage({ tenantId, onUploadComplete }: PayrollUploadStorageProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const subscriptionRef = useRef<any>(null)

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/pdf'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: 'Tipo de archivo no válido. Solo se permiten archivos Excel (.xlsx, .xls) o PDF.'
      })
      return
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: 'El archivo es demasiado grande. El límite es 50MB.'
      })
      return
    }

    setUploadStatus({
      status: 'requesting',
      progress: 10,
      message: 'Solicitando permiso de carga...'
    })

    try {
      // Step 1: Get signed upload URL
      const response = await fetch('/api/trial/payroll-upload-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: tenantId,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error solicitando URL de carga')
      }

      const { uploadUrl, uploadId, storagePath } = result

      setUploadStatus({
        status: 'uploading',
        progress: 30,
        message: 'Subiendo archivo a Supabase Storage...',
        uploadId
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
        status: 'processing',
        progress: 60,
        message: 'Archivo subido. Iniciando procesamiento...',
        uploadId
      })

      // Step 3: Trigger Edge Function to process file
      await triggerProcessing(uploadId, storagePath)

      // Step 4: Subscribe to real-time updates
      subscribeToUploadUpdates(uploadId)

    } catch (error) {
      setUploadStatus({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }

  const triggerProcessing = async (uploadId: string, storagePath: string) => {
    try {
      // Call Edge Function to process the file
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/process-payroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ uploadId })
      })

      if (!response.ok) {
        console.error('Failed to trigger processing:', await response.text())
        // Non-blocking: processing might still happen via Storage trigger
      }
    } catch (error) {
      console.error('Error triggering processing:', error)
      // Non-blocking: processing might still happen via Storage trigger
    }
  }

  const subscribeToUploadUpdates = (uploadId: string) => {
    // Subscribe to real-time changes on the upload record
    const channel = supabase.channel(`upload-${uploadId}`)
      
    subscriptionRef.current = channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payroll_uploads',
          filter: `id=eq.${uploadId}`
        },
        async (payload) => {
          console.log('Realtime update received:', payload)
          const newRecord = payload.new as any

          if (newRecord.upload_status === 'processed') {
            // Fetch extracted employees
            const { data: extractedEmployees } = await supabase
              .from('payroll_extracted_employees')
              .select('*')
              .eq('upload_id', uploadId)
              .order('row_number')

            setUploadStatus({
              status: 'completed',
              progress: 100,
              message: `✅ Procesado exitosamente! Se encontraron ${extractedEmployees?.length || 0} empleados.`,
              uploadId,
              extractedEmployees: extractedEmployees || []
            })

            // Unsubscribe
            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe()
            }

            onUploadComplete?.(uploadId)
          } else if (newRecord.upload_status === 'processing') {
            setUploadStatus(prev => ({
              ...prev,
              status: 'processing',
              progress: 80,
              message: 'Analizando datos de empleados...'
            }))
          } else if (newRecord.upload_status === 'failed') {
            setUploadStatus({
              status: 'error',
              progress: 0,
              message: `Error: ${newRecord.error_message || 'Procesamiento falló'}`
            })

            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe()
            }
          }
        }
      )
      .subscribe()
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const resetUpload = () => {
    setUploadStatus({
      status: 'idle',
      progress: 0,
      message: ''
    })
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case 'requesting':
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-400" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-400" />
      default:
        return <Upload className="h-8 w-8 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (uploadStatus.status) {
      case 'requesting':
      case 'uploading':
      case 'processing':
        return 'border-blue-400 bg-blue-400/10'
      case 'completed':
        return 'border-green-400 bg-green-400/10'
      case 'error':
        return 'border-red-400 bg-red-400/10'
      default:
        return 'border-gray-400 bg-gray-400/10'
    }
  }

  return (
    <Card variant="glass" className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Subir Planilla de Pago (Supabase Storage)
        </CardTitle>
        <CardDescription className="text-gray-300">
          Sube tu planilla directamente a Supabase Storage. El procesamiento es automático en tiempo real.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-blue-400 bg-blue-400/10' : 'border-gray-600 hover:border-gray-500'
          } ${uploadStatus.status !== 'idle' ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.pdf"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploadStatus.status !== 'idle'}
          />
          
          <div className="flex flex-col items-center space-y-4">
            {getStatusIcon()}
            
            <div>
              <p className="text-white font-medium">
                {uploadStatus.status === 'idle' && 'Arrastra tu planilla aquí o haz clic para seleccionar'}
                {uploadStatus.status === 'requesting' && 'Solicitando permiso de carga...'}
                {uploadStatus.status === 'uploading' && 'Subiendo a Supabase Storage...'}
                {uploadStatus.status === 'processing' && 'Procesando planilla en Edge Function...'}
                {uploadStatus.status === 'completed' && '¡Procesado exitosamente!'}
                {uploadStatus.status === 'error' && 'Error en el procesamiento'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Formatos soportados: Excel (.xlsx, .xls) y PDF
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Tamaño máximo: 50MB • Actualización en tiempo real via Realtime
              </p>
            </div>

            {uploadStatus.status === 'idle' && (
              <Button variant="outline" className="mt-4">
                Seleccionar Archivo
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {uploadStatus.status !== 'idle' && uploadStatus.status !== 'completed' && uploadStatus.status !== 'error' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Progreso</span>
              <span className="text-gray-300">{uploadStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadStatus.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 text-center">{uploadStatus.message}</p>
          </div>
        )}

        {/* Status Message */}
        {uploadStatus.message && (uploadStatus.status === 'completed' || uploadStatus.status === 'error') && (
          <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
            <p className="text-sm text-white">{uploadStatus.message}</p>
          </div>
        )}

        {/* Extracted Data Preview */}
        {uploadStatus.extractedEmployees && uploadStatus.extractedEmployees.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-white font-medium">Datos Extraídos (Tiempo Real):</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {uploadStatus.extractedEmployees.slice(0, 10).map((emp, index) => (
                <div key={index} className="bg-gray-800/50 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">{emp.extracted_name || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-400">
                        {emp.extracted_dni && `DNI: ${emp.extracted_dni}`}
                        {emp.extracted_department && ` • ${emp.extracted_department}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-medium">
                        L. {emp.extracted_salary?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round((emp.confidence_score || 0) * 100)}% confianza
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {uploadStatus.extractedEmployees.length > 10 && (
                <p className="text-sm text-gray-400 text-center">
                  ... y {uploadStatus.extractedEmployees.length - 10} empleados más
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {uploadStatus.status === 'completed' && (
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={async () => {
                try {
                  setUploadStatus(prev => ({ ...prev, message: 'Creando entorno de producción...' }))
                  
                  const response = await fetch('/api/admin/trial-conversion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                      uploadId: uploadStatus.uploadId,
                      tenantId
                    })
                  })

                  const result = await response.json()

                  if (!response.ok) {
                    throw new Error(result.error || 'Error iniciando conversión')
                  }

                  setUploadStatus(prev => ({
                    ...prev,
                    message: '✅ Conversión iniciada! Recibirás notificación cuando esté listo.'
                  }))
                } catch (error) {
                  setUploadStatus(prev => ({
                    ...prev,
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Error iniciando conversión'
                  }))
                }
              }}
            >
              🚀 Crear Entorno de Producción
            </Button>
          )}
          
          {(uploadStatus.status === 'error' || uploadStatus.status === 'completed') && (
            <Button variant="outline" onClick={resetUpload}>
              Subir Otra Planilla
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">⚡ Características Supabase:</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Upload directo a Storage (sin pasar por Next.js API)</li>
            <li>• Procesamiento en Edge Function (sin límites de tamaño)</li>
            <li>• Actualización en tiempo real via Realtime (sin polling)</li>
            <li>• RLS aplicado automáticamente en Storage y Database</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
