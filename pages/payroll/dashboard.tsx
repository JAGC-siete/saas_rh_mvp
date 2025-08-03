import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

interface PayrollStats {
  totalEmployees: number
  totalPayroll: number
  averageSalary: number
  pendingPayrolls: number
  completedPayrolls: number
}

export default function PayrollDashboard() {
  const [stats, setStats] = useState<PayrollStats>({
    totalEmployees: 0,
    totalPayroll: 0,
    averageSalary: 0,
    pendingPayrolls: 0,
    completedPayrolls: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchPayrollStats = async () => {
    try {
      // Obtener empleados activos
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, name, base_salary, status')
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

      // Procesar registros de nómina
      const pendingPayrolls = payrollRecords?.filter((r: any) => r.status === 'pending').length || 0
      const completedPayrolls = payrollRecords?.filter((r: any) => r.status === 'completed').length || 0

      setStats({
        totalEmployees,
        totalPayroll,
        averageSalary,
        pendingPayrolls,
        completedPayrolls
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
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">Empleados activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nómina Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalPayroll)}</div>
                <p className="text-xs text-muted-foreground">Salarios mensuales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Salario Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.averageSalary)}</div>
                <p className="text-xs text-muted-foreground">Por empleado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nóminas Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingPayrolls}</div>
                <p className="text-xs text-muted-foreground">Por procesar</p>
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