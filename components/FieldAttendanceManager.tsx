import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Fingerprint,
  Loader2,
  MapPin,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { Button } from './ui/button'
import { formatTimeDisplay } from '../lib/timezone'
import {
  captureFieldGeolocation,
  checkFieldDeviceCapability,
  fieldErrorMessage,
  runWebAuthnAssert,
  runWebAuthnEnroll,
  type FieldGeoFix,
} from '../lib/attendance/field-client'

type Step =
  | 'idle'
  | 'locating'
  | 'biometric'
  | 'enrolling'
  | 'submitting'
  | 'justification'
  | 'success'
  | 'error'

type SuccessState = {
  employeeName: string
  action: 'check_in' | 'check_out'
  time: string
  message: string
  accuracy_m?: number
}

type Suggestion = {
  employee_id: string
  company_id: string
  company_name?: string
  name: string
  dni?: string
}

export default function FieldAttendanceManager() {
  const [dni, setDni] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [enrollToken, setEnrollToken] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [justification, setJustification] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [errorCode, setErrorCode] = useState<string | undefined>()
  const [success, setSuccess] = useState<SuccessState | null>(null)
  const [capabilityMsg, setCapabilityMsg] = useState<string | null>(null)
  const [geoPreview, setGeoPreview] = useState<FieldGeoFix | null>(null)
  const [needsEnroll, setNeedsEnroll] = useState(false)
  const [needsEnrollToken, setNeedsEnrollToken] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deviceIdRef = useRef<string>('')

  const isValidDni = dni.length === 5 || dni.length === 13
  const busy = ['locating', 'biometric', 'enrolling', 'submitting'].includes(step)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cap = await checkFieldDeviceCapability()
      if (cancelled) return
      if (!cap.ok) {
        setCapabilityMsg(cap.message)
        return
      }
      if (!cap.platformAuthenticator) {
        setCapabilityMsg(
          'No se detectó Face ID / huella en este navegador. En iOS/Android usa Safari o Chrome actualizado.'
        )
      }
      try {
        const key = 'sisu_field_device_id'
        let id = localStorage.getItem(key)
        if (!id) {
          id = crypto.randomUUID()
          localStorage.setItem(key, id)
        }
        deviceIdRef.current = id
      } catch {
        deviceIdRef.current = `tmp-${Date.now()}`
      }
    })()
    return () => {
      cancelled = true
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const resetToIdle = () => {
    setStep('idle')
    setSuccess(null)
    setDni('')
    setJustification('')
    setEnrollToken('')
    setErrorMessage('')
    setErrorCode(undefined)
    setGeoPreview(null)
    setNeedsEnroll(false)
    setNeedsEnrollToken(false)
    setSuggestions([])
    inputRef.current?.focus()
  }

  const identityBody = () => ({
    dni: dni.length === 13 ? dni : undefined,
    last5: dni.length === 5 ? dni : undefined,
    company_id: companyId || undefined,
  })

  const handleSuccess = (data: {
    employeeName?: string
    action?: string
    currentTime?: string
    message?: string
    accuracy_m?: number
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
      accuracy_m: data.accuracy_m,
    })
    setStep('success')
    setDni('')
    setJustification('')
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    successTimerRef.current = setTimeout(resetToIdle, 4000)
  }

  const enrollDevice = async () => {
    if (!enrollToken.trim()) {
      setNeedsEnrollToken(true)
      setNeedsEnroll(true)
      setStep('error')
      setErrorCode('ENROLL_TOKEN_REQUIRED')
      setErrorMessage(
        'Primera vinculación: pide a RR.HH. un token y pégalo abajo, luego vuelve a marcar.'
      )
      return false
    }

    setStep('enrolling')
    setErrorMessage('')
    const optRes = await fetch('/api/attendance/field/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...identityBody(),
        purpose: 'enroll',
        enroll_token: enrollToken.trim(),
      }),
    })
    const optData = await optRes.json()

    if (optRes.status === 409 && optData.suggestions) {
      setSuggestions(optData.suggestions)
      setStep('error')
      setErrorMessage(optData.error || 'Selecciona tu empresa')
      setErrorCode(optData.code)
      return false
    }

    if (optRes.status === 401 && optData.needsEnrollToken) {
      setNeedsEnrollToken(true)
      setStep('error')
      setErrorCode(optData.code)
      setErrorMessage(fieldErrorMessage(optData.code, optData.error))
      return false
    }

    if (!optRes.ok) {
      setStep('error')
      setErrorCode(optData.code)
      setErrorMessage(fieldErrorMessage(optData.code, optData.error || optData.message))
      return false
    }

    setStep('biometric')
    let attestation
    try {
      attestation = await runWebAuthnEnroll(optData.options)
    } catch {
      setStep('error')
      setErrorCode('WEBAUTHN_REJECTED')
      setErrorMessage(fieldErrorMessage('WEBAUTHN_REJECTED'))
      return false
    }

    setStep('enrolling')
    const enrollRes = await fetch('/api/attendance/field/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...identityBody(),
        attestation,
        enroll_token: enrollToken.trim(),
        device_label: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : undefined,
      }),
    })
    const enrollData = await enrollRes.json()
    if (!enrollRes.ok) {
      setStep('error')
      setErrorCode(enrollData.code)
      setErrorMessage(fieldErrorMessage(enrollData.code, enrollData.error))
      return false
    }

    setNeedsEnroll(false)
    setNeedsEnrollToken(false)
    setEnrollToken('')
    return true
  }

  const submitPunch = async (withJustification = false) => {
    setErrorMessage('')
    setErrorCode(undefined)

    const cap = await checkFieldDeviceCapability()
    if (!cap.ok) {
      setStep('error')
      setErrorCode(cap.code)
      setErrorMessage(cap.message)
      return
    }

    try {
      setStep('locating')
      const geo = await captureFieldGeolocation()
      setGeoPreview(geo)

      setStep('biometric')
      let optRes = await fetch('/api/attendance/field/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...identityBody(), purpose: 'assert' }),
      })
      let optData = await optRes.json()

      if (optRes.status === 409 && (optData.needsEnroll || optData.code === 'WEBAUTHN_NOT_ENROLLED')) {
        setNeedsEnroll(true)
        const enrolled = await enrollDevice()
        if (!enrolled) return
        optRes = await fetch('/api/attendance/field/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...identityBody(), purpose: 'assert' }),
        })
        optData = await optRes.json()
      }

      if (optRes.status === 409 && optData.suggestions) {
        setSuggestions(optData.suggestions)
        setStep('error')
        setErrorMessage(optData.error || 'Selecciona tu empresa')
        setErrorCode(optData.code)
        return
      }

      if (!optRes.ok) {
        setStep('error')
        setErrorCode(optData.code)
        setErrorMessage(fieldErrorMessage(optData.code, optData.error || optData.message))
        return
      }

      let assertion
      try {
        assertion = await runWebAuthnAssert(optData.options)
      } catch {
        setStep('error')
        setErrorCode('WEBAUTHN_REJECTED')
        setErrorMessage(fieldErrorMessage('WEBAUTHN_REJECTED'))
        return
      }

      setStep('submitting')
      const punchRes = await fetch('/api/attendance/field/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...identityBody(),
          lat: geo.lat,
          lon: geo.lon,
          accuracy_m: geo.accuracy_m,
          geo_ts: geo.geo_ts,
          device_id: deviceIdRef.current,
          assertion,
          justification: withJustification ? justification : undefined,
        }),
      })
      const punchData = await punchRes.json()

      if (punchRes.status === 422 && punchData.requireJustification) {
        setStep('justification')
        setErrorMessage(punchData.message || 'Se requiere justificación.')
        return
      }

      if (punchRes.ok) {
        handleSuccess(punchData)
        return
      }

      setStep('error')
      setErrorCode(punchData.code || punchData.error)
      setErrorMessage(
        fieldErrorMessage(punchData.code, punchData.error || punchData.message)
      )
    } catch (err: any) {
      setStep('error')
      setErrorCode(err?.code)
      setErrorMessage(fieldErrorMessage(err?.code, err?.message || 'Error de conexión'))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidDni || busy) return
    void submitPunch(step === 'justification')
  }

  const greeting = (name: string) => {
    const first = name.split(' ')[0]
    return success?.action === 'check_out' ? `¡Hasta luego, ${first}!` : `¡Buen día, ${first}!`
  }

  const actionLabel = success?.action === 'check_out' ? 'Salida registrada' : 'Entrada registrada'

  const stepHint =
    step === 'locating'
      ? 'Obteniendo ubicación…'
      : step === 'biometric' || step === 'enrolling'
        ? needsEnroll
          ? 'Vincula Face ID / huella…'
          : 'Confirma con Face ID / huella…'
        : step === 'submitting'
          ? 'Registrando asistencia…'
          : null

  return (
    <div className="relative min-h-[320px]">
      <AnimatePresence mode="wait">
        {step === 'success' && success ? (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute inset-0 rounded-2xl bg-emerald-500/10 backdrop-blur-xl flex flex-col items-center justify-center border border-emerald-500/20 px-4"
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3" />
            <h2 className="text-2xl font-bold text-white tracking-tight text-center">
              {greeting(success.employeeName)}
            </h2>
            <p className="text-emerald-200 mt-2 font-medium">
              {actionLabel} {success.time}
            </p>
            {success.accuracy_m != null && (
              <p className="text-white/50 text-xs mt-3 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                GPS ±{Math.round(success.accuracy_m)} m · biometría OK
              </p>
            )}
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="flex items-center justify-center gap-4 text-white/60 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-brand-300" />
                Biometría
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-300" />
                Ubicación
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-300" />
                DNI
              </span>
            </div>

            {capabilityMsg && (
              <div className="flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-100 text-sm">
                <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{capabilityMsg}</p>
              </div>
            )}

            <div className="space-y-3">
              <label htmlFor="field-dni" className="sr-only">
                DNI completo o últimos 5 dígitos
              </label>
              <input
                ref={inputRef}
                id="field-dni"
                type="text"
                inputMode="numeric"
                maxLength={13}
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="DNI o últimos 5 dígitos"
                className="w-full bg-transparent text-center text-3xl font-mono font-bold text-white placeholder:text-white/30 outline-none pb-3 border-b border-brand-400/40 focus:border-brand-300 tracking-widest"
                required
                disabled={busy}
                autoComplete="off"
              />
              <p
                className={`text-sm font-medium text-center ${
                  isValidDni ? 'text-emerald-400' : 'text-white/50'
                }`}
              >
                {dni.length === 13
                  ? '✓ DNI completo'
                  : dni.length === 5
                    ? '✓ Últimos 5 dígitos'
                    : 'Ingresa DNI completo o últimos 5'}
              </p>
            </div>

            {(needsEnroll || needsEnrollToken) && (
              <div className="space-y-2">
                <label htmlFor="enroll-token" className="text-sm text-white/70 block text-center">
                  Token de vinculación (RR.HH.)
                </label>
                <input
                  id="enroll-token"
                  type="text"
                  value={enrollToken}
                  onChange={(e) => setEnrollToken(e.target.value.trim())}
                  placeholder="Pega el token de una sola vez"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-center text-white placeholder:text-white/35 outline-none focus:border-brand-400/60 font-mono text-sm"
                  disabled={busy}
                  autoComplete="off"
                />
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-white/70 text-center">Selecciona tu empresa</p>
                {suggestions.map((s) => (
                  <button
                    key={`${s.company_id}-${s.employee_id}`}
                    type="button"
                    onClick={() => {
                      setCompanyId(s.company_id)
                      setSuggestions([])
                      setStep('idle')
                      setErrorMessage('')
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white hover:bg-white/10 transition-colors"
                  >
                    <span className="font-semibold block">{s.company_name || 'Empresa'}</span>
                    <span className="text-white/60 text-sm">{s.name}</span>
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence>
              {step === 'justification' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-amber-200/90 text-center">{errorMessage}</p>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Motivo de llegada tarde…"
                    className="w-full p-4 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/40 resize-none min-h-[96px] focus:outline-none focus:border-brand-400/60"
                    required
                    disabled={busy}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {step === 'error' && errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25"
                >
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-200 text-sm font-medium">{errorMessage}</p>
                    {errorCode && (
                      <p className="text-red-200/50 text-xs mt-1 font-mono">{errorCode}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {geoPreview && step !== 'error' && step !== 'success' && (
              <p className="text-center text-xs text-white/45 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                ±{Math.round(geoPreview.accuracy_m)} m
              </p>
            )}

            {stepHint && (
              <p className="text-center text-sm text-brand-200 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {stepHint}
              </p>
            )}

            <Button
              type="submit"
              disabled={
                busy ||
                !isValidDni ||
                (step === 'justification' && !justification.trim()) ||
                !!capabilityMsg?.includes('no soporta')
              }
              className="w-full h-14 text-base font-bold text-white bg-gradient-to-r from-brand-800 to-brand-500 hover:from-brand-700 hover:to-brand-400 rounded-xl shadow-lg shadow-brand-900/40 border-0 disabled:opacity-40"
            >
              {busy ? (
                <span className="flex items-center gap-3 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Procesando…
                </span>
              ) : step === 'justification' ? (
                'Enviar justificación'
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <Fingerprint className="h-5 w-5" />
                  Check-in / Check-out
                </span>
              )}
            </Button>

            <p className="text-center text-[11px] text-white/40 leading-relaxed px-2">
              La biometría se verifica en el teléfono. No se almacenan plantillas de huella ni
              rostro. La primera vinculación requiere un token emitido por RR.HH. (1 dispositivo
              activo).
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
