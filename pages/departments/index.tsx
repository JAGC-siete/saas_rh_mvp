import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

interface Department {
  id: string
  name: string
  description: string
  created_at: string
}

interface Employee {
  id: string
  name: string
  base_salary: number
  status: string
}

interface DepartmentStats {
  id: string
  name: string
  description: string
  employeeCount: number
  totalSalary: number
  averageSalary: number
  employees: Employee[]
}

interface DepartmentsData {
  departments: Department[]
  departmentStats: { [key: string]: DepartmentStats }
  summary: {
    totalDepartments: number
    totalEmployees: number
    totalSalary: number
    averageSalary: number
  }
}

export default function DepartmentsPage() {
  const [data, setData] = useState<DepartmentsData>({
    departments: [],
    departmentStats: {},
    summary: {
      totalDepartments: 0,
      totalEmployees: 0,
      totalSalary: 0,
      averageSalary: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)

  useEffect(() => {
    fetchDepartmentsData()
  }, [])

  const fetchDepartmentsData = async () => {
    try {
      console.log('🏢 Departments Page: Iniciando fetch de datos...')
      
      const response = await fetch('/api/departments')
      console.log('📡 Departments Page: Response status:', response.status)
      
      if (response.ok) {
        const departmentsData = await response.json()
        console.log('✅ Departments Page: Datos recibidos exitosamente')
        console.log('📊 Departments Page: Resumen:', {
          totalDepartments: departmentsData.summary.totalDepartments,
          totalEmployees: departmentsData.summary.totalEmployees,
          totalSalary: departmentsData.summary.totalSalary
        })
        
        setData(departmentsData)
      } else {
        console.error('❌ Departments Page: Error en response:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('❌ Departments Page: Error details:', errorText)
      }
    } catch (error) {
      console.error('💥 Departments Page: Error en fetchDepartmentsData:', error)
    } finally {
      setLoading(false)
      console.log('✅ Departments Page: Loading completado')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const router = useRouter()

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Cargando departamentos...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏢 Gestión de Departamentos</h1>
              <p className="text-gray-600">Administración y análisis de departamentos</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/dashboard')}>
                📊 Dashboard
              </Button>
              <Button variant="outline" onClick={() => router.push('/employees')}>
                👥 Empleados
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Departamentos</CardTitle>
                <span className="text-2xl">🏢</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalDepartments}</div>
                <p className="text-xs text-muted-foreground">
                  Departamentos activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
                <span className="text-2xl">👥</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  Empleados activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nómina Total</CardTitle>
                <span className="text-2xl">💰</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.summary.totalSalary)}</div>
                <p className="text-xs text-muted-foreground">
                  Salarios mensuales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Salario Promedio</CardTitle>
                <span className="text-2xl">📊</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.summary.averageSalary)}</div>
                <p className="text-xs text-muted-foreground">
                  Por empleado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Department Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department List */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Lista de Departamentos</CardTitle>
                <CardDescription>
                  Selecciona un departamento para ver detalles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.departmentStats).map(([deptName, stats]) => (
                    <div 
                      key={stats.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedDepartment === deptName 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedDepartment(deptName)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{deptName}</h3>
                          <p className="text-sm text-gray-600">{stats.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{stats.employeeCount} empleados</div>
                          <div className="text-sm text-gray-500">
                            {formatCurrency(stats.totalSalary)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Salario promedio: {formatCurrency(stats.averageSalary)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department Details */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDepartment ? `👥 ${selectedDepartment}` : '📊 Detalles del Departamento'}
                </CardTitle>
                <CardDescription>
                  {selectedDepartment 
                    ? `Información detallada de ${selectedDepartment}`
                    : 'Selecciona un departamento para ver los detalles'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDepartment && data.departmentStats[selectedDepartment] ? (
                  <div className="space-y-6">
                    {/* Department Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {data.departmentStats[selectedDepartment].employeeCount}
                        </div>
                        <div className="text-sm text-gray-600">Empleados</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(data.departmentStats[selectedDepartment].totalSalary)}
                        </div>
                        <div className="text-sm text-gray-600">Nómina Total</div>
                      </div>
                    </div>

                    {/* Employee List */}
                    <div>
                      <h4 className="font-semibold mb-3">👥 Empleados del Departamento</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {data.departmentStats[selectedDepartment].employees.length > 0 ? (
                          data.departmentStats[selectedDepartment].employees.map((employee: Employee) => (
                            <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{employee.name}</div>
                                <div className="text-sm text-gray-500 capitalize">{employee.status}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(employee.base_salary)}</div>
                                <div className="text-xs text-gray-500">Salario base</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            No hay empleados en este departamento
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Department Actions */}
                    <div className="pt-4 border-t">
                      <Button 
                        className="w-full" 
                        onClick={() => router.push(`/employees?department=${selectedDepartment}`)}
                      >
                        👥 Ver Empleados
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">🏢</div>
                    <div>Selecciona un departamento para ver los detalles</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Distribución por Departamento</CardTitle>
              <CardDescription>
                Visualización de empleados y costos por departamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.departmentStats).map(([deptName, stats]) => {
                  const percentage = data.summary.totalEmployees > 0 
                    ? (stats.employeeCount / data.summary.totalEmployees) * 100 
                    : 0
                  
                  return (
                    <div key={stats.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{deptName}</span>
                        <span className="text-sm text-gray-600">
                          {stats.employeeCount} empleados ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Nómina: {formatCurrency(stats.totalSalary)}</span>
                        <span>Promedio: {formatCurrency(stats.averageSalary)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
