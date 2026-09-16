/**
 * Contratos de las peticiones del dashboard (/app/landings).
 * Los comparten el cliente y los endpoints, igual que el schema del lead público.
 */

import { z } from 'zod'
import {
  LANDING_TEMPLATE_KEYS,
  landingPageContentSchema,
  landingPhoneSchema,
  landingSlugSchema,
} from './page-schema'

export const landingTitleSchema = z
  .string()
  .trim()
  .min(2, 'El título necesita al menos 2 caracteres.')
  .max(120, 'El título no puede pasar de 120 caracteres.')

export const landingNotifyEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), { message: 'Correo no válido.' })

/** Campo de formulario: vacío → omitido, para no fallar validación en visita de campo. */
function optionalFilled<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
  }, schema.optional())
}

export const createLandingSchema = z.object({
  title: landingTitleSchema,
  slug: landingSlugSchema,
  templateType: z.enum(LANDING_TEMPLATE_KEYS, { message: 'Elige una plantilla.' }),
  city: optionalFilled(z.string().max(80)),
  address: optionalFilled(z.string().max(160)),
  phone: optionalFilled(landingPhoneSchema),
  whatsapp: optionalFilled(landingPhoneSchema),
  email: optionalFilled(landingNotifyEmailSchema),
  leadNotifyEmail: optionalFilled(landingNotifyEmailSchema),
})

export type CreateLandingInput = z.infer<typeof createLandingSchema>

/** Guardado del borrador. Todo opcional: el editor manda solo lo que cambió. */
export const updateLandingSchema = z
  .object({
    title: landingTitleSchema.optional(),
    slug: landingSlugSchema.optional(),
    leadNotifyEmail: landingNotifyEmailSchema.nullable().optional(),
    /** Validación estricta: guardar nunca debe aceptar un JSON del que se pierdan bloques. */
    content: landingPageContentSchema.optional(),
  })
  .refine(
    (payload) =>
      payload.title !== undefined ||
      payload.slug !== undefined ||
      payload.leadNotifyEmail !== undefined ||
      payload.content !== undefined,
    { message: 'No hay cambios que guardar.' }
  )

export type UpdateLandingInput = z.input<typeof updateLandingSchema>

export const publishLandingSchema = z.object({
  action: z.enum(['publish', 'unpublish']),
})

export function parseCreateLanding(body: unknown) {
  return createLandingSchema.safeParse(body)
}

export function parseUpdateLanding(body: unknown) {
  return updateLandingSchema.safeParse(body)
}

export function parsePublishLanding(body: unknown) {
  return publishLandingSchema.safeParse(body)
}
