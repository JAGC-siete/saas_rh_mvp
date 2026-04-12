import { useState } from 'react'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import FiltersBar from './FiltersBar'
import { ExportFormatButtons } from '../ui/ExportFormatButtons'

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
  onExport: (format: string) => Promise<void>
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
  loading = false,
  from,
  to,
  onRangeChange
}: HeaderBarProps) {
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    try {
      setExportingFormat(format)
      await onExport(format)
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

          <div className="flex items-center gap-1">
            <ExportFormatButtons
              formats={['excel', 'csv', 'pdf']}
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
              title="Las exportaciones reflejan registros consolidados (post-cierre). Las marcas crudas del reloj biométrico se revisan en Cierre de día."
              aria-label="Información sobre exportaciones y cierre de día"
            >
              <InformationCircleIcon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 max-w-md text-left sm:text-right leading-snug hidden sm:block">
          Consolidado post-cierre. Marcas del reloj: revisar en Cierre de día.
        </p>
      </div>
    </div>
  )
}
