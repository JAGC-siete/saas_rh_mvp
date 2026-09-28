/**
 * Carga de una foto en el panel lateral del editor.
 * El archivo va a Storage con URL firmada; el formulario solo guarda la URL pública.
 * La vista previa reacciona al instante porque el campo entra en watch().
 */

import { useRef, useState } from 'react'
import { useController, type Control } from 'react-hook-form'
import { requestLandingMediaUpload } from '../../../lib/landings/admin-api'
import { LANDING_MEDIA_MAX_BYTES } from '../../../lib/landings/media'

const ACCEPT = 'image/jpeg,image/png,image/webp'

type UploadPhase = 'idle' | 'uploading' | 'error'

async function putFile(url: string, file: File): Promise<void> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!response.ok) throw new Error('No se pudo subir la imagen')
}

export function LandingImageField({
  control,
  name,
  landingId,
  label,
  hint,
  allowClear = true,
}: {
  control: Control<any>
  name: string
  landingId: string
  label: string
  hint?: string
  allowClear?: boolean
}) {
  const { field } = useController({ control, name })
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const value = typeof field.value === 'string' ? field.value : ''

  async function upload(file: File) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setPhase('error')
      setError('Usa una imagen JPG, PNG o WebP')
      return
    }
    if (file.size > LANDING_MEDIA_MAX_BYTES) {
      setPhase('error')
      setError('La imagen no puede superar 5 MB')
      return
    }

    setPhase('uploading')
    setError(null)
    try {
      const payload = await requestLandingMediaUpload(landingId, file)
      await putFile(payload.uploadUrl, file)
      field.onChange(payload.publicUrl)
      setPhase('idle')
    } catch (err: unknown) {
      setPhase('error')
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen')
    }
  }

  function onFiles(list: FileList | null) {
    const file = list?.[0]
    if (file) void upload(file)
  }

  const busy = phase === 'uploading'

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-300">{label}</span>
      {value ? (
        <div
          className="flex items-center gap-3 rounded-lg border border-white/15 bg-black/20 p-2"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            if (!busy) onFiles(event.dataTransfer.files)
          }}
        >
          <img src={value} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
          <div className="flex min-w-0 flex-col gap-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="text-left text-xs font-medium text-white hover:underline disabled:opacity-50"
            >
              Reemplazar
            </button>
            {allowClear && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  field.onChange('')
                  setError(null)
                  setPhase('idle')
                }}
                className="text-left text-xs text-gray-400 hover:text-red-300 disabled:opacity-50"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragOver(false)
            onFiles(event.dataTransfer.files)
          }}
          className={`flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-3 py-4 text-center text-xs text-gray-300 ${
            dragOver ? 'border-white bg-white/10' : 'border-white/25 bg-white/5'
          }`}
        >
          Arrastra una foto o haz clic para subirla
          <span className="mt-1 text-[11px] text-gray-500">JPG, PNG o WebP · máximo 5 MB</span>
        </button>
      )}
      {busy && <p className="mt-1 text-[11px] text-gray-400">Subiendo…</p>}
      {phase === 'error' && error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
