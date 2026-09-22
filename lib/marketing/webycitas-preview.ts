/**
 * Mapeo rubro → plantilla y JSON de preview. Seguro para el bundle del lead magnet.
 * Retail (mercadito, papelería, súper, ferretería) usa la plantilla de visita
 * copiada de /mercadosanpablosiguav2. Service (barbería, salón, spa, clínica)
 * usa la plantilla de reserva. El insert en landing_pages vive en webycitas-publish.ts.
 */

import { landingPhoneSchema } from '../landings/page-schema'
import { applyBusinessToTemplate, templateContentFor } from '../landings/templates'
import type { LandingTemplateKey, PublicLandingPage } from '../../types/landing'
import {
  catalogForRubro,
  isRetailRubro,
  isWebycitasFormRubro,
  type DemoLocalRubro,
  type DemoLocalService,
  type WebycitasFormRubro,
} from './demo-local'

const RUBRO_TEMPLATE: Record<WebycitasFormRubro, LandingTemplateKey> = {
  mercadito: 'mercadito',
  papeleria: 'papeleria',
  supermercado: 'supermercado',
  ferreteria: 'ferreteria',
  spa: 'spa',
  clinica: 'clinica',
  barberia: 'barberia',
  salon: 'salon_belleza',
}

export function templateKeyForRubro(rubro: DemoLocalRubro | string): LandingTemplateKey {
  if (isWebycitasFormRubro(rubro)) return RUBRO_TEMPLATE[rubro]
  return 'comercial'
}

export function coerceServicesForRubro(
  rubro: string,
  services: readonly DemoLocalService[]
): DemoLocalService[] {
  if (isRetailRubro(rubro)) return ['landing']
  const unique = Array.from(new Set(services)).filter(
    (item): item is DemoLocalService => item === 'landing' || item === 'booking'
  )
  return unique.length > 0 ? unique : ['landing']
}

export function buildWebycitasPreviewContent(input: {
  rubro: DemoLocalRubro | string
  businessName: string
  city: string
  phone: string
  email?: string
}) {
  const templateKey = templateKeyForRubro(input.rubro)
  const catalog = catalogForRubro(input.rubro)
  const name = input.businessName.trim() || catalog.shopName
  const city = input.city.trim()
  const phoneParsed = landingPhoneSchema.safeParse(input.phone.trim())
  const phone = phoneParsed.success ? phoneParsed.data : undefined

  return applyBusinessToTemplate(
    templateContentFor(templateKey),
    {
      name,
      city: city || undefined,
      whatsapp: phone,
      phone,
      email: input.email,
    },
    { noindex: true }
  )
}

export function buildWebycitasPreviewPage(input: {
  rubro: DemoLocalRubro | string
  businessName: string
  city: string
  phone: string
  slug?: string
}): PublicLandingPage {
  const name = input.businessName.trim() || catalogForRubro(input.rubro).shopName
  return {
    id: 'webycitas-preview',
    slug: input.slug || 'preview-local',
    title: name,
    templateType: templateKeyForRubro(input.rubro),
    content: buildWebycitasPreviewContent(input),
  }
}
