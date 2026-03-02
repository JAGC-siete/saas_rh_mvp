'use client'

import { Download } from 'lucide-react'
import { Button } from './button'

export type ExportFormat = 'pdf' | 'excel' | 'csv'

interface ExportFormatButtonsProps {
  formats: ExportFormat[]
  onExport: (format: ExportFormat) => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  loadingFormat?: ExportFormat | null
  size?: 'sm' | 'default' | 'lg'
  variant?: 'primary' | 'outline'
}

const formatLabels: Record<ExportFormat, string> = {
  pdf: 'PDF',
  excel: 'Excel',
  csv: 'CSV'
}

/**
 * Botones estándar de exportación (PDF, Excel, CSV) con icono de descarga.
 * Estilo consistente en todo el SaaS según diseño de referencia.
 */
export function ExportFormatButtons({
  formats,
  onExport,
  disabled = false,
  loading = false,
  loadingFormat = null,
  size = 'sm',
  variant = 'primary'
}: ExportFormatButtonsProps) {
  const baseClass = variant === 'primary'
    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'

  const handleClick = async (format: ExportFormat) => {
    const result = onExport(format)
    if (result instanceof Promise) {
      await result
    }
  }

  return (
    <div className="flex gap-2">
      {formats.map((format) => {
        const isExporting = loading || loadingFormat === format
        return (
          <Button
            key={format}
            variant="outline"
            size={size}
            disabled={disabled || isExporting}
            onClick={() => handleClick(format)}
            className={`${baseClass} border`}
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {formatLabels[format]}
              </span>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {formatLabels[format]}
              </>
            )}
          </Button>
        )
      })}
    </div>
  )
}
