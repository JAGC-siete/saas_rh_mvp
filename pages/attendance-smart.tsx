import { useState, useEffect } from 'react'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { AlertCircle, Clock, CheckCircle, User, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '../components/ProtectedRoute'

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

interface WeeklyPattern {
  lateDays: number
  earlyDays: number
  onTimeDays: number
  totalDays: number
}

type PunctualityStatus = 'early' | 'on-time' | 'late'
type BehavioralPattern = 'consistent-early' | 'consistent-ontime' | 'repeated-tardiness' | 'improving' | 'normal'

export default function AttendancePage() {
  return (
    <ProtectedRoute>
      <AttendancePageContent />
    </ProtectedRoute>
  )
}

function AttendancePageContent() {
  const [last5, setLast5] = useState('')
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [requireJustification, setRequireJustification] = useState(false)
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [punctualityStatus, setPunctualityStatus] = useState<PunctualityStatus | null>(null)
  const [weeklyPattern, setWeeklyPattern] = useState<WeeklyPattern | null>(null)
  const [behavioralPattern, setBehavioralPattern] = useState<BehavioralPattern | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')

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

  const calculatePunctuality = (currentTime: string, expectedTime: string): { 
    status: PunctualityStatus, 
    minutesDiff: number 
  } => {
    const [currentHour, currentMin] = currentTime.split(':').map(Number)
    const [expectedHour, expectedMin] = expectedTime.split(':').map(Number)
    
    const currentMinutes = currentHour * 60 + currentMin
    const expectedMinutes = expectedHour * 60 + expectedMin
    const minutesDiff = currentMinutes - expectedMinutes

    if (minutesDiff <= -5) return { status: 'early', minutesDiff: Math.abs(minutesDiff) }
    if (minutesDiff <= 5) return { status: 'on-time', minutesDiff: Math.abs(minutesDiff) }
    return { status: 'late', minutesDiff }
  }

  const getWeeklyPattern = async (employeeId: string): Promise<WeeklyPattern> => {
    try {
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const response = await fetch('/api/attendance/weekly-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId, 
          startDate: startOfWeek.toISOString().split('T')[0] 
        })
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error fetching weekly pattern:', error)
    }

    return { lateDays: 0, earlyDays: 0, onTimeDays: 0, totalDays: 0 }
  }

  const detectBehavioralPattern = (pattern: WeeklyPattern): BehavioralPattern => {
    const { lateDays, earlyDays, onTimeDays, totalDays } = pattern

    if (totalDays < 3) return 'normal'
    
    if (lateDays >= 3) return 'repeated-tardiness'
    if (earlyDays >= 4 || (earlyDays + onTimeDays >= 4 && lateDays === 0)) return 'consistent-early'
    if (onTimeDays >= 4 && lateDays <= 1) return 'consistent-ontime'
    if (lateDays <= 1 && totalDays >= 4) return 'improving'
    
    return 'normal'
  }

  const generateFeedbackMessage = (
    punctuality: PunctualityStatus, 
    pattern: BehavioralPattern,
    isCheckOut: boolean = false
  ): string => {
    if (isCheckOut) {
      const checkOutMessages = [
        '🏁 ¡Salida registrada! Que tengas un excelente día.',
        '✅ Salida exitosa. ¡Nos vemos mañana!',
        '🌟 Día de trabajo completado. ¡Descansa bien!'
      ]
      return checkOutMessages[Math.floor(Math.random() * checkOutMessages.length)]
    }

    // Check-in feedback based on punctuality
    let baseMessage = ''
    switch (punctuality) {
      case 'early':
        baseMessage = '🎉 ¡Eres un empleado ejemplar! Llegaste temprano.'
        break
      case 'on-time':
        baseMessage = '✅ ¡Perfecto! Llegaste puntualmente.'
        break
      case 'late':
        baseMessage = '⏰ Por favor sé puntual. Explícanos qué pasó.'
        break
    }

    // Add behavioral pattern feedback
    let patternMessage = ''
    switch (pattern) {
      case 'repeated-tardiness':
        patternMessage = ' 📊 Hemos notado tardanzas recurrentes. Por favor mejora tu puntualidad.'
        break
      case 'consistent-early':
        patternMessage = ' 🏆 ¡Excelente consistencia! Mantén esa disciplina.'
        break
      case 'consistent-ontime':
        patternMessage = ' ⭐ ¡Fantástica puntualidad! Sigue así.'
        break
      case 'improving':
        patternMessage = ' 📈 ¡Se nota tu mejora! Continúa con esa actitud.'
        break
      default:
        patternMessage = ''
    }

    return baseMessage + patternMessage
  }

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
        
        // Get weekly pattern for behavioral analysis
        const pattern = await getWeeklyPattern(data.employee.id)
        setWeeklyPattern(pattern)
        setBehavioralPattern(detectBehavioralPattern(pattern))
        
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
      setWeeklyPattern(null)
      setBehavioralPattern(null)
    }
  }

  const handleAttendance = async () => {
    if (!employee) return

    setLoading(true)
    setMessage('Procesando registro...')
    setMessageType('info')

    try {
      // Determine punctuality for check-in
      if (!attendanceStatus?.hasCheckedIn && employee.checkin_time) {
        const punctuality = calculatePunctuality(currentTime, employee.checkin_time)
        setPunctualityStatus(punctuality.status)
      }

      const response = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          last5, 
          justification: requireJustification ? justification : undefined 
        })
      })

      const data = await response.json()

      if (response.status === 422 && data.requireJustification) {
        setRequireJustification(true)
        setMessage(data.message)
        setMessageType('warning')
        
        // Generate feedback for late arrival
        if (punctualityStatus && behavioralPattern) {
          const feedback = generateFeedbackMessage(punctualityStatus, behavioralPattern)
          setFeedbackMessage(feedback)
        }
      } else if (response.ok) {
        const isCheckOut = data.type === 'check-out'
        
        // Generate personalized feedback
        if (punctualityStatus && behavioralPattern) {
          const feedback = generateFeedbackMessage(punctualityStatus, behavioralPattern, isCheckOut)
          setFeedbackMessage(feedback)
        } else {
          setFeedbackMessage(data.message)
        }
        
        setMessage(data.message)
        setMessageType('success')
        setRequireJustification(false)
        setJustification('')
        
        // Refresh attendance status and patterns
        await lookupEmployee(last5)
        
        // Clear form after delay
        setTimeout(() => {
          setLast5('')
          setEmployee(null)
          setAttendanceStatus(null)
          setWeeklyPattern(null)
          setBehavioralPattern(null)
          setPunctualityStatus(null)
          setFeedbackMessage('')
          setMessage('')
        }, 6000)
      } else {
        setMessage(data.error || data.message || 'Error al registrar')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Error de conexión')
      setMessageType('error')
    }

    setLoading(false)
  }

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default: return <Clock className="w-5 h-5 text-blue-500" />
    }
  }

  const getNextAction = () => {
    if (!attendanceStatus) return 'Buscar empleado'
    if (!attendanceStatus.hasCheckedIn) return 'Registrar entrada'
    if (!attendanceStatus.hasCheckedOut) return 'Registrar salida'
    return 'Completo por hoy'
  }

  const getBehavioralIcon = (pattern: BehavioralPattern) => {
    switch (pattern) {
      case 'consistent-early':
      case 'consistent-ontime':
        return <Award className="w-5 h-5 text-green-500" />
      case 'repeated-tardiness':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-blue-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <>
      <Head>
        <title>Control de Asistencia Inteligente - HR System</title>
        <meta name="description" content="Sistema inteligente de registro de asistencia con análisis de patrones" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Control de Asistencia
            </h1>
            <p className="text-gray-600">
              Sistema inteligente con análisis de patrones
            </p>
            <div className="mt-4 text-2xl font-mono text-blue-600">
              {currentTime}
            </div>
          </div>

          {/* DNI Lookup Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Identificación
              </CardTitle>
              <CardDescription>
                Ingresa los últimos 5 dígitos de tu DNI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Ej: 12345"
                    value={last5}
                    onChange={(e) => setLast5(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="text-center text-lg font-mono"
                    maxLength={5}
                    disabled={loading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading || last5.length !== 5}
                >
                  {loading ? 'Buscando...' : 'Buscar Empleado'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Employee Info */}
          {employee && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Empleado Encontrado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-3">
                  <p className="font-semibold text-lg">{employee.name}</p>
                  <p className="text-gray-600">{employee.position}</p>
                  <p className="text-sm text-gray-500">{employee.company_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div>
                    <p className="text-gray-500">Entrada:</p>
                    <p className="font-mono">{employee.checkin_time}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Salida:</p>
                    <p className="font-mono">{employee.checkout_time}</p>
                  </div>
                </div>

                {attendanceStatus && (
                  <div className="border-t pt-3 space-y-2 mt-4">
                    <h4 className="font-medium">Estado de Hoy:</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        attendanceStatus.hasCheckedIn ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className="text-sm">
                        Entrada: {attendanceStatus.checkInTime || 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        attendanceStatus.hasCheckedOut ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className="text-sm">
                        Salida: {attendanceStatus.checkOutTime || 'Pendiente'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Weekly Pattern Analysis */}
                {weeklyPattern && behavioralPattern && (
                  <div className="border-t pt-3 mt-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      {getBehavioralIcon(behavioralPattern)}
                      Análisis Semanal
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-green-600 font-bold">{weeklyPattern.earlyDays}</div>
                        <div className="text-gray-500">Temprano</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600 font-bold">{weeklyPattern.onTimeDays}</div>
                        <div className="text-gray-500">Puntual</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-600 font-bold">{weeklyPattern.lateDays}</div>
                        <div className="text-gray-500">Tarde</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attendance Action */}
          {employee && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {getNextAction()}
                </CardTitle>
                <CardDescription>
                  Próxima acción requerida
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getNextAction() !== 'Completo por hoy' && (
                  <Button 
                    onClick={handleAttendance} 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? 'Registrando...' : getNextAction()}
                  </Button>
                )}
                {getNextAction() === 'Completo por hoy' && (
                  <div className="text-center text-green-600 font-medium">
                    ✅ Has completado tu jornada laboral
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Justification Form */}
          {employee && requireJustification && (
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-600">Justificación Requerida</CardTitle>
                <CardDescription>
                  Has llegado tarde. Por favor explica el motivo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Describe brevemente el motivo de tu tardanza..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={handleAttendance}
                    className="w-full"
                    disabled={loading || !justification.trim()}
                  >
                    {loading ? 'Registrando...' : 'Registrar con Justificación'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Message */}
          {feedbackMessage && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="font-medium text-blue-800">{feedbackMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Message */}
          {message && (
            <Card className={`border-l-4 ${
              messageType === 'success' ? 'border-l-green-500' :
              messageType === 'error' ? 'border-l-red-500' :
              messageType === 'warning' ? 'border-l-yellow-500' :
              'border-l-blue-500'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {getMessageIcon()}
                  <p className="flex-1">{message}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
