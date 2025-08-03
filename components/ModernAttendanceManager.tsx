import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ModernDashboardLayout from './ModernDashboardLayout'
import { StatsCard, MetricCard } from './ui/modern-cards'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { 
  Clock, 
  UserCheck, 
  UserX, 
  AlertCircle, 
  CheckCircle,
  Timer,
  Calendar
} from 'lucide-react'

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  check_in: string | null
  check_out: string | null
  late_minutes: number
  early_departure_minutes: number
  justification: string | null
  status: string
  employees: {
    name: string
    employee_code: string
    dni: string
  }
}

export default function ModernAttendanceManager() {
  const [last5, setLast5] = useState('')
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [requireJustification, setRequireJustification] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [currentEmployee, setCurrentEmployee] = useState<any>(null)
  const [todayStats, setTodayStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    early: 0
  })

  useEffect(() => {
    fetchTodayAttendance()
    calculateTodayStats()
  }, [])

  const fetchTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        employees:employee_id (
          name,
          employee_code,
          dni
        )
      `)
      .eq('date', today)
      .order('check_in', { ascending: false })

    if (data) {
      setAttendanceRecords(data)
    }
  }

  const calculateTodayStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: records } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', today)

    if (records) {
      const present = records.filter(r => r.check_in).length
      const late = records.filter(r => r.late_minutes > 0).length
      const early = records.filter(r => r.early_departure_minutes > 0).length
      
      setTodayStats({
        present,
        absent: 0, // Calculate based on total employees
        late,
        early
      })
    }
  }

  const handleCheckIn = async () => {
    if (!last5 || last5.length !== 5) {
      showMessage('Por favor ingresa los últimos 5 dígitos del DNI', 'error')
      return
    }

    setLoading(true)
    
    try {
      // Check if justification is required and provided
      if (requireJustification && !justification.trim()) {
        showMessage('Se requiere justificación para este registro', 'error')
        setLoading(false)
        return
      }

      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          last5Digits: last5,
          justification: justification.trim() || null
        }),
      })

      const result = await response.json()

      if (response.ok) {
        showMessage('Asistencia registrada exitosamente', 'success')
        setLast5('')
        setJustification('')
        setRequireJustification(false)
        setCurrentEmployee(null)
        fetchTodayAttendance()
        calculateTodayStats()
      } else {
        if (result.requireJustification) {
          setRequireJustification(true)
          setCurrentEmployee(result.employee)
          showMessage('Se detectó llegada tarde. Se requiere justificación.', 'info')
        } else {
          showMessage(result.error || 'Error al registrar asistencia', 'error')
        }
      }
    } catch (error) {
      showMessage('Error de conexión', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'N/A'
    return new Date(timeString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.late_minutes > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-400/10 text-orange-400">
          <AlertCircle className="w-3 h-3 mr-1" />
          Tarde ({record.late_minutes}min)
        </span>
      )
    }
    if (record.check_in && record.check_out) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-400/10 text-green-400">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completo
        </span>
      )
    }
    if (record.check_in) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">
          <Timer className="w-3 h-3 mr-1" />
          En oficina
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-400/10 text-red-400">
        <UserX className="w-3 h-3 mr-1" />
        Ausente
      </span>
    )
  }

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Control de Asistencia</h1>
            <p className="text-zinc-400 mt-1">
              Gestiona el registro de entrada y salida de empleados
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-zinc-400">Fecha actual</div>
            <div className="text-lg font-semibold text-zinc-100">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard
            title="Presentes Hoy"
            value={todayStats.present}
            icon={UserCheck}
            description="Empleados que han marcado entrada"
          />
          <StatsCard
            title="Llegadas Tarde"
            value={todayStats.late}
            icon={AlertCircle}
            description="Empleados con retraso"
          />
          <StatsCard
            title="En Oficina"
            value={attendanceRecords.filter(r => r.check_in && !r.check_out).length}
            icon={Timer}
            description="Empleados actualmente en oficina"
          />
          <StatsCard
            title="Salidas Tempranas"
            value={todayStats.early}
            icon={Clock}
            description="Empleados con salida anticipada"
          />
        </div>

        {/* Check-in Form */}
        <MetricCard title="Registrar Asistencia">
          <div className="space-y-4">
            {message && (
              <div className={`p-4 rounded-lg ${
                messageType === 'success' ? 'bg-green-400/10 text-green-400 border border-green-400/20' :
                messageType === 'error' ? 'bg-red-400/10 text-red-400 border border-red-400/20' :
                'bg-blue-400/10 text-blue-400 border border-blue-400/20'
              }`}>
                {message}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Últimos 5 dígitos del DNI
                </label>
                <Input
                  type="text"
                  placeholder="12345"
                  value={last5}
                  onChange={(e) => setLast5(e.target.value.slice(0, 5))}
                  maxLength={5}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:border-zinc-600"
                />
              </div>

              {requireJustification && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Justificación (requerida)
                  </label>
                  <Input
                    type="text"
                    placeholder="Motivo del retraso..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:border-zinc-600"
                  />
                </div>
              )}
            </div>

            {currentEmployee && (
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <p className="text-zinc-300">
                  <strong>Empleado:</strong> {currentEmployee.name} ({currentEmployee.employee_code})
                </p>
              </div>
            )}

            <Button
              onClick={handleCheckIn}
              disabled={loading || !last5}
              className="w-full md:w-auto"
              variant="modern"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Registrar Asistencia
                </>
              )}
            </Button>
          </div>
        </MetricCard>

        {/* Today's Records */}
        <MetricCard title="Registros de Hoy">
          <div className="space-y-4">
            {attendanceRecords.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay registros de asistencia para hoy</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Empleado</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Código</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Entrada</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Salida</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Estado</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Justificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record) => (
                      <tr key={record.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="py-3 px-4 text-sm text-zinc-100">
                          {record.employees?.name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-300">
                          {record.employees?.employee_code || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-300">
                          {formatTime(record.check_in)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-300">
                          {formatTime(record.check_out)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {getStatusBadge(record)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400 max-w-xs truncate">
                          {record.justification || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </MetricCard>
      </div>
    </ModernDashboardLayout>
  )
}
