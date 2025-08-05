

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
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
      const response = await fetch('/api/attendance', {
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
        // Show feedback message if available, otherwise show success message
        const displayMessage = data.feedbackMessage || data.message || 'Asistencia registrada exitosamente'
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
    <form onSubmit={handleAttendance} className="space-y-6">
      {/* DNI Field */}
      <div className="space-y-2">
        <label htmlFor="last5" className="text-sm font-medium text-gray-700">
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
          className="h-12 text-center text-lg font-mono"
          required
          disabled={loading}
        />
      </div>

      {/* Justification Field */}
      {requireJustification && (
        <div className="space-y-2">
          <label htmlFor="justification" className="text-sm font-medium text-gray-700">
            Justificación por llegada tarde
          </label>
          <textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Por favor explique por qué llegó tarde..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
            required
            disabled={loading}
          />
          <Button
            type="button"
            onClick={handleJustificationSubmit}
            disabled={loading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
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
          className="w-full h-12 bg-blue-600 hover:bg-blue-700"
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
        <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
          message.includes('Error') 
            ? 'text-red-600 bg-red-50 border border-red-200'
            : 'text-green-600 bg-green-50 border border-green-200'
        }`}>
          <AlertCircle className="h-4 w-4" />
          {message}
        </div>
      )}
    </form>
  )
}
