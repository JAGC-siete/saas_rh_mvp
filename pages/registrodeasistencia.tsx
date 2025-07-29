import { useRouter } from 'next/router'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { CheckCircle, AlertCircle, Clock, User } from 'lucide-react'

interface EmployeeInfo {
  id: string
  name: string
  dni: string
  position: string
  checkin_time: string
  checkout_time: string
  company_name: string
}

interface AttendanceStatus {
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  checkInTime?: string
  checkOutTime?: string
}

export default function RegistroDeAsistencia() {
  const router = useRouter()
  const [last5, setLast5] = useState('')
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [requireJustification, setRequireJustification] = useState(false)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null)
  const [currentTime, setCurrentTime] = useState('')

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('es-HN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const lookupEmployee = async (dniLast5: string) => {
    try {
      const response = await fetch('/api/attendance/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last5: dniLast5 })
      })

      const data = await response.json()

      if (response.ok) {
        setEmployee(data.employee)
        setAttendanceStatus(data.attendance)
        return true
      } else {
        setMessage(data.error || 'Empleado no encontrado')
        setMessageType('error')
        return false
      }
    } catch (error) {
      setMessage('Error de conexión')
      setMessageType('error')
      return false
    }
  }

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!/^\d{5}$/.test(last5)) {
      setMessage('Ingrese exactamente 5 dígitos del DNI')
      setMessageType('error')
      return
    }

    setLoading(true)
    const found = await lookupEmployee(last5)
    setLoading(false)

    if (!found) {
      setEmployee(null)
      setAttendanceStatus(null)
    }
  }

  const handleAttendance = async () => {
    if (!employee) return

    console.log('🚀 Iniciando handleAttendance, loading actual:', loading)
    setLoading(true)
    setMessage('Procesando registro...')
    setMessageType('info')

    try {
      console.log('🔄 Enviando registro de asistencia...')
      const response = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          last5, 
          justification: requireJustification ? justification : undefined 
        })
      })

      const data = await response.json()
      console.log('📥 Respuesta del API:', { status: response.status, data })

      if (response.status === 422 && data.requireJustification) {
        console.log('⚠️ Requiere justificación')
        setRequireJustification(true)
        setMessage(data.message)
        setMessageType('warning')
      } else if (response.ok) {
        console.log('✅ Registro exitoso')
        setMessage(data.message)
        setMessageType('success')
        setRequireJustification(false)
        setJustification('')
        // Refresh attendance status
        await lookupEmployee(last5)
        // Clear form after delay
        setTimeout(() => {
          setLast5('')
          setEmployee(null)
          setAttendanceStatus(null)
          setMessage('')
        }, 4000)
      } else {
        console.log('❌ Error en registro:', data)
        setMessage(data.message || data.error || 'Error registrando asistencia')
        setMessageType('error')
      }
    } catch (error) {
      console.error('💥 Error de conexión:', error)
      setMessage('Error registrando asistencia')
      setMessageType('error')
    }
    console.log('🏁 Finalizando handleAttendance')
    setLoading(false)
    console.log('🔄 Loading establecido en false')
  }

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'info':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <Clock className="h-5 w-5 text-blue-600" />
    }
  }

  const getMessageStyle = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getNextAction = () => {
    if (!employee) return 'Buscar empleado'
    if (!attendanceStatus?.hasCheckedIn) return 'Registrar entrada'
    if (!attendanceStatus?.hasCheckedOut) return 'Registrar salida'
    return 'Asistencia completada'
  }

  return (
    <>
      <Head>
        <title>Control de Asistencia - HR System</title>
        <meta name="description" content="Sistema de registro de asistencia por DNI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Control de Asistencia
            </h1>
            <p className="text-gray-600">
              Registra tu entrada y salida con tu DNI
            </p>
            <div className="mt-4 text-2xl font-mono text-blue-600 font-semibold">
              {currentTime}
            </div>
          </div>

          {/* Main Card */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-gray-800">
                <User className="w-5 h-5" />
                Identificación
              </CardTitle>
              <CardDescription className="text-gray-600">
                Ingresa los últimos 5 dígitos de tu DNI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* DNI Input */}
              <div>
                <label htmlFor="last5" className="block text-sm font-medium text-gray-700 mb-2">
                  Últimos 5 dígitos del DNI
                </label>
                <Input
                  id="last5"
                  type="text"
                  maxLength={5}
                  pattern="[0-9]{5}"
                  value={last5}
                  onChange={(e) => setLast5(e.target.value.replace(/\D/g, ''))}
                  placeholder="00731"
                  className="text-center text-xl font-mono h-12 bg-gray-50 border-gray-300"
                  required
                  disabled={loading}
                />
              </div>

              {/* Search Button */}
              <Button 
                onClick={handleLookup}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium" 
                disabled={loading || last5.length !== 5}
              >
                {loading ? 'Buscando...' : 'Buscar Empleado'}
              </Button>

              {/* Employee Info */}
              {employee && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.position}</p>
                      <p className="text-xs text-gray-500">DNI: {employee.dni}</p>
                    </div>
                  </div>
                  
                  {/* Attendance Status */}
                  {attendanceStatus && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className={`p-3 rounded-lg text-center ${
                        attendanceStatus.hasCheckedIn 
                          ? 'bg-green-100 border border-green-200' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <div className="text-sm font-medium text-gray-700">Entrada</div>
                        <div className={`text-lg font-bold ${
                          attendanceStatus.hasCheckedIn ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {attendanceStatus.hasCheckedIn ? '✅ Registrada' : '⏳ Pendiente'}
                        </div>
                        {attendanceStatus.checkInTime && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(attendanceStatus.checkInTime).toLocaleTimeString('es-HN')}
                          </div>
                        )}
                      </div>
                      
                      <div className={`p-3 rounded-lg text-center ${
                        attendanceStatus.hasCheckedOut 
                          ? 'bg-green-100 border border-green-200' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <div className="text-sm font-medium text-gray-700">Salida</div>
                        <div className={`text-lg font-bold ${
                          attendanceStatus.hasCheckedOut ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {attendanceStatus.hasCheckedOut ? '✅ Registrada' : '⏳ Pendiente'}
                        </div>
                        {attendanceStatus.checkOutTime && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(attendanceStatus.checkOutTime).toLocaleTimeString('es-HN')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Justification */}
              {employee && requireJustification && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">Justificación Requerida</h3>
                  <p className="text-sm text-yellow-700 mb-3">Has llegado tarde. Por favor explica el motivo.</p>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explica el motivo de tu retraso..."
                    className="min-h-[80px] bg-white"
                    required
                  />
                </div>
              )}

              {/* Action Button */}
              {employee && (
                <div className="mt-6">
                  <Button
                    onClick={handleAttendance}
                    disabled={loading}
                    className={`w-full h-12 text-lg font-semibold ${
                      attendanceStatus?.hasCheckedOut 
                        ? 'bg-gray-500 hover:bg-gray-600' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Procesando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        {getNextAction()}
                      </div>
                    )}
                  </Button>
                  
                  {/* Progress Indicator */}
                  {employee && (
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                      <span>Progreso del día:</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          attendanceStatus?.hasCheckedIn ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-xs">Entrada</span>
                        <div className="w-8 h-0.5 bg-gray-300"></div>
                        <div className={`w-3 h-3 rounded-full ${
                          attendanceStatus?.hasCheckedOut ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-xs">Salida</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message */}
              {message && (
                <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${getMessageStyle()}`}>
                  {getMessageIcon()}
                  <p className={`text-sm font-medium`}>{message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            <p>¿Necesitas ayuda? Contacta a Recursos Humanos</p>
            <button 
              onClick={() => router.push('/')}
              className="text-blue-600 hover:underline mt-2"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
