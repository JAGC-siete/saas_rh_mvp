import { z } from 'zod'
import { SEO_BASE_URL } from '../seo/assets'
import {
  escapeHtml,
  liquidCta,
  liquidKeyValueTable,
  liquidParagraph,
  wrapLiquidEmail,
} from '../emails/liquid-layout'
import { formatDateTimeForHonduras } from '../timezone'

export const DEMO_LOCAL_PUBLIC_PATH = '/demo-local'
export const DEMO_LOCAL_API_PATH = '/api/public/send-demo-local-lead'
export const DEMO_LOCAL_MARKETING_SOURCE = 'demo-local'
export const DEMO_LOCAL_LEAD_SOURCE = 'demo-local'

export const DEMO_LOCAL_RUBROS = [
  'barberia',
  'ferreteria',
  'cafeteria',
  'mercadito',
  'escuela',
  'otro',
] as const

export type DemoLocalRubro = (typeof DEMO_LOCAL_RUBROS)[number]

export interface DemoLocalCatalogItem {
  name: string
  detail: string
  price: string
}

export interface DemoLocalCatalog {
  id: DemoLocalRubro
  label: string
  shopName: string
  neighborhood: string
  mapsQuery: string
  hours: string
  items: DemoLocalCatalogItem[]
}

export const DEMO_LOCAL_CATALOGS: Record<DemoLocalRubro, DemoLocalCatalog> = {
  barberia: {
    id: 'barberia',
    label: 'Barbería',
    shopName: 'Barbería El Corte',
    neighborhood: 'Comayagüela, 2 cuadras del parque',
    mapsQuery: 'barbería cerca de mí',
    hours: 'Lun–Sáb 9:00–19:00',
    items: [
      { name: 'Corte clásico', detail: 'Máquina + tijera, 30 min', price: 'L. 150' },
      { name: 'Corte + barba', detail: 'Perfilado con toalla caliente', price: 'L. 220' },
      { name: 'Fade / diseño', detail: 'Degradado y diseño a pedido', price: 'L. 200' },
      { name: 'Niños', detail: 'Hasta 12 años', price: 'L. 120' },
    ],
  },
  ferreteria: {
    id: 'ferreteria',
    label: 'Ferretería',
    shopName: 'Ferretería El Clavo',
    neighborhood: 'Boulevard del Norte, frente al mercado',
    mapsQuery: 'ferretería cerca de mí',
    hours: 'Lun–Sáb 7:30–18:00',
    items: [
      { name: 'Taladro 1/2"', detail: 'Uso profesional, garantía local', price: 'L. 1,250' },
      { name: 'Pintura interior 1 gal', detail: 'Blanco y colores de línea', price: 'L. 385' },
      { name: 'Kit tornillería', detail: 'Caja surtida 200 pzas', price: 'L. 95' },
      { name: 'Manguera 15 m', detail: 'Jardín / obra ligera', price: 'L. 210' },
    ],
  },
  cafeteria: {
    id: 'cafeteria',
    label: 'Cafetería',
    shopName: 'Café La Esquina',
    neighborhood: 'Colonia Palmira, esquina con la 2a',
    mapsQuery: 'café cerca de mí',
    hours: 'Lun–Dom 7:00–20:00',
    items: [
      { name: 'Café de olla', detail: 'Tostión local, 12 oz', price: 'L. 45' },
      { name: 'Capuchino', detail: 'Leche entera o de avena', price: 'L. 65' },
      { name: 'Desayuno del día', detail: 'Huevos, frijoles, plátano, tortillas', price: 'L. 95' },
      { name: 'Pan de banano', detail: 'Horneado en casa', price: 'L. 38' },
    ],
  },
  mercadito: {
    id: 'mercadito',
    label: 'Mercadito',
    shopName: 'Mercadito Don Chepe',
    neighborhood: 'Barrio Abajo, a media cuadra de la iglesia',
    mapsQuery: 'abarrotería cerca de mí',
    hours: 'Lun–Dom 6:30–21:00',
    items: [
      { name: 'Canasta básica', detail: 'Arroz, frijol, azúcar, aceite', price: 'Desde L. 180' },
      { name: 'Lácteos del día', detail: 'Leche, queso, crema', price: 'Según peso' },
      { name: 'Recarga / pagos', detail: 'Claro, Tigo, energía', price: 'Sin recargo' },
      { name: 'Entrega a domicilio', detail: 'Radio 8 cuadras, pedido mínimo', price: 'L. 25' },
    ],
  },
  escuela: {
    id: 'escuela',
    label: 'Escuela / academia',
    shopName: 'Academia Los Pinos',
    neighborhood: 'Residencial La Hacienda, portón 3',
    mapsQuery: 'academia cerca de mí',
    hours: 'Lun–Vie 13:00–18:00 · Sáb 8:00–12:00',
    items: [
      { name: 'Refuerzo escolar', detail: 'Matemática y español, 1 h', price: 'L. 180' },
      { name: 'Inglés niños', detail: 'Grupo de 6, 2 sesiones/sem', price: 'L. 850 / mes' },
      { name: 'Computación', detail: 'Office + internet seguro', price: 'L. 700 / mes' },
      { name: 'Inscripción', detail: 'Una vez al año lectivo', price: 'L. 200' },
    ],
  },
  otro: {
    id: 'otro',
    label: 'Otro oficio',
    shopName: 'Tu negocio en la zona',
    neighborhood: 'Tu colonia, tu cuadra, tu horario',
    mapsQuery: 'negocio cerca de mí',
    hours: 'El horario que hoy das de palabra',
    items: [
      { name: 'Servicio principal', detail: 'Lo que la gente ya te pide en persona', price: 'Tu precio' },
      { name: 'Combo / paquete', detail: 'Para quien llega recomendado', price: 'Tu combo' },
      { name: 'Atención a domicilio', detail: 'Si ya sales a la colonia', price: 'A convenir' },
      { name: 'Pedido por WhatsApp', detail: 'El mismo número que ya usas', price: 'Sin fila' },
    ],
  },
}

