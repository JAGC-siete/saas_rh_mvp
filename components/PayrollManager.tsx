

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '../lib/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'


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
  periodo: new Date().toISOString().slice(0, 7),
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
  const [generateForm, setGenerateForm] = useState(INITIAL_GENERATE_FORM)
  const [supabase, setSupabase] = useState<any>(null)
  // Filtros avanzados (quincena/mes/año/departamento/empleado)
  const [filterYear, setFilterYear] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterQuincena, setFilterQuincena] = useState<number|''>('')
  const [filterDept, setFilterDept] = useState<string>('')
  const [filterEmployee, setFilterEmployee] = useState<string>('')
  const [suspendedCount, setSuspendedCount] = useState<number>(0)
  const [compareData, setCompareData] = useState<any>(null)
  const [trendSeries, setTrendSeries] = useState<any[]>([])
  

  // Memoized values
  const currentPeriodRecords = useMemo(() => 
    payrollRecords.filter(record => 
      record.period_start.startsWith(selectedPeriod || new Date().toISOString().slice(0, 7))
    ),
    [payrollRecords, selectedPeriod]
  )

  const filteredRecords = useMemo(() => {
    let list = payrollRecords
    // Filtro por periodo (mes)
    if (selectedPeriod) {
      list = list.filter(r => r.period_start.startsWith(selectedPeriod))
    }
    // Filtro por año/mes/quincena
    if (filterYear) list = list.filter(r => r.period_start.startsWith(filterYear))
    if (filterMonth) list = list.filter(r => r.period_start.slice(0,7) === `${filterYear || r.period_start.slice(0,4)}-${filterMonth}`)
    if (filterQuincena) {
      list = list.filter(r => {
        const day = Number(r.period_start.slice(8,10))
        const q = day === 1 ? 1 : 2
        return q === filterQuincena
      })
    }
    // Filtro por departamento
    if (filterDept) list = list.filter(r => (r.employees?.department_id || '') === filterDept)
    // Filtro por empleado (nombre o código)
    if (filterEmployee) {
      const q = filterEmployee.toLowerCase()
      list = list.filter(r =>
        (r.employees?.name || '').toLowerCase().includes(q) ||
        (r.employees?.employee_code || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [payrollRecords, selectedPeriod, filterYear, filterMonth, filterQuincena, filterDept, filterEmployee])

  

  // Add last day of selected month for range chips
  const lastDayOfSelectedMonth = useMemo(() => {
    if (!generateForm.periodo) return 30
    const [year, month] = generateForm.periodo.split('-').map((n: any) => Number(n))
    return new Date(year, month, 0).getDate()
  }, [generateForm.periodo])

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

  useEffect(() => {
    if (!supabase) return
    // Llama a fetchData sin agregarlo como dependencia para evitar orden de declaración
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

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
      deptData?.forEach((dept: any) => { deptMap[dept.id] = dept.name })
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
    Object.keys(stats.departmentBreakdown).forEach((deptId) => {
      const count = stats.departmentBreakdown[deptId].count
      const sum = deptSumSalary[deptId] ?? 0
      stats.departmentBreakdown[deptId].avgSalary = count > 0 ? sum / count : 0
    })
    if (currentPeriodRecords.length > 0) {
      stats.averageSalary = stats.totalNetSalary / currentPeriodRecords.length
    }
    const totalDays = currentPeriodRecords.reduce((sum, r) => sum + (r.days_worked || 0), 0)
    const expectedDays = currentPeriodRecords.length * 15
    stats.attendanceRate = expectedDays > 0 ? (totalDays / expectedDays) * 100 : 0
    // Guardar conteo de suspendidos en estado aparte
    if (isMountedRef.current) setPayrollStats(stats)
  }, [currentPeriodRecords, departments])

  const fetchData = useCallback(async () => {
    if (!supabase) return
    
    setLoading(true)
    try {
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

      // Fetch employees (activos y suspendidos)
      let employeesQuery = supabase
        .from('employees')
        .select('id, name, employee_code, base_salary, department_id, status')
        .in('status', ['active','suspended'])
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
      const suspended = (employeesData || []).filter((e: any) => e.status === 'suspended').length
      setSuspendedCount(suspended)

      await loadDepartments()
      calculatePayrollStats(payrollData || [], employeesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error cargando datos: ${errorMessage}`)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [supabase, loadDepartments, calculatePayrollStats])

  const generatePayroll = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
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
  }, [supabase, generateForm, resetGenerateForm, fetchData])

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
        employeeId: record.employee_id,
        quincena
      })
    })
  }, [supabase, downloadFile])

  const sendPayrollEmail = useCallback(async (record?: PayrollRecord) => {
    const to = prompt('Correo de destino:')
    if (!to) return
    const period = (record?.period_start || new Date().toISOString()).slice(0,7)
    const day = record ? Number(record.period_start.slice(8,10)) : 1
    const quincena = day === 1 ? 1 : 2
    const payload: any = { to, periodo: period, quincena }
    if (record) { payload.type = 'recibo'; payload.employeeId = record.employee_id } else { payload.type = 'planilla' }
    const res = await fetch('/api/payroll/send-email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const json = await res.json().catch(()=>({}))
    if (!res.ok) return alert(`❌ Error: ${json.error || res.status}`)
    alert(json.sent ? '✅ Enviado' : `⚠️ Enlace listo: ${json.downloadUrl}`)
  }, [])

  const sendPayrollWhatsApp = useCallback(async (record?: PayrollRecord) => {
    const phone = prompt('Número WhatsApp (E.164, ej. 5049xxxxxxx):')
    if (!phone) return
    const period = (record?.period_start || new Date().toISOString()).slice(0,7)
    const day = record ? Number(record.period_start.slice(8,10)) : 1
    const quincena = day === 1 ? 1 : 2
    const payload: any = { phone, periodo: period, quincena }
    if (record) { payload.type = 'recibo'; payload.employeeId = record.employee_id } else { payload.type = 'planilla' }
    const res = await fetch('/api/payroll/send-whatsapp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const json = await res.json().catch(()=>({}))
    if (!res.ok) return alert(`❌ Error: ${json.error || res.status}`)
    if (json.url) window.open(json.url, '_blank')
  }, [])

  

  const handleFormChange = useCallback((field: keyof typeof INITIAL_GENERATE_FORM, value: string | number | boolean) => {
    setGenerateForm(prev => ({ ...prev, [field]: value }))
  }, [])

  const handlePeriodChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPeriod(e.target.value)
  }, [])

  const clearPeriodFilter = useCallback(() => {
    setSelectedPeriod('')
  }, [])

  

  

  // Pre-cálculos para la sección de distribución (evitar trabajo por iteración)
  const { maxDeptCountMemo, totalDeptEmployeesMemo } = useMemo(() => {
    const values = Object.values(payrollStats.departmentBreakdown)
    const counts = values.map(d => d.count)
    const maxDeptCount = Math.max(1, ...counts)
    const totalDeptEmployees = counts.reduce((s, n) => s + n, 0)
    return { maxDeptCountMemo: maxDeptCount, totalDeptEmployeesMemo: totalDeptEmployees }
  }, [payrollStats.departmentBreakdown])

  // Cargar comparativa y tendencia
  useEffect(() => {
    const ym = (selectedPeriod || new Date().toISOString().slice(0,7))
    const q = (filterQuincena || 1) as number
    ;(async () => {
      try {
        const cmpRes = await fetch(`/api/payroll/compare?periodo=${encodeURIComponent(ym)}&quincena=${q}`)
        const cmpJson = await cmpRes.json().catch(()=>null)
        if (cmpRes.ok) setCompareData(cmpJson)
      } catch {}
      try {
        const trRes = await fetch(`/api/payroll/trend?months=6`)
        const trJson = await trRes.json().catch(()=>null)
        if (trRes.ok) setTrendSeries(trJson?.series || [])
      } catch {}
    })()
  }, [selectedPeriod, filterQuincena])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">🏢 Gestión de Nómina - Paragon Honduras</h1>
          <p className="text-gray-300">Sistema integral de procesamiento y administración de nóminas</p>
      </div>

      </div>

      

      

      {/* Dashboard Ejecutivo */}
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

          {/* Extra Summary: Suspendidos y Horas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="glass">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{suspendedCount}</div>
                  <div className="text-sm text-gray-300">Empleados Suspendidos</div>
                </div>
              </CardContent>
            </Card>
            <Card variant="glass" className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">⏱️ Horas Trabajadas vs Plan</CardTitle>
                <CardDescription className="text-gray-300">Estimado: 8h por día</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const totalDays = currentPeriodRecords.reduce((sum, r) => sum + (r.days_worked || 0), 0)
                  const expectedDays = currentPeriodRecords.length * 15
                  const hoursWorked = totalDays * 8
                  const hoursPlanned = expectedDays * 8
                  const pct = hoursPlanned > 0 ? Math.min(100, Math.round((hoursWorked / hoursPlanned) * 100)) : 0
                  return (
                    <div>
                      <div className="flex justify-between text-sm text-gray-300 mb-1">
                        <span>{hoursWorked} h</span>
                        <span>{hoursPlanned} h plan</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-3">
                        <div className="bg-green-500 h-3 rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="text-right text-xs text-gray-300 mt-1">{pct}%</div>
                    </div>
                  )
                })()}
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

      </div>

      {/* Generar Nómina */}
      <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
            <CardTitle className="text-white">📊 Generar Nómina</CardTitle>
            <CardDescription className="text-gray-300">
              Genera la nómina para todos los empleados activos para un período y quincena seleccionados
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
                  Rango
                </label>
                <div className="flex gap-2">
                <Button 
                    type="button"
                    onClick={() => handleFormChange('quincena', 1)}
                    className={`${generateForm.quincena === 1 ? 'bg-brand-800 hover:bg-brand-700 text-white' : 'border border-white/20 text-white hover:bg-white/10 bg-transparent'}`}
                >
                    1 - 15
                </Button>
                <Button 
                    type="button"
                    onClick={() => handleFormChange('quincena', 2)}
                    className={`${generateForm.quincena === 2 ? 'bg-brand-800 hover:bg-brand-700 text-white' : 'border border-white/20 text-white hover:bg-white/10 bg-transparent'}`}
                  >
                    16 - {lastDayOfSelectedMonth}
                </Button>
                </div>
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

      {/* Registros de Nómina */}
        <div className="space-y-6">
          {/* Filters */}
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <div className="flex items-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={clearPeriodFilter}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Limpiar Filtro
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={()=>sendPayrollEmail()}>Enviar Planilla por Email</Button>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={()=>sendPayrollWhatsApp()}>Enviar por WhatsApp</Button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Año</label>
                  <Input type="number" placeholder="2025" value={filterYear} onChange={e=>setFilterYear(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Mes (01-12)</label>
                  <Input type="text" placeholder="08" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="bg-white/10 border-white/20 text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Quincena</label>
                  <div className="flex gap-2">
                    <Button size="sm" variant={filterQuincena===1?undefined:'outline'} onClick={()=>setFilterQuincena(1)} className={filterQuincena===1? 'bg-brand-800 text-white':'border-white/20 text-white'}>1-15</Button>
                    <Button size="sm" variant={filterQuincena===2?undefined:'outline'} onClick={()=>setFilterQuincena(2)} className={filterQuincena===2? 'bg-brand-800 text-white':'border-white/20 text-white'}>16-fin</Button>
                    <Button size="sm" variant="ghost" onClick={()=>setFilterQuincena('')} className="text-gray-300 hover:bg-white/10">Limpiar</Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Departamento</label>
                  <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className="bg-white/10 border-white/20 text-white rounded px-2 py-2">
                    <option value="">Todos</option>
                    {Object.entries(departments).map(([id,name])=> (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Empleado</label>
                  <Input placeholder="Nombre o código" value={filterEmployee} onChange={e=>setFilterEmployee(e.target.value)} className="bg-white/10 border-white/20 text-white" />
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendPayrollEmail(record)}
                              className="text-gray-300 hover:bg-white/10 hover:text-white"
                            >
                              ✉️ Enviar por Email
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => sendPayrollWhatsApp(record)}
                              className="text-gray-300 hover:bg-white/10 hover:text-white"
                            >
                              💬 Enviar WhatsApp
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

      

      
    </div>
  )
}
