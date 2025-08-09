import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import ProtectedRoute from '../../../components/ProtectedRoute'
import DashboardLayout from '../../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'

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
  const router = useRouter()

  // Memo del formateador para evitar recrearlo por render
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }),
    []
  )
  const formatCurrency = (amount?: number) => currencyFormatter.format(amount ?? 0)

  // Callback con cancelación via AbortSignal
  const fetchDepartmentsData = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/departments', { signal })
      if (response.ok) {
        const departmentsData = await response.json()
        setData(departmentsData ?? {
          departments: [],
          departmentStats: {},
          summary: { totalDepartments: 0, totalEmployees: 0, totalSalary: 0, averageSalary: 0 }
        })
      } else {
        const errorText = await response.text().catch(() => '')
        console.error('[Departments] HTTP', response.status, response.statusText, errorText)
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('[Departments] Fetch error:', error)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    ;(async () => {
      if (!isMounted) return
      await fetchDepartmentsData(controller.signal)
    })()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [fetchDepartmentsData])

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-white font-medium">Cargando departamentos...</div>
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
              <h1 className="text-3xl font-bold text-white">🏢 Gestión de Departamentos</h1>
              <p className="text-gray-300">Administración y análisis de departamentos</p>
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
            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Departamentos</CardTitle>
                <span className="text-2xl">🏢</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.summary.totalDepartments}</div>
                <p className="text-xs text-gray-300">
                  Departamentos activos
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Total Empleados</CardTitle>
                <span className="text-2xl">👥</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{data.summary.totalEmployees}</div>
                <p className="text-xs text-gray-300">
                  Empleados activos
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Nómina Total</CardTitle>
                <span className="text-2xl">💰</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(data.summary.totalSalary)}</div>
                <p className="text-xs text-gray-300">
                  Salarios mensuales
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-200">Salario Promedio</CardTitle>
                <span className="text-2xl">📊</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(data.summary.averageSalary)}</div>
                <p className="text-xs text-gray-300">
                  Por empleado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Department Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department List */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-white">📋 Lista de Departamentos</CardTitle>
                <CardDescription className="text-gray-300">
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
                          ? 'border-brand-500 bg-brand-900/20' 
                          : 'border-white/20 hover:border-white/30 hover:bg-white/5'
                      }`}
                      onClick={() => setSelectedDepartment(deptName)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-white">{deptName}</h3>
                          <p className="text-sm text-gray-300">{stats.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-white">{stats.employeeCount} empleados</div>
                          <div className="text-sm text-gray-300">
                            {formatCurrency(stats.totalSalary)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-300">
                        Salario promedio: {formatCurrency(stats.averageSalary)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department Details */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-white">
                  {selectedDepartment ? `👥 ${selectedDepartment}` : '📊 Detalles del Departamento'}
                </CardTitle>
                <CardDescription className="text-gray-300">
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
                                        {/* Department Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-brand-400">
                          {data.departmentStats[selectedDepartment].employeeCount}
                        </div>
                        <div className="text-sm text-gray-300">Empleados</div>
                      </div>
                      <div className="text-center p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">
                          {formatCurrency(data.departmentStats[selectedDepartment].totalSalary)}
                        </div>
                        <div className="text-sm text-gray-300">Nómina Total</div>
                      </div>
                    </div>

                    {/* Employee List */}
                    <div>
                      <h4 className="font-semibold mb-3 text-white">👥 Empleados del Departamento</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {data.departmentStats[selectedDepartment].employees.length > 0 ? (
                          data.departmentStats[selectedDepartment].employees.map((employee: Employee) => (
                            <div key={employee.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                              <div>
                                <div className="font-medium text-white">{employee.name}</div>
                                <div className="text-sm text-gray-300 capitalize">{employee.status}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-white">{formatCurrency(employee.base_salary)}</div>
                                <div className="text-xs text-gray-300">Salario base</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-300">
                            No hay empleados en este departamento
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Department Actions */}
                    <div className="pt-4 border-t border-white/10">
                      <Button 
                        className="w-full" 
                        onClick={() => router.push(`/employees?department=${selectedDepartment}`)}
                      >
                        👥 Ver Empleados
                      </Button>
                    </div>
                ) : (
                  <div className="text-center py-12 text-gray-300">
                    <div className="text-4xl mb-4">🏢</div>
                    <div>Selecciona un departamento para ver los detalles</div>
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
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">📊 Distribución por Departamento</CardTitle>
              <CardDescription className="text-gray-300">
                Visualización de empleados y costos por departamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.departmentStats).map(([deptName, stats]) => {
                  const totalEmployees = data?.summary?.totalEmployees ?? 0
                  const percentage = totalEmployees > 0 
                    ? (stats.employeeCount / totalEmployees) * 100 
                    : 0
                  
                  return (
                    <div key={stats.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{deptName}</span>
                        <span className="text-sm text-gray-300">
                          {stats.employeeCount} empleados ({Number.isFinite(percentage) ? percentage.toFixed(1) : '0.0'}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-300">
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
