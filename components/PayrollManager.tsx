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
import { usePayrollState } from '../lib/hooks/usePayrollState'
import { PayrollLineEditor } from './PayrollLineEditor'
import { payrollApi, openInNewTab } from '../lib/payroll-api'
import { PayrollLine } from '../types/payroll'

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
  const [supabase, setSupabase] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [payrollRecords, setPayrollRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New payroll state management
  const payrollState = usePayrollState()

  // Legacy state for compatibility
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [filterYear, setFilterYear] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<string>('')
  const [filterQuincena, setFilterQuincena] = useState<string>('')
  const [filterDept, setFilterDept] = useState<string>('')
  const [filterEmployee, setFilterEmployee] = useState<string>('')
  const [suspendedCount, setSuspendedCount] = useState<number>(0)

  // Estado para modo Preview mejorado
  const [previewMode, setPreviewMode] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  // Estados para modales flotantes - removed unused variables

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
        
        return q === parseInt(filterQuincena)
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
        const quincenaText = parseInt(filterQuincena) === 1 ? '1-15' : '16-30'
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
        
        const taxableAmount = monthlySalary - (bracket.limit - bracket.base)
        return Math.max(0, taxableAmount * bracket.rate)
      }
    }
    
    // Para salarios muy altos (último bracket)
    const lastBracket = ISR_BRACKETS_MENSUAL[ISR_BRACKETS_MENSUAL.length - 1]
    const taxableAmount = monthlySalary - (lastBracket.limit - lastBracket.base)
    return Math.max(0, taxableAmount * lastBracket.rate)
  }, [])

  // CÁLCULO IHSS CORRECTO 2025
  const calculateIHSS = useCallback((monthlySalary: number): number => {
    // Tope IHSS 2025: L 119,031.30 anual / 12 = L 9,919.28 mensual
    const IHSS_TOPE_MENSUAL = 9919.28
    const IHSS_RATE = 0.05 // 5%
    
    return Math.min(monthlySalary, IHSS_TOPE_MENSUAL) * IHSS_RATE
  }, [])

  // CÁLCULO RAP CORRECTO 2025
  const calculateRAP = useCallback((monthlySalary: number): number => {
    // Tope RAP 2025: L 119,031.30 anual / 12 = L 9,919.28 mensual
    const RAP_TOPE_MENSUAL = 9919.28
    const RAP_RATE = 0.015 // 1.5%
    
    const taxableAmount = Math.max(0, monthlySalary - RAP_TOPE_MENSUAL)
    return taxableAmount * RAP_RATE
  }, [])

  // Función para calcular nómina completa
  const calculatePayroll = useCallback((employee: any, daysWorked: number, daysAbsent: number) => {
    const baseSalary = Number(employee.base_salary) || 0
    
    // Calcular salario proporcional por días trabajados
    const salaryProportional = (baseSalary / 30) * daysWorked
    
    // Aplicar deducciones solo si es quincena 2 (mensual completo)
    let IHSS = 0, RAP = 0, ISR = 0
    
    if (parseInt(filterQuincena) === 2) {
      IHSS = calculateIHSS(baseSalary)
      RAP = calculateRAP(baseSalary)
      ISR = calculateISR(baseSalary)
    }
    
    const totalDeductions = IHSS + RAP + ISR
    const netSalary = salaryProportional - totalDeductions
    
    return {
      base_salary: baseSalary,
      days_worked: daysWorked,
      days_absent: daysAbsent,
      salary_proportional: salaryProportional,
      IHSS,
      RAP,
      ISR,
      total_deductions: totalDeductions,
      net_salary: netSalary
    }
  }, [filterQuincena, calculateIHSS, calculateRAP, calculateISR])

  // Función para generar preview de nómina
  const generatePayrollPreview = useCallback(async () => {
    if (!employees.length) {
      setError('No hay empleados para generar nómina')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Usar el nuevo sistema de estado
      const response = await payrollState.generatePreview()
      
      setPreviewData(response)
      setPreviewMode(true)
      
      // Mostrar toast de éxito
      console.log(`✅ Preview generado: ${response.empleados} empleados`)
      
    } catch (error: any) {
      setError(error.message || 'Error generando preview de nómina')
      console.error('Error generando preview:', error)
    } finally {
      setLoading(false)
    }
  }, [employees, payrollState])

  // Función para editar línea de nómina
  const handleEditLine = useCallback(async (
    runLineId: string,
    field: string,
    newValue: number,
    reason?: string
  ) => {
    try {
      await payrollState.editLine(runLineId, field, newValue, reason)
      console.log(`✅ Línea editada: ${field} = ${newValue}`)
    } catch (error: any) {
      console.error('Error editando línea:', error)
      // El error ya está manejado por el hook
    }
  }, [payrollState])

  // Función para autorizar nómina
  const handleAuthorize = useCallback(async () => {
    try {
      const response = await payrollState.authorizeRun()
      
      // Abrir PDF en nueva pestaña
      if (response.artifact_url) {
        openInNewTab(response.artifact_url)
      }
      
      console.log('✅ Nómina autorizada exitosamente')
      
    } catch (error: any) {
      console.error('Error autorizando nómina:', error)
      // El error ya está manejado por el hook
    }
  }, [payrollState])

  // Función para enviar por email
  const handleSendEmail = useCallback(async (employeeId?: string) => {
    try {
      const response = await payrollState.sendEmail(employeeId)
      
      console.log(`✅ Email enviado: ${response.successful} exitosos, ${response.failed} fallidos`)
      
      // Mostrar resumen
      if (response.failed > 0) {
        console.warn(`⚠️ ${response.failed} emails fallaron`)
      }
      
    } catch (error: any) {
      console.error('Error enviando email:', error)
      // El error ya está manejado por el hook
    }
  }, [payrollState])

  // Función para enviar por WhatsApp (deshabilitado)
  const handleSendWhatsApp = useCallback(async (employeeId?: string) => {
    alert('Feature en desarrollo - We will implement that later. Forget it for now.')
  }, [])

  // Función para generar y enviar vouchers
  const generateAndSendVouchers = useCallback(async () => {
    alert('Feature en desarrollo - We will implement that later. Forget it for now.')
  }, [])

  // Función para enviar nómina por WhatsApp (deshabilitado)
  const sendPayrollWhatsApp = useCallback(async () => {
    alert('Feature en desarrollo - We will implement that later. Forget it for now.')
  }, [])

  // Función para enviar nómina por email
  const sendPayrollEmail = useCallback(async () => {
    try {
      await handleSendEmail()
    } catch (error: any) {
      console.error('Error enviando nómina por email:', error)
    }
  }, [handleSendEmail])

  // Función para generar PDF
  const generatePDF = useCallback(async () => {
    if (!payrollState.runId) {
      setError('No hay una corrida de nómina activa')
      return
    }

    try {
      const response = await payrollApi.generatePDF(payrollState.runId)
      openInNewTab(response.url)
    } catch (error: any) {
      setError('Error generando PDF')
      console.error('Error generando PDF:', error)
    }
  }, [payrollState.runId])

  // Función para generar voucher individual
  const generateVoucher = useCallback(async (runLineId: string) => {
    try {
      const response = await payrollApi.generateVoucher(runLineId)
      openInNewTab(response.url)
    } catch (error: any) {
      setError('Error generando voucher')
      console.error('Error generando voucher:', error)
    }
  }, [])

  // Función para limpiar filtros
  const clearFilters = useCallback(() => {
    setFilterYear('')
    setFilterMonth('')
    setFilterQuincena('')
    setFilterDept('')
    setFilterEmployee('')
    payrollState.resetFilters()
  }, [payrollState])

  // Función para cambiar periodo
  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period)
  }, [])

  // Función para calcular estadísticas de nómina
  const calculatePayrollStats = useCallback(() => {
    if (!payrollState.planilla.length) return null

    const totalBruto = payrollState.totalBruto
    const totalDeducciones = payrollState.totalDeducciones
    const totalNeto = payrollState.totalNeto

    return {
      totalBruto,
      totalDeducciones,
      totalNeto,
      employeeCount: payrollState.planilla.length
    }
  }, [payrollState.planilla, payrollState.totalBruto, payrollState.totalDeducciones, payrollState.totalNeto])

  // Función para obtener porcentaje de ausentismo
  const getAbsenteeismPercent = useCallback(() => {
    if (!payrollState.planilla.length) return 0

    const totalDays = payrollState.planilla.reduce((sum, line) => sum + line.days_worked + line.days_absent, 0)
    const absentDays = payrollState.planilla.reduce((sum, line) => sum + line.days_absent, 0)

    return totalDays > 0 ? (absentDays / totalDays) * 100 : 0
  }, [payrollState.planilla])

  // Función para obtener empleados activos
  const getActiveEmployees = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments(name)
        `)
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error obteniendo empleados:', error)
      setError('Error obteniendo empleados')
    }
  }, [supabase])

  // Función para obtener departamentos
  const getDepartments = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error: any) {
      console.error('Error obteniendo departamentos:', error)
    }
  }, [supabase])

  // Función para obtener registros de asistencia
  const getAttendanceRecords = useCallback(async () => {
    if (!supabase || !selectedPeriod) return

    try {
      const [year, month] = selectedPeriod.split('-').map(Number)
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employees(name, employee_code, department_id)
        `)
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error
      setAttendanceRecords(data || [])
    } catch (error: any) {
      console.error('Error obteniendo registros de asistencia:', error)
    }
  }, [supabase, selectedPeriod])

  // Función para obtener registros de nómina
  const getPayrollRecords = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select(`
          *,
          employees(
            name,
            employee_code,
            department_id,
            base_salary
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPayrollRecords(data || [])
    } catch (error: any) {
      console.error('Error obteniendo registros de nómina:', error)
    }
  }, [supabase])

  // Función para obtener empleados suspendidos
  const getSuspendedEmployees = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'suspended')

      if (error) throw error
      setSuspendedCount(data?.length || 0)
    } catch (error: any) {
      console.error('Error obteniendo empleados suspendidos:', error)
    }
  }, [supabase])

  // Efecto para inicializar Supabase
  useEffect(() => {
    try {
      const client = createClient()
      if (client) {
        setSupabase(client)
      }
    } catch (error) {
      console.error('Error inicializando Supabase:', error)
      setError('Error de conexión')
    }
  }, [])

  // Efecto para cargar datos iniciales
  useEffect(() => {
    if (supabase) {
      getActiveEmployees()
      getDepartments()
      getPayrollRecords()
      getSuspendedEmployees()
    }
  }, [supabase, getActiveEmployees, getDepartments, getPayrollRecords, getSuspendedEmployees])

  // Efecto para cargar registros de asistencia cuando cambie el periodo
  useEffect(() => {
    if (supabase && selectedPeriod) {
      getAttendanceRecords()
    }
  }, [supabase, selectedPeriod, getAttendanceRecords])

  // Efecto para establecer periodo por defecto
  useEffect(() => {
    if (!selectedPeriod) {
      const now = new Date()
      const defaultPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
      setSelectedPeriod(defaultPeriod)
    }
  }, [selectedPeriod])

  // Función para manejar cambio de filtros
  const handleFilterChange = useCallback((filterType: string, value: string) => {
    switch (filterType) {
      case 'year':
        setFilterYear(value)
        break
      case 'month':
        setFilterMonth(value)
        break
      case 'quincena':
        setFilterQuincena(value)
        break
      case 'dept':
        setFilterDept(value)
        break
      case 'employee':
        setFilterEmployee(value)
        break
      default:
        break
    }
  }, [])

  // Función para exportar datos
  const exportData = useCallback(async () => {
    if (!filteredRecords.length) {
      setError('No hay datos para exportar')
      return
    }

    try {
      const csvContent = [
        ['Empleado', 'Código', 'Departamento', 'Salario Base', 'Días Trabajados', 'Salario Bruto', 'IHSS', 'RAP', 'ISR', 'Total Deducciones', 'Salario Neto'],
        ...filteredRecords.map(record => [
          record.employees?.name || 'N/A',
          record.employees?.employee_code || 'N/A',
          record.employees?.department_id || 'N/A',
          record.base_salary || 0,
          record.days_worked || 0,
          record.gross_salary || 0,
          record.income_tax || 0,
          record.professional_tax || 0,
          record.social_security || 0,
          record.total_deductions || 0,
          record.net_salary || 0
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `nomina_${selectedPeriod || 'general'}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error: any) {
      console.error('Error exportando datos:', error)
      setError('Error exportando datos')
    }
  }, [filteredRecords, selectedPeriod])

  // Función para comparar períodos
  const comparePeriods = useCallback(async () => {
    if (!selectedPeriod) {
      setError('Seleccione un período para comparar')
      return
    }

    try {
      const [y, m] = selectedPeriod.split('-').map(Number)
      const q = filterQuincena || 1
      const ym = `${y}-${m.toString().padStart(2, '0')}`
      
      // Llamada a la API de comparación
      const cmpRes = await fetch(`/api/payroll/compare?periodo=${encodeURIComponent(ym)}&quincena=${q}`)
      const cmpJson = await cmpRes.json().catch(()=>null)
      if (cmpRes.ok) console.log('Comparison data received:', cmpJson)
    } catch {}
  }, [selectedPeriod, filterQuincena])

  // Función para generar nómina
  const generatePayroll = useCallback(async () => {
    if (!employees.length) {
      setError('No hay empleados para generar nómina')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Generar nómina usando el nuevo sistema
      await generatePayrollPreview()
    } catch (error: any) {
      setError(error.message || 'Error generando nómina')
      console.error('Error generando nómina:', error)
    } finally {
      setLoading(false)
    }
  }, [employees, generatePayrollPreview])

  // Función para limpiar error
  const clearError = useCallback(() => {
    setError(null)
    payrollState.clearError()
  }, [payrollState])

  // Función para resetear estado
  const resetState = useCallback(() => {
    payrollState.resetState()
    setPreviewMode(false)
    setPreviewData(null)
    clearError()
  }, [payrollState, clearError])

  // Función para manejar cambio de filtros del nuevo sistema
  const handleNewFilterChange = useCallback((key: string, value: any) => {
    payrollState.updateFilters({ [key]: value })
  }, [payrollState])

  // Renderizado del componente
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Nómina</h1>
          <p className="text-gray-600">Genera y gestiona nóminas con cálculos automáticos</p>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            payrollState.status === 'idle' ? 'bg-gray-100 text-gray-800' :
            payrollState.status === 'draft' ? 'bg-blue-100 text-blue-800' :
            payrollState.status === 'authorized' ? 'bg-green-100 text-green-800' :
            payrollState.status === 'error' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {payrollState.status === 'idle' ? 'Inactivo' :
             payrollState.status === 'draft' ? 'Borrador' :
             payrollState.status === 'authorized' ? 'Autorizado' :
             payrollState.status === 'error' ? 'Error' :
             payrollState.status}
          </span>
          
          {payrollState.loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(error || payrollState.error) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
                              <Icon name="alert" className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || payrollState.error}</p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearError}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Nómina</CardTitle>
          <CardDescription>
            Configura los parámetros para generar la nómina
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Año */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">Año</label>
              <select
                value={payrollState.filters.year.toString()}
                onChange={(e) => handleNewFilterChange('year', parseInt(e.target.value))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Seleccionar año</option>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Mes */}
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
              <select
                value={payrollState.filters.month.toString()}
                onChange={(e) => handleNewFilterChange('month', parseInt(e.target.value))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Seleccionar mes</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month.toString()}>
                    {new Date(2024, month - 1).toLocaleDateString('es-HN', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Quincena */}
            <div>
              <label htmlFor="quincena" className="block text-sm font-medium text-gray-700 mb-2">Quincena</label>
              <select
                value={payrollState.filters.quincena.toString()}
                onChange={(e) => handleNewFilterChange('quincena', parseInt(e.target.value))}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Seleccionar quincena</option>
                <option value="1">1 (1-15)</option>
                <option value="2">2 (16-31)</option>
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <select
                value={payrollState.filters.tipo}
                onChange={(e) => handleNewFilterChange('tipo', e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Seleccionar tipo</option>
                <option value="CON">Con Asistencia</option>
                <option value="SIN">Sin Asistencia</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-6">
            <Button
              onClick={payrollState.generatePreview}
              disabled={!payrollState.canPreview || payrollState.loading}
              className="flex items-center gap-2"
            >
              <Icon name="eye" className="h-4 w-4" />
              {payrollState.loading ? 'Generando...' : 'Generar Preview'}
            </Button>

            <Button
              variant="outline"
              onClick={payrollState.resetFilters}
              disabled={payrollState.loading}
            >
              Resetear Filtros
            </Button>

            {payrollState.canReset && (
              <Button
                variant="outline"
                onClick={resetState}
                disabled={payrollState.loading}
              >
                Resetear Estado
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Planilla Display */}
      {payrollState.hasPlanilla && (
        <Card>
          <CardHeader>
            <CardTitle>Planilla de Nómina</CardTitle>
            <CardDescription>
              {payrollState.totalEmployees} empleados - 
              Total Bruto: {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(payrollState.totalBruto)} - 
              Total Neto: {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(payrollState.totalNeto)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Planilla Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Empleado</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Departamento</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Días Trabajados</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Salario Bruto</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">IHSS</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">RAP</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">ISR</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Total Deducciones</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Salario Neto</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollState.planilla.map((line: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{line.name}</td>
                      <td className="border border-gray-300 px-4 py-2">{line.department}</td>
                      <td className="border border-gray-300 px-4 py-2">{line.days_worked}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(line.total_earnings)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(line.IHSS)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(line.RAP)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(line.ISR)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(line.total_deducciones)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(line.total)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateVoucher(line.line_id)}
                            disabled={payrollState.loading}
                          >
                            <Icon name="download" className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-6">
              <Button
                onClick={handleAuthorize}
                disabled={!payrollState.canAuthorize || payrollState.loading}
                className="flex items-center gap-2"
              >
                <Icon name="check" className="h-4 w-4" />
                {payrollState.loading ? 'Autorizando...' : 'Autorizar Nómina'}
              </Button>

              <Button
                onClick={generatePDF}
                disabled={!payrollState.runId || payrollState.loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon name="document" className="h-4 w-4" />
                Generar PDF
              </Button>

              <Button
                onClick={sendPayrollEmail}
                disabled={!payrollState.canSend || payrollState.loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon name="envelope" className="h-4 w-4" />
                Enviar por Email
              </Button>

              <Button
                onClick={sendPayrollWhatsApp}
                disabled={!payrollState.canSend || payrollState.loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Icon name="whatsapp" className="h-4 w-4" />
                Enviar por WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy Content - Keep for compatibility */}
      {!payrollState.hasPlanilla && (
        <>
          {/* Existing filters and content */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros Avanzados</CardTitle>
              <CardDescription>
                Filtra los registros existentes de nómina
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Existing filter controls */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Year Filter */}
                <div>
                  <label htmlFor="filterYear" className="block text-sm font-medium text-gray-700 mb-2">Año</label>
                  <select
                    value={filterYear}
                    onChange={(e) => handleFilterChange('year', e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Todos los años</option>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Filter */}
                <div>
                  <label htmlFor="filterMonth" className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => handleFilterChange('month', e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Todos los meses</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month.toString()}>
                        {new Date(2024, month - 1).toLocaleDateString('es-HN', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quincena Filter */}
                <div>
                  <label htmlFor="filterQuincena" className="block text-sm font-medium text-gray-700 mb-2">Quincena</label>
                  <select
                    value={filterQuincena}
                    onChange={(e) => handleFilterChange('quincena', e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Todas las quincenas</option>
                    <option value="1">1 (1-15)</option>
                    <option value="2">2 (16-31)</option>
                  </select>
                </div>

                {/* Department Filter */}
                <div>
                  <label htmlFor="filterDept" className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
                  <select
                    value={filterDept}
                    onChange={(e) => handleFilterChange('dept', e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Todos los departamentos</option>
                    <option value="">Todos</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee Search */}
                <div>
                  <label htmlFor="filterEmployee" className="block text-sm font-medium text-gray-700 mb-2">Buscar Empleado</label>
                  <Input
                    id="filterEmployee"
                    placeholder="Nombre o código"
                    value={filterEmployee}
                    onChange={(e) => handleFilterChange('employee', e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center gap-4 mt-4">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={loading}
                >
                  Limpiar Filtros
                </Button>

                <Button
                  variant="outline"
                  onClick={exportData}
                  disabled={!filteredRecords.length || loading}
                >
                  Exportar CSV
                </Button>

                <Button
                  variant="outline"
                  onClick={comparePeriods}
                  disabled={!selectedPeriod || loading}
                >
                  Comparar Períodos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Records Display */}
          {filteredRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Registros de Nómina</CardTitle>
                <CardDescription>
                  {getFilterDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Existing table content */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Empleado</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Período</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Salario Bruto</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Deducciones</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Salario Neto</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Estado</th>
                        <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">
                            <div>
                              <div className="font-medium">{record.employees?.name || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{record.employees?.employee_code || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div>
                              <div className="font-medium">
                                {new Date(record.period_start).toLocaleDateString('es-HN')} - {new Date(record.period_end).toLocaleDateString('es-HN')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {record.period_type === 'monthly' ? 'Mensual' : 'Quincenal'}
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(record.gross_salary || 0)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(record.total_deducciones || 0)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(record.net_salary || 0)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                              record.status === 'approved' 
                                ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80' 
                                : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'
                            }`}>
                              {record.status === 'approved' ? 'Aprobado' : 'Borrador'}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Handle view action
                                }}
                              >
                                <Icon name="eye" className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Handle edit action
                                }}
                              >
                                <Icon name="edit" className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Voucher Generator Modal */}
      <VoucherGenerator 
        employees={[]} 
        onVoucherGenerated={() => {}} 
      />
    </div>
  )
}
