

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { AlertCircle } from 'lucide-react'

export default function AttendanceManager() {
  const [last5, setLast5] = useState('')
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [requireJustification, setRequireJustification] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          last5,
          justification: requireJustification ? justification : undefined,
        }),
      })

      const data = await response.json()

      if (response.status === 422 && data.requireJustification) {
        setRequireJustification(true)
        setMessage(data.message)
        setLoading(false)
        return
      }

      if (response.ok) {
        // Show enhanced feedback message with action type
        const displayMessage = data.message || 'Asistencia registrada exitosamente'
        const actionType = data.action || 'unknown'
        const timeDetection = data.timeDetection || 'unknown'
        
        console.log('Attendance registered:', { actionType, timeDetection, data })
        setMessage(displayMessage)
        setLast5('')
        setJustification('')
        setRequireJustification(false)
      } else {
        setMessage(data.error || 'Error al registrar asistencia')
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleJustificationSubmit = async () => {
    if (!justification.trim()) {
      setMessage('Please provide a justification.')
      return
    }
    
    await handleAttendance(new Event('submit') as any)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">⏰ Registro de Asistencia</h2>
        <p className="text-gray-300">Marca tu entrada o salida usando los últimos 5 dígitos de tu DNI</p>
      </div>

      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-white">Sistema Inteligente de Asistencia</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAttendance} className="space-y-6">
      {/* DNI Field */}
      <div className="space-y-2">
        <label htmlFor="last5" className="text-sm font-medium text-gray-300">
          Últimos 5 dígitos del DNI
        </label>
        <Input
          id="last5"
          type="text"
          maxLength={5}
          pattern="[0-9]{5}"
          value={last5}
          onChange={(e) => setLast5(e.target.value)}
          placeholder="12345"
          className="h-12 text-center text-lg font-mono bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          required
          disabled={loading}
        />
      </div>

      {/* Justification Field */}
      {requireJustification && (
        <div className="space-y-2">
          <label htmlFor="justification" className="text-sm font-medium text-gray-300">
            Justificación por llegada tarde
          </label>
          <textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Por favor explique por qué llegó tarde..."
            className="w-full p-3 border border-white/20 bg-white/10 rounded-md text-white placeholder-gray-400 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 h-24 resize-none"
            required
            disabled={loading}
          />
          <Button
            type="button"
            onClick={handleJustificationSubmit}
            disabled={loading}
            className="w-full h-12 bg-brand-600 hover:bg-brand-700"
          >
            Enviar Justificación
          </Button>
        </div>
      )}

      {/* Submit Button */}
      {!requireJustification && (
        <Button
          type="submit"
          disabled={loading || last5.length !== 5}
          className="w-full h-12 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-600"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Procesando...
            </div>
          ) : (
            'Marcar Asistencia'
          )}
        </Button>
      )}

      {/* Message Display */}
      {message && (
        <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${
          message.includes('Error') 
            ? 'text-red-400 bg-red-500/20 border border-red-500/30'
            : 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30'
        }`}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="whitespace-pre-line">{message}</div>
        </div>
      )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
