import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function AttendanceManager() {
  const [last5, setLast5] = useState('')
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [requireJustification, setRequireJustification] = useState(false)

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
          dni: last5.length === 13 ? last5 : undefined, // Full DNI if complete
          last5: last5.length === 5 ? last5 : undefined, // Last 5 digits
          company_id: undefined, // Can add company selection UI later
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
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000)
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
      setMessage('Por favor proporcione una justificación.')
      return
    }
    
    await handleAttendance(new Event('submit') as any)
  }

  return (
    <form onSubmit={handleAttendance} className="space-y-6">
      {/* DNI Field */}
      <div className="space-y-3">
        <label htmlFor="last5" className="text-sm font-semibold text-white block">
          DNI (completo o últimos 5 dígitos)
        </label>
        <Input
          id="last5"
          type="text"
          maxLength={13}
          pattern="[0-9]{5,13}"
          value={last5}
          onChange={(e) => setLast5(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="0801199012345 o 12345"
          className="h-14 text-center text-xl font-mono font-semibold"
          style={{
            background: '#F9FAFB',
            border: '2px solid #E5E7EB',
            borderRadius: '12px',
            color: '#1E293B',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#004C97'
            e.target.style.boxShadow = '0 0 0 4px rgba(0,76,151,0.15)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#E5E7EB'
            e.target.style.boxShadow = 'none'
          }}
          required
          disabled={loading}
        />
        <p className="text-sm font-medium text-center"
           style={{
             color: last5.length === 13 ? '#10B981' : last5.length === 5 ? '#10B981' : '#A8D0E6'
           }}>
          {last5.length === 13 ? '✓ DNI completo' : last5.length === 5 ? '✓ Últimos 5 dígitos' : 'Ingrese DNI completo o últimos 5 dígitos'}
        </p>
      </div>

      {/* Justification Field */}
      {requireJustification && (
        <div className="space-y-3 animate-fadeIn">
          <label htmlFor="justification" className="text-sm font-semibold text-white block">
            Justificación por llegada tarde
          </label>
          <textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Por favor explique por qué llegó tarde..."
            className="w-full p-4 border-2 rounded-lg text-base text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/20 transition-all"
            style={{
              background: '#F9FAFB',
              border: '2px solid #E5E7EB',
              minHeight: '100px'
            }}
            required
            disabled={loading}
          />
          <Button
            type="button"
            onClick={handleJustificationSubmit}
            disabled={loading}
            className="w-full h-14 text-base font-semibold"
            style={{
              background: 'linear-gradient(90deg, #004C97, #0072CE)',
              color: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,76,151,0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Enviando...
              </div>
            ) : (
              'Enviar Justificación'
            )}
          </Button>
        </div>
      )}

      {/* Submit Button */}
      {!requireJustification && (
        <Button
          type="submit"
          disabled={loading || (last5.length !== 5 && last5.length !== 13)}
          className="w-full h-14 text-base font-bold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: loading || (last5.length !== 5 && last5.length !== 13) 
              ? '#9CA3AF'
              : 'linear-gradient(90deg, #004C97, #0072CE)',
            borderRadius: '12px',
            boxShadow: loading || (last5.length !== 5 && last5.length !== 13)
              ? 'none'
              : '0 6px 20px rgba(0,76,151,0.4)'
          }}
        >
          {loading ? (
            <div className="flex items-center gap-3 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Procesando...</span>
            </div>
          ) : (
            '✓ Marcar Asistencia'
          )}
        </Button>
      )}

      {/* Message Display */}
      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg animate-fadeIn ${
          message.includes('Error') || message.includes('error') || message.includes('Error')
            ? 'bg-red-50 border-2 border-red-200'
            : 'bg-emerald-50 border-2 border-emerald-200'
        }`}>
          {message.includes('Error') || message.includes('error') || message.includes('Error') ? (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          <div className={`font-medium ${message.includes('Error') || message.includes('error') || message.includes('Error') ? 'text-red-800' : 'text-emerald-800'}`}>
            {message}
          </div>
        </div>
      )}
    </form>
  )
}
