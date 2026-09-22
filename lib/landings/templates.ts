/**
 * Plantillas base del constructor: JSON inicial por nicho.
 * Cada plantilla es solo datos; el motor de render las interpreta igual que una página ya editada.
 */

import {
  LANDING_SCHEMA_VERSION,
  LANDING_TEMPLATE_KEYS,
  landingPageContentSchema,
  slugifyBusinessName,
  type LandingPageContent,
  type LandingPageContentInput,
  type LandingTemplateKey,
} from './page-schema'
import { brandedSeoTitle } from './seo-title'
import { RETAIL_VISIT_TEMPLATE_CONTENT } from './retail-visit'
import { SERVICE_BOOKING_TEMPLATE_CONTENT } from './service-booking'

export interface LandingTemplateOption {
  key: LandingTemplateKey
  label: string
  description: string
  /** Sugerencia de slug cuando la empresa aún no eligió nombre de página. */
  slugHint: string
}

export const LANDING_TEMPLATE_OPTIONS: readonly LandingTemplateOption[] = [
  {
    key: 'papeleria',
    label: 'Papelería',
    description: 'Visita al local: copias, impresiones y útiles de mostrador.',
    slugHint: 'papeleria',
  },
  {
    key: 'barberia',
    label: 'Barbería',
    description: 'Cortes y barba con reserva en tres pasos y precios a la vista.',
    slugHint: 'barberia',
  },
  {
    key: 'salon_belleza',
    label: 'Salón de Belleza',
    description: 'Uñas, color y keratina con menú, estilista y cita reservada.',
    slugHint: 'salon-de-belleza',
  },
  {
    key: 'spa',
    label: 'Spa',
    description: 'Masaje y facial con terapeuta, precios claros y reserva en tres pasos.',
    slugHint: 'spa',
  },
  {
    key: 'comercial',
    label: 'Comercial',
    description: 'Muebles, línea blanca y electrodomésticos con crédito propio.',
    slugHint: 'comercial',
  },
  {
    key: 'ferreteria',
    label: 'Ferretería',
    description: 'Visita al local: materiales, carga y pasillos de ferretería.',
    slugHint: 'ferreteria',
  },
  {
    key: 'mercadito',
    label: 'Mercadito',
    description: 'Visita al local: canasta, lácteos y verdura de la cuadra.',
    slugHint: 'mercadito',
  },
  {
    key: 'supermercado',
    label: 'Supermercado',
    description: 'Visita a tienda: pasillos, horario y cómo llegar.',
    slugHint: 'supermercado',
  },
  {
    key: 'clinica',
    label: 'Clínica',
    description: 'Consulta con proceso de primera visita, equipo y cita reservada.',
    slugHint: 'clinica',
  },
]

const CONSENT_TEXT =
  'Acepto que este negocio me contacte por WhatsApp, teléfono o correo sobre mi solicitud.'

