import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { EyeIcon, BuildingOfficeIcon, UserIcon, CurrencyDollarIcon, TrophyIcon } from '@heroicons/react/24/outline'

interface TrialEmployee {
  id: string
  name: string
  employee_code: string
  email?: string
  phone?: string
  role?: string
  team?: string
  base_salary: number
  hire_date?: string
  status: string
  department_name: string
  gamification_points: number
  attendance_rate: number
  last_attendance: string
  performance_rating: string
}

interface TrialEmployeeManagerProps {
  tenant: string
}

export default function TrialEmployeeManager({ tenant }: TrialEmployeeManagerProps) {
  const [employees, setEmployees] = useState<TrialEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<TrialEmployee | null>(null)

  useEffect(() => {
    fetchEmployees()
  }, [tenant])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trial/employees?tenant=${encodeURIComponent(tenant)}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setEmployees(data.employees || [])
    } catch (err: any) {
      console.error('Error fetching trial employees:', err)
      setError(err.message || 'Error cargando empleados')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-HN')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Cargando empleados...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-white mb-2">Error cargando empleados</h3>
        <p className="text-gray-300 mb-4">{error}</p>
        <Button onClick={fetchEmployees} variant="outline">
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">👥 Gestión de Empleados (Trial)</CardTitle>
          <CardDescription className="text-gray-300">
            Vista de solo lectura de la plantilla de empleados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-white">{employees.length}</div>
              <div className="text-sm text-gray-300">Total Empleados</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-green-400">
                {employees.filter(e => e.status === 'active').length}
              </div>
              <div className="text-sm text-gray-300">Empleados Activos</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-blue-400">
                {formatCurrency(employees.reduce((sum, e) => sum + (e.base_salary || 0), 0))}
              </div>
              <div className="text-sm text-gray-300">Salario Total</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round(employees.reduce((sum, e) => sum + (e.gamification_points || 0), 0) / employees.length)}
              </div>
              <div className="text-sm text-gray-300">Puntos Promedio</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Lista de Empleados</CardTitle>
          <CardDescription className="text-gray-300">
            {employees.length} empleados encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-300 border-b border-white/10">
                <tr>
                  <th className="py-3 pr-4">Empleado</th>
                  <th className="py-3 pr-4">Departamento</th>
                  <th className="py-3 pr-4">Salario</th>
                  <th className="py-3 pr-4">Puntos</th>
                  <th className="py-3 pr-4">Asistencia</th>
                  <th className="py-3 pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 pr-4">
                      <div>
                        <div className="font-medium text-white">{employee.name}</div>
                        <div className="text-xs text-gray-400">{employee.employee_code}</div>
                        {employee.role && (
                          <div className="text-xs text-gray-400">{employee.role}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="h-4 w-4 text-blue-400" />
                        <span>{employee.department_name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-green-400">
                        {formatCurrency(employee.base_salary)}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <TrophyIcon className="h-4 w-4 text-yellow-400" />
                        <span className="font-medium">{employee.gamification_points}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">{employee.attendance_rate}%</div>
                        <div className="text-xs text-gray-400">
                          Última: {formatDate(employee.last_attendance)}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEmployee(employee)}
                        className="flex items-center gap-2"
                      >
                        <EyeIcon className="h-4 w-4" />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card variant="glass" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white">Detalles del Empleado</CardTitle>
              <CardDescription className="text-gray-300">
                Información completa de {selectedEmployee.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Nombre</label>
                  <div className="text-white font-medium">{selectedEmployee.name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Código</label>
                  <div className="text-white font-medium">{selectedEmployee.employee_code}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Departamento</label>
                  <div className="text-white font-medium">{selectedEmployee.department_name}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Cargo</label>
                  <div className="text-white font-medium">{selectedEmployee.role || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Salario Base</label>
                  <div className="text-green-400 font-medium">
                    {formatCurrency(selectedEmployee.base_salary)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Fecha de Contratación</label>
                  <div className="text-white font-medium">
                    {formatDate(selectedEmployee.hire_date || '')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Puntos de Gamificación</label>
                  <div className="text-yellow-400 font-medium">{selectedEmployee.gamification_points}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Tasa de Asistencia</label>
                  <div className="text-blue-400 font-medium">{selectedEmployee.attendance_rate}%</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Rating de Desempeño</label>
                  <div className="text-purple-400 font-medium">{selectedEmployee.performance_rating}/5.0</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Última Asistencia</label>
                  <div className="text-white font-medium">
                    {formatDate(selectedEmployee.last_attendance)}
                  </div>
                </div>
              </div>
              
              {selectedEmployee.email && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Email</label>
                  <div className="text-white font-medium">{selectedEmployee.email}</div>
                </div>
              )}
              
              {selectedEmployee.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-400">Teléfono</label>
                  <div className="text-white font-medium">{selectedEmployee.phone}</div>
                </div>
              )}
            </CardContent>
            <div className="p-6 pt-0">
              <Button 
                onClick={() => setSelectedEmployee(null)} 
                className="w-full"
                variant="outline"
              >
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
