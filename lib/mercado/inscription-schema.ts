/**
 * Contrato del formulario público de inscripción al directorio.
 * Lo comparten el componente y POST /api/mercado/inscriptions.
 * No crea vendor, slug ni ficha: solo una solicitud pendiente de revisión.
 */

import { z } from 'zod'

export const VENDOR_APPLICATIONS_TABLE = 'vendor_applications'
export const VENDOR_APPLICATION_SOURCE = 'mercado-public'
export const VENDOR_APPLICATION_STATUSES = ['received', 'reviewed', 'rejected'] as const

export type VendorApplicationStatus = (typeof VENDOR_APPLICATION_STATUSES)[number]

export const mercadoInscriptionSchema = z.object({
  stallNumber: z
    .string()
    .trim()
    .min(1, 'Escribe el número de local.')
    .max(40, 'El número de local no puede pasar de 40 caracteres.')
    .refine((value) => /[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(value), {
      message: 'Incluye el número o la ubicación del local.',
    }),
  merchantName: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre del comerciante.')
    .max(80, 'El nombre del comerciante no puede pasar de 80 caracteres.'),
  businessName: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre del comercio.')
    .max(80, 'El nombre del comercio no puede pasar de 80 caracteres.'),
  /**
   * Honeypot: el formulario lo pinta oculto y una persona nunca lo llena.
   * Si llega con texto, el endpoint responde éxito sin guardar nada.
   */
  website: z.string().max(200).optional(),
})

export type MercadoInscriptionInput = z.input<typeof mercadoInscriptionSchema>
export type MercadoInscription = z.output<typeof mercadoInscriptionSchema>

export function parseMercadoInscription(body: unknown) {
  return mercadoInscriptionSchema.safeParse(body)
}

export function looksLikeInscriptionBot(inscription: MercadoInscription): boolean {
  return Boolean(inscription.website && inscription.website.trim().length > 0)
}

export function mercadoInscriptionFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'submit')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
