'use client'

import { Download } from 'lucide-react'
import { Button } from './button'
import { useCanExportReportsScope, type ExportPermissionScope } from '../../lib/hooks/useCanonicalPermissions'

export type ExportFormat = 'pdf' | 'excel' | 'csv'

interface ExportFormatButtonsProps {
  formats: ExportFormat[]
  onExport: (format: ExportFormat) => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  loadingFormat?: ExportFormat | null
  size?: 'sm' | 'default' | 'lg'
  variant?: 'primary' | 'outline'
  /**
   * If true, skips the built-in permission gate.
   * Use only for self-service contexts (e.g. employee portal exporting own data)
   * where the backend already enforces the proper rules.
   */
  bypassPermissionCheck?: boolean
  /** `attendance` permite managers con reporte de asistencia; `full` requiere export general. */
  exportScope?: ExportPermissionScope
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
  variant = 'primary',
  bypassPermissionCheck = false,
  exportScope = 'full',
}: ExportFormatButtonsProps) {
  const canExport = useCanExportReportsScope(exportScope)
  const permissionBlocked = !bypassPermissionCheck && !canExport
  const baseClass = variant === 'primary'
    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
    : 'bg-white/5 border-white/20 text-white hover:bg-white/10'

  const handleClick = async (format: ExportFormat) => {
    if (permissionBlocked) return
    const result = onExport(format)
    if (result instanceof Promise) {
      await result
    }
  }

  const blockedTitle = 'No tiene permisos para exportar reportes'

  return (
    <div className="flex gap-2">
      {formats.map((format) => {
        const isExporting = loading || loadingFormat === format
        const isDisabled = disabled || isExporting || permissionBlocked
        return (
          <Button
            key={format}
            variant="outline"
            size={size}
            disabled={isDisabled}
            onClick={() => handleClick(format)}
            className={`${baseClass} border`}
            title={permissionBlocked ? blockedTitle : undefined}
            aria-disabled={isDisabled}
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
