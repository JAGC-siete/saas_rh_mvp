import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { AlertCircle, Clock, CheckCircle, User } from 'lucide-react'

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

    setLoading(true)
    setMessage('Procesando registro...')
    setMessageType('info')

    try {
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
      } else if (response.ok) {
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

  return (
    <>
      <Head>
        <title>Registro de Asistencia - HR System</title>
        <meta name="description" content="Sistema de registro de asistencia por DNI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Control de Asistencia
            </h1>
            <p className="text-gray-600">
              Registra tu entrada y salida con tu DNI
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
                    placeholder="12345"
                    className="text-center text-xl font-mono"
                    required
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
                <CardTitle className="text-green-600">Empleado Encontrado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-lg">{employee.name}</p>
                  <p className="text-gray-600">{employee.position}</p>
                  <p className="text-sm text-gray-500">{employee.company_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <div className="border-t pt-3 space-y-2">
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
              </CardContent>
            </Card>
          )}

          {/* Justification */}
          {employee && requireJustification && (
            <Card>
              <CardHeader>
                <CardTitle className="text-yellow-600">Justificación Requerida</CardTitle>
                <CardDescription>
                  Has llegado tarde. Por favor explica el motivo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explica el motivo de tu retraso..."
                  className="min-h-[100px]"
                  required
                />
              </CardContent>
            </Card>
          )}

          {/* Action Button */}
          {employee && (
            <Button 
              onClick={handleAttendance}
              className="w-full text-lg py-6"
              disabled={loading || (requireJustification && !justification.trim()) || 
                       (attendanceStatus?.hasCheckedIn && attendanceStatus?.hasCheckedOut)}
            >
              {loading ? 'Procesando...' : getNextAction()}
            </Button>
          )}

          {/* Message */}
          {message && (
            <Card className={`border-l-4 ${
              messageType === 'success' ? 'border-green-500 bg-green-50' :
              messageType === 'error' ? 'border-red-500 bg-red-50' :
              messageType === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {getMessageIcon()}
                  <p className="font-medium">{message}</p>
                </div>
              </CardContent>
            </Card>
          )}

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
