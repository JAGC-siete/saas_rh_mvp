/**
 * Formulario de captura de la landing publicada.
 * Estado con useState + validación con el Zod compartido (sin react-hook-form,
 * igual que el resto de formularios públicos del repo).
 *
 * `layout: booking` pinta 3 pasos (servicio → horario → datos) y arma el mensaje.
 * No es un calendario en vivo: confirma disponibilidad por WhatsApp después del envío.
 */

import React, { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { LANDING_LEAD_API_PATH } from '../../lib/landings/paths'
import { landingLeadFieldErrors, parseLandingLead } from '../../lib/landings/lead-schema'
import type { ServiceMenuItem } from '../../lib/landings/service-booking'
import type { LandingBlock } from '../../types/landing'

type LeadFormBlock = Extract<LandingBlock, { kind: 'leadForm' }>

interface LandingLeadFormProps {
  block: LeadFormBlock
  slug: string
  services?: ServiceMenuItem[]
  selectedService?: string
  onSelectedService?: (name: string) => void
}

const CONSENT_FALLBACK = 'Acepto que este negocio me contacte sobre mi solicitud.'

function composeBookingMessage(params: {
  service?: string
  slot?: string
  note?: string
}): string | undefined {
  const lines: string[] = []
  if (params.service) lines.push(`Servicio: ${params.service}`)
  if (params.slot) lines.push(`Horario preferido: ${params.slot}`)
  if (params.note) lines.push(params.note)
  const text = lines.join('\n').trim()
  return text.length > 0 ? text : undefined
}

export default function LandingLeadForm({
  block,
  slug,
  services = [],
  selectedService,
  onSelectedService,
}: LandingLeadFormProps) {
  const booking = block.layout === 'booking'
  const slots = block.slotHints ?? []
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [service, setService] = useState(selectedService ?? '')
  const [slot, setSlot] = useState('')
  const [consent, setConsent] = useState(false)
  /** Honeypot: oculto para personas, irresistible para bots de formularios. */
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (selectedService) setService(selectedService)
  }, [selectedService])

  function pickService(name: string) {
    setService(name)
    onSelectedService?.(name)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

    if (booking && services.length > 0 && !service) {
      setErrors({ service: 'Elige un servicio.' })
      return
    }
    if (booking && slots.length > 0 && !slot) {
      setErrors({ slot: 'Elige un horario preferido.' })
      return
    }

    const payload = {
      slug,
      blockId: block.id,
      website: honeypot,
      fullName,
      email: email.trim() ? email : undefined,
      phone: block.fields.phone && phone.trim() ? phone : undefined,
      message: booking
        ? composeBookingMessage({ service, slot, note: message.trim() || undefined })
        : block.fields.message && message.trim()
          ? message
          : undefined,
      consent,
    }

    const parsed = parseLandingLead(payload)
    if (!parsed.success) {
      setErrors(landingLeadFieldErrors(parsed.error))
      return
    }

    setErrors({})
    setSending(true)
    try {
      const res = await fetch(LANDING_LEAD_API_PATH, {
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
      <div className="rounded-xl border border-[var(--lp-primary)]/30 bg-white/80 p-6 text-slate-900">
        <p className="text-lg font-semibold">{block.successTitle}</p>
        <p className="mt-2 text-sm text-slate-600">{block.successBody}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {booking && services.length > 0 ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">1. Servicio</legend>
          <div className="flex flex-wrap gap-2">
            {services.map((item) => {
              const active = service === item.name
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => pickService(item.name)}
                  className={`rounded-full border px-3 py-2 text-left text-sm ${
                    active
                      ? 'border-[var(--lp-primary)] bg-[var(--lp-primary)] text-white'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  <span className="block font-medium">{item.name}</span>
                  {item.priceLabel ? <span className="block text-xs opacity-80">{item.priceLabel}</span> : null}
                </button>
              )
            })}
          </div>
          {errors.service && <p className="mt-1 text-xs text-red-500">{errors.service}</p>}
        </fieldset>
      ) : null}

      {booking && slots.length > 0 ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">2. Horario que te queda</legend>
          <p className="mb-2 text-xs opacity-70">No es el cupo en vivo. Te confirmamos la hora exacta por WhatsApp.</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((hint) => {
              const active = slot === hint
              return (
                <button
                  key={hint}
                  type="button"
                  onClick={() => setSlot(hint)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    active
                      ? 'border-[var(--lp-primary)] bg-[var(--lp-primary)] text-white'
                      : 'border-slate-300 bg-white text-slate-800'
                  }`}
                >
                  {hint}
                </button>
              )
            })}
          </div>
          {errors.slot && <p className="mt-1 text-xs text-red-500">{errors.slot}</p>}
        </fieldset>
      ) : null}

      <div className={booking ? 'space-y-4' : 'space-y-4'}>
        {booking ? <p className="text-sm font-semibold">3. Tus datos</p> : null}

        <div>
          <label htmlFor={`${block.id}-name`} className="mb-1 block text-sm font-medium">
            Nombre
          </label>
          <Input
            id={`${block.id}-name`}
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="bg-white text-slate-900"
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
        </div>

        <div>
          <label htmlFor={`${block.id}-email`} className="mb-1 block text-sm font-medium">
            Correo
          </label>
          <Input
            id={`${block.id}-email`}
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="bg-white text-slate-900"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        {block.fields.phone && (
          <div>
            <label htmlFor={`${block.id}-phone`} className="mb-1 block text-sm font-medium">
              Teléfono o WhatsApp
            </label>
            <Input
              id={`${block.id}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className="bg-white text-slate-900"
              aria-invalid={Boolean(errors.phone)}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>
        )}

        {block.fields.message && (
          <div>
            <label htmlFor={`${block.id}-message`} className="mb-1 block text-sm font-medium">
              {booking ? 'Nota (profesional, detalle)' : 'Mensaje'}
            </label>
            <Textarea
              id={`${block.id}-message`}
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={booking ? 2 : 4}
              className="bg-white text-slate-900"
              aria-invalid={Boolean(errors.message)}
            />
            {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message}</p>}
          </div>
        )}
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${block.id}-website`}>Sitio web</label>
        <input
          id={`${block.id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <label className="flex items-start gap-2 text-xs leading-relaxed">
        <input
          type="checkbox"
          name="consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--lp-primary)]"
        />
        <span>{block.consentText || CONSENT_FALLBACK}</span>
      </label>
      {errors.consent && <p className="text-xs text-red-500">{errors.consent}</p>}

      {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}

      <Button
        type="submit"
        disabled={sending}
        className="h-12 w-full bg-[var(--lp-primary)] text-white shadow-none hover:bg-[var(--lp-primary)] hover:opacity-90"
      >
        {sending ? 'Enviando…' : block.submitLabel}
      </Button>
    </form>
  )
}
