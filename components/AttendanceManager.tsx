import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { formatTimeDisplay } from '../lib/timezone'

type KioskStatus = 'idle' | 'loading' | 'success' | 'error' | 'justification'

interface SuccessState {
  employeeName: string
  action: 'check_in' | 'check_out'
  time: string
  message: string
}

export default function AttendanceManager() {
  const [dni, setDni] = useState('')
  const [justification, setJustification] = useState('')
  const [status, setStatus] = useState<KioskStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isValidDni = dni.length === 5 || dni.length === 13
  const isActive = inputFocused || dni.length > 0
  const isLoading = status === 'loading'

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const resetToIdle = () => {
    setStatus('idle')
    setSuccess(null)
    setDni('')
    setJustification('')
    setErrorMessage('')
    inputRef.current?.focus()
  }

  const handleSuccess = (data: {
    employeeName?: string
    action?: string
    currentTime?: string
    message?: string
  }) => {
    const action = data.action === 'check_out' ? 'check_out' : 'check_in'
    const time =
      data.currentTime && /^\d{1,2}:\d{2}/.test(String(data.currentTime))
        ? String(data.currentTime).slice(0, 5)
        : formatTimeDisplay(data.currentTime || new Date().toISOString())

    setSuccess({
      employeeName: data.employeeName || 'Colaborador',
      action,
      time,
      message: data.message || 'Asistencia registrada',
    })
    setStatus('success')
    setDni('')
    setJustification('')

    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(resetToIdle, 3000)
  }

  const submitAttendance = async (withJustification = false) => {
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/attendance/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: dni.length === 13 ? dni : undefined,
          last5: dni.length === 5 ? dni : undefined,
          justification: withJustification ? justification : undefined,
        }),
      })

      const data = await response.json()

      if (response.status === 422 && data.requireJustification) {
        setStatus('justification')
        setErrorMessage(data.message || 'Se requiere justificación.')
        return
      }

      if (response.ok) {
        handleSuccess(data)
        return
      }

      setStatus('error')
      setErrorMessage(data.error || data.message || 'Error al registrar asistencia')
    } catch {
      setStatus('error')
      setErrorMessage('Error de conexión')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidDni) return
    void submitAttendance(status === 'justification')
  }

  const greeting = (name: string) => {
    const first = name.split(' ')[0]
    return success?.action === 'check_out' ? `¡Hasta luego, ${first}!` : `¡Buen día, ${first}!`
  }

  const actionLabel = success?.action === 'check_out' ? 'Salida registrada' : 'Entrada registrada'

  return (
    <div className="relative min-h-[280px]">
      <AnimatePresence mode="wait">
        {status === 'success' && success ? (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute inset-0 rounded-2xl bg-emerald-500/10 backdrop-blur-xl flex flex-col items-center justify-center border border-emerald-500/20"
          >
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-4 drop-shadow-severity-safe" />
            <h2 className="text-2xl font-bold text-white tracking-tight">{greeting(success.employeeName)}</h2>
            <p className="text-emerald-200 mt-2 font-medium">
              {actionLabel} {success.time}
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-8"
          >
            {/* Magnetic DNI input */}
            <div className="space-y-4">
              <label htmlFor="kiosk-dni" className="sr-only">
                DNI completo o últimos 5 dígitos
              </label>
              <div className="relative px-2">
                <motion.div
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-brand-400/40 rounded-full origin-center"
                  animate={{
                    scaleX: isActive ? 1 : 0.6,
                    opacity: isActive ? 1 : 0.35,
                  }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute bottom-0 left-2 right-2 h-[2px] overflow-hidden rounded-full"
                  animate={{ opacity: isActive ? 1 : 0 }}
                >
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-brand-300 to-transparent animate-glow-line" />
                </motion.div>
                <input
                  ref={inputRef}
                  id="kiosk-dni"
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/[^0-9]/g, ''))}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="DNI o últimos 5 dígitos"
                  className={`w-full bg-transparent text-center text-3xl font-mono font-bold text-white placeholder:text-white/30 outline-none pb-4 transition-all duration-300 ${
                    isActive ? 'drop-shadow-clock-glow tracking-widest' : 'tracking-wide'
                  }`}
                  required
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              <p
                className={`text-sm font-medium text-center transition-colors duration-300 ${
                  isValidDni ? 'text-emerald-400' : 'text-white/50'
                }`}
              >
                {dni.length === 13
                  ? '✓ DNI completo'
                  : dni.length === 5
                    ? '✓ Últimos 5 dígitos'
                    : 'Ingrese DNI completo o últimos 5 dígitos'}
              </p>
            </div>

            {/* Justification — elastic emerge */}
            <AnimatePresence>
              {status === 'justification' && (
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-amber-200/90 text-center">{errorMessage}</p>
                  <label htmlFor="justification" className="text-sm font-semibold text-white block">
                    Justificación por llegada tarde
                  </label>
                  <textarea
                    id="justification"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explique brevemente el motivo..."
                    className="w-full p-4 bg-white/5 border border-white/15 rounded-xl text-base text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-brand-400/60 focus:ring-2 focus:ring-brand-400/20 transition-all min-h-[100px]"
                    required
                    disabled={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {status === 'error' && errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25"
                >
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm font-medium">{errorMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || !isValidDni || (status === 'justification' && !justification.trim())}
              className="w-full h-14 text-base font-bold text-white bg-gradient-to-r from-brand-800 to-brand-500 hover:from-brand-700 hover:to-brand-400 rounded-xl shadow-lg shadow-brand-900/40 transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100 border-0"
            >
              {isLoading ? (
                <span className="flex items-center gap-3 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Procesando...
                </span>
              ) : status === 'justification' ? (
                'Enviar justificación'
              ) : (
                'Marcar asistencia'
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