const TEMPLATE_CONTENT: Record<LandingTemplateKey, LandingPageContentInput> = {
  papeleria: RETAIL_VISIT_TEMPLATE_CONTENT.papeleria,
  barberia: SERVICE_BOOKING_TEMPLATE_CONTENT.barberia,
  salon_belleza: SERVICE_BOOKING_TEMPLATE_CONTENT.salon_belleza,
  spa: SERVICE_BOOKING_TEMPLATE_CONTENT.spa,
  comercial: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Muebles y línea blanca',
      seoDescription:
        'Salas, comedores, refrigeradoras y lavadoras con crédito propio y entrega a domicilio. Cotiza tu plan de pagos hoy.',
      keywords: 'muebles, línea blanca, electrodomésticos, crédito propio',
      noindex: false,
    },
    theme: {
      tone: 'light',
      primary: '#1f2937',
      accent: '#ea580c',
      surface: '#f8fafc',
      font: 'sans',
      radius: 'md',
    },
    business: {
      name: 'Comercial Tu Nombre',
      tagline: 'Muebles y línea blanca con crédito que sí aprueban',
      address: 'Boulevard principal, sala de ventas',
      city: 'Tu ciudad',
      mapsQuery: 'mueblería cerca de mí',
      socials: {},
    },
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        badge: 'Crédito propio · Entrega a domicilio',
        headline: 'Amuebla hoy y paga por abonos',
        subheadline:
          'Salas, comedores, refrigeradoras y lavadoras con plan de pagos sin banco. Cotiza y te decimos la prima exacta.',
        primaryCta: { label: 'Cotizar mi plan', action: 'lead-form' },
        secondaryCta: { label: 'Preguntar por WhatsApp', action: 'whatsapp' },
      },
      {
        id: 'muebles',
        kind: 'items',
        title: 'Muebles',
        subtitle: 'Precios de contado. El plan por abonos se cotiza aparte.',
        layout: 'grid',
        items: [
          { name: 'Sala 3 piezas', detail: 'Tela antimanchas, varios colores', priceLabel: 'Desde L. 9,800' },
          { name: 'Comedor 6 sillas', detail: 'Madera con vidrio templado', priceLabel: 'Desde L. 7,500' },
          { name: 'Cama matrimonial', detail: 'Base, cabecera y colchón', priceLabel: 'Desde L. 6,200' },
          { name: 'Ropero 3 puertas', detail: 'Con espejo y cajones', priceLabel: 'Desde L. 4,300' },
        ],
      },
      {
        id: 'linea-blanca',
        kind: 'items',
        title: 'Línea blanca y electrodomésticos',
        subtitle: 'Marcas con garantía y servicio en la ciudad.',
        layout: 'grid',
        items: [
          { name: 'Refrigeradora 11 pies', detail: 'No frost, garantía 1 año', priceLabel: 'Desde L. 11,500' },
          { name: 'Lavadora 18 libras', detail: 'Carga superior', priceLabel: 'Desde L. 8,900' },
          { name: 'Estufa 4 quemadores', detail: 'Gas, con horno', priceLabel: 'Desde L. 6,400' },
          { name: 'Televisor 43"', detail: 'Smart TV, control incluido', priceLabel: 'Desde L. 7,200' },
          { name: 'Microondas', detail: '0.7 pies, digital', priceLabel: 'Desde L. 2,300' },
          { name: 'Abanico de torre', detail: '3 velocidades', priceLabel: 'Desde L. 1,100' },
        ],
      },
      {
        id: 'credito',
        kind: 'text',
        title: 'Cómo funciona el crédito',
        body:
          'Con tu identidad y un comprobante de ingreso definimos prima y abono semanal o quincenal. Te entregamos a domicilio dentro de la ciudad y el producto sale con garantía de fábrica. Plazo de 3 a 12 meses según el monto.',
      },
      {
        id: 'horario',
        kind: 'hours',
        title: 'Horario de sala de ventas',
        rows: [
          { label: 'Lunes a viernes', value: '8:00 – 18:00' },
          { label: 'Sábado', value: '8:00 – 17:00' },
          { label: 'Domingo', value: '9:00 – 13:00' },
        ],
      },
      {
        id: 'preguntas',
        kind: 'faq',
        title: 'Preguntas frecuentes',
        items: [
          {
            question: '¿Qué necesito para el crédito?',
            answer: 'Identidad vigente y un comprobante de ingreso. La aprobación es el mismo día con los papeles en mano.',
          },
          {
            question: '¿La entrega tiene costo?',
            answer: 'Dentro de la ciudad es gratis. Fuera de la ciudad se cotiza según la distancia.',
          },
          {
            question: '¿Los productos tienen garantía?',
            answer: 'Sí. Un año de garantía de fábrica en línea blanca y 90 días en muebles por defectos de costura.',
          },
        ],
      },
      {
        id: 'cotizacion',
        kind: 'leadForm',
        title: 'Cotiza tu plan de pagos',
        subtitle: 'Dinos qué producto te interesa y cuánto puedes dar de prima.',
        submitLabel: 'Quiero mi cotización',
        consentText: CONSENT_TEXT,
        fields: { phone: true, message: true },
        successTitle: 'Cotización en camino',
        successBody: 'Un asesor te contacta con prima, abono y fecha de entrega.',
      },
      {
        id: 'contacto',
        kind: 'contact',
        title: 'Visita la sala de ventas',
        note: 'Sobre el boulevard, con parqueo y área de carga.',
        showWhatsapp: true,
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showMap: true,
      },
      {
        id: 'cierre',
        kind: 'cta',
        headline: 'Llévalo hoy, págalo por abonos',
        subheadline: 'Aprobación el mismo día con tus documentos en mano.',
        primaryCta: { label: 'Cotizar ahora', action: 'lead-form' },
      },
    ],
  },
  ferreteria: RETAIL_VISIT_TEMPLATE_CONTENT.ferreteria,
  mercadito: RETAIL_VISIT_TEMPLATE_CONTENT.mercadito,
  supermercado: RETAIL_VISIT_TEMPLATE_CONTENT.supermercado,
  clinica: SERVICE_BOOKING_TEMPLATE_CONTENT.clinica,
}

