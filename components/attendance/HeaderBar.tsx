import { useState } from 'react'
import Link from 'next/link'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
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
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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

      {/* Acciones del header */}
      <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
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
              title="Recalcular horas (Capa Base) para hoy"
            >
              {recalcLoading ? 'Recalculando…' : 'Recalcular ahora'}
            </button>
          )}

          <Link
            href="/app/attendance/corrections"
            className="px-3 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-200"
            title="Solicitudes y revisión de correcciones de asistencia"
          >
            Correcciones
          </Link>
          <Link
            href="/app/attendance/scheduling"
            className="px-3 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-200"
            title="Asignación de turnos por fecha (Scheduling)"
          >
            Scheduling
          </Link>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnsOpen((v) => !v)}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-800/80 hover:bg-gray-800 text-white"
                aria-expanded={columnsOpen}
              >
                Columnas
              </button>
              {columnsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/10 bg-gray-950/95 backdrop-blur p-3 shadow-xl z-50">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-200">Exportación</span>
                    <button
                      type="button"
                      className="text-xs text-gray-400 hover:text-white"
                      onClick={() => setColumnsOpen(false)}
                    >
                      Cerrar
                    </button>
                  </div>

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
                      Reset (default)
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
            <button
              type="button"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Las exportaciones reflejan registros consolidados (post-cierre). Las marcas crudas del reloj biométrico se revisan en Control de horas extras."
              aria-label="Información sobre exportaciones y control de horas extras"
            >
              <InformationCircleIcon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 max-w-md text-left sm:text-right leading-snug hidden sm:block">
          Consolidado post-cierre. Marcas del reloj: revisar en Control de horas extras.
        </p>
      </div>
    </div>
  )
}