export function catalogForRubro(rubro: string | undefined): DemoLocalCatalog {
  if (rubro && DEMO_LOCAL_RUBROS.includes(rubro as DemoLocalRubro)) {
    return DEMO_LOCAL_CATALOGS[rubro as DemoLocalRubro]
  }
  return DEMO_LOCAL_CATALOGS.barberia
}

export const DEMO_LOCAL_COPY = {
  seo: {
    title: 'Página, Google Maps y reservas para tu negocio local | Humano SISU',
    description:
      'Servicio para barberías, ferreterías y locales de barrio: te armamos la página, el sistema de reservas y WhatsApp. Al contratar, te publicamos en Google Maps y en un dominio tuyo. Ves un modelo primero. Te cotizamos al confirmar el local.',
    keywords:
      'página web negocio local Honduras, Google Maps barbería, reservas citas negocio, ferretería cerca de mí, presencia digital MIPYME, landing negocio de barrio',
  },
  hero: {
    kicker: 'Página · Google Maps · Reservas · WhatsApp',
    headline: 'Tu comercio local en Internet hoy',
    subheadline: 'Página web, Sistema de reservas, y Whatsapp',
    mapsBenefit:
      'Aparece primero cuando tus vecinos busquen lo que ofreces. Facilítales contactarte o reservar en el momento.',
    ctaPrimary: 'Quiero mi página y Maps',
  },
  offer: {
    title: 'Cómo lo hacemos',
    steps: [
      {
        title: 'Tu página y sistema de reservas',
        body: 'Publicamos tus servicios y horarios. Tus clientes podrán agendar una cita directamente o escribirte por WhatsApp a un solo clic.',
      },
      {
        title: 'Aparece en Google Maps',
        body: 'Listamos tu negocio en Google maps para que sea encontrado en la búsqueda',
      },
    ],
  },
  form: {
    title: 'Dejanos los datos del local',
    subtitle:
      'Con esto armamos el modelo y te cotizamos. No es el alta del sitio final.',
    bullets: [
      'Nombre del local y de quien atiende.',
      'WhatsApp que querés publicar.',
      'Colonia o ciudad para Maps.',
    ],
    submit: 'Pedir que armen mi página',
    submitting: 'Enviando…',
    notePlaceholder: 'Cortes, menú... ¿Necesitas que agenden citas?',
    bookingLabel: 'Quiero incluir un sistema para recibir reservas/citas',
    successTitle: 'Datos recibidos',
    successBody:
      'Revisá tu correo (y spam). Te escribimos para armar el modelo, cotizarte y confirmar Maps y dominio.',
    consent:
      'Acepto que Humano SISU me contacte sobre este servicio de página, reservas y Google Maps, y reciba información comercial. Puedo darme de baja cuando quiera.',
    privacy: 'Política de privacidad',
    terms: 'Términos',
    errorConsent: 'Marcá el consentimiento para enviar.',
  },
  close: {
    headline: 'Siguiente paso: armar tu modelo y cotizarte.',
    sub: 'Página + reservas + WhatsApp + Google Maps. Dominio propio cuando contratás.',
    primary: 'Quiero mi página y Maps',
  },
  footer: {
    blurb: 'Presencia digital para negocios de barrio. Humano SISU.',
    payrollNote: 'Planilla y asistencia son otro producto.',
    payrollCta: 'Software de RRHH',
  },
} as const