/**
 * JSON inicial de la plantilla, ya validado y clonado.
 * Lanza si una constante rompe el contrato: es un bug de código, no input de usuario.
 */
export function templateContentFor(key: LandingTemplateKey): LandingPageContent {
  return landingPageContentSchema.parse(structuredClone(TEMPLATE_CONTENT[key]))
}

/** Sobrescribe los datos del negocio sobre la plantilla recién creada. */
export function applyBusinessToTemplate(
  content: LandingPageContent,
  business: {
    name: string
    city?: string
    address?: string
    whatsapp?: string
    phone?: string
    email?: string
  },
  options?: { noindex?: boolean }
): LandingPageContent {
  const hero = content.blocks.find((block) => block.kind === 'hero')
  const ogFromHero = hero && hero.kind === 'hero' ? hero.imageUrl : undefined
  const city = business.city ?? content.business.city

  return {
    ...content,
    meta: {
      ...content.meta,
      seoTitle: brandedSeoTitle(business.name, content.meta.seoTitle),
      ogImageUrl: content.meta.ogImageUrl ?? ogFromHero,
      noindex: options?.noindex ?? content.meta.noindex,
    },
    business: {
      ...content.business,
      name: business.name,
      city,
      address: business.address ?? content.business.address,
      whatsapp: business.whatsapp ?? content.business.whatsapp,
      phone: business.phone ?? content.business.phone,
      email: business.email ?? content.business.email,
      mapsQuery:
        [business.address, business.city].filter(Boolean).join(', ') || content.business.mapsQuery,
    },
    blocks: content.blocks.map((block) => {
      if (block.kind === 'hero' && block.layout === 'visit' && city) {
        return { ...block, badge: city }
      }
      return block
    }),
  }
}

export function templateOption(key: LandingTemplateKey): LandingTemplateOption {
  const found = LANDING_TEMPLATE_OPTIONS.find((option) => option.key === key)
  if (!found) throw new Error(`Plantilla desconocida: ${key}`)
  return found
}

export function templateLabel(key: LandingTemplateKey): string {
  return templateOption(key).label
}

/** Slug candidato para una página nueva: nombre del negocio, con la plantilla como respaldo. */
export function suggestedSlugFor(key: LandingTemplateKey, businessName?: string): string {
  const fromName = businessName ? slugifyBusinessName(businessName) : ''
  return fromName.length >= 3 ? fromName : templateOption(key).slugHint
}

/** Guardia de arranque: verifica que las plantillas existan y validen. */
export function assertTemplatesValid(): void {
  for (const key of LANDING_TEMPLATE_KEYS) {
    templateContentFor(key)
  }
}
