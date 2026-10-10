import { useState } from 'react'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import FiltersBar from './FiltersBar'
import { ExportFormatButtons } from '../ui/ExportFormatButtons'
import { getStandardColumns } from '../../lib/reports/standard-columns'

interface HeaderBarProps {
  preset: string
  onPresetChange: (preset: string) => void
  selectedEmployeeId: string
  onEmployeeChange: (employeeId: string) => void
  selectedRole?: string
  onRoleChange?: (role: string) => void
  selectedDepartmentId?: string
  onDepartmentChange?: (departmentId: string) => void
  lastUpdated: Date | null
  onExport: (format: string, opts?: { columnIds?: string[]; timeFormat?: '24h' | '12h' }) => Promise<void>
  exportColumnIds?: string[]
  onExportColumnIdsChange?: (ids: string[]) => void
  exportTimeFormat?: '24h' | '12h'
  onExportTimeFormatChange?: (fmt: '24h' | '12h') => void
  onRecalculateNow?: () => Promise<void>
  recalcLoading?: boolean
  loading?: boolean
  from?: string
  to?: string
  onRangeChange?: (from: string, to: string) => void
}

export default function HeaderBar({
  preset,
  onPresetChange,
  selectedEmployeeId,
  onEmployeeChange,
  selectedRole,
  onRoleChange,
  selectedDepartmentId,
  onDepartmentChange,
  lastUpdated,
  onExport,
  exportColumnIds = [],
  onExportColumnIdsChange,
  exportTimeFormat = '24h',
  onExportTimeFormatChange,
  onRecalculateNow,
  recalcLoading = false,
  loading = false,
  from,
  to,
  onRangeChange
}: HeaderBarProps) {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const availableColumns = getStandardColumns('attendance')

  const handleExport = async (format: string) => {
    try {
      setExportingFormat(format)
      await onExport(format, { columnIds: exportColumnIds, timeFormat: exportTimeFormat })
    } finally {
      setExportingFormat(null)
    }
  }

  const formatLastUpdated = () => {
    if (!lastUpdated) return null
    
    const now = new Date()
    const diffMs = now.getTime() - lastUpdated.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Actualizado ahora'
    if (diffMins < 60) return `Actualizado hace ${diffMins} min`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Actualizado hace ${diffHours}h`
    
    return `Actualizado ${lastUpdated.toLocaleDateString('es-HN')}`
  }

  return (
    <div className="space-y-3">
      {/* Acciones */}
      <div className="flex flex-col items-stretch sm:items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 order-first sm:order-none">
              {formatLastUpdated()}
            </span>
          )}

          {preset === 'today' && onRecalculateNow && (
            <button
              type="button"
              onClick={() => onRecalculateNow()}
              disabled={recalcLoading}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/15 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title="Vuelve a calcular las horas de hoy con las marcas más recientes"
            >
              {recalcLoading ? 'Recalculando…' : 'Recalcular ahora'}
            </button>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnsOpen((v) => !v)}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-800/80 hover:bg-gray-800 text-white"
                aria-expanded={columnsOpen}
                aria-haspopup="dialog"
              >
                <span className="inline-flex items-center gap-1.5">
                  <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden />
                  Opciones de exportación
                </span>
              </button>
              {columnsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/10 bg-gray-950/95 backdrop-blur p-3 shadow-xl z-50">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-200">Opciones de exportación</span>
                    <button
                      type="button"
                      className="text-xs text-gray-400 hover:text-white"
                      onClick={() => setColumnsOpen(false)}
                    >
                      Cerrar
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mb-3 leading-snug">
                    El archivo incluye los registros ya cerrados. Las marcas del reloj sin cerrar se revisan en
                    Cierre del día.
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-400">Hora:</span>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded-md text-xs ${exportTimeFormat === '24h' ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                      onClick={() => onExportTimeFormatChange?.('24h')}
                    >
                      24h
                    </button>
                    <button
                      type="button"
                      className={`px-2 py-1 rounded-md text-xs ${exportTimeFormat === '12h' ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                      onClick={() => onExportTimeFormatChange?.('12h')}
                    >
                      12h
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mb-2">Columnas:</p>
                  <div className="max-h-64 overflow-auto pr-1 space-y-2">
                    {availableColumns.map((c) => {
                      const checked = exportColumnIds.includes(c.id)
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                          <input
                            type="checkbox"
                            className="accent-white"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...exportColumnIds, c.id]))
                                : exportColumnIds.filter((id) => id !== c.id)
                              onExportColumnIdsChange?.(next)
                            }}
                          />
                          <span className="text-xs">{c.label}</span>
                        </label>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3">
                    <button
                      type="button"
                      className="text-xs text-gray-300 hover:text-white"
                      onClick={() => onExportColumnIdsChange?.([])}
                      title="Usar columnas por defecto configuradas"
                    >
                      Restablecer
                    </button>
                    <button
                      type="button"
                      className="text-xs text-gray-300 hover:text-white"
                      onClick={() => onExportColumnIdsChange?.(availableColumns.map((x) => x.id))}
                      title="Seleccionar todas las columnas estándar"
                    >
                      Todas
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ExportFormatButtons
              formats={['excel', 'csv', 'pdf']}
              exportScope="attendance"
              onExport={async (format) => {
                await handleExport(format === 'excel' ? 'xlsx' : format)
              }}
              disabled={!!exportingFormat}
              loadingFormat={
                exportingFormat === 'xlsx' ? 'excel' : (exportingFormat as 'pdf' | 'csv' | null)
              }
              variant="primary"
            />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FiltersBar
        preset={preset}
        onPresetChange={onPresetChange}
        selectedEmployeeId={selectedEmployeeId}
        onEmployeeChange={onEmployeeChange}
        selectedRole={selectedRole}
        onRoleChange={onRoleChange}
        selectedDepartmentId={selectedDepartmentId}
        onDepartmentChange={onDepartmentChange}
        loading={loading}
        from={from}
        to={to}
        onRangeChange={onRangeChange}
      />
    </div>
  )
}
