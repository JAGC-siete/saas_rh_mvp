import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useToast } from '../lib/toast'

interface Employee {
  id: string
  name: string
  email: string
}

type CostCenterType = 'ventas' | 'administracion' | 'produccion' | null

interface Department {
  id: string
  name: string
  description?: string
  manager_id?: string
  cost_center_type?: CostCenterType
}

interface EditDepartmentModalProps {
  isOpen: boolean
  department: Department | null
  onClose: () => void
  onSuccess: () => void
}

export default function EditDepartmentModal({ 
  isOpen, 
  department,
  onClose, 
  onSuccess 
}: EditDepartmentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager_id: '',
    cost_center_type: '' as CostCenterType | ''
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  // Initialize form data when department changes
  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        description: department.description || '',
        manager_id: department.manager_id || '',
        cost_center_type: department.cost_center_type || ''
      })
    }
  }, [department])

  // Fetch active employees for manager selection
  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true)
      const response = await fetch('/api/employees/search?limit=100&status=active', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.employees || [])
      } else {
        console.error('Error fetching employees:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoadingEmployees(false)
    }
  }, [])

  // Load employees when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEmployees()
      setError('')
    }
  }, [isOpen, fetchEmployees])

  const handleFormChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }, [error])

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      setError('El nombre del departamento es requerido')
      return false
    }

    if (formData.name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres')
      return false
    }

    if (formData.name.trim().length > 100) {
      setError('El nombre no puede exceder 100 caracteres')
      return false
    }

    if (formData.description && formData.description.length > 500) {
      setError('La descripción no puede exceder 500 caracteres')
      return false
    }

    return true
  }, [formData])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !department) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const departmentData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        manager_id: formData.manager_id || null,
        cost_center_type: formData.cost_center_type || null
      }

      const response = await fetch(`/api/departments/${department.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(departmentData),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error('Ya existe un departamento con este nombre')
        } else if (response.status === 404) {
          throw new Error('Departamento no encontrado')
        } else if (response.status === 403) {
          throw new Error('No tienes permisos para editar este departamento')
        } else {
          throw new Error(errorData.error || 'Error al actualizar el departamento')
        }
      }

      // Success
      toast.success('Éxito', 'Departamento actualizado exitosamente')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error updating department:', error)
      setError(error.message || 'Error inesperado al actualizar el departamento')
    } finally {
      setLoading(false)
    }
  }, [formData, department, validateForm, onSuccess, onClose, toast])

  const handleClose = useCallback(() => {
    if (!loading) {
      setError('')
      onClose()
    }
  }, [loading, onClose])

  const getManagerName = useCallback((managerId: string) => {
    if (!managerId) return 'Sin asignar'
    const manager = employees.find(emp => emp.id === managerId)
    return manager ? manager.name : 'Sin asignar'
  }, [employees])

  if (!isOpen || !department) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-md mx-4 bg-gray-900/95 border-gray-700" variant="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-white">✏️ Editar Departamento</CardTitle>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Department Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre del Departamento *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Ej: Recursos Humanos, Ventas, IT..."
                disabled={loading}
                className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-brand-500"
                required
              />
              <div className="text-xs text-gray-400 mt-1">
                {formData.name.length}/100 caracteres
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Descripción opcional del departamento..."
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-gray-400 resize-none"
              />
              <div className="text-xs text-gray-400 mt-1">
                {formData.description.length}/500 caracteres
              </div>
            </div>

            {/* Centro de Costo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Centro de Costo (Contabilidad)
              </label>
              <select
                value={formData.cost_center_type ?? ''}
                onChange={(e) =>
                  handleFormChange(
                    'cost_center_type',
                    e.target.value || ''
                  )
                }
                disabled={loading}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white"
              >
                <option value="">Sin asignar</option>
                <option value="ventas">Ventas</option>
                <option value="administracion">Administración</option>
                <option value="produccion">Producción</option>
              </select>
              <div className="text-xs text-gray-400 mt-1">
                Para asignar gastos de sueldos por centro de costo en asientos
                contables
              </div>
            </div>

            {/* Manager Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Gerente/Manager
              </label>
              {loadingEmployees ? (
                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
                  <span>Cargando empleados...</span>
                </div>
              ) : (
                <>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => handleFormChange('manager_id', e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white"
                  >
                    <option value="">Sin asignar</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                  
                  {/* Current Manager Display */}
                  {department.manager_id && (
                    <div className="text-xs text-gray-400 mt-1">
                      Manager actual: {getManagerName(department.manager_id)}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Actualizando...</span>
                  </div>
                ) : (
                  '💾 Actualizar Departamento'
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
