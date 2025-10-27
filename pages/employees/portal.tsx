import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import EmployeePasswordLogin from '../../components/employee-portal/EmployeePasswordLogin'
import { useAuth } from '../../lib/auth'
// import { useNotificationContext } from '../../components/NotificationProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
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
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('es-HN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    } catch {
      return timeString
    }
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
                    {new Date(record.date).toLocaleDateString('es-HN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    {record.check_in && (
                      <span className="text-sm text-gray-400">
                        Entrada: <span className="text-green-400">{formatTime(record.check_in)}</span>
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
function PayrollSection({ employeeId }: { employeeId?: string }) {
  const [payrollData, setPayrollData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line no-unused-vars
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

  // eslint-disable-next-line no-unused-vars
  const generatePDF = async (periodo: string, quincena: number) => {
    // Mostrar mensaje de funcionalidad en desarrollo
    alert('🚧 Funcionalidad en desarrollo\n\nLa generación de recibos de nómina en PDF estará disponible próximamente.')
    return
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
              // Calcular período y quincena para el PDF
              const periodStart = new Date(record.period_start)
              const periodo = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`                                            
              const quincena = periodStart.getDate() <= 15 ? 1 : 2
              
              return (
                <div key={record.id || index} className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-white font-medium">
                        {new Date(record.period_start).toLocaleDateString('es-HN')} - 
                        {new Date(record.period_end).toLocaleDateString('es-HN')}
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
                      `${new Date(record.period_start).getFullYear()}-${String(new Date(record.period_start).getMonth() + 1).padStart(2, '0')}`,
                      new Date(record.period_start).getDate() <= 15 ? 1 : 2
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

export default function EmployeePortal() {
  // Use same auth system as admin portal
  const { user, session, logout } = useAuth()
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null)
  const [permissionsSummary, setPermissionsSummary] = useState<PermissionsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'permissions' | 'payroll'>('profile')
  const [showPermissionForm, setShowPermissionForm] = useState(false)
  const [isSubmittingPermission, setIsSubmittingPermission] = useState(false)
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
        
      } else {
        const errorData = await dashboardResponse.text()
        console.error('Failed to fetch dashboard data:', {
          status: dashboardResponse.status,
          error: errorData
        })
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificado'
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

  const handlePermissionSubmit = async (formData: any) => {
    try {
      setIsSubmittingPermission(true)
      
      const response = await fetch('/api/employees/me/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        // Refresh dashboard data to update permissions summary
        await fetchEmployeeData()
        setShowPermissionForm(false)
        
        // Show success message (you could add a toast notification here)
        alert('✅ Permiso registrado exitosamente')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al registrar el permiso')
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
      </div>
    )
  }

  if (!session) {
    return <EmployeePasswordLogin onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Portal de Empleados</h1>
                <p className="text-sm text-gray-300">Humano SISU</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.user_metadata?.full_name || 'Empleado'}</p>
                <p className="text-xs text-gray-300">{user?.user_metadata?.role || 'employee'}</p>
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
          <p className="text-gray-300">
            Acceda a su información personal, asistencia y más.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-strong">
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

          <Card className="glass-strong">
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

          <Card className="glass-strong">
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

          <Card className="glass-strong">
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

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          {[
            { id: 'profile', label: 'Mi Perfil', icon: UserIcon },
            { id: 'attendance', label: 'Mi Asistencia', icon: ClockIcon },
            { id: 'permissions', label: 'Mi Permisos', icon: DocumentTextIcon },
            { id: 'payroll', label: 'Mi Nómina', icon: CurrencyDollarIcon }
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
            <Card className="glass-strong">
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
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-white">Mi Asistencia</CardTitle>
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
            <Card className="glass-strong">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Mi Permisos</CardTitle>
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
            <Card className="glass-strong">
              <CardHeader>
                <CardTitle className="text-white">Mi Nómina</CardTitle>
                <CardDescription className="text-gray-300">
                  Información sobre sus pagos y deducciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PayrollSection employeeId={user?.user_metadata?.employee_id} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
