import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'

interface PayrollStats {
  totalEmployees: number
  totalPayroll: number
  averageSalary: number
  pendingPayrolls: number
  completedPayrolls: number
  monthlyExpense: number
  recentPayrolls: Array<{
    id: string
    period_start: string
    period_end: string
    total_employees: number
    total_amount: number
    status: string
  }>
  departmentStats: Record<string, { employees: number; total_salary: number }>
}

export default function PayrollDashboard() {
  const [stats, setStats] = useState<PayrollStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPayrollStats = async () => {
    try {
      // Obtener empleados activos
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name, base_salary, department_id, status')
        .eq('status', 'active')

      if (empError) {
        console.error('Error fetching employees:', empError)
        return
      }

      // Obtener registros de nómina recientes
      const { data: payrollRecords, error: payrollError } = await supabase
        .from('payroll_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (payrollError) {
        console.error('Error fetching payroll records:', payrollError)
      }

      // Calcular estadísticas
      const totalEmployees = employees?.length || 0
      const totalPayroll = employees?.reduce((sum: number, emp: any) => sum + (emp.base_salary || 0), 0) || 0
      const averageSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0
      const monthlyExpense = totalPayroll

      // Agrupar por departamento
      const departmentStats: Record<string, { employees: number; total_salary: number }> = {}
      employees?.forEach((emp: any) => {
        const deptId = emp.department_id || 'Sin Departamento'
        if (!departmentStats[deptId]) {
          departmentStats[deptId] = { employees: 0, total_salary: 0 }
        }
        departmentStats[deptId].employees++
        departmentStats[deptId].total_salary += emp.base_salary || 0
      })

      // Procesar registros de nómina
      const pendingPayrolls = payrollRecords?.filter((r: any) => r.status === 'pending').length || 0
      const completedPayrolls = payrollRecords?.filter((r: any) => r.status === 'completed').length || 0

      const recentPayrolls = payrollRecords?.map((record: any) => ({
        id: record.id,
        period_start: record.period_start,
        period_end: record.period_end,
        total_employees: 0, // Esto requeriría un join con employees
        total_amount: record.net_salary || 0,
        status: record.status
      })) || []

      setStats({
        totalEmployees,
        totalPayroll,
        averageSalary,
        pendingPayrolls,
        completedPayrolls,
        monthlyExpense,
        recentPayrolls,
        departmentStats
      })
    } catch (error) {
      console.error('Error fetching payroll stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayrollStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Procesando</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando estadísticas de nómina...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Nómina</h1>
            <p className="text-gray-600">Resumen y estadísticas del sistema de nómina</p>
          </div>

          {/* Estadísticas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
                <p className="text-xs text-muted-foreground">Empleados activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nómina Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.totalPayroll || 0)}</div>
                <p className="text-xs text-muted-foreground">Salarios mensuales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Salario Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats?.averageSalary || 0)}</div>
                <p className="text-xs text-muted-foreground">Por empleado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nóminas Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingPayrolls || 0}</div>
                <p className="text-xs text-muted-foreground">Por procesar</p>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas por departamento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Nómina por Departamento</CardTitle>
                <CardDescription>Distribución de salarios por departamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.departmentStats && Object.entries(stats.departmentStats).map(([dept, data]) => (
                    <div key={dept} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{dept}</p>
                        <p className="text-sm text-gray-500">{data.employees} empleados</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(data.total_salary)}</p>
                        <p className="text-sm text-gray-500">
                          {((data.total_salary / (stats?.totalPayroll || 1)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nóminas Recientes</CardTitle>
                <CardDescription>Últimas nóminas procesadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.recentPayrolls.slice(0, 5).map((payroll) => (
                    <div key={payroll.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {new Date(payroll.period_start).toLocaleDateString()} - {new Date(payroll.period_end).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">{payroll.total_employees} empleados</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(payroll.total_amount)}</p>
                        {getStatusBadge(payroll.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Gestionar nómina y reportes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button onClick={() => window.location.href = '/payroll'}>
                  Generar Nómina
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/reports'}>
                  Ver Reportes
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/employees'}>
                  Gestionar Empleados
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
} 