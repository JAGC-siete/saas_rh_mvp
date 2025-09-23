import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { useAuth } from '../lib/auth'
import { useCompanyContext } from '../lib/useCompanyContext'
import { Employee } from '../lib/types/employee'
import AddEmployeeForm from './AddEmployeeForm'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'
import { getHondurasTimestamp, formatTimeDisplay } from '../lib/timezone'

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
  role: '',
  team: '',
  department_id: '',
  work_schedule_id: '',
  base_salary: '',
  hire_date: '',
  termination_date: '',
  status: 'active',
  bank_name: '',
  bank_account: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address: '',
  metadata: ''
}

export default function EmployeeManager({ companyId: propCompanyId }: { companyId?: string }) {
  const { user, loading: sessionLoading } = useAuth()
  const { companyId: contextCompanyId, loading: companyLoading } = useCompanyContext()
  
  // Usar companyId de props si está disponible, sino del contexto
  const companyId = propCompanyId || contextCompanyId
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [employeesError, setEmployeesError] = useState<string | null>(null)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [schedulesError, setSchedulesError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState<Employee | null>(null)
  const [terminationDate, setTerminationDate] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes('401')) return 'Sesión expirada. Por favor, inicia sesión nuevamente.'
      if (message.includes('403')) return 'No tienes permisos para realizar esta operación.'
      if (message.includes('404')) return 'No se encontró el empleado solicitado.'
      if (message.includes('409')) return 'El código de empleado ya existe. Por favor, usa un código diferente.'
      if (message.includes('missing required fields')) return 'Por favor, completa todos los campos requeridos: código, DNI, nombre y salario base.'
      if (message.includes('500')) return 'Error del servidor. Por favor, intenta más tarde.'
      if (message.includes('unauthorized')) return 'No autorizado. Por favor, inicia sesión nuevamente.'
      return error.message
    }
    return 'Error inesperado. Por favor, verifica tu conexión e intenta nuevamente.'
  }, [])

  const fetchEmployees = useCallback(async () => {
    if (!user?.id) return
    
    setEmployeesLoading(true)
    setEmployeesError(null)
    
    try {
      console.log('🔍 Fetching employees for user:', user.id)
      
      let query = supabase.from('employees').select('*')
      if (companyId) {
        query = query.eq('company_id', companyId)
      }
      const { data, error } = await query
      if (error) throw error
      setEmployees(data || [])
    } catch (err) {
      console.error('Fetch error:', err)
      setEmployeesError(getErrorMessage(err))
    } finally {
      setEmployeesLoading(false)
    }
  }, [user?.id, getErrorMessage, companyId])

  const fetchDepartments = useCallback(async () => {
    setDepartmentsLoading(true)
    setDepartmentsError(null)
    
    try {
      console.log('🔍 Fetching departments...')
      const response = await fetch('/api/departments', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Error fetching departments: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 Raw departments response:', data)
      
      // Extraer departments del objeto de respuesta
      const departmentsList = data.departments || []
      console.log(`✅ Departments loaded: ${departmentsList.length} departments`)
      
      if (departmentsList.length > 0) {
        console.log('📋 Sample departments:', departmentsList.slice(0, 3).map((d: Department) => `${d.name} (${d.id})`))
      } else {
        console.warn('⚠️ No departments found in response')
      }
      
      setDepartments(departmentsList)
    } catch (error) {
      console.error('💥 Error fetching departments:', error)
      setDepartmentsError('Error loading departments')
    } finally {
      setDepartmentsLoading(false)
    }
  }, [])

  const fetchWorkSchedules = useCallback(async () => {
    setSchedulesLoading(true)
    setSchedulesError(null)
    
    try {
      console.log('🔍 Fetching work schedules...')
      const response = await fetch('/api/work-schedules', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Error fetching work schedules: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 Raw work schedules response:', data)
      
      // Extraer schedules del objeto de respuesta
      const schedulesList = data.schedules || []
      console.log(`✅ Work schedules loaded: ${schedulesList.length} schedules`)
      
      if (schedulesList.length > 0) {
        console.log('📋 Sample schedules:', schedulesList.slice(0, 3).map((s: WorkSchedule) => `${s.name} (${s.id})`))
      } else {
        console.warn('⚠️ No work schedules found in response')
      }
      
      setWorkSchedules(schedulesList)
    } catch (error) {
      console.error('💥 Error fetching work schedules:', error)
      setSchedulesError('Error loading work schedules')
    } finally {
      setSchedulesLoading(false)
    }
  }, [])

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA)
    setShowForm(false)
    setEditingEmployee(null)
    setEmployeesError(null)
    setDepartmentsError(null)
    setSchedulesError(null)
  }, [])

  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)
      
      const url = editingEmployee 
        ? '/api/employees/update'
        : '/api/employees/create'
      
      const method = editingEmployee ? 'PUT' : 'POST'
      
      const requestBody = editingEmployee 
        ? { id: editingEmployee.id, ...formData }
        : formData
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error ${editingEmployee ? 'updating' : 'creating'} employee: ${response.status} - ${errorText}`)
      }

      // Reset form and refresh employees
      resetForm()
      fetchEmployees()
    } catch (error) {
      console.error(`Error ${editingEmployee ? 'updating' : 'creating'} employee:`, error)
      setEmployeesError(error instanceof Error ? error.message : `Error ${editingEmployee ? 'updating' : 'creating'} employee`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, editingEmployee, resetForm, fetchEmployees])

  const handleCancel = useCallback(() => {
    resetForm()
  }, [resetForm])

  const handleEdit = useCallback((employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      employee_code: employee.employee_code || '',
      dni: employee.dni || '',
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || '',
      team: employee.team || '', // Usar team que sí existe en la BD
      department_id: employee.department_id || '',
      work_schedule_id: employee.work_schedule_id || '',
      base_salary: employee.base_salary?.toString() || '',
      hire_date: employee.hire_date || '',
      termination_date: employee.termination_date || '',
      status: employee.status || 'active',
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      address: employee.address || '',
      metadata: employee.metadata || ''
    })
    setShowForm(true)
  }, [])

  const handleDeactivate = useCallback((employee: Employee) => {
    setEmployeeToDeactivate(employee)
    setShowDeactivateModal(true)
  }, [])

  const handleViewDetails = useCallback((employee: Employee) => {
    setSelectedEmployee(employee)
    setShowDetailsModal(true)
  }, [])

  const confirmDeactivate = useCallback(async () => {
    if (!employeeToDeactivate) return

    try {
      setIsSubmitting(true)
      
      // Usar fecha seleccionada o fecha actual
      const finalTerminationDate = terminationDate || getHondurasTimestamp().split('T')[0]
      
      const response = await fetch('/api/employees/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: employeeToDeactivate.id,
          status: 'inactive',
          termination_date: finalTerminationDate
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error deactivating employee: ${response.status} - ${errorText}`)
      }

      setShowDeactivateModal(false)
      setEmployeeToDeactivate(null)
      setTerminationDate('') // Resetear fecha
      fetchEmployees()
    } catch (error) {
      console.error('Error deactivating employee:', error)
      setEmployeesError(error instanceof Error ? error.message : 'Error deactivating employee')
    } finally {
      setIsSubmitting(false)
    }
  }, [employeeToDeactivate, fetchEmployees, terminationDate])

  const shouldFetch = useMemo(() => !!user?.id && !sessionLoading, [user?.id, sessionLoading])

  useEffect(() => {
    if (shouldFetch) {
      fetchEmployees()
      fetchDepartments()
      fetchWorkSchedules()
    }
  }, [shouldFetch, fetchEmployees, fetchDepartments, fetchWorkSchedules])

  const isLoading = sessionLoading || employeesLoading || departmentsLoading || schedulesLoading
  const hasErrors = employeesError || departmentsError || schedulesError

  if (isLoading && !hasErrors) {
    return (
      <div className="p-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400 mx-auto"></div>
              <p className="mt-2 text-gray-300">
                {sessionLoading && "Verificando sesión..."}
                {employeesLoading && "Cargando empleados..."}
                {departmentsLoading && "Cargando departamentos..."}
                {schedulesLoading && "Cargando horarios..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasErrors && !showForm) {
    return (
      <div className="p-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeesError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">Error al cargar empleados</h3>
                    <p className="text-sm mt-2 text-gray-300">{employeesError}</p>
                  </div>
                  <Button onClick={fetchEmployees} variant="outline" className="mb-4 bg-white/5 border-white/20 text-white hover:bg-white/10">
                    Reintentar cargar empleados
                  </Button>
                </div>
              )}
              
              {departmentsError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">Error al cargar departamentos</h3>
                    <p className="text-sm mt-2 text-gray-300">{departmentsError}</p>
                  </div>
                  <Button onClick={fetchDepartments} variant="outline" className="mb-4 bg-white/5 border-white/20 text-white hover:bg-white/10">
                    Reintentar cargar departamentos
                  </Button>
                </div>
              )}
              
              {schedulesError && (
                <div className="text-center">
                  <div className="text-red-400 mb-4">
                    <h3 className="text-lg font-semibold">Error al cargar horarios</h3>
                    <p className="text-sm mt-2 text-gray-300">{schedulesError}</p>
                  </div>
                  <Button onClick={fetchWorkSchedules} variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                    Reintentar cargar horarios
                  </Button>
                </div>
              )}
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
          isEditing={!!editingEmployee}
        />
      ) : (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">Empleados</h2>
            <p className="text-gray-300">Administra la información de los empleados</p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-700"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nuevo Empleado</span>
          </Button>
        </div>
      )}

      {showForm && (
        <>
          {employeesError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-md p-4">
              <div className="text-red-400">
                <h3 className="text-sm font-medium">Error al {editingEmployee ? 'actualizar' : 'crear'} empleado</h3>
                <p className="text-sm mt-1 text-gray-300">{employeesError}</p>
              </div>
            </div>
          )}
          {(departmentsError || schedulesError) && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-md p-4">
              <div className="text-yellow-400">
                <h3 className="text-sm font-medium">Advertencia</h3>
                <div className="text-sm mt-1 text-gray-300">
                  {departmentsError && <p>Error al cargar departamentos. <Button onClick={fetchDepartments} variant="link" className="text-yellow-400 underline p-0 h-auto">Reintentar</Button></p>}
                  {schedulesError && <p>Error al cargar horarios. <Button onClick={fetchWorkSchedules} variant="link" className="text-yellow-400 underline p-0 h-auto">Reintentar</Button></p>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Lista de Empleados ({employees.length})</CardTitle>
          <CardDescription className="text-gray-300">
            Empleados registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No se encontraron empleados
            </div>
          ) : (
            <div className="space-y-4">
              {employees.map((employee) => (
                <div key={employee.id} className="border border-white/10 rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-white">{employee.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          employee.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {employee.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                        {employee.attendance_status && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            employee.attendance_status === 'present' ? 'bg-brand-500/20 text-brand-400' :
                            employee.attendance_status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                            employee.attendance_status === 'absent' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {employee.attendance_status === 'present' ? 'Presente' :
                             employee.attendance_status === 'late' ? 'Tardanza' :
                             employee.attendance_status === 'absent' ? 'Ausente' : 'No registrado'}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                        <div>
                          <p><span className="font-medium text-gray-200">DNI:</span> {employee.dni}</p>
                          <p><span className="font-medium text-gray-200">Código:</span> {employee.employee_code}</p>
                          <p><span className="font-medium text-gray-200">Email:</span> {employee.email || 'No especificado'}</p>
                          <p><span className="font-medium text-gray-200">Teléfono:</span> {employee.phone || 'No especificado'}</p>
                        </div>
                        <div>
                          <p><span className="font-medium text-gray-200">Posición:</span> {employee.role || 'No especificada'}</p>
                          <p><span className="font-medium text-gray-200">Departamento:</span> {employee.departments?.name || 'Sin asignar'}</p>
                          <p><span className="font-medium text-gray-200">Horario:</span> {employee.work_schedules?.name || 'Sin asignar'}</p>
                          {employee.check_in_time && (
                            <p><span className="font-medium text-gray-200">Entrada:</span> {formatTimeDisplay(employee.check_in_time)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {employee.employee_scores && (
                        <div className="text-right text-xs text-gray-400">
                          <p>Puntos: {employee.employee_scores.total_points || 0}</p>
                          <p>Semana: {employee.employee_scores.weekly_points || 0}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(employee)}
                          className="flex items-center gap-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Ver</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(employee)}
                          className="flex items-center gap-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        
                        {employee.status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeactivate(employee)}
                            className="flex items-center gap-1 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Dar Baja</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles del Empleado */}
      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-2xl w-full mx-4 backdrop-blur-sm max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Detalles del Empleado
              </h3>
              <Button
                onClick={() => setShowDetailsModal(false)}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h4 className="text-lg font-medium text-white">{selectedEmployee.name}</h4>
                <p className="text-sm text-gray-400">{selectedEmployee.employee_code}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedEmployee.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedEmployee.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                  {selectedEmployee.attendance_status && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedEmployee.attendance_status === 'present' ? 'bg-brand-500/20 text-brand-400' :
                      selectedEmployee.attendance_status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                      selectedEmployee.attendance_status === 'absent' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedEmployee.attendance_status === 'present' ? 'Presente' :
                       selectedEmployee.attendance_status === 'late' ? 'Tardanza' :
                       selectedEmployee.attendance_status === 'absent' ? 'Ausente' : 'No registrado'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Nombre Completo</label>
                    <div className="text-white font-medium">{selectedEmployee.name}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Código de Empleado</label>
                    <div className="text-white font-medium">{selectedEmployee.employee_code}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">DNI</label>
                    <div className="text-white font-medium">{selectedEmployee.dni}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Departamento</label>
                    <div className="text-white font-medium">{selectedEmployee.departments?.name || 'Sin asignar'}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Cargo/Posición</label>
                    <div className="text-white font-medium">{selectedEmployee.role || 'No especificado'}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Salario Base</label>
                    <div className="text-green-400 font-medium">
                      {selectedEmployee.base_salary ? 
                        new Intl.NumberFormat('es-HN', {
                          style: 'currency',
                          currency: 'HNL'
                        }).format(selectedEmployee.base_salary) : 
                        'No especificado'
                      }
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Email</label>
                    <div className="text-white font-medium">{selectedEmployee.email || 'No especificado'}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Teléfono</label>
                    <div className="text-white font-medium">{selectedEmployee.phone || 'No especificado'}</div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Fecha de Contratación</label>
                    <div className="text-white font-medium">
                      {selectedEmployee.hire_date ? 
                        new Date(selectedEmployee.hire_date).toLocaleDateString('es-HN') : 
                        'No especificada'
                      }
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400">Horario de Trabajo</label>
                    <div className="text-white font-medium">{selectedEmployee.work_schedules?.name || 'Sin asignar'}</div>
                  </div>
                  
                  {selectedEmployee.check_in_time && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Entrada de Hoy</label>
                      <div className="text-white font-medium">{formatTimeDisplay(selectedEmployee.check_in_time)}</div>
                    </div>
                  )}
                  
                  {selectedEmployee.employee_scores && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Puntos de Gamificación</label>
                      <div className="text-yellow-400 font-medium">
                        Total: {selectedEmployee.employee_scores.total_points || 0} | 
                        Semana: {selectedEmployee.employee_scores.weekly_points || 0}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {(selectedEmployee.address || selectedEmployee.emergency_contact_name) && (
                <div className="border-t border-white/10 pt-4">
                  <h5 className="text-sm font-medium text-gray-400 mb-3">Información Adicional</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEmployee.address && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Dirección</label>
                        <div className="text-white font-medium">{selectedEmployee.address}</div>
                      </div>
                    )}
                    {selectedEmployee.emergency_contact_name && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Contacto de Emergencia</label>
                        <div className="text-white font-medium">
                          {selectedEmployee.emergency_contact_name}
                          {selectedEmployee.emergency_contact_phone && (
                            <span className="text-gray-400"> - {selectedEmployee.emergency_contact_phone}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <Button
                onClick={() => setShowDetailsModal(false)}
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                variant="outline"
              >
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  setShowDetailsModal(false)
                  handleEdit(selectedEmployee)
                }}
                className="flex-1 bg-brand-600 hover:bg-brand-700"
              >
                Editar Empleado
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Baja */}
      {showDeactivateModal && employeeToDeactivate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              Confirmar Baja de Empleado
            </h3>
            <p className="text-gray-300 mb-4">
              ¿Estás seguro de que quieres dar de baja a <strong className="text-white">{employeeToDeactivate.name}</strong>?
              Esta acción cambiará su estado a "Inactivo".
            </p>
            
            {/* Campo de fecha de terminación */}
            <div className="mb-6">
              <label htmlFor="termination-date" className="block text-sm font-medium text-gray-300 mb-2">
                Fecha de Terminación
              </label>
              <input
                type="date"
                id="termination-date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                placeholder="Selecciona la fecha de terminación"
              />
              <p className="text-xs text-gray-400 mt-1">
                Deja vacío para usar la fecha actual
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={confirmDeactivate}
                disabled={isSubmitting}
                variant="destructive"
                className="flex-1 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Baja'}
              </Button>
              <Button
                onClick={() => {
                  setShowDeactivateModal(false)
                  setEmployeeToDeactivate(null)
                  setTerminationDate('') // Resetear fecha
                }}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}