export const demoLocalLeadSchema = z.object({
  ownerName: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre de quien atiende o del dueño.')
    .max(80, 'El nombre es demasiado largo.'),
  businessName: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre del negocio.')
    .max(120, 'El nombre del negocio es demasiado largo.'),
  email: z
    .string()
    .trim()
    .min(5, 'Correo no válido.')
    .max(254, 'El correo es demasiado largo.')
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Correo no válido.',
    })
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(8, 'Teléfono o WhatsApp demasiado corto.')
    .max(30, 'Teléfono demasiado largo.')
    .refine((value) => (value.match(/\d/g) || []).length >= 7, {
      message: 'Incluye un número de teléfono o WhatsApp real.',
    }),
  rubro: z.enum(DEMO_LOCAL_RUBROS, { message: 'Elige el tipo de negocio.' }),
  city: z
    .string()
    .trim()
    .min(2, 'Escribe ciudad o colonia.')
    .max(80, 'La zona es demasiado larga.'),
  note: z
    .string()
    .trim()
    .max(500, 'La nota no puede pasar de 500 caracteres.')
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  wantsBooking: z.boolean().default(false),
  consent: z.boolean().refine((value) => value === true, {
    message: DEMO_LOCAL_COPY.form.errorConsent,
  }),
})

export type DemoLocalLeadInput = z.input<typeof demoLocalLeadSchema>
export type DemoLocalLead = z.output<typeof demoLocalLeadSchema>

export function parseDemoLocalLead(body: unknown) {
  return demoLocalLeadSchema.safeParse(body)
}

export function demoLocalFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'submit')
    if (!out[key]) out[key] = issue.message
  }
  return out
}

export function rubroLabel(rubro: DemoLocalRubro): string {
  return DEMO_LOCAL_CATALOGS[rubro].label
}

export function buildDemoLocalOwnerEmail(lead: DemoLocalLead): { subject: string; html: string } {
  const catalog = catalogForRubro(lead.rubro)
  const pageUrl = `${SEO_BASE_URL}${DEMO_LOCAL_PUBLIC_PATH}`
  const bodyHtml = [
    liquidParagraph(`Hola ${escapeHtml(lead.ownerName)},`),
    liquidParagraph(
      `Recibimos la solicitud para <strong>${escapeHtml(lead.businessName)}</strong> (${escapeHtml(catalog.label)} en ${escapeHtml(lead.city)}).`
    ),
    liquidParagraph(
      'El servicio es este: te armamos la página del local (nombre, servicios o menú, horario, WhatsApp y citas). Si lo contratás, te publicamos en Google Maps y en un dominio tuyo. El modelo de ejemplo vive en SISU hasta esa compra.'
    ),
    liquidParagraph(
      'Te escribimos por este correo o por WhatsApp para armar el modelo, pasarte el precio y confirmar zona y el número que querés publicar.'
    ),
    liquidCta(pageUrl, 'Volver a la página del servicio'),
  ].join('')

  return {
    subject: `Tu página local — ${lead.businessName}`,
    html: wrapLiquidEmail({
      title: 'Datos recibidos',
      subtitle: 'Página, reservas y Google Maps para tu negocio de barrio',
      badge: 'Demo local',
      bodyHtml,
      footerNote: 'Humano SISU · presencia digital para negocios locales. Puedes responder este correo.',
    }),
  }
}

export function buildDemoLocalInternalEmail(lead: DemoLocalLead, receivedAt: Date): { subject: string; html: string } {
  const catalog = catalogForRubro(lead.rubro)
  const when = formatDateTimeForHonduras(receivedAt)
  const bodyHtml = [
    liquidParagraph('Nuevo lead de /demo-local (presencia digital: página + reservas + Maps, cotizar).'),
    liquidKeyValueTable([
      { label: 'Dueño', value: lead.ownerName, emphasize: true },
      { label: 'Negocio', value: lead.businessName },
      { label: 'Rubro', value: catalog.label },
      { label: 'Zona', value: lead.city },
      { label: 'Correo', value: lead.email },
      { label: 'Teléfono / WhatsApp', value: lead.phone },
      { label: 'Reservas / citas', value: lead.wantsBooking ? 'Sí' : 'No' },
      { label: 'Nota', value: lead.note || '—' },
      { label: 'Recibido (HN)', value: when },
    ]),
  ].join('')

  return {
    subject: `Lead demo-local · ${lead.businessName} · ${catalog.label}`,
    html: wrapLiquidEmail({
      title: 'Lead negocio local',
      subtitle: lead.businessName,
      badge: 'Prospección',
      bodyHtml,
      footerNote: 'Aviso interno de captura /demo-local.',
    }),
  }
}
