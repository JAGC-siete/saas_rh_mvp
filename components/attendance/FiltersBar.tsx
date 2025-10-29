import { useState, useEffect } from 'react'
import { ChevronDownIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Employee {
  id: string
  name: string
  dni: string
  employee_code?: string
  department?: string
}

interface FiltersBarProps {
  preset: string
  onPresetChange: (p: string) => void
  selectedEmployeeId?: string
  onEmployeeChange?: (employeeId: string) => void
  selectedRole?: string
  onRoleChange?: (role: string) => void
  loading?: boolean
  // Date range support
  from?: string
  to?: string
  onRangeChange?: (from: string, to: string) => void
}

const presets = [
  { label: 'Hoy', value: 'today', icon: '📅' },
  { label: 'Esta Semana', value: 'week', icon: '📆' },
  { label: 'Esta Quincena', value: 'fortnight', icon: '📋' },
  { label: 'Este Mes', value: 'month', icon: '🗓️' },
  { label: 'Este Año', value: 'year', icon: '📊' }
]

export default function FiltersBar({
  preset,
  onPresetChange,
  selectedEmployeeId = '',
  onEmployeeChange,
  selectedRole = '',
  onRoleChange,
  loading = false,
  from,
  to,
  onRangeChange
}: FiltersBarProps) {
  // Estado para empleados
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  
  // Estado para roles/equipos
  const [roles, setRoles] = useState<string[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  // Cargar lista de empleados activos
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoadingEmployees(true)
        const response = await fetch('/api/attendance/employees')
        if (response.ok) {
          const data = await response.json()
          setEmployees(data || [])
        }
      } catch (error) {
        console.error('Error loading employees:', error)
        setEmployees([])
      } finally {
        setLoadingEmployees(false)
      }
    }

    loadEmployees()
  }, [])

  // Cargar lista de roles/equipos
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoadingRoles(true)
        const response = await fetch('/api/teams')
        if (response.ok) {
          const data = await response.json()
          if (data?.success) {
            setRoles(data.roles || [])
          }
        }
      } catch (error) {
        console.error('Error loading roles:', error)
        setRoles([])
      } finally {
        setLoadingRoles(false)
      }
    }

    loadRoles()
  }, [])

  const handleEmployeeChange = (employeeId: string) => {
    onEmployeeChange && onEmployeeChange(employeeId)
  }

  const handleRoleChange = (role: string) => {
    onRoleChange && onRoleChange(role)
  }

  const clearFilters = () => {
    if (onEmployeeChange) onEmployeeChange('')
    if (onRoleChange) onRoleChange('')
  }

  const hasActiveFilters = selectedEmployeeId || selectedRole

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-white">Filtros</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors rounded hover:bg-white/10"
          >
            <XMarkIcon className="h-4 w-4" />
            Limpiar
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Presets */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Período</label>
          <div className="relative">
            <select
              value={preset}
              onChange={(e) => onPresetChange(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 appearance-none pr-8"
            >
              {presets.map((p) => (
                <option key={p.value} value={p.value} className="bg-gray-800">
                  {p.icon} {p.label}
                </option>
              ))}
              <option value="custom" className="bg-gray-800">🗓️ Rango personalizado</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Date range (only if custom) */}
        {preset === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Desde</label>
              <input
                type="date"
                value={(from || '').slice(0, 10)}
                onChange={(e) => onRangeChange && onRangeChange(e.target.value, to || e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Hasta</label>
              <input
                type="date"
                value={(to || '').slice(0, 10)}
                onChange={(e) => onRangeChange && onRangeChange(from || e.target.value, e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
              />
            </div>
          </>
        )}

        {/* Employee Filter */}
        {onEmployeeChange && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Empleado</label>
            <div className="relative">
              <select
                value={selectedEmployeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                disabled={loadingEmployees || loading}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 appearance-none pr-8 disabled:opacity-50"
              >
                <option value="" className="bg-gray-800">👤 Todos los empleados</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id} className="bg-gray-800">
                    {employee.name} {employee.employee_code ? `(${employee.employee_code})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
            {loadingEmployees && (
              <div className="text-xs text-gray-500 mt-1">Cargando...</div>
            )}
          </div>
        )}

        {/* Team/Role Filter */}
        {onRoleChange && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Equipo</label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={loadingRoles || loading}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-medium cursor-pointer hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 appearance-none pr-8 disabled:opacity-50"
              >
                <option value="" className="bg-gray-800">👥 Todos los equipos</option>
                {roles.map(role => (
                  <option key={role} value={role} className="bg-gray-800">{role}</option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
            {loadingRoles && (
              <div className="text-xs text-gray-500 mt-1">Cargando...</div>
            )}
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            {selectedEmployeeId && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-500/20 text-brand-300 text-xs rounded-full">
                Empleado seleccionado
                <button 
                  onClick={() => handleEmployeeChange('')}
                  className="hover:text-brand-100"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedRole && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-500/20 text-brand-300 text-xs rounded-full">
                Equipo: {selectedRole}
                <button 
                  onClick={() => handleRoleChange('')}
                  className="hover:text-brand-100"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
