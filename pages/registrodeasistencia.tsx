<<<<<<< HEAD
import React, { useState, useEffect } from 'react'
=======
import { useState, useEffect } from 'react'
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
<<<<<<< HEAD
import { AlertCircle, Clock, CheckCircle, User, Building2, Calendar, Timer } from 'lucide-react'
=======
import { AlertCircle, Clock, CheckCircle, User } from 'lucide-react'
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556

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
<<<<<<< HEAD
      console.error('Lookup error:', error)
=======
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
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
<<<<<<< HEAD
        // Late arrival - requires justification
=======
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
        setRequireJustification(true)
        setMessage(data.message)
        setMessageType('warning')
      } else if (response.ok) {
<<<<<<< HEAD
        // Success
=======
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
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
<<<<<<< HEAD
        // Error
        console.error('Registration error:', response.status, data)
        setMessage(data.error || data.message || 'Error al registrar asistencia')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Network error:', error)
      setMessage('Error de conexión con el servidor')
=======
        setMessage(data.error || data.message || 'Error al registrar')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Error de conexión')
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
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
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Empleado Encontrado</h3>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">{employee.name}</p>
                    <p className="text-sm text-gray-600">{employee.position}</p>
                    <p className="text-xs text-gray-500">{employee.company_name}</p>
                  </div>
                  
                  {attendanceStatus && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Estado de Hoy:</h4>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Entrada:</span>
                          <span className={`font-mono ${attendanceStatus.hasCheckedIn ? 'text-green-600' : 'text-gray-400'}`}>
                            {attendanceStatus.checkInTime || 'Pendiente'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Salida:</span>
                          <span className={`font-mono ${attendanceStatus.hasCheckedOut ? 'text-green-600' : 'text-gray-400'}`}>
                            {attendanceStatus.checkOutTime || 'Pendiente'}
                          </span>
                        </div>
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
                <Button 
                  onClick={handleAttendance}
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium mt-4"
                  disabled={loading || (requireJustification && !justification.trim()) || 
                           (attendanceStatus?.hasCheckedIn && attendanceStatus?.hasCheckedOut)}
                >
                  {loading ? 'Procesando...' : getNextAction()}
                </Button>
              )}

              {/* Message */}
              {message && (
                <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                  messageType === 'success' ? 'bg-green-50 border border-green-200' :
                  messageType === 'error' ? 'bg-red-50 border border-red-200' :
                  messageType === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  {getMessageIcon()}
                  <p className={`text-sm font-medium ${
                    messageType === 'success' ? 'text-green-800' :
                    messageType === 'error' ? 'text-red-800' :
                    messageType === 'warning' ? 'text-yellow-800' :
                    'text-blue-800'
                  }`}>{message}</p>
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
