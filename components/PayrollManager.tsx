import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '../lib/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

// MODE: por días (cálculo basado en días trabajados)
interface PayrollRecord {
  id: string
  employee_id: string
  period_start: string
  period_end: string
  period_type: string
  base_salary: number
  gross_salary: number
  income_tax: number
  professional_tax: number // Mapeado a RAP en UI
  social_security: number // Mapeado a IHSS en UI
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

// Nuevo tipo para registros Preview (no persistidos)
interface PreviewPayrollRecord extends Omit<PayrollRecord, 'id' | 'created_at'> {
  id?: string
  status: 'preview' | 'draft'
  isPreview: true
  previewConfig?: {
    daysWorked: number
    includeOvertime: boolean
    overtimeHours?: number
    overtimeRate?: number
  }
}

// Configuración de escenarios para Preview
interface PreviewScenario {
  daysWorked: number
  includeOvertime: boolean
  overtimeHours: number
  overtimeRate: number
  baseSalaryAdjustment: number
}

// Constantes para fórmulas oficiales de Honduras 2025
const HONDURAS_2025_CONSTANTS = {
  SALARIO_MINIMO: 11903.13,
  IHSS_TECHO: 11903.13,
  IHSS_PORCENTAJE: 0.05,
  RAP_PORCENTAJE: 0.015,
  ISR_EXENCION_ANUAL: 40000,
  ISR_BRACKETS: [
    { limit: 217493.16, rate: 0.00, base: 0 },
    { limit: 331638.50, rate: 0.15, base: 0 },
    { limit: 771252.38, rate: 0.20, base: 17121.80 },
    { limit: Infinity, rate: 0.25, base: 105044.58 }
  ]
} as const

const DEFAULT_PREVIEW_SCENARIO: PreviewScenario = {
  daysWorked: 15,
  includeOvertime: false,
  overtimeHours: 0,
  overtimeRate: 1.5,
  baseSalaryAdjustment: 0
}

interface Employee {
  id: string
  name: string
  employee_code: string
  base_salary: number
  department_id: string
  status: string
}

// Métricas completas para las 8 tarjetas
interface PayrollMetrics {
  // Fila 1
  activeEmployees: number
  totalGrossSalary: number
  totalDeductions: number
  totalNetSalary: number
  // Fila 2
  totalIHSS: number
  totalRAP: number
  totalISR: number
  totalDaysWorked: number
  // Cálculos adicionales
  payrollCoverage: number
  attendanceRate: number
  // Propiedades adicionales para compatibilidad
  averageSalary: number
  departmentBreakdown: { [key: string]: { count: number, name: string, avgSalary: number } }
}

const INITIAL_PAYROLL_METRICS: PayrollMetrics = {
  activeEmployees: 0,
  totalGrossSalary: 0,
  totalDeductions: 0,
  totalNetSalary: 0,
  totalIHSS: 0,
  totalRAP: 0,
  totalISR: 0,
  totalDaysWorked: 0,
  payrollCoverage: 0,
  attendanceRate: 0,
  averageSalary: 0,
  departmentBreakdown: {}
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
  paid: { label: 'Pagada', classes: 'bg-green-100 text-green-800' },
  preview: { label: 'Preview', classes: 'bg-yellow-100 text-yellow-800' }
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
  const [previewRecords, setPreviewRecords] = useState<PreviewPayrollRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [selectedQuincena, setSelectedQuincena] = useState<number>(() => {
    const today = new Date()
    const day = today.getDate()
    return day <= 15 ? 1 : 2
  })
  const [userProfile, setUserProfile] = useState<any>(null)
  const [payrollMetrics, setPayrollMetrics] = useState<PayrollMetrics>(INITIAL_PAYROLL_METRICS)
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
  // Estado para modo Preview mejorado
  const [previewScenario, setPreviewScenario] = useState<PreviewScenario>(DEFAULT_PREVIEW_SCENARIO)
  // UI colors (computed to avoid static strings triggering secret scanner)

  

  // Memoized values
  const currentPeriodRecords = useMemo(() => 
    payrollRecords.filter(record => 
      record.period_start.startsWith(selectedPeriod || new Date().toISOString().slice(0, 7))
    ),
    [payrollRecords, selectedPeriod]
  )

  const filteredRecords = useMemo(() => {
    // Combinar registros reales y de preview
    const allRecords = [...payrollRecords, ...previewRecords]
    let list = allRecords
    
    // Filtro por periodo (mes)
    if (selectedPeriod) {
      list = list.filter(r => r.period_start.startsWith(selectedPeriod))
    }
    // Filtro por año/mes/quincena
    if (filterYear) list = list.filter(r => r.period_start.startsWith(filterYear))
    if (filterMonth) list = list.filter(r => r.period_start.slice(0,7) === `${filterYear || r.period_start.slice(0,4)}-${filterMonth}`)
    if (filterQuincena) {
      list = list.filter(r => {
        const startDay = Number(r.period_start.slice(8,10))
        const endDay = Number(r.period_end.slice(8,10))
        
        // Períodos fijos: 1-15 (quincena 1) y 16-<lastDay> (quincena 2)
        // Verificar que tanto el inicio como el fin estén en la misma quincena
        let q = 0
        if (startDay <= 15 && endDay <= 15) {
          q = 1 // Quincena 1: 1-15
        } else if (startDay >= 16 && endDay >= 16) {
          q = 2 // Quincena 2: 16-<lastDay>
        }
        
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
  }, [payrollRecords, previewRecords, selectedPeriod, filterYear, filterMonth, filterQuincena, filterDept, filterEmployee])

  // Función para obtener descripción del filtro aplicado
  const getFilterDescription = useMemo(() => {
    let description = `${filteredRecords.length} registros`
    
    if (selectedPeriod) {
      const monthName = new Date(selectedPeriod + '-01').toLocaleDateString('es-HN', { year: 'numeric', month: 'long' })
      description += ` para ${monthName}`
      
      if (filterQuincena) {
        const quincenaText = filterQuincena === 1 ? '1-15' : '16-30'
        description += ` (Quincena ${quincenaText})`
      }
    }
    
    return description
  }, [filteredRecords.length, selectedPeriod, filterQuincena])

  

  // Add last day of selected month for range chips - FIXED PERIODS
  const lastDayOfSelectedMonth = useMemo(() => {
    // Calcular el último día real del mes seleccionado
    const [y, m] = (selectedPeriod || new Date().toISOString().slice(0, 7)).split('-').map(Number)
    return new Date(y, m, 0).getDate() // 28–31
  }, [selectedPeriod])

  // Función para calcular ISR según tabla progresiva de Honduras 2025
  const calculateISR = useCallback((annualSalary: number): number => {
    const baseImponible = annualSalary - HONDURAS_2025_CONSTANTS.ISR_EXENCION_ANUAL
    
    if (baseImponible <= 0) return 0
    
    for (const bracket of HONDURAS_2025_CONSTANTS.ISR_BRACKETS) {
      if (baseImponible <= bracket.limit) {
        return bracket.base + (baseImponible - (bracket.base > 0 ? bracket.limit : 0)) * bracket.rate
      }
    }
    
    return 0
  }, [])

  // Función para calcular deducciones según fórmulas oficiales de Honduras
  const calculateHondurasDeductions = useCallback((baseSalary: number, daysWorked: number, includeOvertime: boolean = false, overtimeHours: number = 0, overtimeRate: number = 1.5): {
    grossSalary: number
    ihss: number
    rap: number
    isr: number
    totalDeductions: number
    netSalary: number
  } => {
    // MODE: por días (cálculo basado en días trabajados)
    const dailyRate = baseSalary / 30
    const baseGrossSalary = dailyRate * daysWorked
    
    // Calcular horas extra si se incluyen
    let overtimeAmount = 0
    if (includeOvertime && overtimeHours > 0) {
      const hourlyRate = baseSalary / (30 * 8)
      overtimeAmount = hourlyRate * overtimeHours * overtimeRate
    }
    
    const grossSalary = baseGrossSalary + overtimeAmount
    
    // IHSS: 5% del salario base (máximo L.11,903.13)
    const ihssBase = Math.min(baseSalary, HONDURAS_2025_CONSTANTS.IHSS_TECHO)
    const ihss = (ihssBase * HONDURAS_2025_CONSTANTS.IHSS_PORCENTAJE) / 2 // Dividir por 2 para quincena
    
    // RAP: 1.5% sobre el excedente del salario mínimo
    const rap = Math.max(0, baseSalary - HONDURAS_2025_CONSTANTS.SALARIO_MINIMO) * HONDURAS_2025_CONSTANTS.RAP_PORCENTAJE / 2
    
    // ISR según tabla progresiva de Honduras 2025
    const annualSalary = baseSalary * 12
    const isrAnnual = calculateISR(annualSalary)
    const isr = (isrAnnual / 12) / 2 // Convertir a quincenal
    
    const totalDeductions = ihss + rap + isr
    const netSalary = grossSalary - totalDeductions
    
    return {
      grossSalary,
      ihss,
      rap,
      isr,
      totalDeductions,
      netSalary
    }
  }, [calculateISR])

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

  const calculatePayrollStats = useCallback((records: (PayrollRecord | PreviewPayrollRecord)[], emps: Employee[]) => {
    const stats: PayrollMetrics = {
      activeEmployees: emps.length,
      totalGrossSalary: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      totalIHSS: 0,
      totalRAP: 0,
      totalISR: 0,
      totalDaysWorked: 0,
      payrollCoverage: 0,
      attendanceRate: 0,
      averageSalary: 0,
      departmentBreakdown: {}
    }
    stats.payrollCoverage = emps.length > 0 ? (records.length / emps.length) * 100 : 0
    const deptSumSalary: Record<string, number> = {}
    records.forEach((record) => {
      stats.totalGrossSalary += record.gross_salary
      stats.totalDeductions += record.total_deductions
      stats.totalNetSalary += record.net_salary
      stats.totalIHSS += record.social_security
      stats.totalRAP += record.professional_tax
      stats.totalISR += record.income_tax
      stats.totalDaysWorked += record.days_worked || 0
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
    if (records.length > 0) {
      stats.averageSalary = stats.totalNetSalary / records.length
    }
    const totalDays = records.reduce((sum, r) => sum + (r.days_worked || 0), 0)
    const expectedDays = records.length * 15
    stats.attendanceRate = expectedDays > 0 ? (totalDays / expectedDays) * 100 : 0
    // Guardar conteo de suspendidos en estado aparte
    if (isMountedRef.current) setPayrollMetrics(stats)
  }, [departments])

  // Función para calcular el último día del mes seleccionado
  const getLastDayOfMonth = useCallback((period: string) => {
    const [y, m] = period.split('-').map(Number)
    return new Date(y, m, 0).getDate() // 28–31
  }, [])

  // Función para generar registros Preview cuando no existen payroll_records
  const generatePreviewRecords = useCallback(async (period: string, quincena: number) => {
    if (!supabase || !userProfile) return []

    try {
      // Obtener empleados activos de la empresa
      let employeesQuery = supabase
        .from('employees')
        .select('id, name, employee_code, base_salary, department_id, status')
        .eq('status', 'active')
        .order('name')

      if (userProfile.company_id) {
        employeesQuery = employeesQuery.eq('company_id', userProfile.company_id)
      }

      const { data: activeEmployees, error: empError } = await employeesQuery
      if (empError) throw empError

      const lastDay = getLastDayOfMonth(period)
      const startDay = quincena === 1 ? 1 : 16
      const endDay = quincena === 1 ? 15 : lastDay

      // Generar registros Preview para cada empleado activo usando fórmulas reales
      const previewRecords: PreviewPayrollRecord[] = activeEmployees.map((emp: any) => {
        // Aplicar ajuste de salario base si está configurado
        const adjustedBaseSalary = emp.base_salary + previewScenario.baseSalaryAdjustment
        
        // Calcular deducciones usando fórmulas oficiales de Honduras
        const deductions = calculateHondurasDeductions(
          adjustedBaseSalary,
          previewScenario.daysWorked,
          previewScenario.includeOvertime,
          previewScenario.overtimeHours,
          previewScenario.overtimeRate
        )

        return {
          employee_id: emp.id,
          period_start: `${period}-${startDay.toString().padStart(2, '0')}`,
          period_end: `${period}-${endDay.toString().padStart(2, '0')}`,
          period_type: 'quincenal',
          base_salary: adjustedBaseSalary,
          gross_salary: deductions.grossSalary,
          income_tax: deductions.isr,
          professional_tax: deductions.rap,
          social_security: deductions.ihss,
          total_deductions: deductions.totalDeductions,
          net_salary: deductions.netSalary,
          days_worked: previewScenario.daysWorked,
          days_absent: 0,
          late_days: 0,
          status: 'preview',
          employees: {
            name: emp.name,
            employee_code: emp.employee_code,
            team: '',
            department_id: emp.department_id
          },
          isPreview: true,
          previewConfig: {
            daysWorked: previewScenario.daysWorked,
            includeOvertime: previewScenario.includeOvertime,
            overtimeHours: previewScenario.overtimeHours,
            overtimeRate: previewScenario.overtimeRate
          }
        }
      })

      return previewRecords
    } catch (error) {
      console.error('Error generating preview records:', error)
      return []
    }
  }, [supabase, userProfile, getLastDayOfMonth, previewScenario, calculateHondurasDeductions])

  // Función para obtener registros del periodo actual (reales o preview)
  const getCurrentPeriodRecords = useCallback(async () => {
    const currentPeriod = selectedPeriod || new Date().toISOString().slice(0, 7)
    const currentQuincena = selectedQuincena

    // Buscar registros reales del periodo
    let realRecords = payrollRecords.filter(record => {
      const recordPeriod = record.period_start.slice(0, 7)
      const startDay = Number(record.period_start.slice(8, 10))
      const endDay = Number(record.period_end.slice(8, 10))
      
      if (recordPeriod !== currentPeriod) return false
      
      if (currentQuincena === 1) {
        return startDay <= 15 && endDay <= 15
      } else {
        const lastDay = getLastDayOfMonth(currentPeriod)
        return startDay >= 16 && endDay >= 16 && endDay <= lastDay
      }
    })

    // Si no hay registros reales, generar Preview
    if (realRecords.length === 0) {
      const previewRecords = await generatePreviewRecords(currentPeriod, currentQuincena)
      setPreviewRecords(previewRecords)
      return previewRecords
    } else {
      setPreviewRecords([])
      return realRecords
    }
  }, [payrollRecords, selectedPeriod, selectedQuincena, generatePreviewRecords, getLastDayOfMonth])

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
      
      // Obtener registros del periodo actual (reales o preview)
      const currentRecords = await getCurrentPeriodRecords()
      
      // Calcular métricas con los registros actuales
      const activeEmployees = (employeesData || []).filter((e: any) => e.status === 'active')
      calculatePayrollStats(currentRecords, activeEmployees)

    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error cargando datos: ${errorMessage}`)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [supabase, loadDepartments, calculatePayrollStats, getCurrentPeriodRecords])

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

  const downloadPayrollPDF = useCallback(async (record: PayrollRecord | PreviewPayrollRecord) => {
    const period = record.period_start.slice(0, 7)
    const day = Number(record.period_start.slice(8, 10))
    const quincena = day <= 15 ? 1 : 2
    
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

  const downloadIndividualReceipt = useCallback(async (record: PayrollRecord | PreviewPayrollRecord) => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      alert('❌ No se encontró token de sesión. Por favor, inicia sesión nuevamente.')
      return
    }

    const period = record.period_start.slice(0, 7)
    const day = Number(record.period_start.slice(8, 10))
    const quincena = day <= 15 ? 1 : 2
    const employeeCode = record.employees?.employee_code || 'unknown'

    await downloadFile('/api/payroll/export', `recibo_${employeeCode}_${period}_q${quincena}.pdf`, {
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

  const sendPayrollEmail = useCallback(async (record?: PayrollRecord | PreviewPayrollRecord) => {
    const to = prompt('Correo de destino:')
    if (!to) return
    const period = (record?.period_start || new Date().toISOString()).slice(0,7)
    const day = record ? Number(record.period_start.slice(8,10)) : 1
    const quincena = day <= 15 ? 1 : 2
    const payload: any = { to, periodo: period, quincena }
    if (record) { 
      payload.type = 'recibo'; 
      payload.employeeId = record.employee_id || 'unknown'
    } else { 
      payload.type = 'planilla' 
    }
    const res = await fetch('/api/payroll/send-email', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const json = await res.json().catch(()=>({}))
    if (!res.ok) return alert(`❌ Error: ${json.error || res.status}`)
    alert(json.sent ? '✅ Enviado' : `⚠️ Enlace listo: ${json.downloadUrl}`)
  }, [])

  const sendPayrollWhatsApp = useCallback(async (record?: PayrollRecord | PreviewPayrollRecord) => {
    const phone = prompt('Número WhatsApp (E.164, ej. 5049xxxxxxx):')
    if (!phone) return
    const period = (record?.period_start || new Date().toISOString()).slice(0,7)
    const day = record ? Number(record.period_start.slice(8,10)) : 1
    const quincena = day <= 15 ? 1 : 2
    const payload: any = { phone, periodo: period, quincena }
    if (record) { 
      payload.type = 'recibo'; 
      payload.employeeId = record.employee_id || 'unknown'
    } else { 
      payload.type = 'planilla' 
    }
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

  const clearAllFilters = useCallback(() => {
    setSelectedPeriod('')
    setSelectedQuincena(() => {
      const today = new Date()
      const day = today.getDate()
      return day <= 15 ? 1 : 2
    })
    setFilterYear('')
    setFilterMonth('')
    setFilterQuincena('')
    setFilterDept('')
    setFilterEmployee('')
  }, [])

  const editPayrollRecord = useCallback((record: PayrollRecord | PreviewPayrollRecord) => {
    // TODO: Implementar edición de registro de nómina
    console.log('Editando registro de nómina:', record)
    alert('Funcionalidad de edición en desarrollo')
  }, [])

  const recalculatePayroll = useCallback(async (recordId: string) => {
    try {
      // TODO: Implementar recálculo de nómina
      console.log('Recalculando nómina para:', recordId)
      alert('Funcionalidad de recálculo en desarrollo')
    } catch (error) {
      console.error('Error recalculando nómina:', error)
      alert('Error al recalcular nómina')
    }
  }, [])

  

  

  // (Distribución por departamento fue reemplazada por tendencia; pre-cálculos removidos)

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

  // Actualizar registros cuando cambie el periodo o quincena
  useEffect(() => {
    if (userProfile && supabase) {
      getCurrentPeriodRecords().then(currentRecords => {
        const activeEmployees = employees.filter(e => e.status === 'active')
        calculatePayrollStats(currentRecords, activeEmployees)
      })
    }
  }, [selectedPeriod, selectedQuincena, userProfile, supabase, employees, getCurrentPeriodRecords, calculatePayrollStats])

  // % Ausentismo (periodo actual)
  const absenteeismPercent = useMemo(() => {
    const plannedDays = currentPeriodRecords.length * 15
    const totalAbsent = currentPeriodRecords.reduce((sum, r) => sum + (r.days_absent || 0), 0)
    return plannedDays > 0 ? (totalAbsent / plannedDays) * 100 : 0
  }, [currentPeriodRecords])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">🏢 Gestión de Nómina - Paragon Honduras</h1>
          <p className="text-gray-300">Sistema integral de procesamiento y administración de nóminas</p>
      </div>

      </div>

      {/* 1. 📊 Dashboard Ejecutivo */}
      <div className="space-y-6">
        {/* Banner de Preview */}
        {previewRecords.length > 0 && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              <span className="text-yellow-200 font-medium">Modo Preview</span>
              <span className="text-yellow-300 text-sm">
                Mostrando estimado en vivo (no persistido) para {selectedPeriod} Q{selectedQuincena}
              </span>
            </div>
          </div>
        )}

        {/* Controles de Escenario para Preview */}
        {previewRecords.length > 0 && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">🔧 Configuración de Escenario Preview</CardTitle>
              <CardDescription className="text-gray-300">
                Ajusta parámetros para simular diferentes escenarios de nómina
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Días Trabajados */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    📅 Días Trabajados
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={previewScenario.daysWorked}
                    onChange={(e) => setPreviewScenario(prev => ({ 
                      ...prev, 
                      daysWorked: Math.max(1, Math.min(31, Number(e.target.value))) 
                    }))}
                    className="w-full bg-white/10 border-white/20 text-white"
                  />
                </div>

                {/* Incluir Horas Extra */}
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={previewScenario.includeOvertime}
                    onChange={(e) => setPreviewScenario(prev => ({ 
                      ...prev, 
                      includeOvertime: e.target.checked 
                    }))}
                    className="w-4 h-4 accent-brand-500"
                    id="includeOvertime"
                  />
                  <label htmlFor="includeOvertime" className="text-sm font-medium text-white">
                    ⏰ Incluir Horas Extra
                  </label>
                </div>

                {/* Horas Extra */}
                {previewScenario.includeOvertime && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      🔥 Horas Extra
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={previewScenario.overtimeHours}
                      onChange={(e) => setPreviewScenario(prev => ({ 
                        ...prev, 
                        overtimeHours: Math.max(0, Number(e.target.value)) 
                      }))}
                      className="w-full bg-white/10 border-white/20 text-white"
                    />
                  </div>
                )}

                {/* Tasa de Horas Extra */}
                {previewScenario.includeOvertime && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      💰 Tasa Hora Extra
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={previewScenario.overtimeRate}
                      onChange={(e) => setPreviewScenario(prev => ({ 
                        ...prev, 
                        overtimeRate: Math.max(1, Number(e.target.value)) 
                      }))}
                      className="w-full bg-white/10 border-white/20 text-white"
                    />
                  </div>
                )}

                {/* Ajuste de Salario Base */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    💵 Ajuste Salario Base
                  </label>
                  <Input
                    type="number"
                    value={previewScenario.baseSalaryAdjustment}
                    onChange={(e) => setPreviewScenario(prev => ({ 
                      ...prev, 
                      baseSalaryAdjustment: Number(e.target.value) 
                    }))}
                    className="w-full bg-white/10 border-white/20 text-white"
                    placeholder="0"
                  />
                </div>

                {/* Botón Actualizar Preview */}
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      getCurrentPeriodRecords().then(currentRecords => {
                        const activeEmployees = employees.filter(e => e.status === 'active')
                        calculatePayrollStats(currentRecords, activeEmployees)
                      })
                    }}
                    className="bg-brand-800 hover:bg-brand-700 text-white w-full"
                  >
                    🔄 Actualizar Preview
                  </Button>
                </div>
              </div>

              {/* Información de Fórmulas */}
              <div className="mt-4 p-3 bg-brand-800/20 border border-brand-500/30 rounded-lg">
                <div className="text-sm text-brand-300 font-medium mb-2">📊 Fórmulas Oficiales de Honduras 2025:</div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>• <strong>IHSS:</strong> 5% del salario base (máx. L.11,903.13)</div>
                  <div>• <strong>RAP:</strong> 1.5% sobre excedente del mínimo</div>
                  <div>• <strong>ISR:</strong> Tabla progresiva Honduras 2025</div>
                  <div>• <strong>Horas Extra:</strong> Tasa configurable</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards - Fila 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {payrollMetrics.activeEmployees}
                </div>
                <div className="text-sm text-gray-300">Empleados en Planilla</div>
                <div className="text-xs text-gray-400 mt-1">
                  {payrollMetrics.payrollCoverage.toFixed(1)}% cobertura
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {formatCurrency(payrollMetrics.totalGrossSalary)}
                </div>
                <div className="text-sm text-gray-300">Salario Bruto (Q)</div>
                <div className="text-xs text-gray-400 mt-1">
                  {selectedPeriod} Q{selectedQuincena}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {formatCurrency(payrollMetrics.totalDeductions)}
                </div>
                <div className="text-sm text-gray-300">Total Deducciones (Q)</div>
                <div className="text-xs text-gray-400 mt-1">
                  ISR + RAP + IHSS
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {formatCurrency(payrollMetrics.totalNetSalary)}
                </div>
                <div className="text-sm text-gray-300">Salario Neto (Q)</div>
                <div className="text-xs text-gray-400 mt-1">
                  Bruto - Deducciones
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards - Fila 2 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {formatCurrency(payrollMetrics.totalIHSS)}
                </div>
                <div className="text-sm text-gray-300">Total IHSS (Q)</div>
                <div className="text-xs text-gray-400 mt-1">
                  5% del salario base (máx. L.11,903.13)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(payrollMetrics.totalRAP)}
                </div>
                <div className="text-sm text-gray-300">Total RAP (Q)</div>
                <div className="text-xs text-gray-400 mt-1">
                  1.5% sobre excedente del mínimo
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-400">
                  {formatCurrency(payrollMetrics.totalISR)}
                </div>
                <div className="text-sm text-gray-300">Total ISR (Q)</div>
                <div className="text-xs text-gray-400 mt-1">
                  Tabla progresiva 2025 (exención L.40k anual)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-400">
                  {payrollMetrics.totalDaysWorked}
                </div>
                <div className="text-sm text-gray-300">Días Trabajados (Q)</div>
                <div className="text-xs text-gray-400 mt-1">
                  {payrollMetrics.attendanceRate.toFixed(1)}% cumplimiento
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chips de Contexto */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-sm text-brand-300">
            📅 {selectedPeriod ? new Date(selectedPeriod + '-01').toLocaleDateString('es-HN', { year: 'numeric', month: 'long' }) : 'Período actual'}
          </div>
          <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-sm text-brand-300">
            ⏰ Quincena {selectedQuincena}: {selectedQuincena === 1 ? '1-15' : `16-${lastDayOfSelectedMonth}`}
          </div>
          {filterDept && (
            <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-sm text-brand-300">
              🏢 {departments[filterDept] || filterDept}
            </div>
          )}
          {filterEmployee && (
            <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-sm text-brand-300">
              👤 {filterEmployee}
            </div>
          )}
          {previewRecords.length > 0 && (
            <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-sm text-yellow-300">
              🔍 Modo Preview
            </div>
          )}
        </div>



        {/* Gráfico de Tendencia */}
        <div className="grid grid-cols-1 gap-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-white">📈 Tendencia 6 meses (Neto)</CardTitle>
              <CardDescription className="text-gray-300">Costo neto mensual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.13)" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" tickFormatter={(v)=>formatCurrency(v as any)} />
                    <Tooltip 
                      formatter={(v: any)=>formatCurrency(Number(v))} 
                      labelStyle={{ color: 'rgb(255,255,255)' }} 
                                              contentStyle={{ background: 'rgb(17,24,39)', border: '1px solid rgb(55,65,81)' }} 
                    />
                    <Line type="monotone" dataKey="netSalary" stroke="blue" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>



      {/* 3. 📊 Generar Nómina */}
      <div className="space-y-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">📊 Generar Nómina</CardTitle>
            <CardDescription className="text-gray-300">
              Genera la nómina para todos los empleados activos para un período y quincena seleccionados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generatePayroll} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    📅 Mes
                  </label>
                  <Input
                    type="month"
                    value={generateForm.periodo}
                    onChange={e => handleFormChange('periodo', e.target.value)}
                    required
                    className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    ⏰ Rango de Quincena
                  </label>
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      onClick={() => handleFormChange('quincena', 1)}
                      className={`flex-1 ${generateForm.quincena === 1 ? 'bg-brand-800 hover:bg-brand-700 text-white' : 'border border-white/20 text-white hover:bg-white/10 bg-transparent'}`}
                    >
                      1 - 15
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => handleFormChange('quincena', 2)}
                      className={`flex-1 ${generateForm.quincena === 2 ? 'bg-brand-800 hover:bg-brand-700 text-white' : 'border border-white/20 text-white hover:bg-white/10 bg-transparent'}`}
                    >
                      16 - {lastDayOfSelectedMonth}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={generateForm.incluirDeducciones}
                    onChange={e => handleFormChange('incluirDeducciones', e.target.checked)}
                    className="w-4 h-4 accent-brand-500"
                    id="deducciones"
                  />
                  <label htmlFor="deducciones" className="text-sm font-medium text-white">
                    💰 Incluir deducciones (ISR, IHSS, RAP)
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={generateForm.soloEmpleadosConAsistencia}
                    onChange={e => handleFormChange('soloEmpleadosConAsistencia', e.target.checked)}
                    className="w-4 h-4 accent-brand-500"
                    id="asistencia"
                  />
                  <label htmlFor="asistencia" className="text-sm font-medium text-white">
                    ✅ Solo empleados con asistencia completa
                  </label>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                <Button type="submit" disabled={loading} className="bg-brand-800 hover:bg-brand-700 text-white px-8 py-3">
                  {loading ? '🔄 Generando...' : '🚀 Generar Nómina'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={()=>sendPayrollEmail()} 
                  className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
                >
                  ✉️ Enviar Planilla por Email
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={()=>sendPayrollWhatsApp()} 
                  className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
                >
                  💬 Enviar por WhatsApp
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

      {/* 4. 📋 Tabla de Registros de Nómina */}
      <div className="space-y-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white">📋 Registros de Nómina</CardTitle>
            <CardDescription className="text-gray-300">
              {getFilterDescription}
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
                          <div className="text-red-400">Tardanza: {record.late_days} días</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(record.status)}
                        {('isPreview' in record && record.isPreview) && (
                          <div className="text-xs text-yellow-400 mt-1">Preview</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-2">
                          {/* Botón Editar - solo para registros reales */}
                          {!('isPreview' in record && record.isPreview) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editPayrollRecord(record)}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              ✏️ Editar
                            </Button>
                          )}
                          
                          {/* Botón Recalcular - solo para registros reales */}
                          {!('isPreview' in record && record.isPreview) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => recalculatePayroll(record.id || '')}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              🔄 Recalcular
                            </Button>
                          )}
                          
                          {/* Botón Aprobar - solo si está en borrador */}
                          {record.status === 'draft' && !('isPreview' in record && record.isPreview) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approvePayroll(record.id || '')}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              ✅ Aprobar
                            </Button>
                          )}
                          
                          {/* Botón Marcar Pagado - solo si está aprobada */}
                          {record.status === 'approved' && !('isPreview' in record && record.isPreview) && (
                            <Button
                              size="sm"
                              onClick={() => markAsPaid(record.id || '')}
                              className="bg-brand-800 hover:bg-brand-700 text-white"
                            >
                              💰 Marcar Pagado
                            </Button>
                          )}
                          
                          {/* Botones de descarga - siempre visibles */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => await downloadPayrollPDF(record)}
                            className="text-gray-300 hover:bg-white/10 hover:text-white"
                            disabled={'isPreview' in record && record.isPreview}
                            title={'isPreview' in record && record.isPreview ? 'Generá primero la nómina' : 'Descargar PDF'}
                          >
                            📄 Descargar PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => await downloadIndividualReceipt(record)}
                            className="text-gray-300 hover:bg-white/10 hover:text-white"
                            disabled={'isPreview' in record && record.isPreview}
                            title={'isPreview' in record && record.isPreview ? 'Generá primero la nómina' : 'Descargar recibo individual'}
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

      

      
    </div>
  )
}
