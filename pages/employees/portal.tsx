import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import EmployeePasswordLogin from '../../components/employee-portal/EmployeePasswordLogin'
import { useAuth } from '../../lib/auth'
import { useNotificationContext, type NotificationContextType } from '../../components/NotificationProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Button } from '../../components/ui/button'
import {
  UserIcon, 
  ClockIcon, 
  CurrencyDollarIcon, 
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { clientLogger } from '../../lib/logger-client'
import EmployeePermissionForm from '../../components/employee-portal/EmployeePermissionForm'
import EmployeePermissionHistory from '../../components/employee-portal/EmployeePermissionHistory'
import { formatTimeDisplay, parseDateOnlyAsHonduras, formatDateOnlyForHonduras, HONDURAS_TIMEZONE } from '../../lib/timezone'
import NotificationBell from '../../components/ui/NotificationBell'
import EmployeePortalShell from '../../components/employee-portal/EmployeePortalShell'

// Component for attendance records list
function AttendanceRecordsList({ employeeId }: { employeeId?: string }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  useEffect(() => {
    if (!employeeId) return

    const fetchRecords = async () => {
      try {
        const response = await fetch(`/api/employees/me/attendance?limit=20&page=${currentPage}`, {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          setRecords(data.records || [])
          setTotalRecords(data.total || 0)
        }
      } catch (error) {
        console.error('Error fetching attendance records:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [employeeId, currentPage])

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A'
    // Usar formatTimeDisplay que maneja correctamente la conversión de UTC a hora de Honduras
    return formatTimeDisplay(timeString)
  }

  const calculateHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return null
    try {
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return hours.toFixed(1)
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-400 mx-auto"></div>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Sin Registros de Asistencia
        </h3>
        <p className="text-gray-300">
          No hay registros de asistencia disponibles
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Records List */}
      <div className="space-y-2">
        {records.map((record, index) => {
          const calculatedHours = calculateHours(record.check_in, record.check_out)
          
          return (
            <div key={record.id || index} className="bg-white/5 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-white font-medium">
                    {(() => {
                      const d = parseDateOnlyAsHonduras(record.date)
                      return isNaN(d.getTime()) ? record.date : d.toLocaleDateString('es-HN', {
                        timeZone: HONDURAS_TIMEZONE,
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    })()}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    {record.check_in && (
                      <span className="text-sm text-gray-400">
                        Entrada: <span className="text-green-400">{formatTime(record.check_in)}</span>
                      </span>
                    )}
                    {(record as any).lunch_start && (
                      <span className="text-sm text-gray-400">
                        Inicio almuerzo: <span className="text-amber-400">{formatTime((record as any).lunch_start)}</span>
                      </span>
                    )}
                    {(record as any).lunch_end && (
                      <span className="text-sm text-gray-400">
                        Fin almuerzo: <span className="text-amber-400">{formatTime((record as any).lunch_end)}</span>
                      </span>
                    )}
                    {record.check_out && (
                      <span className="text-sm text-gray-400">
                        Salida: <span className="text-red-400">{formatTime(record.check_out)}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    record.status === 'present' ? 'bg-green-500/20 text-green-400' :
                    record.status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                    record.status === 'absent' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {record.status === 'present' ? 'Presente' :
                     record.status === 'late' ? 'Tardanza' :
                     record.status === 'absent' ? 'Ausente' : 
                     record.status || 'Sin estado'}
                  </span>
                  {calculatedHours && (
                    <p className="text-sm text-blue-400 mt-1 font-medium">{calculatedHours}h</p>
                  )}
                  {record.late_minutes > 0 && (
                    <p className="text-xs text-yellow-400 mt-1">+{record.late_minutes}min tarde</p>
                  )}
                </div>
              </div>
              
              {record.justification && (
                <div className="mt-2 p-2 bg-white/5 rounded text-sm">
                  <span className="text-gray-400">Justificación: </span>
                  <span className="text-white">{record.justification}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalRecords > 20 && (
        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-gray-400">
            Mostrando {records.length} de {totalRecords} registros
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/10 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-white">
              Página {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={records.length < 20}
              className="px-3 py-1 bg-white/10 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Component for payroll section
function PayrollSection({
  employeeId,
  addNotification
}: {
  employeeId?: string
  addNotification: NotificationContextType['addNotification']
}) {
  const [payrollData, setPayrollData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    if (!employeeId) return

    const fetchPayroll = async () => {
      try {
        const response = await fetch('/api/employees/me/payroll', {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          setPayrollData(data)
        } else if (response.status === 404) {
          // No payroll data available
          setPayrollData(null)
        }
      } catch (error) {
        console.error('Error fetching payroll:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPayroll()
  }, [employeeId])

  const generatePDF = async (periodo: string, quincena: number) => {
    setGeneratingPDF(true)
    try {
      const response = await fetch('/api/employees/me/payroll-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ periodo, quincena })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error((errorData as { error?: string }).error || 'Error al generar el recibo')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-nomina-${periodo}-q${quincena}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      addNotification({
        type: 'success',
        title: 'Recibo de nómina',
        message: 'PDF descargado correctamente',
        module: 'payroll'
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Inténtalo nuevamente'
      addNotification({
        type: 'error',
        title: 'Error al descargar PDF',
        message,
        module: 'payroll'
      })
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
      </div>
    )
  }

  if (!payrollData || payrollData.summary.totalRecords === 0) {
    return (
      <div className="text-center py-8">
        <CurrencyDollarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          Sin Información de Nómina
        </h3>
        <p className="text-gray-300">
          No hay registros de nómina disponibles para este período
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Período Actual</div>
          <div className="text-white font-medium">
            {payrollData.currentPeriod.month.toString().padStart(2, '0')}/{payrollData.currentPeriod.year}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Último Pago</div>
          <div className="text-white font-medium">
            {payrollData.summary.lastPayment 
              ? new Date(payrollData.summary.lastPayment).toLocaleDateString('es-HN')
              : 'No disponible'
            }
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Último Monto</div>
          <div className="text-white font-medium">
            {payrollData.summary.lastAmount 
              ? `L. ${Number(payrollData.summary.lastAmount).toLocaleString('es-HN', { minimumFractionDigits: 2 })}`
              : 'No disponible'
            }
          </div>
        </div>
      </div>

      {/* Payroll Records */}
      {payrollData.records && payrollData.records.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-white font-medium">Registros de Nómina</h4>
          <div className="space-y-2">
            {payrollData.records.map((record: any, index: number) => {
              // Calcular período y quincena para el PDF (usar parseDateOnlyAsHonduras para evitar bug UTC)
              const periodStart = parseDateOnlyAsHonduras(record.period_start)
              const periodo = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`
              const quincena = periodStart.getDate() <= 15 ? 1 : 2
              
              return (
                <div key={record.id || index} className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-white font-medium">
                        {formatDateOnlyForHonduras(record.period_start)} - {formatDateOnlyForHonduras(record.period_end)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {record.days_worked} días trabajados
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        record.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {record.status === 'paid' ? 'Pagado' :
                         record.status === 'approved' ? 'Aprobado' : 'Pendiente'}
                      </span>
                      <button
                        onClick={() => generatePDF(periodo, quincena)}
                        disabled={generatingPDF}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
                      >
                        {generatingPDF ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Generando...
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Salario Bruto</div>
                    <div className="text-white">L. {Number(record.gross_salary || 0).toLocaleString('es-HN')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Deducciones</div>
                    <div className="text-red-300">-L. {Number(record.total_deductions || 0).toLocaleString('es-HN')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Salario Neto</div>
                    <div className="text-green-300 font-medium">L. {Number(record.net_salary || 0).toLocaleString('es-HN')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Fecha Pago</div>
                    <div className="text-white">
                      {record.paid_at ? new Date(record.paid_at).toLocaleDateString('es-HN') : 'Pendiente'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => generatePDF(
                      `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`,
                      periodStart.getDate() <= 15 ? 1 : 2
                    )}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                  >
                    📄 PDF
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Run Lines (if no records available) */}
      {payrollData.runLines && payrollData.runLines.length > 0 && (!payrollData.records || payrollData.records.length === 0) && (
        <div className="space-y-4">
          <h4 className="text-white font-medium">Cálculos de Nómina</h4>
          <div className="space-y-2">
            {payrollData.runLines.map((line: any, index: number) => {
              // Calcular período y quincena para el PDF
              const periodo = `${line.payroll_runs.year}-${String(line.payroll_runs.month).padStart(2, '0')}`
              const quincena = line.payroll_runs.quincena
              
              return (
                <div key={line.id || index} className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-white font-medium">
                        {line.payroll_runs.month}/{line.payroll_runs.year} - Q{line.payroll_runs.quincena}
                      </div>
                      <div className="text-sm text-gray-400">
                        {Number(line.eff_hours || 0).toFixed(1)} horas
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        line.payroll_runs.status === 'authorized' ? 'bg-green-500/20 text-green-400' :
                        line.payroll_runs.status === 'edited' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {line.payroll_runs.status === 'authorized' ? 'Autorizado' :
                         line.payroll_runs.status === 'edited' ? 'Editado' : 'Borrador'}
                      </span>
                      <button
                        onClick={() => generatePDF(periodo, quincena)}
                        disabled={generatingPDF}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
                      >
                        {generatingPDF ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Generando...
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Bruto</div>
                    <div className="text-white">L. {Number(line.eff_bruto || 0).toLocaleString('es-HN')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">IHSS</div>
                    <div className="text-red-300">-L. {Number(line.eff_ihss || 0).toLocaleString('es-HN')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">RAP</div>
                    <div className="text-red-300">-L. {Number(line.eff_rap || 0).toLocaleString('es-HN')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Neto</div>
                    <div className="text-green-300 font-medium">L. {Number(line.eff_neto || 0).toLocaleString('es-HN')}</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => generatePDF(
                      `${line.payroll_runs.year}-${String(line.payroll_runs.month).padStart(2, '0')}`,
                      line.payroll_runs.quincena
                    )}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                  >
                    📄 PDF
                  </button>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface EmployeeSession {
  sessionToken: string
  employee: {
    id: string
    name: string
    dni_masked: string
    role: string
    department?: string
  }
  expiresAt: string
}

interface EmployeeProfile {
  employee: {
    id: string
    name: string
    dni_masked: string
    role: string
    email?: string
    phone?: string
    hire_date?: string
    department?: {
      id: string
      name: string
    }
    work_schedule?: {
      id: string
      name: string
      [key: string]: any
    }
    base_salary_masked: boolean
    status: string
  }
}

interface AttendanceSummary {
  summary: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    totalHours: number
    averageHours: number
  }
}

interface PermissionsSummary {
  summary: {
    totalPermissions: number
    permissionsThisMonth: number
    hoursUsed: number
    daysUsed: number
  }
}

interface RecentAttendanceRow {
  id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string | null
}

interface VacationSummary {
  entitledDays: number
  usedDaysThisYear: number
  remainingDays: number
  source: 'leave_types' | 'default'
}

export default function EmployeePortal() {
  // Use same auth system as admin portal
  const { user, session, logout } = useAuth()
  const { addNotification } = useNotificationContext()
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null)
  const [permissionsSummary, setPermissionsSummary] = useState<PermissionsSummary | null>(null)
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendanceRow[]>([])
  const [vacationSummary, setVacationSummary] = useState<VacationSummary | null>(null)
  const [performanceEvaluations, setPerformanceEvaluations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'permissions' | 'payroll' | 'performance'>('profile')
  const [showPermissionForm, setShowPermissionForm] = useState(false)
  const [isSubmittingPermission, setIsSubmittingPermission] = useState(false)
  const [fabMenuOpen, setFabMenuOpen] = useState(false)
  const [fabBusy, setFabBusy] = useState(false)
  const fabWrapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  // Check if user is employee
  const isEmployee = user?.user_metadata?.role === 'employee'

  // Check for existing session on load
  useEffect(() => {
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    // No need for custom session checking - useAuth handles this
    setLoading(false)
  }
  const fetchEmployeeData = useCallback(async () => {
    if (!user || !isEmployee) return

    try {
      // Fetch all dashboard data in one unified call
      const dashboardResponse = await fetch('/api/employees/dashboard', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json()
        
        
        // Set profile data with proper structure
        setProfile({
          employee: dashboardData.employee
        })
        
        // Set attendance summary with proper structure
        setAttendanceSummary(dashboardData.attendance_summary)
        
        // Set permissions summary with proper structure
        setPermissionsSummary(dashboardData.permissions_summary)

        setRecentAttendance(dashboardData.recent_attendance || [])
        setVacationSummary(dashboardData.vacation_summary || null)
        
      } else {
        const errorData = await dashboardResponse.text()
        console.error('Failed to fetch dashboard data:', {
          status: dashboardResponse.status,
          error: errorData
        })
      }

      // Performance evaluations (completed, read-only)
      try {
        const perfRes = await fetch('/api/employees/me/performance-evaluations', {
          credentials: 'include'
        })
        if (perfRes.ok) {
          const perfData = await perfRes.json()
          setPerformanceEvaluations(perfData.evaluations || [])
        }
      } catch {
        // Non-blocking
      }

    } catch (error) {
      console.error('Error fetching employee data:', error)
    }
  }, [user, isEmployee])

  // Fetch data when session is available
  useEffect(() => {
    if (session) {
      fetchEmployeeData()
    }
  }, [session, fetchEmployeeData])

  const handleLoginSuccess = useCallback((sessionData: EmployeeSession) => {
    clientLogger.info('Employee portal access', {
      employeeId: sessionData.employee.id,
      employeeName: sessionData.employee.name
    })
    
    // Reload page to let useAuth pick up the new Supabase session
    window.location.reload()
  }, [])

  const clearSession = useCallback(() => {
    // Clear employee data - useAuth handles Supabase logout
    localStorage.removeItem('employee_data')
    setProfile(null)
    setAttendanceSummary(null)
    setPermissionsSummary(null)
    setRecentAttendance([])
    setVacationSummary(null)
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      // Use useAuth logout (same as admin portal)
      await logout()
      clearSession()
      router.push('/employees/portal')
    } catch (error) {
      console.error('Logout error:', error)
      clearSession()
      router.reload()
    }
  }, [logout, router, clearSession])

  const closeFabMenu = useCallback(() => setFabMenuOpen(false), [])

  useEffect(() => {
    if (!fabMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = fabWrapRef.current
      if (el && !el.contains(e.target as Node)) closeFabMenu()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [fabMenuOpen, closeFabMenu])

  const getHondurasMonthRange = useCallback(() => {
    const hondurasDateStr = new Date().toLocaleDateString('en-CA', { timeZone: HONDURAS_TIMEZONE })
    const [y, m] = hondurasDateStr.split('-').map((v) => parseInt(v, 10))
    const lastDay = new Date(y, m, 0).getDate()
    const mm = String(m).padStart(2, '0')
    const startDate = `${y}-${mm}-01`
    const endDate = `${y}-${mm}-${String(lastDay).padStart(2, '0')}`
    return { startDate, endDate }
  }, [])

  const handleFabConstancia = useCallback(async () => {
    const employeeId = user?.user_metadata?.employee_id as string | undefined
    if (!employeeId) {
      addNotification({
        type: 'error',
        title: 'Constancia',
        message: 'No se encontró el empleado vinculado a su cuenta.',
        module: 'system',
      })
      setFabMenuOpen(false)
      return
    }
    setFabBusy(true)
    try {
      const response = await fetch('/api/reports/export-work-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
        credentials: 'include',
        body: JSON.stringify({
          employeeId,
          format: 'pdf',
          purpose: 'Constancia de trabajo',
          certificateType: 'general',
          includeDeductions: true,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          (err as { message?: string }).message ||
            (err as { error?: string }).error ||
            'No se pudo generar el PDF'
        )
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `constancia_trabajo_${employeeId.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      addNotification({
        type: 'success',
        title: 'Constancia',
        message: 'PDF descargado correctamente.',
        module: 'system',
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Inténtelo de nuevo.'
      addNotification({ type: 'error', title: 'Constancia', message, module: 'system' })
    } finally {
      setFabBusy(false)
      setFabMenuOpen(false)
    }
  }, [user, addNotification])

  const handleFabAttendanceReport = useCallback(async () => {
    const employeeId = user?.user_metadata?.employee_id as string | undefined
    if (!employeeId) {
      addNotification({
        type: 'error',
        title: 'Reporte',
        message: 'No se encontró el empleado vinculado a su cuenta.',
        module: 'system',
      })
      setFabMenuOpen(false)
      return
    }
    const { startDate, endDate } = getHondurasMonthRange()
    setFabBusy(true)
    try {
      const response = await fetch('/api/reports/export-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          startDate,
          endDate,
          formato: 'pdf',
          employee_id: employeeId,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          (err as { message?: string }).message ||
            (err as { error?: string }).error ||
            'No se pudo generar el reporte'
        )
      }
      const blob = await response.blob()
      const cd = response.headers.get('Content-Disposition')
      let filename = `reporte-asistencia-${startDate}-${endDate}.pdf`
      const m = cd && cd.match(/filename="?([^";]+)"?/i)
      if (m?.[1]) filename = m[1].trim()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      addNotification({
        type: 'success',
        title: 'Reporte de asistencia',
        message: 'PDF descargado correctamente.',
        module: 'attendance',
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Inténtelo de nuevo.'
      addNotification({
        type: 'error',
        title: 'Reporte de asistencia',
        message,
        module: 'attendance',
      })
    } finally {
      setFabBusy(false)
      setFabMenuOpen(false)
    }
  }, [user, addNotification, getHondurasMonthRange])

  const handleFabVoucherNav = useCallback(() => {
    setActiveTab('payroll')
    setShowPermissionForm(false)
    setFabMenuOpen(false)
  }, [])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificado'
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const d = parseDateOnlyAsHonduras(dateString)
      return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('es-HN', {
        timeZone: HONDURAS_TIMEZONE,
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
    return new Date(dateString).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getAttendancePercentage = () => {
    if (!attendanceSummary?.summary.totalDays) return 0
    return Math.round((attendanceSummary.summary.presentDays / attendanceSummary.summary.totalDays) * 100)
  }

  /** Últimos hasta 5 días con registro en el mes (orden cronológico para el gráfico). */
  const attendanceBarData = useMemo(() => {
    const slice = [...recentAttendance].slice(0, 5)
    return slice
      .reverse()
      .map((r) => {
        let hours = 0
        if (r.check_in && r.check_out) {
          const diff =
            (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / (1000 * 60 * 60)
          hours = Math.round(Math.max(0, diff) * 10) / 10
        }
        const d = parseDateOnlyAsHonduras(r.date)
        const dayLabel = isNaN(d.getTime())
          ? r.date
          : d.toLocaleDateString('es-HN', {
              timeZone: HONDURAS_TIMEZONE,
              weekday: 'short'
            })
        return { day: dayLabel, hours, date: r.date }
      })
  }, [recentAttendance])

  const vacationEntitled = vacationSummary?.entitledDays ?? 15
  const vacationRemaining = vacationSummary?.remainingDays ?? 15
  const vacationProgressPct = vacationEntitled > 0
    ? Math.min(100, Math.round((vacationRemaining / vacationEntitled) * 100))
    : 0

  const handlePermissionSubmit = async (formData: any) => {
    try {
      setIsSubmittingPermission(true)

      let body: string | FormData
      const headers: Record<string, string> = {}
      if (formData.attachment) {
        const fd = new FormData()
        fd.append('leave_type_id', formData.leave_type_id)
        fd.append('start_date', formData.start_date)
        fd.append('end_date', formData.end_date)
        fd.append('reason', formData.reason)
        if (formData.duration_hours) {
          fd.append('duration_hours', formData.duration_hours.toString())
        }
        fd.append('attachment', formData.attachment)
        body = fd
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify({
          leave_type_id: formData.leave_type_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason,
          duration_hours: formData.duration_hours
        })
      }

      const response = await fetch('/api/employees/me/permissions', {
        method: 'POST',
        headers,
        credentials: 'include',
        body
      })

      if (response.ok) {
        await fetchEmployeeData()
        setShowPermissionForm(false)
        alert('✅ Solicitud enviada. Se notificará cuando sea aprobada o rechazada.')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar la solicitud')
      }
    } catch (error) {
      console.error('Error submitting permission:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsSubmittingPermission(false)
    }
  }

  if (loading) {
    return (
      <EmployeePortalShell centered>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
      </EmployeePortalShell>
    )
  }

  if (!session) {
    return (
      <EmployeePortalShell centered>
        <EmployeePasswordLogin onLoginSuccess={handleLoginSuccess} />
      </EmployeePortalShell>
    )
  }

  return (
    <EmployeePortalShell showAppBar={false}>
      {/* Header */}
      <div className="glass-modern border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Portal de Empleados</h1>
                <p className="text-sm text-white/70">Humano SISU</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationBell className="hidden sm:block" />
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.user_metadata?.full_name || 'Empleado'}</p>
                <p className="text-xs text-white/70">{user?.user_metadata?.role || 'employee'}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Bienvenido, {user?.user_metadata?.full_name?.split(' ')[0] || 'Empleado'}
          </h2>
          <p className="text-white/70">
            Acceda a su información personal, asistencia y más.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card variant="liquid">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Asistencia del Mes</p>
                  <p className="text-2xl font-bold text-white">
                    {getAttendancePercentage()}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CalendarDaysIcon className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="liquid">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Días Trabajados</p>
                  <p className="text-2xl font-bold text-white">
                    {attendanceSummary?.summary.presentDays || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="liquid">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Permisos del Mes</p>
                  <p className="text-2xl font-bold text-white">
                    {permissionsSummary?.summary.permissionsThisMonth || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="liquid">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Horas Totales</p>
                  <p className="text-2xl font-bold text-white">
                    {Math.round((attendanceSummary?.summary.totalHours || 0) * 10) / 10}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === MEJORA 4: MINI GRÁFICOS RECHARTS === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card variant="liquid">
            <CardHeader>
              <CardTitle className="text-lg">Distribución de Asistencia (mes)</CardTitle>
            </CardHeader>
            <CardContent className="h-72 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Presente', value: attendanceSummary?.summary.presentDays || 0, fill: '#10b981' },
                      { name: 'Ausente', value: attendanceSummary?.summary.absentDays || 0, fill: '#ef4444' },
                      { name: 'Tardanza', value: attendanceSummary?.summary.lateDays || 0, fill: '#eab308' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                  />
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card variant="liquid">
            <CardHeader>
              <CardTitle className="text-lg">Horas trabajadas (días recientes)</CardTitle>
              <CardDescription className="text-gray-400">
                Hasta 5 días con registro en el mes actual
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72 pt-2">
              {attendanceBarData.length === 0 ? (
                <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-400">
                  Sin registros de asistencia recientes en el mes
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="day" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* === MEJORA 1: BALANCES GRANDES (datos del dashboard) === */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card variant="liquid" className="border-emerald-400/30">
            <CardContent className="p-6 text-center">
              <div className="flex justify-between items-start">
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm text-emerald-300">Vacaciones restantes</p>
                  <p className="text-5xl font-bold text-emerald-400 mt-2">
                    {vacationRemaining}
                  </p>
                  <p className="text-xs text-emerald-400">
                    de {vacationEntitled} días · usados {vacationSummary?.usedDaysThisYear ?? 0} este año
                  </p>
                  {vacationSummary?.source === 'default' && (
                    <p className="text-xs text-emerald-200/70 mt-2">
                      Sin tipo «Vacaciones» en la empresa; se muestra cupo referencia.
                    </p>
                  )}
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${vacationProgressPct}%` }}
                    />
                  </div>
                </div>
                <CalendarDaysIcon className="h-10 w-10 text-emerald-400/30 shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card variant="liquid" className="border-orange-400/30">
            <CardContent className="p-6 text-center">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-orange-300">Permisos usados este mes</p>
                  <p className="text-5xl font-bold text-orange-400 mt-2">
                    {permissionsSummary?.summary.permissionsThisMonth || 0}
                  </p>
                </div>
                <DocumentTextIcon className="h-10 w-10 text-orange-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card variant="liquid" className="border-blue-400/30">
            <CardContent className="p-6 text-center">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-blue-300">% Asistencia</p>
                  <p className="text-5xl font-bold text-blue-400 mt-2">
                    {getAttendancePercentage()}%
                  </p>
                </div>
                <ChartBarIcon className="h-10 w-10 text-blue-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card variant="liquid" className="border-purple-400/30">
            <CardContent className="p-6 text-center">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-purple-300">Próximo pago</p>
                  <p className="text-3xl font-bold text-purple-400 mt-2">15 Mayo</p>
                </div>
                <CurrencyDollarIcon className="h-10 w-10 text-purple-400/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          {[
            { id: 'profile', label: 'Perfil', icon: UserIcon },
            { id: 'attendance', label: 'Asistencia', icon: ClockIcon },
            { id: 'permissions', label: 'Permisos', icon: DocumentTextIcon },
            { id: 'payroll', label: 'Recibos de pago', icon: CurrencyDollarIcon },
            { id: 'performance', label: 'Desempeño', icon: ChartBarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'profile' && (
            <Card variant="liquid">
              <CardHeader>
                <CardTitle className="text-white">Información Personal</CardTitle>
                <CardDescription className="text-gray-300">
                  Sus datos personales y de contacto
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Nombre Completo</label>
                      <p className="text-white font-medium">{profile.employee?.name || 'No disponible'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">DNI</label>
                      <p className="text-white font-medium">{profile.employee?.dni_masked || 'No disponible'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Cargo</label>
                      <p className="text-white font-medium">{profile.employee?.role || 'No especificado'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Departamento</label>
                      <p className="text-white font-medium">
                        {profile.employee?.department?.name || 'Sin asignar'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Estado</label>
                      <p className="text-white font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          profile.employee?.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {profile.employee?.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Email</label>
                      <p className="text-white font-medium">{profile.employee?.email || 'No especificado'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Teléfono</label>
                      <p className="text-white font-medium">{profile.employee?.phone || 'No especificado'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Fecha de Contratación</label>
                      <p className="text-white font-medium">{formatDate(profile.employee?.hire_date)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-400">Horario de Trabajo</label>
                      <p className="text-white font-medium">
                        {profile.employee?.work_schedule?.name || 'Sin asignar'}
                      </p>
                      {profile.employee?.work_schedule && (
                        <div className="mt-2 text-sm text-gray-400">
                          <p>Lun-Vie: {profile.employee.work_schedule.monday_start || 'N/A'} - {profile.employee.work_schedule.monday_end || 'N/A'}</p>
                          {profile.employee.work_schedule.saturday_start && (
                            <p>Sáb: {profile.employee.work_schedule.saturday_start} - {profile.employee.work_schedule.saturday_end}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'attendance' && (
            <Card variant="liquid">
              <CardHeader>
                <CardTitle className="text-white">Asistencia</CardTitle>
                <CardDescription className="text-gray-300">
                  Registro de asistencia del mes actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceSummary ? (
                  <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {attendanceSummary.summary.presentDays}
                        </div>
                        <div className="text-sm text-gray-400">Días Presentes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">
                          {attendanceSummary.summary.absentDays}
                        </div>
                        <div className="text-sm text-gray-400">Ausencias</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          {attendanceSummary.summary.lateDays}
                        </div>
                        <div className="text-sm text-gray-400">Tardanzas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {Math.round(attendanceSummary.summary.averageHours * 10) / 10}h
                        </div>
                        <div className="text-sm text-gray-400">Promedio Diario</div>
                      </div>
                    </div>
                    
                    {/* Recent Records */}
                    <div className="space-y-2">
                      <h4 className="text-white font-medium">Registros Recientes</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {/* Show actual attendance records if available */}
                        <AttendanceRecordsList employeeId={user?.user_metadata?.employee_id} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-400"></div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'permissions' && (
            <Card variant="liquid">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Permisos</CardTitle>
                    <CardDescription className="text-gray-300">
                      Registre permisos pre-autorizados y consulte su historial
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowPermissionForm(true)}
                    className="bg-brand-600 hover:bg-brand-700"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Nueva Solicitud
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showPermissionForm ? (
                  <EmployeePermissionForm
                    onSubmit={handlePermissionSubmit}
                    onCancel={() => setShowPermissionForm(false)}
                    isLoading={isSubmittingPermission}
                  />
                ) : (
                  <div className="space-y-6">
                    {/* Permissions Summary */}
                    {permissionsSummary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-400">
                            {permissionsSummary.summary.totalPermissions}
                          </div>
                          <div className="text-sm text-gray-400">Total Permisos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {permissionsSummary.summary.permissionsThisMonth}
                          </div>
                          <div className="text-sm text-gray-400">Este Mes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {permissionsSummary.summary.hoursUsed}h
                          </div>
                          <div className="text-sm text-gray-400">Horas Usadas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">
                            {permissionsSummary.summary.daysUsed}
                          </div>
                          <div className="text-sm text-gray-400">Días Usados</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Permission History */}
                    <div className="space-y-2">
                      <h4 className="text-white font-medium">Historial de Permisos</h4>
                      <EmployeePermissionHistory employeeId={user?.user_metadata?.employee_id} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'payroll' && (
            <Card variant="liquid">
              <CardHeader>
                <CardTitle className="text-white">Recibos de pago</CardTitle>
                <CardDescription className="text-gray-300">
                  Información sobre sus pagos y deducciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PayrollSection
                  employeeId={user?.user_metadata?.employee_id}
                  addNotification={addNotification}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'performance' && (
            <Card variant="liquid">
              <CardHeader>
                <CardTitle className="text-white">Desempeño</CardTitle>
                <CardDescription className="text-gray-300">
                  Evaluaciones finalizadas por ciclo (solo lectura).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceEvaluations.length === 0 ? (
                  <div className="text-center py-8 text-gray-300">
                    No hay evaluaciones de desempeño finalizadas.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {performanceEvaluations.map((ev: any) => (
                      <div key={ev.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-white font-medium">
                            {ev.cycle_start} → {ev.cycle_end}
                          </div>
                          <div className="text-sm text-gray-300">
                            Score: {ev.overall_score == null ? '—' : Number(ev.overall_score).toFixed(3)}
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {(ev.items || []).slice(0, 10).map((it: any) => (
                            <div key={it.id} className="rounded-md bg-white/5 border border-white/10 p-3">
                              <div className="text-sm text-white">{it.function || '—'}</div>
                              <div className="mt-1 text-xs text-gray-300">KR: {it.indicator || '—'}</div>
                              <div className="mt-1 text-xs text-gray-300">
                                Rating: {it.rating || '—'} {it.weight ? `· Peso ${it.weight}%` : ''}
                              </div>
                              {it.comment && (
                                <div className="mt-2 text-xs text-gray-200">Comentario: {it.comment}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Menú rápido: documentos y reportes (la solicitud de permiso sigue en la pestaña Permisos) */}
        <div
          ref={fabWrapRef}
          className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 md:bottom-10 md:right-10"
        >
          {fabMenuOpen && (
            <div
              role="menu"
              className="mb-1 min-w-[14rem] rounded-xl border border-white/15 bg-slate-950/95 py-1 shadow-2xl backdrop-blur-md"
            >
              <button
                type="button"
                role="menuitem"
                disabled={fabBusy}
                onClick={() => void handleFabConstancia()}
                className="flex w-full items-center px-4 py-3 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                Constancia de trabajo
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={fabBusy}
                onClick={handleFabVoucherNav}
                className="flex w-full items-center px-4 py-3 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                Voucher de pago
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={fabBusy}
                onClick={() => void handleFabAttendanceReport()}
                className="flex w-full items-center px-4 py-3 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                Reporte de asistencia
              </button>
            </div>
          )}
          <Button
            type="button"
            onClick={() => setFabMenuOpen((o) => !o)}
            className="h-14 w-14 rounded-2xl bg-brand-600 hover:bg-brand-700 shadow-2xl flex items-center justify-center text-white text-3xl"
            aria-label={fabMenuOpen ? 'Cerrar menú de acciones' : 'Abrir menú de acciones'}
            aria-expanded={fabMenuOpen}
            aria-haspopup="menu"
          >
            {fabBusy ? (
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              '+'
            )}
          </Button>
        </div>
      </div>
    </EmployeePortalShell>
  )
}
