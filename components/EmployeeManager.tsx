import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useSupabaseSession } from '../lib/hooks/useSession'
import { Employee } from '../lib/types/employee'
import AddEmployeeForm from './AddEmployeeForm'
import { PlusIcon } from '@heroicons/react/24/outline'

interface Department {
  id: string
  name: string
}

interface WorkSchedule {
  id: string
  name: string
}

const INITIAL_FORM_DATA = {
  employee_code: '',
  dni: '',
  name: '',
  email: '',
  phone: '',
  department_id: '',
  work_schedule_id: '',
  position: '',
  salary: '',
  hire_date: '',
  status: 'active'
}

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useSupabaseSession()

  // Simple fetch function
  const fetchEmployees = useCallback(async () => {
    if (!user?.id) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching employees for user:', user.id)
      
      const response = await fetch('/api/employees/search?limit=50', {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      })
      console.log('📡 API Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ API Data received:', data)
      
      setEmployees(data.employees || [])
    } catch (err) {
      console.error('💥 Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Error fetching employees')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }, [])

  const fetchWorkSchedules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('work_schedules')
        .select('id, name')
        .order('name')

      if (error) throw error
      setWorkSchedules(data || [])
    } catch (error) {
      console.error('Error fetching work schedules:', error)
    }
  }, [])

  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error creating employee: ${response.status} - ${errorText}`)
      }

      // Reset form and refresh employees
      setFormData(INITIAL_FORM_DATA)
      setShowForm(false)
      fetchEmployees()
    } catch (error) {
      console.error('Error creating employee:', error)
      setError(error instanceof Error ? error.message : 'Error creating employee')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, fetchEmployees])

  const handleCancel = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setShowForm(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchEmployees()
      fetchDepartments()
      fetchWorkSchedules()
    }
  }, [user?.id, fetchEmployees, fetchDepartments, fetchWorkSchedules])

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando empleados...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !showForm) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">
                <h3 className="text-lg font-semibold">Error al cargar empleados</h3>
                <p className="text-sm mt-2">{error}</p>
              </div>
              <Button onClick={fetchEmployees} variant="outline">
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showForm ? (
        <AddEmployeeForm
          formData={formData}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          departments={departments}
          workSchedules={workSchedules}
          loading={isSubmitting}
        />
      ) : (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Empleados</h2>
            <p className="text-gray-600">Administra la información de los empleados</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nuevo Empleado</span>
          </Button>
        </div>
      )}

      {error && showForm && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-600">
            <h3 className="text-sm font-medium">Error al crear empleado</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados ({employees.length})</CardTitle>
          <CardDescription>
            Empleados registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No se encontraron empleados
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{employee.name}</h3>
                      <p className="text-sm text-gray-600">DNI: {employee.dni}</p>
                      <p className="text-sm text-gray-600">Código: {employee.employee_code}</p>
                      <p className="text-sm text-gray-600">Email: {employee.email}</p>
                      <p className="text-sm text-gray-600">Departamento: {employee.departments?.name || 'Sin asignar'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        employee.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}