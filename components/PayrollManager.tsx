

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '../lib/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

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
    department_id: string
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
  departmentBreakdown: { [key: string]: { count: number, name: string, avgSalary: number } }
  attendanceRate: number
  payrollCoverage: number
}

const INITIAL_PAYROLL_STATS: PayrollStats = {
  totalEmployees: 0,
  totalGrossSalary: 0,
  totalDeductions: 0,
  totalNetSalary: 0,
  averageSalary: 0,
  departmentBreakdown: {},
  attendanceRate: 0,
  payrollCoverage: 0
}

const INITIAL_GENERATE_FORM = {
  periodo: '',
  quincena: 1,
  incluirDeducciones: false,
  soloEmpleadosConAsistencia: true
}

const STATUS_CONFIG = {
  draft: { label: 'Borrador', classes: 'bg-gray-100 text-gray-800' },
  approved: { label: 'Aprobada', classes: 'bg-blue-100 text-blue-800' },
  paid: { label: 'Pagada', classes: 'bg-green-100 text-green-800' }
} as const

const DEFAULT_PERMISSIONS = {
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
}

export default function PayrollManager() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [payrollStats, setPayrollStats] = useState<PayrollStats>(INITIAL_PAYROLL_STATS)
  const [departments, setDepartments] = useState<{ [key: string]: string }>({})
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'generate' | 'reports'>('dashboard')
  const [generateForm, setGenerateForm] = useState(INITIAL_GENERATE_FORM)
  const [supabase, setSupabase] = useState<any>(null)

  // Check if we're in demo mode
  const isDemoMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.location.pathname.startsWith('/app/demo')
  }, [])

  // Memoized values
  const currentPeriodRecords = useMemo(() => 
    payrollRecords.filter(record => 
      record.period_start.startsWith(selectedPeriod || new Date().toISOString().slice(0, 7))
    ),
    [payrollRecords, selectedPeriod]
  )

  const filteredRecords = useMemo(() => 
    selectedPeriod 
      ? payrollRecords.filter(record => record.period_start.startsWith(selectedPeriod))
      : payrollRecords,
    [payrollRecords, selectedPeriod]
  )

  const currentPeriod = useMemo(() => 
    selectedPeriod || new Date().toISOString().slice(0, 7),
    [selectedPeriod]
  )

  // Initialize Supabase client
  useEffect(() => {
    try {
      const client = createClient()
      if (client) {
        setSupabase(client)
      }
    } catch (error) {
      console.error('Failed to create Supabase client:', error)
    }
  }, [])

  // Evitar setState tras desmontaje durante cargas largas
  const isMountedRef = useRef(true)
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const resetGenerateForm = useCallback(() => {
    setGenerateForm(INITIAL_GENERATE_FORM)
  }, [])

  const downloadFile = useCallback(async (url: string, filename: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        ...options
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(link)
    } catch (error: any) {
      console.error('Error downloading file:', error)
      alert(`❌ Error descargando archivo: ${error.message}`)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoMode) {
        // Demo mode: Load data from demo endpoints
        console.log('🎯 PayrollManager: Loading demo data...')
        
        // Load demo payroll data
        const payrollResponse = await fetch('/api/demo/payroll')
        if (payrollResponse.ok) {
          const payrollData = await payrollResponse.json()
          const mockRecords = payrollData.data.records?.map((record: any) => ({
            id: `payroll-${record.employee_id}`,
            employee_id: record.employee_id,
            period_start: `${payrollData.data.period}-01`,
            period_end: `${payrollData.data.period}-15`,
            period_type: 'quincenal',
            base_salary: record.gross_salary,
            gross_salary: record.gross_salary,
            income_tax: record.isr_deduction,
            professional_tax: record.rap_deduction,
            social_security: record.ihss_deduction,
            total_deductions: record.total_deductions,
            net_salary: record.net_salary,
            days_worked: 15,
            days_absent: 0,
            late_days: 0,
            status: 'approved',
            created_at: payrollData.data.generated_at,
            employees: {
              name: `Empleado ${record.employee_id.slice(-3)}`,
              employee_code: record.employee_id,
              team: 'Demo',
              department_id: 'd-desarrollo'
            }
          })) || []
          
          setPayrollRecords(mockRecords)
          
          // Calculate demo stats
          const stats = {
            totalEmployees: mockRecords.length,
            totalGrossSalary: payrollData.data.totals?.gross || 0,
            totalDeductions: payrollData.data.totals?.total_deductions || 0,
            totalNetSalary: payrollData.data.totals?.net || 0,
            averageSalary: mockRecords.length > 0 ? (payrollData.data.totals?.net || 0) / mockRecords.length : 0,
            departmentBreakdown: { 'demo': { count: mockRecords.length, name: 'Demo', avgSalary: 20000 } },
            attendanceRate: 95,
            payrollCoverage: 100
          }
          setPayrollStats(stats)
        }

        // Load demo employees
        const employeesResponse = await fetch('/api/demo/employees')
        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json()
          const mockEmployees = employeesData.data?.map((emp: any) => ({
            id: emp.id,
            name: emp.full_name,
            employee_code: emp.dni_last5,
            base_salary: emp.base_salary_monthly,
            department_id: emp.department_id
          })) || []
          setEmployees(mockEmployees)
        }

        setUserProfile({
          id: 'demo-user',
          role: 'demo',
          is_active: true,
          permissions: DEFAULT_PERMISSIONS
        })

        console.log('✅ Demo payroll data loaded')
        return
      }

      // Regular mode: Original Supabase logic
      if (!supabase) return
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        alert('❌ Error de autenticación. Por favor, inicia sesión nuevamente.')
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
        
        if (profileError.code === 'PGRST116') {
          console.log('🔧 Perfil no encontrado, intentando crear...')
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              role: 'super_admin',
              is_active: true,
              permissions: DEFAULT_PERMISSIONS,
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

      if (!profile || !profile.is_active) {
        if (!profile.is_active) {
          alert('❌ Su cuenta ha sido desactivada')
        }
        setPayrollRecords([])
        setEmployees([])
        return
      }

      // Fetch payroll records
      let payrollQuery = supabase
        .from('payroll_records')
        .select(`
          *,
          employees:employee_id (
            name,
            employee_code,
            team,
            department_id
          )
        `)
        .order('created_at', { ascending: false })

      if (profile.company_id) {
        payrollQuery = payrollQuery.eq('employees.company_id', profile.company_id)
      }

      const { data: payrollData, error: payrollError } = await payrollQuery

      if (payrollError) {
        console.error('Error fetching payroll records:', payrollError)
        throw payrollError
      }
      
      console.log('✅ Payroll records loaded:', payrollData?.length || 0)
      if (!isMountedRef.current) return
      setPayrollRecords(payrollData || [])

      // Fetch employees
      let employeesQuery = supabase
        .from('employees')
        .select('id, name, employee_code, base_salary, department_id')
        .eq('status', 'active')
        .order('name')

      if (profile.company_id) {
        employeesQuery = employeesQuery.eq('company_id', profile.company_id)
      }

      const { data: employeesData, error: empError } = await employeesQuery

      if (empError) {
        console.error('Error fetching employees:', empError)
        throw empError
      }
      
      console.log('✅ Employees loaded:', employeesData?.length || 0)
      if (!isMountedRef.current) return
      setEmployees(employeesData || [])

      await loadDepartments()
      calculatePayrollStats(payrollData || [], employeesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error cargando datos: ${errorMessage}`)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [isDemoMode, supabase])

  // Initialize data when component mounts or dependencies change
  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, start loading immediately
      fetchData()
    } else if (supabase) {
      // In regular mode, wait for supabase to be initialized
      fetchData()
    }
  }, [supabase, isDemoMode, fetchData])

  const loadDepartments = useCallback(async () => {
    if (!supabase) return
    
    try {
      const { data: deptData, error } = await supabase
        .from('departments')
        .select('id, name')
      
      if (error) {
        console.error('Error loading departments:', error)
        return
      }
      
      const deptMap: { [key: string]: string } = {}
      deptData?.forEach((dept: any) => {
        deptMap[dept.id] = dept.name
      })
      
      setDepartments(deptMap)
      if (!isMountedRef.current) return
      console.log('✅ Departments loaded:', Object.keys(deptMap).length)
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }, [supabase])

  const calculatePayrollStats = useCallback((records: PayrollRecord[], emps: Employee[]) => {
    const stats: PayrollStats = {
      totalEmployees: emps.length,
      totalGrossSalary: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      averageSalary: 0,
      departmentBreakdown: {},
      attendanceRate: 0,
      payrollCoverage: 0
    }

    stats.payrollCoverage = emps.length > 0 ? (currentPeriodRecords.length / emps.length) * 100 : 0

    // Una sola pasada: acumular totales y sumas por depto
    const deptSumSalary: Record<string, number> = {}
    currentPeriodRecords.forEach((record) => {
      stats.totalGrossSalary += record.gross_salary
      stats.totalDeductions += record.total_deductions
      stats.totalNetSalary += record.net_salary
      
      const deptId = record.employees?.department_id || 'sin-departamento'
      const deptName = departments[deptId] || 'Sin Departamento'
      
      if (!stats.departmentBreakdown[deptId]) {
        stats.departmentBreakdown[deptId] = { count: 0, name: deptName, avgSalary: 0 }
      }
      
      stats.departmentBreakdown[deptId].count += 1
      deptSumSalary[deptId] = (deptSumSalary[deptId] ?? 0) + record.net_salary
    })

    // Promedios por depto
    Object.keys(stats.departmentBreakdown).forEach((deptId) => {
      const count = stats.departmentBreakdown[deptId].count
      const sum = deptSumSalary[deptId] ?? 0
      stats.departmentBreakdown[deptId].avgSalary = count > 0 ? sum / count : 0
    })

    if (currentPeriodRecords.length > 0) {
      stats.averageSalary = stats.totalNetSalary / currentPeriodRecords.length
    }

    const totalDays = currentPeriodRecords.reduce((sum, r) => sum + r.days_worked, 0)
    const expectedDays = currentPeriodRecords.length * 15
    stats.attendanceRate = expectedDays > 0 ? (totalDays / expectedDays) * 100 : 0

    if (isMountedRef.current) setPayrollStats(stats)
  }, [currentPeriodRecords, departments])

  const generatePayroll = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isDemoMode) {
        // Demo mode: Use demo payroll calculation
        console.log('🎯 PayrollManager: Generating demo payroll...')
        
        const response = await fetch('/api/demo/payroll/calculate', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(generateForm),
        })

        if (!response.ok) {
          throw new Error('Failed to generate demo payroll')
        }

        const result = await response.json()
        alert(`✅ ${result.message}`)
        
        resetGenerateForm()
        fetchData()
        return
      }

      // Regular mode: Original authentication and generation logic
      if (!supabase) {
        alert('❌ Error: Sistema no inicializado')
        return
      }

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
          'Accept': 'application/pdf',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify(generateForm),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate payroll')
      }

      if (response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `planilla_paragon_${generateForm.periodo}_q${generateForm.quincena}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        alert('✅ Nómina generada y PDF descargado exitosamente!')
      } else {
        alert('✅ Nómina generada exitosamente!')
      }
      
      resetGenerateForm()
      fetchData()

    } catch (error: any) {
      console.error('Error generating payroll:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [isDemoMode, supabase, generateForm, resetGenerateForm, fetchData])

  const approvePayroll = useCallback(async (payrollId: string) => {
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
  }, [supabase, userProfile?.employee_id, fetchData])

  const markAsPaid = useCallback(async (payrollId: string) => {
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
  }, [supabase, fetchData])

  // Memo del formateador para evitar recrearlo
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }),
    []
  )
  const formatCurrency = useCallback((amount: number) => currencyFormatter.format(amount ?? 0), [currencyFormatter])

  const getStatusBadge = useCallback((status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium'
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    
    if (config) {
      return <span className={`${baseClasses} ${config.classes}`}>{config.label}</span>
    }
    
    return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>
  }, [])

  const downloadPayrollPDF = useCallback(async (record: PayrollRecord) => {
    const period = record.period_start.slice(0, 7)
    const day = Number(record.period_start.slice(8, 10))
    const quincena = day === 1 ? 1 : 2
    
    await downloadFile('/api/payroll/calculate', `planilla_paragon_${period}_q${quincena}.pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf'
      },
      body: JSON.stringify({
        periodo: period,
        quincena: quincena,
        incluirDeducciones: true
      })
    })
  }, [downloadFile])

  const downloadIndividualReceipt = useCallback(async (record: PayrollRecord) => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      alert('❌ No se encontró token de sesión. Por favor, inicia sesión nuevamente.')
      return
    }

    const period = record.period_start.slice(0, 7)
    const day = Number(record.period_start.slice(8, 10))
    const quincena = day === 1 ? 1 : 2

    await downloadFile('/api/payroll/export', `recibo_${record.employees?.employee_code}_${period}_q${quincena}.pdf`, {
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
      })
    })
  }, [supabase, downloadFile])

  const exportToExcel = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      alert('❌ No se encontró token de sesión. Por favor, inicia sesión nuevamente.')
      return
    }

    await downloadFile('/api/payroll/export', `nomina_paragon_${currentPeriod}.xlsx`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        periodo: currentPeriod,
        formato: 'excel'
      })
    })
  }, [supabase, downloadFile, currentPeriod])

  const exportPayrollReport = useCallback(async (reportType: string, format: 'pdf' | 'csv') => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      alert('❌ No se encontró token de sesión. Por favor, inicia sesión nuevamente.')
      return
    }

    await downloadFile('/api/reports/export-payroll', `reporte_nomina_${reportType}_${currentPeriod}.${format}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': format === 'pdf' ? 'application/pdf' : 'text/csv',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        reportType,
        format,
        periodo: currentPeriod
      })
    })
  }, [supabase, downloadFile, currentPeriod])

  const handleFormChange = useCallback((field: keyof typeof INITIAL_GENERATE_FORM, value: string | number | boolean) => {
    setGenerateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handlePeriodChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPeriod(e.target.value)
  }, [])

  const clearPeriodFilter = useCallback(() => {
    setSelectedPeriod('')
  }, [])

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab)
  }, [])

  // Pre-cálculos para la sección de distribución (evitar trabajo por iteración)
  const { maxDeptCountMemo, totalDeptEmployeesMemo } = useMemo(() => {
    const values = Object.values(payrollStats.departmentBreakdown)
    const counts = values.map(d => d.count)
    const maxDeptCount = Math.max(1, ...counts)
    const totalDeptEmployees = counts.reduce((s, n) => s + n, 0)
    return { maxDeptCountMemo: maxDeptCount, totalDeptEmployeesMemo: totalDeptEmployees }
  }, [payrollStats.departmentBreakdown])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">🏢 Gestión de Nómina - Paragon Honduras</h1>
          <p className="text-gray-300">Sistema integral de procesamiento y administración de nóminas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleTabChange('generate')} className="bg-brand-800 hover:bg-brand-700 text-white">
            📊 Generar Nómina
          </Button>
          <Button variant="outline" onClick={exportToExcel} className="border-white/20 text-white hover:bg-white/10">
            📥 Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => handleTabChange('reports')} className="border-white/20 text-white hover:bg-white/10">
            📋 Reportes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
            }`}
          >
            📈 Dashboard Ejecutivo
          </button>
          <button
            onClick={() => handleTabChange('records')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'records'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
            }`}
          >
            📋 Registros de Nómina
          </button>
          <button
            onClick={() => handleTabChange('generate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generate'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
            }`}
          >
            ⚙️ Generar Nómina
          </button>
          <button
            onClick={() => handleTabChange('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
            }`}
          >
            📋 Reportes
          </button>
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card variant="glass">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {payrollStats.totalEmployees}
                  </div>
                  <div className="text-sm text-gray-300">Empleados Activos</div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {formatCurrency(payrollStats.totalGrossSalary)}
                  </div>
                  <div className="text-sm text-gray-300">Salario Bruto Quincenal</div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {payrollStats.payrollCoverage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-300">Cobertura Nómina</div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {formatCurrency(payrollStats.totalNetSalary)}
                  </div>
                  <div className="text-sm text-gray-300">Salario Neto Quincenal</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-white">📊 Métricas de Gestión</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Salario Promedio:</span>
                    <span className="font-semibold text-white">{formatCurrency(payrollStats.averageSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Cobertura de Nómina:</span>
                    <span className={`font-semibold ${payrollStats.payrollCoverage >= 95 ? 'text-green-400' : 'text-orange-400'}`}>
                      {payrollStats.payrollCoverage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Empleados:</span>
                    <span className="font-semibold text-white">{payrollStats.totalEmployees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Registros Procesados:</span>
                    <span className="font-semibold text-white">{Object.values(payrollStats.departmentBreakdown).reduce((sum, d) => sum + d.count, 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-white">🏢 Distribución por Departamento</CardTitle>
                <CardDescription className="text-gray-300">Cantidad de empleados y salario promedio por área</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(payrollStats.departmentBreakdown).map(([deptId, data]) => {
                    const percentage = (data.count / maxDeptCountMemo) * 100
                    const deptPercentage = totalDeptEmployeesMemo > 0 ? (data.count / totalDeptEmployeesMemo) * 100 : 0
                    
                    return (
                      <div key={deptId} className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-white">{data.name}</div>
                            <div className="text-xs text-gray-300">{data.count} empleados ({deptPercentage.toFixed(1)}%)</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-brand-400">{formatCurrency(data.avgSalary)}</div>
                            <div className="text-xs text-gray-300">promedio</div>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-white/10 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-brand-500 to-brand-600 h-3 rounded-full transition-all duration-700 relative"
                              style={{ width: `${percentage}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          <div className="mt-1 flex justify-between text-xs">
                            <span className="text-gray-300">{data.count} empleados</span>
                            <span className="text-brand-400 font-medium">{deptPercentage.toFixed(1)}% del total</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {Object.keys(payrollStats.departmentBreakdown).length === 0 && (
                    <div className="text-center text-gray-300 py-8">
                      <div className="text-4xl mb-2">📊</div>
                      <div className="text-sm">No hay datos de departamentos para mostrar</div>
                      <div className="text-xs text-gray-400 mt-1">Los empleados necesitan tener departamentos asignados</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">⚡ Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  className="w-full bg-brand-800 hover:bg-brand-700 text-white"
                  onClick={() => handleTabChange('generate')}
                >
                  Generar Nómina Actual
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  onClick={exportToExcel}
                >
                  Exportar Reporte
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  onClick={() => handleTabChange('records')}
                >
                  Ver Registros
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-400/20">
                    <div className="text-blue-400 font-bold text-lg">{payrollStats.totalEmployees}</div>
                    <div className="text-blue-300 text-xs">Empleados</div>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-lg border border-green-400/20">
                    <div className="text-green-400 font-bold text-lg">{Object.keys(payrollStats.departmentBreakdown).length}</div>
                    <div className="text-green-300 text-xs">Departamentos</div>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg border border-purple-400/20">
                    <div className="text-purple-400 font-bold text-lg">{payrollStats.payrollCoverage.toFixed(0)}%</div>
                    <div className="text-purple-300 text-xs">Cobertura</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records Tab */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Filtrar por Período
                  </label>
                  <Input
                    type="month"
                    value={selectedPeriod}
                    onChange={handlePeriodChange}
                    className="w-48 bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearPeriodFilter}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Limpiar Filtro
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Records */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">Registros de Nómina</CardTitle>
              <CardDescription className="text-gray-300">
                {filteredRecords.length} registros
                {selectedPeriod && ` para ${new Date(selectedPeriod + '-01').toLocaleDateString('es-HN', { year: 'numeric', month: 'long' })}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 text-white">Empleado</th>
                      <th className="text-left py-3 px-4 text-white">Período</th>
                      <th className="text-left py-3 px-4 text-white">Salario Bruto</th>
                      <th className="text-left py-3 px-4 text-white">Deducciones</th>
                      <th className="text-left py-3 px-4 text-white">Salario Neto</th>
                      <th className="text-left py-3 px-4 text-white">Asistencia</th>
                      <th className="text-left py-3 px-4 text-white">Estado</th>
                      <th className="text-left py-3 px-4 text-white">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, index) => (
                      <tr key={record.id ?? `record-${index}`} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-white">{record.employees?.name}</div>
                            <div className="text-sm text-gray-300">
                              {record.employees?.employee_code} • {record.employees?.team}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="text-white">{new Date(record.period_start).toLocaleDateString('es-HN')}</div>
                            <div className="text-gray-300">hasta {new Date(record.period_end).toLocaleDateString('es-HN')}</div>
                            <div className="text-xs text-gray-400 capitalize">{record.period_type}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-white">
                          {formatCurrency(record.gross_salary)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-mono">
                            <div className="text-white">ISR: {formatCurrency(record.income_tax)}</div>
                            <div className="text-white">RAP: {formatCurrency(record.professional_tax)}</div>
                            <div className="text-white">IHSS: {formatCurrency(record.social_security)}</div>
                            <div className="font-semibold border-t border-white/20 pt-1 text-white">
                              Total: {formatCurrency(record.total_deductions)}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-green-400">
                          {formatCurrency(record.net_salary)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="text-white">Trabajó: {record.days_worked} días</div>
                            <div className="text-red-400">Ausente: {record.days_absent} días</div>
                            <div className="text-yellow-400">Tardanza: {record.late_days} días</div>
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
                                className="border-white/20 text-white hover:bg-white/10"
                              >
                                Aprobar
                              </Button>
                            )}
                            {record.status === 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => markAsPaid(record.id)}
                                className="bg-brand-800 hover:bg-brand-700 text-white"
                              >
                                Marcar Pagado
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => await downloadPayrollPDF(record)}
                              className="text-gray-300 hover:bg-white/10 hover:text-white"
                            >
                              📄 Descargar PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => await downloadIndividualReceipt(record)}
                              className="text-gray-300 hover:bg-white/10 hover:text-white"
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
                  <div className="text-center py-8 text-gray-300">
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
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">📊 Generar Nómina</CardTitle>
              <CardDescription className="text-gray-300">
                Genera la nómina para todos los empleados activos de Paragon Honduras para un período y quincena seleccionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generatePayroll} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Mes
                  </label>
                  <Input
                    type="month"
                    value={generateForm.periodo}
                    onChange={e => handleFormChange('periodo', e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Quincena
                  </label>
                  <select
                    value={generateForm.quincena}
                    onChange={e => handleFormChange('quincena', Number(e.target.value))}
                    className="w-full p-2 border border-white/20 rounded-md focus:ring-2 focus:ring-brand-500 bg-white/10 text-white"
                    required
                  >
                    <option value={1} className="bg-brand-900 text-white">Primera (1-15)</option>
                    <option value={2} className="bg-brand-900 text-white">Segunda (16-fin de mes)</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateForm.incluirDeducciones}
                    onChange={e => handleFormChange('incluirDeducciones', e.target.checked)}
                    className="mr-2 accent-brand-500"
                    id="deducciones"
                  />
                  <label htmlFor="deducciones" className="text-sm font-medium text-white">
                    Incluir deducciones (ISR, IHSS, RAP)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateForm.soloEmpleadosConAsistencia}
                    onChange={e => handleFormChange('soloEmpleadosConAsistencia', e.target.checked)}
                    className="mr-2 accent-brand-500"
                    id="asistencia"
                  />
                  <label htmlFor="asistencia" className="text-sm font-medium text-white">
                    Solo empleados con asistencia completa
                  </label>
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <Button type="submit" disabled={loading} className="bg-brand-800 hover:bg-brand-700 text-white">
                    {loading ? '🔄 Generando...' : '🚀 Generar Nómina'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleTabChange('dashboard')}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Employee Preview */}
          {employees.length > 0 && (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-white">👥 Empleados Activos ({employees.length})</CardTitle>
                <CardDescription className="text-gray-300">
                  Lista de empleados que serán incluidos en la nómina
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employees.slice(0, 9).map((emp) => (
                    <div key={emp.id} className="p-3 border border-white/20 rounded-lg bg-white/5">
                      <div className="font-medium text-white">{emp.name}</div>
                      <div className="text-sm text-gray-300">
                        {emp.employee_code} • {emp.department_id || 'Sin departamento'}
                      </div>
                      <div className="text-sm font-mono text-green-400">
                        {formatCurrency(emp.base_salary)}
                      </div>
                    </div>
                  ))}
                  {employees.length > 9 && (
                    <div className="p-3 border border-white/20 rounded-lg bg-white/5 text-center">
                      <div className="text-sm text-gray-300">
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

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">📊 Reportes de Nómina</CardTitle>
              <CardDescription className="text-gray-300">
                Genera reportes detallados de nómina en diferentes formatos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Reporte General */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">📋 Reporte General</CardTitle>
                    <CardDescription className="text-gray-300">Estadísticas completas de nómina</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        onClick={() => exportPayrollReport('general', 'pdf')}
                        className="w-full bg-brand-800 hover:bg-brand-700 text-white"
                      >
                        📄 Exportar PDF
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => exportPayrollReport('general', 'csv')}
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        📊 Exportar CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Reporte por Período */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">📅 Reporte por Período</CardTitle>
                    <CardDescription className="text-gray-300">Nómina de un período específico</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-white mb-1">
                          Período
                        </label>
                        <Input
                          type="month"
                          value={selectedPeriod}
                          onChange={handlePeriodChange}
                          className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400"
                        />
                      </div>
                      <Button 
                        onClick={() => exportPayrollReport('period', 'pdf')}
                        className="w-full bg-brand-800 hover:bg-brand-700 text-white"
                        disabled={!selectedPeriod}
                      >
                        📄 Exportar PDF
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => exportPayrollReport('period', 'csv')}
                        className="w-full border-white/20 text-white hover:bg-white/10"
                        disabled={!selectedPeriod}
                      >
                        📊 Exportar CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Reporte de Deducciones */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">💰 Reporte de Deducciones</CardTitle>
                    <CardDescription className="text-gray-300">Análisis detallado de deducciones</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        onClick={() => exportPayrollReport('deductions', 'pdf')}
                        className="w-full bg-brand-800 hover:bg-brand-700 text-white"
                      >
                        📄 Exportar PDF
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => exportPayrollReport('deductions', 'csv')}
                        className="w-full border-white/20 text-white hover:bg-white/10"
                      >
                        📊 Exportar CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
