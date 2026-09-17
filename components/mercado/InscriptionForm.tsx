/**
 * Formulario público de solicitud de inscripción.
 * Validación Zod compartida con el endpoint. Sin cuenta, sin cobro, sin publicación automática.
 */

import { useState, type FormEvent } from 'react'
import { MERCADO_INSCRIPTION_API_PATH } from '../../lib/mercado/paths'
import {
  mercadoInscriptionFieldErrors,
  parseMercadoInscription,
} from '../../lib/mercado/inscription-schema'

const fieldClass =
  'mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-3 text-stone-900 shadow-none outline-none ring-0 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'

export default function InscriptionForm() {
  const [stallNumber, setStallNumber] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

    const payload = {
      stallNumber,
      merchantName,
      businessName,
      website: honeypot,
    }

    const parsed = parseMercadoInscription(payload)
    if (!parsed.success) {
      setErrors(mercadoInscriptionFieldErrors(parsed.error))
      return
    }

    setErrors({})
    setSending(true)
    try {
      const res = await fetch(MERCADO_INSCRIPTION_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setErrors({ submit: body.error || 'No se pudo enviar. Intenta de nuevo.' })
        return
      }
      setSent(true)
    } catch {
      setErrors({ submit: 'Sin conexión. Revisa tu internet e intenta de nuevo.' })
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-8" role="status">
        <h2 className="text-xl font-semibold text-stone-900">Solicitud recibida</h2>
        <p className="mt-3 text-stone-600">
          Recibimos tu solicitud. La publicación no es inmediata: el equipo revisa los datos y da de
          alta el puesto a mano.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <div>
        <label htmlFor="stall-number" className="text-sm font-medium text-stone-700">
          Número de local
        </label>
        <input
          id="stall-number"
          name="stallNumber"
          value={stallNumber}
          onChange={(event) => setStallNumber(event.target.value)}
          placeholder="Ej. 8 o Pasillo 1, local 8"
          autoComplete="off"
          className={fieldClass}
          aria-invalid={Boolean(errors.stallNumber)}
          required
        />
        {errors.stallNumber && <p className="mt-1 text-sm text-red-600">{errors.stallNumber}</p>}
      </div>

      <div className="mt-5">
        <label htmlFor="merchant-name" className="text-sm font-medium text-stone-700">
          Nombre del comerciante
        </label>
        <input
          id="merchant-name"
          name="merchantName"
          value={merchantName}
          onChange={(event) => setMerchantName(event.target.value)}
          placeholder="Quién atiende el puesto"
          autoComplete="name"
          className={fieldClass}
          aria-invalid={Boolean(errors.merchantName)}
          required
        />
        {errors.merchantName && <p className="mt-1 text-sm text-red-600">{errors.merchantName}</p>}
      </div>

      <div className="mt-5">
        <label htmlFor="business-name" className="text-sm font-medium text-stone-700">
          Nombre del comercio
        </label>
        <input
          id="business-name"
          name="businessName"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="Cómo querés que aparezca el puesto"
          autoComplete="organization"
          className={fieldClass}
          aria-invalid={Boolean(errors.businessName)}
          required
        />
        {errors.businessName && <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>}
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="inscription-website">Sitio web</label>
        <input
          id="inscription-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      {errors.submit && <p className="mt-4 text-sm text-red-600">{errors.submit}</p>}

      <button
        type="submit"
        disabled={sending}
        className="mt-6 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
        style={{ backgroundColor: '#d97706' }}
      >
        {sending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
