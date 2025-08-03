

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

// Crear cliente de Supabase
const supabase = createClient()

interface PayrollRecord {
  id: string
  employee_id: string
  period_start: string
  period_end: string
  period_type: string
  base_salary: number
  gross_salary: number
  income_tax: number
  professional_tax: number
  social_security: number
  total_deductions: number
  net_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  status: string
  created_at: string
  employees: {
    name: string
    employee_code: string
    team: string
    department: string
  }
}

interface Employee {
  id: string
  name: string
  employee_code: string
  base_salary: number
  department_id: string
}

interface PayrollStats {
  totalEmployees: number
  totalGrossSalary: number
  totalDeductions: number
  totalNetSalary: number
  averageSalary: number
  departmentBreakdown: { [key: string]: number }
  attendanceRate: number
}

export default function PayrollManager() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [payrollStats, setPayrollStats] = useState<PayrollStats>({
    totalEmployees: 0,
    totalGrossSalary: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    averageSalary: 0,
    departmentBreakdown: {},
    attendanceRate: 0
  })
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'generate'>('dashboard')

  // Form state
  const [generateForm, setGenerateForm] = useState({
    periodo: '',
    quincena: 1,
    incluirDeducciones: false,
    soloEmpleadosConAsistencia: true
  });

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get user profile with better error handling
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user:', userError)
        alert('❌ Error de autenticación. Por favor, inicia sesión nuevamente.')
        return
      }
      
      if (!user) {
        console.error('No user found - user is null')
        alert('❌ No se encontró usuario autenticado. Por favor, inicia sesión.')
        return
      }

      console.log('✅ User authenticated:', user.email)

      let { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        
        // Si el perfil no existe, intentar crearlo
        if (profileError.code === 'PGRST116') {
          console.log('🔧 Perfil no encontrado, intentando crear...')
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              role: 'super_admin',
              is_active: true,
              permissions: {
                can_manage_employees: true,
                can_view_payroll: true,
                can_manage_attendance: true,
                can_manage_departments: true,
                can_view_reports: true,
                can_manage_companies: true,
                can_generate_payroll: true,
                can_export_payroll: true,
                can_view_own_attendance: true,
                can_register_attendance: true
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creando perfil:', createError)
            alert('❌ Error creando perfil de usuario. Contacte al administrador.')
            return
          }

          console.log('✅ Perfil creado exitosamente:', newProfile)
          setUserProfile(newProfile)
          profile = newProfile
        } else {
          console.error('Error obteniendo perfil:', profileError)
          alert('❌ Error obteniendo perfil de usuario')
          return
        }
      } else {
        console.log('✅ User profile loaded:', profile)
        setUserProfile(profile)
      }

      if (!profile) {
        console.warn('No user profile found, skipping company data fetch')
        setPayrollRecords([])
        setEmployees([])
        return
      }

      if (!profile.is_active) {
        alert('❌ Su cuenta ha sido desactivada')
        return
      }

      // Fetch payroll records (sin restricción de empresa)
      let payrollQuery = supabase
        .from('payroll_records')
        .select(`
          *,
          employees:employee_id (
            name,
            employee_code,
            team,
            department
          )
        `)
        .order('created_at', { ascending: false })

      // Si el usuario tiene company_id, filtrar por empresa
      if (profile.company_id) {
        payrollQuery = payrollQuery.eq('employees.company_id', profile.company_id)
      }

      const { data: payrollData, error: payrollError } = await payrollQuery

      if (payrollError) {
        console.error('Error fetching payroll records:', payrollError)
        throw payrollError
      }
      
      console.log('✅ Payroll records loaded:', payrollData?.length || 0)
      setPayrollRecords(payrollData || [])

      // Fetch employees for generation form (sin restricción de empresa)
      let employeesQuery = supabase
        .from('employees')
        .select('id, name, employee_code, base_salary, department_id')
        .eq('status', 'active')
        .order('name')

      // Si el usuario tiene company_id, filtrar por empresa
      if (profile.company_id) {
        employeesQuery = employeesQuery.eq('company_id', profile.company_id)
      }

      const { data: employeesData, error: empError } = await employeesQuery

      if (empError) {
        console.error('Error fetching employees:', empError)
        throw empError
      }
      
      console.log('✅ Employees loaded:', employeesData?.length || 0)
      setEmployees(employeesData || [])

      // Calculate statistics
      calculatePayrollStats(payrollData || [], employeesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error cargando datos: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const calculatePayrollStats = (records: PayrollRecord[], emps: Employee[]) => {
    const stats: PayrollStats = {
      totalEmployees: emps.length,
      totalGrossSalary: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      averageSalary: 0,
      departmentBreakdown: {},
      attendanceRate: 0
    }

    // Calculate totals from current period records
    const currentPeriodRecords = records.filter(r => 
      r.period_start.startsWith(selectedPeriod || new Date().toISOString().slice(0, 7))
    )

    currentPeriodRecords.forEach(record => {
      stats.totalGrossSalary += record.gross_salary
      stats.totalDeductions += record.total_deductions
      stats.totalNetSalary += record.net_salary
      
      const dept = record.employees?.department || 'Sin Departamento'
      stats.departmentBreakdown[dept] = (stats.departmentBreakdown[dept] || 0) + 1
    })

    // Calculate averages
    if (currentPeriodRecords.length > 0) {
      stats.averageSalary = stats.totalNetSalary / currentPeriodRecords.length
    }

    // Calculate attendance rate
    const totalDays = currentPeriodRecords.reduce((sum, r) => sum + r.days_worked, 0)
    const expectedDays = currentPeriodRecords.length * 15 // Assuming 15 days per period
    stats.attendanceRate = expectedDays > 0 ? (totalDays / expectedDays) * 100 : 0

    setPayrollStats(stats)
  }

  const generatePayroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Verificar autenticación primero
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        alert('❌ Error de autenticación. Por favor, inicia sesión nuevamente.')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        alert('❌ No se encontró token de sesión. Por favor, inicia sesión nuevamente.')
        return
      }

      console.log('✅ Generating payroll with authenticated user:', user.email)

      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(generateForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate payroll')
      }

      alert('✅ Nómina generada exitosamente!')
      setShowGenerateForm(false)
      setGenerateForm({
        periodo: '',
        quincena: 1,
        incluirDeducciones: false,
        soloEmpleadosConAsistencia: true
      })
      fetchData()

    } catch (error: any) {
      console.error('Error generating payroll:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const approvePayroll = async (payrollId: string) => {
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userProfile?.employee_id 
        })
        .eq('id', payrollId)

      if (error) throw error
      alert('✅ Nómina aprobada exitosamente!')
      fetchData()
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`)
    }
  }

  const markAsPaid = async (payrollId: string) => {
    try {
      const { error } = await supabase
        .from('payroll_records')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', payrollId)

      if (error) throw error
      alert('✅ Nómina marcada como pagada!')
      fetchData()
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    switch (status) {
      case 'draft':
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Borrador</span>
      case 'approved':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>Aprobada</span>
      case 'paid':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Pagada</span>
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>
    }
  }

  const filteredRecords = selectedPeriod 
    ? payrollRecords.filter(record => 
        record.period_start.startsWith(selectedPeriod)
      )
    : payrollRecords

  // Calculate totals
  const totals = filteredRecords.reduce((acc, record) => {
    acc.grossSalary += record.gross_salary
    acc.totalDeductions += record.total_deductions
    acc.netSalary += record.net_salary
    return acc
  }, { grossSalary: 0, totalDeductions: 0, netSalary: 0 })

  const downloadPayrollPDF = async (record: PayrollRecord) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        alert('❌ Debes estar logueado para descargar el PDF. Por favor, inicia sesión.')
        return
      }

      const period = record.period_start.slice(0, 7)
      const day = Number(record.period_start.slice(8, 10))
      const quincena = day === 1 ? 1 : 2
      
      const response = await fetch(`/api/payroll/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/pdf'
        },
        credentials: 'include',
        body: JSON.stringify({
          periodo: period,
          quincena: quincena,
          incluirDeducciones: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Error: ${response.status} ${response.statusText} - ${errorData.error || ''}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `planilla_paragon_${period}_q${quincena}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      alert(`❌ Error descargando PDF: ${error.message || 'Unknown error'}`)
    }
  }

  const downloadIndividualReceipt = async (record: PayrollRecord) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token found.')
      }

      const period = record.period_start.slice(0, 7)
      const day = Number(record.period_start.slice(8, 10))
      const quincena = day === 1 ? 1 : 2

      const response = await fetch('/api/payroll/export', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'application/pdf'
        },
        body: JSON.stringify({
          periodo: period,
          formato: 'recibo-individual',
          employeeId: record.employee_id
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate receipt')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo_${record.employees?.employee_code}_${period}_q${quincena}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error: any) {
      alert(`❌ Error descargando recibo: ${error.message}`)
    }
  }

  const exportToExcel = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No authentication token found.')
      }

      const response = await fetch('/api/payroll/export', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          periodo: selectedPeriod || new Date().toISOString().slice(0, 7),
          formato: 'excel'
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to export')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nomina_paragon_${selectedPeriod || 'actual'}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error: any) {
      alert(`❌ Error exportando: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏢 Gestión de Nómina - Paragon Honduras</h1>
          <p className="text-gray-600">Sistema integral de procesamiento y administración de nóminas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setActiveTab('generate')}>
            📊 Generar Nómina
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            📥 Exportar Excel
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📈 Dashboard Ejecutivo
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'records'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Registros de Nómina
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generate'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ⚙️ Generar Nómina
          </button>
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {payrollStats.totalEmployees}
                  </div>
                  <div className="text-sm text-gray-600">Empleados Activos</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(payrollStats.totalGrossSalary)}
                  </div>
                  <div className="text-sm text-gray-600">Total Salario Bruto</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(payrollStats.totalDeductions)}
                  </div>
                  <div className="text-sm text-gray-600">Total Deducciones</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(payrollStats.totalNetSalary)}
                  </div>
                  <div className="text-sm text-gray-600">Total Salario Neto</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📊 Estadísticas de Asistencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Tasa de Asistencia:</span>
                    <span className="font-semibold">{payrollStats.attendanceRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salario Promedio:</span>
                    <span className="font-semibold">{formatCurrency(payrollStats.averageSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Registros de Nómina:</span>
                    <span className="font-semibold">{filteredRecords.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🏢 Distribución por Departamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(payrollStats.departmentBreakdown).map(([dept, count]) => (
                    <div key={dept} className="flex justify-between">
                      <span className="text-sm">{dept}:</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚡ Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => setActiveTab('generate')}
                  >
                    Generar Nómina Actual
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={exportToExcel}
                  >
                    Exportar Reporte
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveTab('records')}
                  >
                    Ver Registros
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filtrar por Período
                  </label>
                  <Input
                    type="month"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedPeriod('')}
                  >
                    Limpiar Filtro
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Records */}
          <Card>
            <CardHeader>
              <CardTitle>Registros de Nómina</CardTitle>
              <CardDescription>
                {filteredRecords.length} registros
                {selectedPeriod && ` para ${new Date(selectedPeriod + '-01').toLocaleDateString('es-HN', { year: 'numeric', month: 'long' })}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Empleado</th>
                      <th className="text-left py-3 px-4">Período</th>
                      <th className="text-left py-3 px-4">Salario Bruto</th>
                      <th className="text-left py-3 px-4">Deducciones</th>
                      <th className="text-left py-3 px-4">Salario Neto</th>
                      <th className="text-left py-3 px-4">Asistencia</th>
                      <th className="text-left py-3 px-4">Estado</th>
                      <th className="text-left py-3 px-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, index) => (
                      <tr key={`record-${index}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{record.employees?.name}</div>
                            <div className="text-sm text-gray-500">
                              {record.employees?.employee_code} • {record.employees?.team}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div>{new Date(record.period_start).toLocaleDateString('es-HN')}</div>
                            <div className="text-gray-500">hasta {new Date(record.period_end).toLocaleDateString('es-HN')}</div>
                            <div className="text-xs text-gray-400 capitalize">{record.period_type}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {formatCurrency(record.gross_salary)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-mono">
                            <div>ISR: {formatCurrency(record.income_tax)}</div>
                            <div>RAP: {formatCurrency(record.professional_tax)}</div>
                            <div>IHSS: {formatCurrency(record.social_security)}</div>
                            <div className="font-semibold border-t pt-1">
                              Total: {formatCurrency(record.total_deductions)}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-green-600">
                          {formatCurrency(record.net_salary)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div>Trabajó: {record.days_worked} días</div>
                            <div className="text-red-600">Ausente: {record.days_absent} días</div>
                            <div className="text-yellow-600">Tardanza: {record.late_days} días</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            {record.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approvePayroll(record.id)}
                              >
                                Aprobar
                              </Button>
                            )}
                            {record.status === 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => markAsPaid(record.id)}
                              >
                                Marcar Pagado
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => await downloadPayrollPDF(record)}
                            >
                              📄 Descargar PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => await downloadIndividualReceipt(record)}
                            >
                              📄 Descargar Recibo
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredRecords.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron registros de nómina.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📊 Generar Nómina</CardTitle>
              <CardDescription>
                Genera la nómina para todos los empleados activos de Paragon Honduras para un período y quincena seleccionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generatePayroll} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mes
                  </label>
                  <Input
                    type="month"
                    value={generateForm.periodo}
                    onChange={e => setGenerateForm({ ...generateForm, periodo: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quincena
                  </label>
                  <select
                    value={generateForm.quincena}
                    onChange={e => setGenerateForm({ ...generateForm, quincena: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value={1}>Primera (1-15)</option>
                    <option value={2}>Segunda (16-fin de mes)</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateForm.incluirDeducciones}
                    onChange={e => setGenerateForm({ ...generateForm, incluirDeducciones: e.target.checked })}
                    className="mr-2"
                    id="deducciones"
                  />
                  <label htmlFor="deducciones" className="text-sm font-medium text-gray-700">
                    Incluir deducciones (ISR, IHSS, RAP)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateForm.soloEmpleadosConAsistencia}
                    onChange={e => setGenerateForm({ ...generateForm, soloEmpleadosConAsistencia: e.target.checked })}
                    className="mr-2"
                    id="asistencia"
                  />
                  <label htmlFor="asistencia" className="text-sm font-medium text-gray-700">
                    Solo empleados con asistencia completa
                  </label>
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? '🔄 Generando...' : '🚀 Generar Nómina'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('dashboard')}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Employee Preview */}
          {employees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>👥 Empleados Activos ({employees.length})</CardTitle>
                <CardDescription>
                  Lista de empleados que serán incluidos en la nómina
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.slice(0, 9).map((emp) => (
                    <div key={emp.id} className="p-3 border rounded-lg">
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-sm text-gray-500">
                        {emp.employee_code} • {emp.department_id || 'Sin departamento'}
                      </div>
                      <div className="text-sm font-mono text-green-600">
                        {formatCurrency(emp.base_salary)}
                      </div>
                    </div>
                  ))}
                  {employees.length > 9 && (
                    <div className="p-3 border rounded-lg bg-gray-50 text-center">
                      <div className="text-sm text-gray-500">
                        +{employees.length - 9} empleados más
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
