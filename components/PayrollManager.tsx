import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '../lib/supabase/client'
import { usePayrollReports } from '../lib/hooks/usePayrollReports'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Icon } from './Icon'
import { useAuth } from '../lib/auth'
import { useCompanyContext } from '../lib/useCompanyContext'
import VoucherGenerator from './VoucherGenerator'

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

// Nuevo tipo para filas del draft editable
type DraftRow = {
  employee_id: string
  employee_code: string
  name: string
  base_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  gross_salary: number
  ihss: number
  rap: number
  isr: number
  total_deductions: number
  net_salary: number
  // campos editables:
  adj_bonus?: number
  adj_discount?: number
  note?: string
}

// Constantes para fórmulas oficiales de Honduras 2025
// CONSTANTES CORRECTAS HONDURAS 2025 (VERIFICACIÓN CRUZADA)
const HONDURAS_2025_CONSTANTS = {
  SALARIO_MINIMO: 11903.13,
  IHSS_TECHO: 11903.13,        // Techo IHSS 2025 (EM + IVM)
  IHSS_PORCENTAJE_EMPLEADO: 0.05,  // 5% total (2.5% EM + 2.5% IVM)
  RAP_PORCENTAJE: 0.015,       // 1.5% empleado
} as const

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
  quincena: (() => {
    const today = new Date()
    const day = today.getDate()
    return day <= 15 ? 1 : 2
  })(),
  incluirDeducciones: false, // Default: no deductions for first fortnight
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
  // Estado para modo Preview mejorado

  // UI colors (computed to avoid static strings triggering secret scanner)

  // Nuevos estados para el sistema de draft
  const [draft, setDraft] = useState<{rows: DraftRow[], totals: any, meta: {periodo:string, quincena:1|2}}|null>(null)
  const [isEditingDraft, setIsEditingDraft] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [showPreviewForm, setShowPreviewForm] = useState(false)

  // Estado para el formulario de preview
  const [previewForm, setPreviewForm] = useState({
    periodo: new Date().toISOString().slice(0, 7),
    quincena: (() => {
      const today = new Date()
      const day = today.getDate()
      return day <= 15 ? 1 : 2
    })(),
    incluirDeducciones: false, // Default: no deductions for first fortnight
    soloEmpleadosConAsistencia: true
  })

  

  // Memoized values
  const currentPeriodRecords = useMemo(() => 
    payrollRecords.filter(record => 
      record.period_start.startsWith(selectedPeriod || new Date().toISOString().slice(0, 7))
    ),
    [payrollRecords, selectedPeriod]
  )

  const filteredRecords = useMemo(() => {
    // Combinar registros reales y de preview
    const allRecords = [...payrollRecords]
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
  }, [payrollRecords, selectedPeriod, filterYear, filterMonth, filterQuincena, filterDept, filterEmployee])

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

  // CÁLCULO ISR CORRECTO 2025 - TABLA MENSUAL
  const calculateISR = useCallback((monthlySalary: number): number => {
    // Tabla mensual correcta 2025 (derivada de anual SAR)
    const ISR_BRACKETS_MENSUAL = [
      { limit: 21457.76, rate: 0.00, base: 0 },                    // Exento hasta L 21,457.76
      { limit: 30969.88, rate: 0.15, base: 0 },                    // 15%
      { limit: 67604.36, rate: 0.20, base: 1428.32 },             // 20%
      { limit: Infinity, rate: 0.25, base: 8734.32 }              // 25%
    ]
    
    // Aplicar tabla mensual directamente
    for (const bracket of ISR_BRACKETS_MENSUAL) {
      if (monthlySalary <= bracket.limit) {
        if (bracket.rate === 0) return 0
        
        // Calcular correctamente el excedente del tramo
        if (bracket.base === 0) {
          // Primer tramo: aplicar tasa desde el inicio
          return (monthlySalary - 21457.76) * bracket.rate
        } else {
          // Tramo con base: aplicar base + tasa sobre excedente
          const limiteInferior = bracket.limit === 67604.36 ? 30969.88 : 67604.36
          return bracket.base + (monthlySalary - limiteInferior) * bracket.rate
        }
      }
    }
    return 0
  }, [])

  // Función para calcular deducciones según fórmulas oficiales de Honduras 2025
  const calculateHondurasDeductions = useCallback((baseSalary: number, daysWorked: number, includeOvertime: boolean = false, overtimeHours: number = 0, overtimeRate: number = 1.5): {
    grossSalary: number
    ihss: number
    rap: number
    isr: number
    totalDeductions: number
    netSalary: number
  } => {
    // IMPORTANTE: Para el dashboard, usamos salarios COMPLETOS mensuales
    // Las deducciones se aplican UNA SOLA VEZ al mes (no por quincena)
    const grossSalary = baseSalary // Salario completo mensual
    
    // Calcular horas extra si se incluyen
    let overtimeAmount = 0
    if (includeOvertime && overtimeHours > 0) {
      const hourlyRate = baseSalary / (30 * 8)
      overtimeAmount = hourlyRate * overtimeHours * overtimeRate
    }
    
    const totalGrossSalary = grossSalary + overtimeAmount
    
    // IHSS: 5% del salario base (2.5% EM + 2.5% IVM) con techo L 11,903.13
    const ihssBase = Math.min(baseSalary, HONDURAS_2025_CONSTANTS.IHSS_TECHO)
    const ihss = ihssBase * HONDURAS_2025_CONSTANTS.IHSS_PORCENTAJE_EMPLEADO // 5% mensual
    
    // RAP: 1.5% sobre el excedente del salario mínimo
    const rap = Math.max(0, baseSalary - HONDURAS_2025_CONSTANTS.SALARIO_MINIMO) * HONDURAS_2025_CONSTANTS.RAP_PORCENTAJE
    
    // ISR según tabla MENSUAL de Honduras 2025
    const isr = calculateISR(baseSalary) // Ya es mensual
    
    const totalDeductions = ihss + rap + isr
    const netSalary = totalGrossSalary - totalDeductions
    
    return {
      grossSalary: totalGrossSalary,
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

  const { downloadConsolidatedReport, downloadEmployeeReceipt } = usePayrollReports()

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
      console.log('Departments loaded:', Object.keys(deptMap).length)
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }, [supabase])

  // Función para calcular métricas del dashboard basándose en empleados activos (salarios COMPLETOS)
  const calculateDashboardMetrics = useCallback((emps: Employee[]) => {
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

    if (emps.length === 0) return stats

    // Calcular métricas basándose en empleados activos con salarios COMPLETOS
    emps.forEach((emp) => {
      const baseSalary = emp.base_salary || 0
      
      // Salario bruto COMPLETO mensual
      stats.totalGrossSalary += baseSalary
      
      // Calcular deducciones COMPLETAS mensuales
      const ihss = Math.min(baseSalary, HONDURAS_2025_CONSTANTS.IHSS_TECHO) * HONDURAS_2025_CONSTANTS.IHSS_PORCENTAJE_EMPLEADO
      const rap = Math.max(0, baseSalary - HONDURAS_2025_CONSTANTS.SALARIO_MINIMO) * HONDURAS_2025_CONSTANTS.RAP_PORCENTAJE
      const isr = calculateISR(baseSalary)
      
      stats.totalIHSS += ihss
      stats.totalRAP += rap
      stats.totalISR += isr
      stats.totalDeductions += ihss + rap + isr
      
      // Salario neto COMPLETO mensual
      stats.totalNetSalary += baseSalary - (ihss + rap + isr)
      
      // Agrupar por departamento
      const deptId = emp.department_id || 'sin-departamento'
      const deptName = departments[deptId] || 'Sin Departamento'
      if (!stats.departmentBreakdown[deptId]) {
        stats.departmentBreakdown[deptId] = { count: 0, name: deptName, avgSalary: 0 }
      }
      stats.departmentBreakdown[deptId].count += 1
      stats.departmentBreakdown[deptId].avgSalary += baseSalary - (ihss + rap + isr)
    })

    // Calcular promedios por departamento
    Object.keys(stats.departmentBreakdown).forEach((deptId) => {
      const count = stats.departmentBreakdown[deptId].count
      if (count > 0) {
        stats.departmentBreakdown[deptId].avgSalary = stats.departmentBreakdown[deptId].avgSalary / count
      }
    })

    // Calcular promedio general
    stats.averageSalary = stats.totalNetSalary / emps.length

    // Cobertura de planilla (100% si todos los empleados activos están en planilla)
    stats.payrollCoverage = 100

    // Guardar métricas del dashboard
    if (isMountedRef.current) setPayrollMetrics(stats)
    
    return stats
  }, [departments, calculateISR])

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
      // RECALCULAR salario neto para asegurar consistencia: Bruto - Deducciones
      const recalculatedNetSalary = record.gross_salary - record.total_deductions
      stats.totalNetSalary += recalculatedNetSalary
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




  // Función para obtener registros del periodo actual (reales o preview)
  const getCurrentPeriodRecords = useCallback(async () => {
    if (!userProfile?.company_id) {
      console.warn('⚠️ Usuario sin company_id - no se pueden obtener registros')
      return []
    }

    try {
      // Obtener registros reales del periodo actual
      const { data: realRecords, error } = await supabase
        .from('payroll_records')
        .select(`
          *,
          employees:employee_id (
            name,
            employee_code,
            team,
            department_id,
            company_id
          )
        `)
        .eq('employees.company_id', userProfile.company_id)
        .eq('period_start', `${selectedPeriod}-01`)
        .eq('period_end', `${selectedPeriod}-${getLastDayOfMonth(selectedPeriod)}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error obteniendo registros reales:', error)
        return []
      }

      // Si no hay registros reales, retornar array vacío
      if (realRecords.length === 0) {
        return []
      }

      return realRecords
    } catch (error) {
      console.error('Error en getCurrentPeriodRecords:', error)
      return []
    }
  }, [userProfile?.company_id, selectedPeriod, getLastDayOfMonth])

  const fetchData = useCallback(async () => {
    if (!supabase) return
    
    setLoading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        alert('Error de autenticación. Por favor, inicia sesión nuevamente.')
        return
      }

      console.log('User authenticated:', user.email)

      let { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error fetching user profile:', profileError)
        
        if (profileError.code === 'PGRST116') {
          console.log('Perfil no encontrado, intentando crear...')
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
            alert('Error creando perfil de usuario. Contacte al administrador.')
            return
          }

          console.log('Perfil creado exitosamente:', newProfile)
          setUserProfile(newProfile)
          profile = newProfile
        } else {
          console.error('Error obteniendo perfil:', profileError)
          alert('Error obteniendo perfil de usuario')
          return
        }
      } else {
        console.log('User profile loaded:', profile)
        setUserProfile(profile)
      }

      if (!profile || !profile.is_active) {
        if (!profile.is_active) {
          alert('Su cuenta ha sido desactivada')
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
            department_id,
            company_id
          )
        `)
        .order('created_at', { ascending: false })

      // IMPORTANTE: Filtrar por company_id del usuario para evitar acceso a datos de otras empresas
      if (profile.company_id) {
        payrollQuery = payrollQuery.eq('employees.company_id', profile.company_id)
        console.log('🔒 Filtrando registros de nómina por empresa:', profile.company_id)
      } else {
        console.warn('⚠️ Usuario sin company_id - no se pueden cargar registros de nómina')
        setPayrollRecords([])
        setEmployees([])
        return
      }

      const { data: payrollData, error: payrollError } = await payrollQuery

      if (payrollError) {
        console.error('Error fetching payroll records:', payrollError)
        throw payrollError
      }
      
      console.log('Payroll records loaded:', payrollData?.length || 0)
      if (!isMountedRef.current) return
      setPayrollRecords(payrollData || [])

      // Fetch employees (activos y suspendidos) - SOLO de la empresa del usuario
      let employeesQuery = supabase
        .from('employees')
        .select('id, name, employee_code, base_salary, department_id, status, company_id')
        .in('status', ['active','suspended'])
        .order('name')

      // IMPORTANTE: Filtrar SOLO por company_id del usuario autenticado
      if (profile.company_id) {
        employeesQuery = employeesQuery.eq('company_id', profile.company_id)
        console.log('🔒 Filtrando empleados por empresa:', profile.company_id)
      } else {
        console.warn('⚠️ Usuario sin company_id - no se pueden cargar empleados')
        setEmployees([])
        return
      }

      const { data: employeesData, error: empError } = await employeesQuery

      if (empError) {
        console.error('Error fetching employees:', empError)
        throw empError
      }
      
      console.log('Employees loaded:', employeesData?.length || 0)
      if (!isMountedRef.current) return
      setEmployees(employeesData || [])
      const suspended = (employeesData || []).filter((e: any) => e.status === 'suspended').length
      setSuspendedCount(suspended)

      await loadDepartments()
      
      // Obtener registros del periodo actual (reales o preview)
      const currentRecords = await getCurrentPeriodRecords()
      
      // Calcular métricas con los registros actuales
      const activeEmployees = (employeesData || []).filter((e: any) => e.status === 'active')
      calculateDashboardMetrics(activeEmployees)

    } catch (error) {
      console.error('Error fetching data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`Error cargando datos: ${errorMessage}`)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [supabase, loadDepartments, calculateDashboardMetrics, getCurrentPeriodRecords])

  // Función para generar nómina definitiva
  const generatePayroll = useCallback(async () => {
    if (!userProfile?.company_id) {
      alert('❌ Usuario sin empresa asignada')
      return
    }

    if (!previewForm.periodo || !previewForm.quincena) {
      alert('❌ Selecciona período y quincena')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo: previewForm.periodo,
          quincena: previewForm.quincena,
          incluirDeducciones: previewForm.incluirDeducciones
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Error generando nómina')
      }

      const result = await response.json()
      console.log('✅ Nómina generada exitosamente:', result)
      
      alert(`✅ Nómina generada para ${result.employeeCount || 0} empleados de la empresa ${userProfile.company_id}`)
      
      // Recargar datos
      await fetchData()
      
    } catch (error: any) {
      console.error('❌ Error generando nómina:', error)
      alert(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }, [userProfile?.company_id, previewForm, fetchData])

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
      alert('Nómina aprobada exitosamente!')
      fetchData()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
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
      alert('Nómina marcada como pagada!')
      fetchData()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
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
    try {
      await downloadConsolidatedReport(period, quincena)
    } catch (e: any) {
      alert(`Error: ${e?.message || 'No se pudo descargar el reporte'}`)
    }
  }, [downloadConsolidatedReport])

  const downloadIndividualReceipt = useCallback(async (record: PayrollRecord | PreviewPayrollRecord) => {
    const period = record.period_start.slice(0, 7)
    const day = Number(record.period_start.slice(8, 10))
    const quincena = day <= 15 ? 1 : 2
    try {
      await downloadEmployeeReceipt(record.employee_id, period, quincena)
    } catch (e: any) {
      alert(`Error: ${e?.message || 'No se pudo descargar el recibo'}`)
    }
  }, [downloadEmployeeReceipt])

  const sendPayrollEmail = useCallback(async (record?: PayrollRecord | PreviewPayrollRecord) => {
    try {
      // Validar que el usuario esté autenticado y tenga empresa
      if (!userProfile?.company_id) {
        alert('❌ Error: Usuario no tiene empresa asignada')
        return
      }

      const to = prompt('Correo de destino:')
      if (!to) return
      
      // Validar formato de email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        alert('❌ Formato de email inválido')
        return
      }

      const period = (record?.period_start || new Date().toISOString()).slice(0,7)
      const day = record ? Number(record.period_start.slice(8,10)) : 1
      const quincena = day <= 15 ? 1 : 2
      
      const payload: any = { 
        to, 
        periodo: period, 
        quincena 
      }
      
      if (record) { 
        payload.type = 'recibo'; 
        payload.employeeId = record.employee_id || 'unknown'
      } else { 
        payload.type = 'planilla' 
      }

      console.log('📧 Enviando email de nómina:', {
        to,
        type: payload.type,
        periodo: period,
        quincena,
        companyId: userProfile.company_id
      })

      const res = await fetch('/api/payroll/send-email', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify(payload) 
      })
      
      const json = await res.json().catch(()=>({}))
      
      if (!res.ok) {
        console.error('❌ Error enviando email:', json)
        alert(`❌ Error enviando email: ${json.error || json.message || res.status}`)
        return
      }

      if (json.sent) {
        alert(`✅ Email enviado exitosamente a ${to}`)
      } else {
        alert(`📥 ${json.message || 'Enlace listo'}: ${json.downloadUrl}`)
      }
    } catch (error: any) {
      console.error('❌ Error en sendPayrollEmail:', error)
      alert(`❌ Error: ${error.message || 'Error desconocido'}`)
    }
  }, [userProfile])

  const sendPayrollWhatsApp = useCallback(async (record?: PayrollRecord | PreviewPayrollRecord) => {
    try {
      // Validar que el usuario esté autenticado y tenga empresa
      if (!userProfile?.company_id) {
        alert('❌ Error: Usuario no tiene empresa asignada')
        return
      }

      const phone = prompt('Número WhatsApp (E.164, ej. 5049xxxxxxx):')
      if (!phone) return
      
      // Validar formato de teléfono
      const cleanPhone = phone.replace(/\D/g, '')
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        alert('❌ Formato de teléfono inválido. Use formato E.164 (ej: 5049xxxxxxx)')
        return
      }

      const period = (record?.period_start || new Date().toISOString()).slice(0,7)
      const day = record ? Number(record.period_start.slice(8,10)) : 1
      const quincena = day <= 15 ? 1 : 2
      
      const payload: any = { 
        phone: cleanPhone, 
        periodo: period, 
        quincena 
      }
      
      if (record) { 
        payload.type = 'recibo'; 
        payload.employeeId = record.employee_id || 'unknown'
      } else { 
        payload.type = 'planilla' 
      }

      console.log('📱 Enviando WhatsApp de nómina:', {
        phone: cleanPhone,
        type: payload.type,
        periodo: period,
        quincena,
        companyId: userProfile.company_id
      })

      const res = await fetch('/api/payroll/send-whatsapp', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify(payload) 
      })
      
      const json = await res.json().catch(()=>({}))
      
      if (!res.ok) {
        console.error('❌ Error enviando WhatsApp:', json)
        alert(`❌ Error enviando WhatsApp: ${json.error || json.message || res.status}`)
        return
      }

      if (json.url) {
        const openWhatsApp = confirm(`📱 Enlace de WhatsApp generado para ${cleanPhone}.\n\n¿Abrir WhatsApp?`)
        if (openWhatsApp) {
          window.open(json.url, '_blank')
        }
      } else {
        alert(`📱 ${json.message || 'Enlace generado'}`)
      }
    } catch (error: any) {
      console.error('❌ Error en sendPayrollWhatsApp:', error)
      alert(`❌ Error: ${error.message || 'Error desconocido'}`)
    }
  }, [userProfile])

  

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

  // Nuevas funciones para el sistema de draft
  const generatePreview = useCallback(async () => {
    if (!userProfile?.company_id) {
      alert('❌ Usuario sin empresa asignada')
      return
    }

    if (!previewForm.periodo || !previewForm.quincena) {
      alert('❌ Selecciona período y quincena')
      return
    }

    setIsWorking(true)
    try {
      // Obtener empleados activos - SOLO de la empresa del usuario
      let employeesQuery = supabase
        .from('employees')
        .select('id, name, employee_code, base_salary, department_id, status, company_id')
        .eq('status', 'active')
        .order('name')

      // IMPORTANTE: Filtrar SOLO por company_id del usuario autenticado
      if (userProfile.company_id) {
        employeesQuery = employeesQuery.eq('company_id', userProfile.company_id)
        console.log('🔒 Generando preview para empresa:', userProfile.company_id)
      } else {
        throw new Error('Usuario sin empresa asignada')
      }
      
      const { data: activeEmployees, error: empError } = await employeesQuery
      
      if (empError) throw new Error(`Error cargando empleados: ${empError.message}`)
      if (!activeEmployees || activeEmployees.length === 0) {
        alert('No hay empleados activos para generar preview')
        return
      }

      console.log(`📊 Generando preview para ${activeEmployees.length} empleados de la empresa ${userProfile.company_id}`)

      const periodo = previewForm.periodo
      const quincena = previewForm.quincena as 1 | 2
      const [year, month] = periodo.split('-').map(Number)
      const lastDay = new Date(year, month, 0).getDate()
      
      // Calcular días trabajados por quincena
      const daysInQuincena = quincena === 1 ? 15 : (lastDay - 15)
      
      const draftRows: DraftRow[] = activeEmployees.map((emp: any) => {
        // Calcular salario bruto QUINCENAL (salario mensual ÷ 2)
        const grossSalary = emp.base_salary / 2
        
        // Calcular deducciones usando las fórmulas existentes
        let deductions
        if (previewForm.incluirDeducciones) {
          deductions = calculateHondurasDeductions(emp.base_salary, daysInQuincena)
        } else {
          // Sin deducciones
          deductions = {
            grossSalary,
            ihss: 0,
            rap: 0,
            isr: 0,
            totalDeductions: 0,
            netSalary: grossSalary
          }
        }
        
        return {
          employee_id: emp.id,
          employee_code: emp.employee_code,
          name: emp.name,
          base_salary: emp.base_salary,
          days_worked: daysInQuincena,
          days_absent: 0, // Por defecto
          late_days: 0, // Por defecto
          gross_salary: deductions.grossSalary,
          ihss: deductions.ihss,
          rap: deductions.rap,
          isr: deductions.isr,
          total_deductions: deductions.totalDeductions,
          net_salary: deductions.netSalary,
          adj_bonus: 0,
          adj_discount: 0,
          note: 'estimado'
        }
      })

      const totals = {
        gross: draftRows.reduce((sum, row) => sum + row.gross_salary, 0),
        deductions: draftRows.reduce((sum, row) => sum + row.total_deductions, 0),
        net: draftRows.reduce((sum, row) => sum + row.net_salary, 0),
        employees: draftRows.length
      }

      setDraft({
        rows: draftRows,
        totals,
        meta: { periodo, quincena }
      })

      // Cerrar el formulario después de generar
      setShowPreviewForm(false)
      
      alert(`Preview generado para ${draftRows.length} empleados activos de la empresa ${userProfile.company_id}`)
    } catch (error: any) {
      console.error('Error generando preview:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsWorking(false)
    }
  }, [supabase, userProfile, previewForm, calculateHondurasDeductions])

  const toggleEditDraft = useCallback(() => {
    setIsEditingDraft(prev => !prev)
  }, [])

  const updateDraftRow = useCallback((employeeId: string, field: keyof DraftRow, value: any) => {
    if (!draft) return
    
    setDraft(prev => {
      if (!prev) return prev
      
      const updatedRows = prev.rows.map(row => {
        if (row.employee_id === employeeId) {
          const updatedRow = { ...row, [field]: value }
          
          // Recalcular totales de la fila
          const newGross = updatedRow.gross_salary + (updatedRow.adj_bonus || 0)
          const newDeductions = updatedRow.total_deductions + (updatedRow.adj_discount || 0)
          updatedRow.net_salary = newGross - newDeductions
          
          return updatedRow
        }
        return row
      })
      
      // Recalcular totales generales
      const newTotals = {
        gross: updatedRows.reduce((sum, row) => sum + row.gross_salary + (row.adj_bonus || 0), 0),
        deductions: updatedRows.reduce((sum, row) => sum + row.total_deductions + (row.adj_discount || 0), 0),
        net: updatedRows.reduce((sum, row) => sum + row.net_salary, 0),
        employees: updatedRows.length
      }
      
      return {
        ...prev,
        rows: updatedRows,
        totals: newTotals
      }
    })
  }, [draft])

  const generatePDF = useCallback(async () => {
    if (!draft || !supabase) return
    
    setIsWorking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No hay sesión activa')
      }

      // Usar el nuevo endpoint que genera PDF desde datos del draft
      const response = await fetch('/api/payroll/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': 'application/pdf'
        },
        body: JSON.stringify({
          periodo: draft.meta.periodo,
          quincena: draft.meta.quincena,
          draftData: draft
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      if (response.headers.get('content-type')?.includes('application/pdf')) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `planilla_draft_${draft.meta.periodo}_q${draft.meta.quincena}.pdf`
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
        alert('PDF generado y descargado exitosamente desde datos del draft')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Respuesta inesperada del servidor')
      }
    } catch (error: any) {
      console.error('Error generando PDF:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsWorking(false)
    }
  }, [draft, supabase])

  const generateAndSendVouchers = useCallback(async () => {
    if (!draft || !supabase) return
    
    // Preguntar método de envío
    const deliveryMethod = prompt(
      '¿Cómo desea enviar los vouchers?\n\n' +
      '1. Solo email\n' +
      '2. Solo WhatsApp\n' +
      '3. Ambos (email + WhatsApp)\n\n' +
      'Escriba: email, whatsapp, o both'
    )
    
    if (!deliveryMethod || !['email', 'whatsapp', 'both'].includes(deliveryMethod.toLowerCase())) {
      alert('Método de envío inválido. Use: email, whatsapp, o both')
      return
    }
    
    if (!confirm(`¿Generar y enviar vouchers individuales por ${deliveryMethod}?`)) return
    
    setIsWorking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No hay sesión activa')
      }

      const response = await fetch('/api/payroll/send-vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify({
          periodo: draft.meta.periodo,
          quincena: draft.meta.quincena,
          delivery: deliveryMethod.toLowerCase(),
          draft_overrides: draft.rows.map(row => ({
            employee_id: row.employee_id,
            adj_bonus: row.adj_bonus || 0,
            adj_discount: row.adj_discount || 0,
            note: row.note || ''
          })),
          options: { attach_pdf: true }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      if (result.sent) {
        const summary = result.summary
        let message = `Vouchers enviados: ${summary.ok}/${summary.total}`
        
        if (summary.failed > 0) {
          message += `\nFallidos: ${summary.failed}`
          if (result.failed && result.failed.length > 0) {
            message += '\n\nEmpleados con error:'
            result.failed.forEach((f: any) => {
              message += `\n• ${f.employee_id}: ${f.reason}`
            })
          }
        }
        
        alert(message)
      } else {
        throw new Error('No se pudieron enviar los vouchers')
      }
    } catch (error: any) {
      console.error('Error enviando vouchers:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsWorking(false)
    }
  }, [draft, supabase])

  

  

  // (Distribución por departamento fue reemplazada por tendencia; pre-cálculos removidos)

  // Cargar comparativa
  useEffect(() => {
    const ym = (selectedPeriod || new Date().toISOString().slice(0,7))
    const q = (filterQuincena || 1) as number
    ;(async () => {
      try {
        const cmpRes = await fetch(`/api/payroll/compare?periodo=${encodeURIComponent(ym)}&quincena=${q}`)
        const cmpJson = await cmpRes.json().catch(()=>null)
        if (cmpRes.ok) setCompareData(cmpJson)
      } catch {}
    })()
  }, [selectedPeriod, filterQuincena])

  // Actualizar registros cuando cambie el periodo o quincena
  useEffect(() => {
    if (userProfile && supabase) {
      getCurrentPeriodRecords().then(currentRecords => {
        const activeEmployees = employees.filter(e => e.status === 'active')
        calculateDashboardMetrics(activeEmployees)
      })
    }
  }, [selectedPeriod, selectedQuincena, userProfile, supabase, employees, getCurrentPeriodRecords, calculateDashboardMetrics])

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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Icon name="building" className="w-6 h-6" />
            Gestión de Nómina - Paragon Honduras
          </h1>
          <p className="text-gray-300">Sistema integral de procesamiento y administración de nóminas</p>
          
          {/* Información de la empresa */}
          {userProfile?.company_id && (
            <div className="mt-2 flex items-center gap-4 text-sm">
              <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-brand-300 flex items-center gap-2">
                <Icon name="building" className="w-4 h-4" />
                Empresa: {userProfile.company_id}
              </div>
              <div className="px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-full text-green-300 flex items-center gap-2">
                <Icon name="users" className="w-4 h-4" />
                {employees.filter(e => e.status === 'active').length} empleados activos
              </div>
              {suspendedCount > 0 && (
                <div className="px-3 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded-full text-yellow-300 flex items-center gap-2">
                  <Icon name="warning" className="w-4 h-4" />
                  {suspendedCount} suspendidos
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1. 📊 Dashboard Ejecutivo */}
      <div className="space-y-6">




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
                  {formatCurrency(payrollMetrics.totalGrossSalary / 2)}
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
                <div className="text-1xl font-bold text-purple-400">
                  {formatCurrency(
                    selectedQuincena === 1 
                      ? payrollMetrics.totalGrossSalary / 2  // Q1: solo salario bruto ÷ 2
                      : (payrollMetrics.totalGrossSalary / 2) - payrollMetrics.totalDeductions  // Q2: bruto ÷ 2 - deducciones
                  )}
                </div>
                <div className="text-sm text-gray-300">Salario Neto (Q)</div>
                <div className="text-xs text-gray-400 mt-1">
                  {selectedQuincena === 1 
                    ? 'Q1: Solo salario bruto (sin deducciones)'
                    : 'Q2: Bruto ÷ 2 - Deducciones mensuales'
                  }
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
                  {formatCurrency(payrollMetrics.totalGrossSalary)}
                </div>
                <div className="text-sm text-gray-300">Salario Bruto (M)</div>
                <div className="text-xs text-gray-400 mt-1">
                  Total mensual completo
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chips de Contexto */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-sm text-brand-300 flex items-center gap-2">
            <Icon name="calendar" className="w-4 h-4" />
            {selectedPeriod ? new Date(selectedPeriod + '-01').toLocaleDateString('es-HN', { year: 'numeric', month: 'long' }) : 'Período actual'}
          </div>
          <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-sm text-brand-300 flex items-center gap-2">
            <Icon name="clock" className="w-4 h-4" />
            Quincena {selectedQuincena}: {selectedQuincena === 1 ? '1-15' : `16-${lastDayOfSelectedMonth}`}
          </div>
          {filterDept && (
            <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-sm text-brand-300 flex items-center gap-2">
              <Icon name="building" className="w-4 h-4" />
              {departments[filterDept] || filterDept}
            </div>
          )}
          {filterEmployee && (
            <div className="px-3 py-1 bg-brand-800/20 border border-brand-500/30 rounded-full text-sm text-brand-300 flex items-center gap-2">
              <Icon name="users" className="w-4 h-4" />
              {filterEmployee}
            </div>
          )}

        </div>

        


      </div>

      {/* 3.  Generar Nómina */}
      <div className="space-y-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white"> Generar Nómina</CardTitle>
            <CardDescription className="text-gray-300">
              Genera la nómina para todos los empleados activos para un período y quincena seleccionados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={generatePayroll} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Mes
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
                     Rango de Quincena
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
                      16 - {(() => {
                        const [year, month] = generateForm.periodo.split('-').map(Number)
                        return new Date(year, month, 0).getDate()
                      })()}
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
                     Solo empleados con asistencia completa
                  </label>
                </div>
              </div>

              {/* Acciones de Nómina Integradas */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Icon name="target" className="w-5 h-5" />
                  Acciones de Nómina
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Botón 1: Generar Preview */}
              <Button
                    type="button"
                onClick={async () => {
                  setShowPreviewForm(!showPreviewForm)
                  // Si no hay draft, generar uno automáticamente
                  if (!draft) {
                    await generatePreview()
                  }
                }}
                disabled={isWorking || employees.length === 0}
                className="bg-green-600/20 border border-green-500/30 hover:bg-green-600/30 text-white h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200"
                title={employees.length === 0 ? 'No hay empleados activos' : 'Generar preview de nómina'}
              >
                    <Icon name="document" className="w-6 h-6" />
                <span className="text-sm font-medium">Generar Preview</span>
                <span className="text-xs opacity-80">(Draft)</span>
              </Button>

              {/* Botón 2: Editar Draft */}
              <Button
                    type="button"
                onClick={toggleEditDraft}
                disabled={!draft || isWorking}
                className={`h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                  isEditingDraft 
                    ? 'bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-white' 
                    : 'bg-gray-600/20 border border-gray-500/30 hover:bg-gray-600/30 text-white'
                }`}
                title={!draft ? 'Primero genera un preview' : 'Editar draft de nómina'}
              >
                    <Icon name="edit" className="w-6 h-6" />
                <span className="text-sm font-medium">Editar Draft</span>
                <span className="text-xs opacity-80">
                  {isEditingDraft ? 'Activado' : 'Toggle'}
                </span>
              </Button>

              {/* Botón 3: Generar PDF */}
              <Button
                    type="button"
                onClick={generatePDF}
                disabled={!draft || isWorking}
                className="bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-white h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200"
                title={!draft ? 'Primero genera un preview' : 'Generar PDF de planilla general'}
              >
                    <Icon name="download" className="w-6 h-6" />
                <span className="text-sm font-medium">Generar PDF</span>
                <span className="text-xs opacity-80">(Planilla General)</span>
              </Button>

              {/* Botón 4: Generar y Enviar Vouchers */}
              <Button
                    type="button"
                onClick={generateAndSendVouchers}
                disabled={!draft || isWorking}
                className="bg-orange-600/20 border border-orange-500/30 hover:bg-orange-600/30 text-white h-20 flex flex-col items-center justify-center gap-2 transition-all duration-200"
                title={!draft ? 'Primero genera un preview' : 'Generar y enviar vouchers por email'}
              >
                    <Icon name="edit" className="w-6 h-6" />
                <span className="text-sm font-medium">Generar y Enviar</span>
                <span className="text-xs opacity-80">Vouchers (Email)</span>
              </Button>
            </div>

            {/* Banner de Preview */}
            {draft && (
                  <div className="mb-6 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2">
                      <Icon name="warning" className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-200 font-medium">Preview (no persistido)</span>
                  <span className="text-yellow-300 text-sm">
                    — Periodo {draft?.meta?.periodo} Q{draft?.meta?.quincena} • {draft?.rows?.length || 0} empleados
                  </span>
                </div>
                <div className="mt-2 text-xs text-yellow-300">
                  Totales: Bruto {formatCurrency(draft?.totals?.gross || 0)} • 
                  Deducciones {formatCurrency(draft?.totals?.deductions || 0)} • 
                  Neto {formatCurrency(draft?.totals?.net || 0)}
                </div>
              </div>
            )}

            {/* Tabla editable del draft */}
            {draft && isEditingDraft && (
                  <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Icon name="document" className="w-5 h-5" />
                        Editar Draft de Nómina
                      </h3>
                  <Button
                    onClick={() => setIsEditingDraft(false)}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                        <Icon name="close" className="w-4 h-4 mr-1" />
                        Cerrar
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr className="border-b border-white/20">
                        <th className="text-left py-2 px-2 text-white">Empleado</th>
                        <th className="text-left py-2 px-2 text-white">Bruto</th>
                        <th className="text-left py-2 px-2 text-white">IHSS</th>
                        <th className="text-left py-2 px-2 text-white">RAP</th>
                        <th className="text-left py-2 px-2 text-white">ISR</th>
                        <th className="text-left py-2 px-2 text-white">Adj. Bono</th>
                        <th className="text-left py-2 px-2 text-white">Adj. Descuento</th>
                        <th className="text-left py-2 px-2 text-white">Neto</th>
                        <th className="text-left py-2 px-2 text-white">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft?.rows?.map((row) => (
                        <tr key={row.employee_id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 px-2">
                            <div className="text-white font-medium">{row.name}</div>
                            <div className="text-xs text-gray-300">{row.employee_code}</div>
                          </td>
                          <td className="py-2 px-2 text-white font-mono">
                            {formatCurrency(row.gross_salary)}
                          </td>
                          <td className="py-2 px-2 text-white font-mono">
                            {formatCurrency(row.ihss)}
                          </td>
                          <td className="py-2 px-2 text-white font-mono">
                            {formatCurrency(row.rap)}
                          </td>
                          <td className="py-2 px-2 text-white font-mono">
                            {formatCurrency(row.isr)}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              value={row.adj_bonus || 0}
                              onChange={(e) => {
                                const value = Number(e.target.value) || 0
                                const limit = row.base_salary * 2 // ±2 salarios mensuales
                                if (Math.abs(value) <= limit) {
                                  updateDraftRow(row.employee_id, 'adj_bonus', value)
                                }
                              }}
                              className="w-20 h-8 bg-white/10 border-white/20 text-white text-xs"
                              placeholder="0"
                              min={-row.base_salary * 2}
                              max={row.base_salary * 2}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              value={row.adj_discount || 0}
                              onChange={(e) => {
                                const value = Number(e.target.value) || 0
                                const limit = row.base_salary * 2 // ±2 salarios mensuales
                                if (Math.abs(value) <= limit) {
                                  updateDraftRow(row.employee_id, 'adj_discount', value)
                                }
                              }}
                              className="w-20 h-8 bg-white/10 border-white/20 text-white text-xs"
                              placeholder="0"
                              min={0}
                              max={row.base_salary * 2}
                            />
                          </td>
                          <td className="py-2 px-2 text-white font-mono font-semibold">
                            {formatCurrency(row.net_salary)}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="text"
                              value={row.note || ''}
                              onChange={(e) => updateDraftRow(row.employee_id, 'note', e.target.value)}
                              className="w-24 h-8 bg-white/10 border-white/20 text-white text-xs"
                              placeholder="Nota"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 p-3 bg-brand-800/20 border border-brand-500/30 rounded-lg">
                      <div className="text-sm text-brand-300 font-medium mb-2 flex items-center gap-2">
                        <Icon name="chart" className="w-4 h-4" />
                        Totales Actualizados:
                      </div>
                  <div className="grid grid-cols-3 gap-4 text-xs text-gray-300">
                    <div>Bruto: <span className="text-white font-mono">{formatCurrency(draft?.totals?.gross || 0)}</span></div>
                    <div>Deducciones: <span className="text-white font-mono">{formatCurrency(draft?.totals?.deductions || 0)}</span></div>
                    <div>Neto: <span className="text-white font-mono">{formatCurrency(draft?.totals?.net || 0)}</span></div>
                  </div>
                </div>
              </div>
            )}
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                <Button type="submit" disabled={loading} className="bg-brand-800 hover:bg-brand-700 text-white px-8 py-3">
                  {loading ? (
                    <>
                      <Icon name="refresh" className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Icon name="rocket" className="w-4 h-4 mr-2" />
                      Generar Nómina
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={()=>sendPayrollEmail()} 
                  className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
                >
                  <Icon name="envelope" className="w-4 h-4 mr-2" />
                  Enviar Planilla por Email
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={()=>sendPayrollWhatsApp()} 
                  className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
                >
                  <Icon name="whatsapp" className="w-4 h-4 mr-2" />
                  Enviar por WhatsApp
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 4. 🎫 Generar Voucher Individual */}
      <div className="space-y-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Icon name="receipt" className="w-5 h-5" />
              Generar Voucher Individual
            </CardTitle>
            <CardDescription className="text-gray-300">
              Genera vouchers individuales para empleados específicos con ajustes personalizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoucherGenerator 
              employees={employees.filter(e => e.status === 'active')}
              onVoucherGenerated={fetchData}
            />
          </CardContent>
        </Card>
      </div>

      {/* 4. 📋 Tabla de Registros de Nómina */}
      <div className="space-y-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Icon name="document" className="w-5 h-5" />
              Registros de Nómina
            </CardTitle>
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
                        {('isPreview' in record && record.isPreview as boolean) && (
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
                              <Icon name="edit" className="w-4 h-4 mr-1" />
                              Editar
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
                              <Icon name="refresh" className="w-4 h-4 mr-1" />
                              Recalcular
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
                              <Icon name="check" className="w-4 h-4 mr-1" />
                              Aprobar
                            </Button>
                          )}
                          
                          {/* Botón Marcar Pagado - solo si está aprobada */}
                          {record.status === 'approved' && !('isPreview' in record && record.isPreview) && (
                            <Button
                              size="sm"
                              onClick={() => markAsPaid(record.id || '')}
                              className="bg-brand-800 hover:bg-brand-700 text-white"
                            >
                              <Icon name="money" className="w-4 h-4 mr-1" />
                              Marcar Pagado
                            </Button>
                          )}
                          
                          {/* Botones de descarga - siempre visibles */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => await downloadPayrollPDF(record)}
                            className="text-gray-300 hover:bg-white/10 hover:text-white"
                            disabled={'isPreview' in record && (record.isPreview as boolean)}
                            title={'isPreview' in record && (record.isPreview as boolean) ? 'Generá primero la nómina' : 'Descargar PDF'}
                          >
                            <Icon name="download" className="w-4 h-4 mr-1" />
                            Descargar PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => await downloadIndividualReceipt(record)}
                            className="text-gray-300 hover:bg-white/10 hover:text-white"
                            disabled={'isPreview' in record && (record.isPreview as boolean)}
                            title={'isPreview' in record && (record.isPreview as boolean) ? 'Generá primero la nómina' : 'Descargar recibo individual'}
                          >
                            <Icon name="receipt" className="w-4 h-4 mr-1" />
                            Descargar Recibo
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

      {/* Formulario de Preview */}
      {showPreviewForm && (
        <div className="mt-6 p-6 bg-brand-800/20 border border-brand-500/30 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Icon name="gear" className="w-5 h-5" />
              Configurar Preview de Nómina
            </h3>
            <Button
              onClick={() => setShowPreviewForm(false)}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Icon name="close" className="w-4 h-4 mr-1" />
              Cerrar
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mes */}
            <div>
              <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Icon name="calendar" className="w-4 h-4" />
                Mes
              </label>
              <Input
                type="month"
                value={previewForm.periodo}
                onChange={(e) => setPreviewForm(prev => ({ ...prev, periodo: e.target.value }))}
                required
                className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400"
              />
            </div>
            
            {/* Rango de Quincena */}
            <div>
              <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Icon name="clock" className="w-4 h-4" />
                Rango de Quincena
              </label>
              <div className="flex gap-3">
                <Button 
                  type="button"
                  onClick={() => setPreviewForm(prev => ({ ...prev, quincena: 1 }))}
                  className={`flex-1 ${previewForm.quincena === 1 ? 'bg-brand-800 hover:bg-brand-700 text-white' : 'border border-white/20 text-white hover:bg-white/10 bg-transparent'}`}
                >
                  1 - 15
                </Button>
                <Button 
                  type="button"
                  onClick={() => setPreviewForm(prev => ({ ...prev, quincena: 2 }))}
                  className={`flex-1 ${previewForm.quincena === 2 ? 'bg-brand-800 hover:bg-brand-700 text-white' : 'border border-white/20 text-white hover:bg-white/10 bg-transparent'}`}
                >
                  16 - {(() => {
                    const [year, month] = previewForm.periodo.split('-').map(Number)
                    return new Date(year, month, 0).getDate()
                  })()}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Incluir Deducciones */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={previewForm.incluirDeducciones}
                onChange={(e) => setPreviewForm(prev => ({ ...prev, incluirDeducciones: e.target.checked }))}
                className="w-4 h-4 accent-brand-500"
                id="preview-deducciones"
              />
              <label htmlFor="preview-deducciones" className="text-sm font-medium text-white flex items-center gap-2">
                <Icon name="money" className="w-4 h-4" />
                Incluir deducciones (ISR, IHSS, RAP)
              </label>
            </div>
            
            {/* Solo Empleados con Asistencia */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={previewForm.soloEmpleadosConAsistencia}
                onChange={(e) => setPreviewForm(prev => ({ ...prev, soloEmpleadosConAsistencia: e.target.checked }))}
                className="w-4 h-4 accent-brand-500"
                id="preview-asistencia"
              />
              <label htmlFor="preview-asistencia" className="text-sm font-medium text-white flex items-center gap-2">
                <Icon name="check" className="w-4 h-4" />
                Solo empleados con asistencia completa
              </label>
            </div>
          </div>
          
          {/* Botón Generar Preview */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <Button 
              onClick={generatePreview}
              disabled={isWorking}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 w-full md:w-auto"
            >
              {isWorking ? (
                <>
                  <Icon name="refresh" className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Icon name="rocket" className="w-4 h-4 mr-2" />
                  Generar Preview
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
