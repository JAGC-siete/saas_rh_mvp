import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { AlertCircle, Clock, CheckCircle, User, Building2, Calendar, Timer } from 'lucide-react'
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

export default function AsistenciaNueva() {
  return (
    <ProtectedRoute>
      <AsistenciaNuevaContent />
    </ProtectedRoute>
  )
}

function AsistenciaNuevaContent() {
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
      console.error('Lookup error:', error)
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
    setMessage('')

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          justification: justification || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requireJustification) {
          setRequireJustification(true)
          setMessage(data.message)
          setMessageType('warning')
        } else {
          setMessage(data.message)
          setMessageType('success')
          setRequireJustification(false)
          setJustification('')
          
          // Refresh attendance status
          await lookupEmployee(last5)
        }
      } else {
        setMessage(data.error || 'Error al registrar asistencia')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Attendance error:', error)
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
        <title>Sistema de Asistencia - Portal RH</title>
        <meta name="description" content="Sistema de registro de asistencia para empleados" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Portal de Asistencia</h1>
                  <p className="text-sm text-gray-500">Sistema de Recursos Humanos</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date().toLocaleDateString('es-HN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div className="flex items-center space-x-2 text-lg font-mono font-bold text-blue-600">
                  <Timer className="w-5 h-5" />
                  <span>{currentTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Main Card */}
          <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white pb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold mb-2">Registro de Asistencia</CardTitle>
                <CardDescription className="text-blue-100">
                  Ingrese los últimos 5 dígitos de su DNI para registrar su asistencia
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {/* DNI Input Form */}
              {!employee && (
                <form onSubmit={handleLookup} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Últimos 5 dígitos del DNI
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Ej: 12345"
                        value={last5}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                          setLast5(value)
                          setMessage('')
                        }}
                        className="h-12 text-lg text-center tracking-wider font-mono border-2 focus:border-blue-500"
                        maxLength={5}
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Solo números, exactamente 5 dígitos
                    </p>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-lg rounded-xl shadow-lg"
                    disabled={loading || last5.length !== 5}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Buscando...</span>
                      </div>
                    ) : (
                      'Buscar Empleado'
                    )}
                  </Button>
                </form>
              )}

              {/* Employee Info Display */}
              {employee && (
                <div className="space-y-6">
                  {/* Employee Card */}
                  <div className="bg-gray-50 rounded-xl p-6 border">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{employee.name}</h3>
                        <p className="text-sm text-gray-600 mb-1">{employee.position}</p>
                        <p className="text-sm text-gray-500">DNI: •••••{employee.dni.slice(-5)}</p>
                        <p className="text-sm text-blue-600 font-medium">{employee.company_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border-2 ${
                      attendanceStatus?.hasCheckedIn 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="text-center">
                        <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${
                          attendanceStatus?.hasCheckedIn ? 'text-green-500' : 'text-gray-300'
                        }`} />
                        <p className="text-sm font-medium text-gray-700">Entrada</p>
                        <p className={`text-lg font-bold ${
                          attendanceStatus?.hasCheckedIn ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {attendanceStatus?.checkInTime || '--:--'}
                        </p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 ${
                      attendanceStatus?.hasCheckedOut 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="text-center">
                        <Clock className={`w-8 h-8 mx-auto mb-2 ${
                          attendanceStatus?.hasCheckedOut ? 'text-blue-500' : 'text-gray-300'
                        }`} />
                        <p className="text-sm font-medium text-gray-700">Salida</p>
                        <p className={`text-lg font-bold ${
                          attendanceStatus?.hasCheckedOut ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          {attendanceStatus?.checkOutTime || '--:--'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Justification Input */}
                  {requireJustification && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                      <div className="flex items-start space-x-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">Justificación Requerida</h4>
                          <p className="text-sm text-yellow-700">Se requiere una justificación para el registro tardío.</p>
                        </div>
                      </div>
                      <Textarea
                        placeholder="Escriba la razón del retraso..."
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        className="w-full border-yellow-300 focus:border-yellow-500"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleAttendance}
                      className={`flex-1 h-12 font-medium text-lg rounded-xl shadow-lg ${
                        attendanceStatus?.hasCheckedIn && !attendanceStatus?.hasCheckedOut
                          ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                          : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      } text-white`}
                      disabled={loading || (requireJustification && !justification.trim()) || 
                               (attendanceStatus?.hasCheckedIn && attendanceStatus?.hasCheckedOut)}
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Procesando...</span>
                        </div>
                      ) : (
                        getNextAction()
                      )}
                    </Button>

                    <Button 
                      onClick={() => {
                        setEmployee(null)
                        setAttendanceStatus(null)
                        setLast5('')
                        setMessage('')
                        setJustification('')
                        setRequireJustification(false)
                      }}
                      variant="outline"
                      className="h-12 px-6 border-2 hover:bg-gray-50 rounded-xl"
                    >
                      Nuevo
                    </Button>
                  </div>
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div className={`mt-6 p-4 rounded-xl flex items-start space-x-3 ${
                  messageType === 'success' ? 'bg-green-50 border-2 border-green-200' :
                  messageType === 'error' ? 'bg-red-50 border-2 border-red-200' :
                  messageType === 'warning' ? 'bg-yellow-50 border-2 border-yellow-200' :
                  'bg-blue-50 border-2 border-blue-200'
                }`}>
                  {getMessageIcon()}
                  <p className={`font-medium ${
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
          <div className="text-center mt-8 space-y-3">
            <p className="text-sm text-gray-600">
              ¿Necesitas ayuda? Contacta al departamento de Recursos Humanos
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => router.push('/')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                ← Volver al Dashboard
              </button>
              <span className="text-gray-300">|</span>
              <button 
                onClick={() => window.location.reload()}
                className="text-gray-600 hover:text-gray-700 text-sm transition-colors"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
