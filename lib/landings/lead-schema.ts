/**
 * Contrato del formulario público de una landing. Lo comparten el componente
 * y el endpoint /api/landings/lead, así el navegador y el servidor validan lo mismo.
 *
 * El cliente manda `slug`, nunca landing_id ni company_id: el servidor resuelve
 * el tenant desde el slug para que nadie pueda escribir leads en otra empresa.
 */

import { z } from 'zod'

export const LANDING_LEAD_SOURCE = 'landing-page'
export const LANDING_LEAD_MESSAGE_MAX = 1000

export const landingLeadSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(63)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Página no válida.')
      .optional(),
    /** Alternativa al slug para clientes que ya tienen el id (previsualización interna). */
    landingId: z.string().uuid('Página no válida.').optional(),
    /**
     * Honeypot: el formulario lo pinta oculto y una persona nunca lo llena.
     * Si llega con texto, el endpoint responde éxito sin guardar nada.
     */
    website: z.string().max(200).optional(),
    blockId: z
      .string()
      .trim()
      .max(40)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .optional(),
    fullName: z
      .string()
      .trim()
      .min(2, 'Escribe tu nombre.')
      .max(120, 'El nombre es demasiado largo.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), { message: 'Correo no válido.' })
      .optional(),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine((value) => (value.match(/\d/g) || []).length >= 7, {
        message: 'Incluye un teléfono o WhatsApp real.',
      })
      .optional(),
    message: z
      .string()
      .trim()
      .max(LANDING_LEAD_MESSAGE_MAX, `El mensaje no puede pasar de ${LANDING_LEAD_MESSAGE_MAX} caracteres.`)
      .optional(),
    consent: z.boolean().refine((value) => value === true, {
      message: 'Marca el consentimiento para enviar.',
    }),
  })
  .refine((lead) => Boolean(lead.email || lead.phone), {
    message: 'Deja al menos un correo o un teléfono.',
    path: ['email'],
  })
  .refine((lead) => Boolean(lead.slug || lead.landingId), {
    message: 'Falta identificar la página.',
    path: ['slug'],
  })

/** El honeypot es la única señal de bot que no se le muestra al usuario como error. */
export function looksLikeBot(lead: LandingLead): boolean {
  return Boolean(lead.website && lead.website.trim().length > 0)
}

export type LandingLeadInput = z.input<typeof landingLeadSchema>
export type LandingLead = z.output<typeof landingLeadSchema>

export function parseLandingLead(body: unknown) {
  return landingLeadSchema.safeParse(body)
}

/** Primer mensaje por campo, para pintar errores junto a cada input. */
export function landingLeadFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'submit')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
