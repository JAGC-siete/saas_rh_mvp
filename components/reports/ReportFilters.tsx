import { useState, useEffect } from 'react'
import { ReportFilters as ReportFiltersType, ReportType, Periodicity } from './ReportBuilder'
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { nowInHonduras } from '../../lib/timezone'

interface ReportFiltersProps {
  reportType: ReportType
  filters: ReportFiltersType
  onFiltersChange: (filters: ReportFiltersType) => void
  loading?: boolean
}

const PERIODICITY_PRESETS = [
  { label: 'Hoy', value: 'daily', icon: '📅' },
  { label: 'Esta Semana', value: 'weekly', icon: '📆' },
  { label: 'Esta Quincena', value: 'fortnightly', icon: '📋' },
  { label: 'Este Mes', value: 'monthly', icon: '🗓️' },
  { label: 'Rango Personalizado', value: 'custom', icon: '🗓️' }
] as const

export default function ReportFilters({
  reportType,
  filters,
  onFiltersChange,
  loading = false
}: ReportFiltersProps) {
  const [employees, setEmployees] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  // Load filter options
  useEffect(() => {
    loadFilterOptions()
  }, [])

  // Set default date range based on periodicity
  useEffect(() => {
    if (!filters.from || !filters.to) {
      setDefaultDateRange(filters.periodicity)
    }
  }, [filters.periodicity])

  const loadFilterOptions = async () => {
    try {
      // Mock data for now
      setEmployees([
        { id: '1', name: 'Juan Pérez', code: 'EMP-001' },
        { id: '2', name: 'María González', code: 'EMP-002' },
        { id: '3', name: 'Carlos López', code: 'EMP-003' },
        { id: '4', name: 'Ana Martínez', code: 'EMP-004' },
        { id: '5', name: 'Pedro Rodríguez', code: 'EMP-005' },
      ])
      
      setTeams([
        { id: '1', name: 'Equipo de Desarrollo' },
        { id: '2', name: 'Equipo de Ventas' },
        { id: '3', name: 'Equipo de Soporte' },
      ])
      
      setDepartments([
        { id: '1', name: 'TI' },
        { id: '2', name: 'RRHH' },
        { id: '3', name: 'Ventas' },
        { id: '4', name: 'Finanzas' },
      ])
    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }

  const setDefaultDateRange = (periodicity: Periodicity) => {
    const now = nowInHonduras()
    let from = ''
    let to = now.toISOString().split('T')[0]

    switch (periodicity) {
      case 'daily':
        from = now.toISOString().split('T')[0]
        break
      case 'weekly':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        from = weekStart.toISOString().split('T')[0]
        break
      case 'fortnightly':
        const fortnightStart = new Date(now)
        const dayOfMonth = now.getDate()
        if (dayOfMonth <= 15) {
          fortnightStart.setDate(1)
        } else {
          fortnightStart.setDate(16)
        }
        from = fortnightStart.toISOString().split('T')[0]
        break
      case 'monthly':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        break
      case 'custom':
        // Keep existing or set to current month
        if (!filters.from) {
          from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        }
        break
    }

    if (from) {
      onFiltersChange({ ...filters, from, to })
    }
  }

  const handlePeriodicityChange = (periodicity: Periodicity) => {
    onFiltersChange({ ...filters, periodicity })
    setDefaultDateRange(periodicity)
  }

  const clearFilters = () => {
    onFiltersChange({
      reportType: filters.reportType,
      periodicity: filters.periodicity,
      from: '',
      to: ''
    })
  }

  const hasActiveFilters = !!(filters.employeeIds?.length || filters.teamIds?.length || 
                              filters.departmentIds?.length || filters.attendanceStatus?.length)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">Filtros de Reporte</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <XMarkIcon className="h-4 w-4" />
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Periodicity Presets */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Período
        </label>
        <div className="flex flex-wrap gap-2">
          {PERIODICITY_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePeriodicityChange(preset.value as Periodicity)}
              disabled={loading}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${filters.periodicity === preset.value
                  ? 'bg-brand-600 text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {preset.icon} {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range (always visible) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fecha Inicio
          </label>
          <input
            type="date"
            value={filters.from || ''}
            onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fecha Fin
          </label>
          <input
            type="date"
            value={filters.to || ''}
            onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
            disabled={loading}
            className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Employee Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Empleado
        </label>
        <select
          value={filters.employeeIds?.[0] || ''}
          onChange={(e) => {
            onFiltersChange({ 
              ...filters, 
              employeeIds: e.target.value ? [e.target.value] : undefined 
            })
          }}
          disabled={loading}
          className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 appearance-none"
        >
          <option value="" className="bg-gray-800 text-gray-400">Todos los empleados</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id} className="bg-gray-800">
              {emp.name} ({emp.code})
            </option>
          ))}
        </select>
      </div>

      {/* Team Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Equipo
        </label>
        <select
          value={filters.teamIds?.[0] || ''}
          onChange={(e) => {
            onFiltersChange({ 
              ...filters, 
              teamIds: e.target.value ? [e.target.value] : undefined 
            })
          }}
          disabled={loading}
          className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50 appearance-none"
        >
          <option value="" className="bg-gray-800 text-gray-400">Todos los equipos</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id} className="bg-gray-800">
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Context-Specific Filters */}
      {reportType === 'attendance' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Estado de Asistencia
          </label>
          <div className="flex flex-wrap gap-2">
            {['present', 'absent', 'late', 'permission'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  const currentStatuses = filters.attendanceStatus || []
                  const newStatuses = currentStatuses.includes(status as any)
                    ? currentStatuses.filter(s => s !== status)
                    : [...currentStatuses, status as any]
                  onFiltersChange({ ...filters, attendanceStatus: newStatuses })
                }}
                disabled={loading}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${filters.attendanceStatus?.includes(status as any)
                    ? 'bg-brand-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }
                  disabled:opacity-50
                `}
              >
                {status === 'present' && '✅ Presente'}
                {status === 'absent' && '❌ Ausente'}
                {status === 'late' && '⏰ Tarde'}
                {status === 'permission' && '📝 Permiso'}
              </button>
            ))}
          </div>
        </div>
      )}

      {reportType === 'employees' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Estado del Empleado
          </label>
          <select
            value={filters.employeeStatus || 'all'}
            onChange={(e) => onFiltersChange({ ...filters, employeeStatus: e.target.value as any })}
            disabled={loading}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          >
            <option value="all" className="bg-gray-800">Todos</option>
            <option value="active" className="bg-gray-800">Solo Activos</option>
            <option value="inactive" className="bg-gray-800">Solo Inactivos</option>
          </select>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            {filters.employeeIds?.map(id => {
              const emp = employees.find(e => e.id === id)
              return emp && (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-brand-500/20 text-brand-300 text-xs rounded-full">
                  👤 {emp.name}
                  <button 
                    onClick={() => onFiltersChange({ ...filters, employeeIds: filters.employeeIds?.filter(eid => eid !== id) })}
                    className="hover:text-brand-100"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
            {filters.teamIds?.map(id => {
              const team = teams.find(t => t.id === id)
              return team && (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                  👥 {team.name}
                  <button 
                    onClick={() => onFiltersChange({ ...filters, teamIds: filters.teamIds?.filter(tid => tid !== id) })}
                    className="hover:text-purple-100"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

