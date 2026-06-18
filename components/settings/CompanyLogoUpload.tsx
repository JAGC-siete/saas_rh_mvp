import { useState, useRef, useCallback, useEffect } from 'react'
import { PhotoIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'

interface CompanyLogoUploadProps {
  companyId: string
  onLogoChange?: (previewUrl: string | null) => void
  variant?: 'dark'
}

type UploadStatus = 'idle' | 'requesting' | 'uploading' | 'confirming' | 'success' | 'error'

export default function CompanyLogoUpload({
  companyId,
  onLogoChange,
  variant = 'dark',
}: CompanyLogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hasLogo, setHasLogo] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [message, setMessage] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadCurrentLogo = useCallback(async () => {
    if (!companyId) return
    setLoadingInitial(true)
    try {
      const res = await fetch('/api/companies/branding/logo', { credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.previewUrl) {
        setPreviewUrl(data.previewUrl)
        setHasLogo(true)
        onLogoChange?.(data.previewUrl)
      } else {
        setPreviewUrl(null)
        setHasLogo(false)
        onLogoChange?.(null)
      }
    } catch {
      setPreviewUrl(null)
      setHasLogo(false)
    } finally {
      setLoadingInitial(false)
    }
  }, [companyId, onLogoChange])

  useEffect(() => {
    void loadCurrentLogo()
  }, [loadCurrentLogo])

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        setStatus('error')
        setMessage('Solo se permiten archivos JPG o PNG')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        setStatus('error')
        setMessage('El archivo no puede superar 2MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => setPreviewUrl(e.target?.result as string)
      reader.readAsDataURL(file)

      setStatus('requesting')
      setMessage('Preparando carga...')

      try {
        const urlRes = await fetch('/api/companies/branding/logo/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            filename: file.name,
            file_size: file.size,
            mime_type: file.type,
          }),
        })
        const urlData = await urlRes.json()
        if (!urlRes.ok) throw new Error(urlData.error || 'Error al preparar la carga')

        setStatus('uploading')
        setMessage('Subiendo logo...')

        const uploadRes = await fetch(urlData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
            'x-upsert': 'true',
          },
        })
        if (!uploadRes.ok) throw new Error('Error al subir el archivo')

        setStatus('confirming')
        setMessage('Guardando...')

        const confirmRes = await fetch('/api/companies/branding/logo/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            storage_path: urlData.storagePath,
            mime_type: file.type,
          }),
        })
        const confirmData = await confirmRes.json()
        if (!confirmRes.ok) throw new Error(confirmData.error || 'Error al confirmar')

        setStatus('success')
        setMessage('Logo actualizado')
        setHasLogo(true)
        if (confirmData.previewUrl) {
          setPreviewUrl(confirmData.previewUrl)
          onLogoChange?.(confirmData.previewUrl)
        }
        setTimeout(() => {
          setStatus('idle')
          setMessage('')
        }, 2500)
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Error al subir')
        void loadCurrentLogo()
      }
    },
    [loadCurrentLogo, onLogoChange]
  )

  const handleDelete = async () => {
    if (!confirm('¿Eliminar el logo de la empresa?')) return
    setStatus('requesting')
    setMessage('Eliminando...')
    try {
      const res = await fetch('/api/companies/branding/logo', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'No se pudo eliminar')
      }
      setPreviewUrl(null)
      setHasLogo(false)
      onLogoChange?.(null)
      setStatus('success')
      setMessage('Logo eliminado')
      setTimeout(() => {
        setStatus('idle')
        setMessage('')
      }, 2000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const isDark = variant === 'dark'
  const borderClass = dragActive
    ? 'border-brand-400 bg-brand-500/10'
    : isDark
      ? 'border-white/20 bg-white/5 hover:border-white/30'
      : 'border-gray-300 bg-gray-50'

  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-xl border-2 border-dashed p-6 transition-colors ${borderClass}`}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragActive(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void uploadFile(file)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadFile(file)
            e.target.value = ''
          }}
        />

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-28 h-28 rounded-lg border border-white/15 bg-black/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {loadingInitial ? (
              <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : previewUrl ? (
              <img src={previewUrl} alt="Logo empresa" className="max-h-full max-w-full object-contain p-2" />
            ) : (
              <PhotoIcon className="h-10 w-10 text-gray-500" />
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <p className="text-sm font-medium text-white">Logo de la empresa</p>
            <p className="text-xs text-gray-400">JPG o PNG · máximo 2MB · uso en reportes y recibos PDF</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={status === 'requesting' || status === 'uploading' || status === 'confirming'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                {hasLogo ? 'Reemplazar' : 'Cargar logo'}
              </button>
              {hasLogo && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={status === 'requesting' || status === 'uploading'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 text-sm disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        {(status === 'requesting' || status === 'uploading' || status === 'confirming') && (
          <div className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {message && (
        <p
          className={`text-xs ${
            status === 'error' ? 'text-red-300' : status === 'success' ? 'text-emerald-300' : 'text-gray-400'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
