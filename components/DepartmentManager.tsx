import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '@supabase/auth-helpers-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Department {
  id: string
  company_id: string
  name: string
  description?: string
  manager_id?: string
  created_at: string
  employees?: Employee[]
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
}

const INITIAL_FORM_DATA = {
  name: '',
  description: '',
  manager_id: ''
}

const CONFIRMATION_MESSAGE = '¿Estás seguro de que quieres eliminar este departamento?'
const NO_MANAGER_TEXT = 'Sin asignar'
const NO_DEPARTMENTS_TEXT = 'No hay departamentos registrados'

export default function DepartmentManager() {
  const session = useSession()
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          employees:employees(id, first_name, last_name, email)
        `)
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email')
        .eq('status', 'active')
        .order('first_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }, [])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setShowForm(false)
    setEditingDepartment(null)
  }, [])

  const handleFormChange = useCallback((field: keyof typeof INITIAL_FORM_DATA, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      const departmentData = {
        name: formData.name,
        description: formData.description || null,
        manager_id: formData.manager_id || null
      }

      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update(departmentData)
          .eq('id', editingDepartment.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([departmentData])

        if (error) throw error
      }

      resetForm()
      fetchDepartments()
    } catch (error) {
      console.error('Error saving department:', error)
    } finally {
      setLoading(false)
    }
  }, [formData, editingDepartment, resetForm, fetchDepartments])

  const handleEdit = useCallback((department: Department) => {
    setEditingDepartment(department)
    setFormData({
      name: department.name,
      description: department.description || '',
      manager_id: department.manager_id || ''
    })
    setShowForm(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(CONFIRMATION_MESSAGE)) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchDepartments()
    } catch (error) {
      console.error('Error deleting department:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchDepartments])

  const getManagerName = useCallback((managerId: string) => {
    const manager = employees.find(emp => emp.id === managerId)
    return manager ? `${manager.first_name} ${manager.last_name}` : NO_MANAGER_TEXT
  }, [employees])



  const isLoadingInitial = loading && departments.length === 0

  useEffect(() => {
    if (session?.user) {
      fetchDepartments()
      fetchEmployees()
    }
  }, [session, fetchDepartments, fetchEmployees])

  if (isLoadingInitial) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Departamentos</h2>
        <Button 
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nuevo Departamento</span>
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingDepartment ? 'Editar Departamento' : 'Nuevo Departamento'}
            </CardTitle>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  required
                  placeholder="Ej: Recursos Humanos"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager
                </label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => handleFormChange('manager_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar manager</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción del departamento"
              />
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Guardando...' : editingDepartment ? 'Actualizar' : 'Crear'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Cancelar
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <Card key={department.id}>
            <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{department.name}</h3>
                {department.description && (
                  <p className="text-gray-600 text-sm mt-1">{department.description}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(department)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(department.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Manager: </span>
                <span className="text-sm text-gray-600">
                  {getManagerName(department.manager_id || '')}
                </span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-700">Empleados: </span>
                <span className="text-sm text-gray-600">
                  {department.employees?.length || 0}
                </span>
              </div>
            </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {departments.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">{NO_DEPARTMENTS_TEXT}</p>
        </div>
      )}
    </div>
  )
}
