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

export const DEMO_LOCAL_PUBLIC_PATH = '/webycitas'
export const DEMO_LOCAL_LEGACY_PATH = '/demo-local'
export const DEMO_LOCAL_API_PATH = '/api/public/send-demo-local-lead'
export const DEMO_LOCAL_ADMIN_PATH = '/app/admin/webycitas'
export const DEMO_LOCAL_ADMIN_API_PATH = '/api/admin/webycitas/leads'
export const DEMO_LOCAL_MARKETING_SOURCE = 'demo-local'
export const WEBYCITAS_LEADS_TABLE = 'webycitas_leads'
export const WEBYCITAS_LEAD_SOURCE = 'webycitas'
export const WEBYCITAS_LEAD_STATUSES = ['received', 'reviewed', 'rejected'] as const
export type WebycitasLeadStatus = (typeof WEBYCITAS_LEAD_STATUSES)[number]

export const WEBYCITAS_RETAIL_RUBROS = [
  'mercadito',
  'papeleria',
  'supermercado',
  'ferreteria',
] as const

export const WEBYCITAS_SERVICE_RUBROS = ['spa', 'clinica', 'barberia', 'salon'] as const

export const WEBYCITAS_FORM_RUBROS = [
  ...WEBYCITAS_RETAIL_RUBROS,
  ...WEBYCITAS_SERVICE_RUBROS,
] as const

/** Rubros que el form ya no ofrece; siguen válidos en filas históricas. */
export const WEBYCITAS_LEGACY_RUBROS = ['cafeteria', 'escuela', 'otro'] as const

export const DEMO_LOCAL_RUBROS = [...WEBYCITAS_FORM_RUBROS, ...WEBYCITAS_LEGACY_RUBROS] as const

export type WebycitasRetailRubro = (typeof WEBYCITAS_RETAIL_RUBROS)[number]
export type WebycitasFormRubro = (typeof WEBYCITAS_FORM_RUBROS)[number]
export type DemoLocalRubro = (typeof DEMO_LOCAL_RUBROS)[number]

export function isRetailRubro(rubro: string): rubro is WebycitasRetailRubro {
  return (WEBYCITAS_RETAIL_RUBROS as readonly string[]).includes(rubro)
}

export function isWebycitasFormRubro(value: string): value is WebycitasFormRubro {
  return (WEBYCITAS_FORM_RUBROS as readonly string[]).includes(value)
}

export const DEMO_LOCAL_SERVICES = ['landing', 'booking'] as const
export type DemoLocalService = (typeof DEMO_LOCAL_SERVICES)[number]

const SERVICE_LABEL: Record<DemoLocalService, string> = {
  landing: 'Página web',
  booking: 'Reservas / citas',
}

export function formatDemoLocalServices(services: readonly DemoLocalService[]): string {
  const unique = DEMO_LOCAL_SERVICES.filter((id) => services.includes(id))
  const chosen = unique.map((id) => SERVICE_LABEL[id]).join(' + ')
  return `${chosen} · Google Maps incluido`
}

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
  papeleria: {
    id: 'papeleria',
    label: 'Papelería',
    shopName: 'Papelería Central',
    neighborhood: 'Frente al colegio, local 2',
    mapsQuery: 'papelería cerca de mí',
    hours: 'Lun–Vie 8:00–18:00 · Sáb 8:00–14:00',
    items: [
      { name: 'Copia carta B/N', detail: 'Por página', price: 'L. 1' },
      { name: 'Impresión color', detail: 'Desde USB o WhatsApp', price: 'L. 8' },
      { name: 'Engargolado', detail: 'Hasta 100 hojas', price: 'L. 45' },
      { name: 'Útiles escolares', detail: 'Lista completa', price: 'Según lista' },
    ],
  },
  supermercado: {
    id: 'supermercado',
    label: 'Supermercado',
    shopName: 'Super La Colonia',
    neighborhood: 'Boulevard principal, parqueo al frente',
    mapsQuery: 'supermercado cerca de mí',
    hours: 'Lun–Dom 7:00–21:00',
    items: [
      { name: 'Canasta básica', detail: 'Arroz, frijol, aceite, azúcar', price: 'Desde L. 180' },
      { name: 'Carnes y lácteos', detail: 'Del día, por peso', price: 'Según peso' },
      { name: 'Abarrotes', detail: 'Limpieza y despensa', price: 'Precio de góndola' },
      { name: 'Entrega a domicilio', detail: 'Radio del barrio', price: 'L. 25' },
    ],
  },
  spa: {
    id: 'spa',
    label: 'Spa',
    shopName: 'Spa Luna',
    neighborhood: 'Plaza del barrio, segundo nivel',
    mapsQuery: 'spa cerca de mí',
    hours: 'Mar–Sáb 9:00–18:00',
    items: [
      { name: 'Masaje relajante', detail: '50 min', price: 'L. 650' },
      { name: 'Facial', detail: 'Limpieza y mascarilla', price: 'L. 480' },
      { name: 'Manicura spa', detail: 'Exfoliación incluida', price: 'L. 280' },
      { name: 'Paquete día', detail: 'Masaje + facial', price: 'L. 1,050' },
    ],
  },
  clinica: {
    id: 'clinica',
    label: 'Clínica',
    shopName: 'Clínica San José',
    neighborhood: 'Media cuadra de la iglesia',
    mapsQuery: 'clínica cerca de mí',
    hours: 'Lun–Vie 8:00–17:00 · Sáb 8:00–12:00',
    items: [
      { name: 'Consulta general', detail: '30 min', price: 'L. 400' },
      { name: 'Control / seguimiento', detail: 'Cita de 20 min', price: 'L. 250' },
      { name: 'Inyectable', detail: 'Con receta', price: 'L. 80' },
      { name: 'Certificado médico', detail: 'El mismo día', price: 'L. 150' },
    ],
  },
  salon: {
    id: 'salon',
    label: 'Salón de belleza',
    shopName: 'Salón Luna',
    neighborhood: 'Plaza comercial, local 4',
    mapsQuery: 'salón de belleza cerca de mí',
    hours: 'Mar–Sáb 9:00–18:00',
    items: [
      { name: 'Manicura', detail: 'Esmalte tradicional', price: 'L. 180' },
      { name: 'Uñas acrílicas', detail: 'Juego completo', price: 'L. 650' },
      { name: 'Tinte / retoque', detail: 'Según largo', price: 'Desde L. 700' },
      { name: 'Peinado de evento', detail: 'Boda, quince, graduación', price: 'Desde L. 500' },
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
    title: 'Más clientes locales: web, reservas y Google Maps | Humano SISU',
    description:
      'Deja de perder ventas en tu zona. Te armamos página, reservas y Perfil de Empresa en Google Maps para que tus vecinos te encuentren y agenden sin llenarte el WhatsApp. Boceto y cotización, sin compromiso.',
    keywords:
      'más clientes negocio local Honduras, Google Maps barbería, reservas citas negocio, ferretería cerca de mí, perfil de empresa Google, landing negocio de barrio',
  },
  hero: {
    kicker: 'Captación de clientes para negocios locales',
    headline: 'Consigue más clientes en tu ciudad y automatiza tus reservas',
    subheadlineLead: 'Crea hoy',
    subheadlineFeatures: 'Página Web, Sistema de Reservas, y Perfil en Google Maps',
    subheadlineTail: 'para que nuevos clientes te encuentren en la zona.',
    mapsBenefit:
      'Tus vecinos te buscan. Si no apareces, le compran al de al lado. El perfil en Maps va incluido.',
    ctaPrimary: 'Probar gratis',
  },
  problem: {
    title: '¿Necesitas más clientes en tu negocio?',
    items: [
      {
        title: 'Eres un “fantasma” en tu zona',
        body: 'Las personas buscan “salón de belleza / taller cerca de mí” en Google y tú no apareces.',
      },
      {
        title: 'Sin sistema de reservas',
        body: 'Te escriben para pedir turno y contestas uno por uno. Sin agenda, se te cruzan las citas o el cliente se va al que sí reserva solo.',
      },
      {
        title: 'Sin ventas por WhatsApp',
        body: 'Te escriben para pedir precio o el mandado y el chat se queda ahí. Sin lista, sin botón de pedido, esa venta no se cierra o se la lleva otro.',
      },
    ],
  },
  offer: {
    title: 'Atrae nuevos clientes con nuestro servicio',
    cta: 'Activar',
    steps: [
      {
        title: 'Página web',
        body: 'Un sitio claro y rápido que muestra tus servicios, precios y genera confianza inmediata en quien te visita.',
      },
      {
        title: 'Sitio de Reservas',
        body: 'Tus clientes agendan según tu disponibilidad. Cero hilos infinitos. La agenda queda organizada.',
      },
      {
        title: 'Perfil de Empresa en Google Maps',
        body: 'Configuramos tu perfil para que aparezcas cuando tus vecinos te busquen en el mapa. Incluido al contratar la página web o las reservas: no se cotiza aparte.',
        badge: 'Incluido · gratis con tu página o tus reservas',
      },
    ],
  },
  form: {
    title: 'Solicitud de servicio',
    submit: 'Activar',
    submitting: 'Enviando…',
    notePlaceholder: 'Cortes, menú… ¿Algo que debamos saber del local?',
    services: {
      legend: 'Qué armamos',
      hint: 'Elige uno o los dos. El perfil de Google Maps se incluye al contratar cualquiera.',
      hintRetail: 'En este rubro armamos la página. El perfil de Google Maps se incluye al contratar.',
      error: 'Elige página web, reservas, o las dos.',
      landingTitle: 'Página web',
      landingBody: 'Tu local en internet: servicios, precios y WhatsApp.',
      bookingTitle: 'Reservas / citas',
      bookingBody: 'Que agenden solos, sin hilos de chat.',
      mapsTitle: 'Perfil de Google Maps',
      mapsBody: 'Incluido al contratar la página o las reservas. No se cotiza aparte.',
      mapsBadge: 'Incluido',
    },
    successTitle: 'Propuesta en camino',
    successBody:
      'Revisa tu correo (y spam). Te escribimos con el boceto, la cotización y para confirmar Maps y dominio.',
    consent:
      'Acepto que Humano SISU me contacte sobre este servicio de página, reservas y Google Maps, y reciba información comercial. Puedo darme de baja cuando quiera.',
    privacy: 'Política de privacidad',
    terms: 'Términos',
    errorConsent: 'Marca el consentimiento para enviar.',
  },
  footer: {
    blurb: 'Más clientes para negocios de barrio. Humano SISU.',
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
  rubro: z.enum(WEBYCITAS_FORM_RUBROS, { message: 'Elige el tipo de negocio.' }),
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
  services: z.preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z
      .array(z.enum(DEMO_LOCAL_SERVICES))
      .min(1, DEMO_LOCAL_COPY.form.services.error)
      .max(2)
      .refine((value) => new Set(value).size === value.length, {
        message: DEMO_LOCAL_COPY.form.services.error,
      })
  ),
  consent: z.boolean().refine((value) => value === true, {
    message: DEMO_LOCAL_COPY.form.errorConsent,
  }),
  website: z.string().max(200).optional(),
}).transform((lead) => ({
  ...lead,
  services: isRetailRubro(lead.rubro) ? (['landing'] as DemoLocalService[]) : lead.services,
}))

export type DemoLocalLeadInput = z.input<typeof demoLocalLeadSchema>
export type DemoLocalLead = z.output<typeof demoLocalLeadSchema>

export function parseDemoLocalLead(body: unknown) {
  return demoLocalLeadSchema.safeParse(body)
}

export function looksLikeDemoLocalBot(lead: DemoLocalLead): boolean {
  return Boolean(lead.website && lead.website.trim().length > 0)
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

export function buildDemoLocalOwnerEmail(
  lead: DemoLocalLead,
  options?: { publicUrl?: string }
): { subject: string; html: string } {
  const catalog = catalogForRubro(lead.rubro)
  const liveUrl = options?.publicUrl
  const pageUrl = liveUrl || `${SEO_BASE_URL}${DEMO_LOCAL_PUBLIC_PATH}`
  const bodyHtml = [
    liquidParagraph(`Hola ${escapeHtml(lead.ownerName)},`),
    liquidParagraph(
      `Recibimos la solicitud para <strong>${escapeHtml(lead.businessName)}</strong> (${escapeHtml(catalog.label)} en ${escapeHtml(lead.city)}).`
    ),
    liveUrl
      ? liquidParagraph(
          `Tu página ya está en Internet. Ábrela, revísala y respóndenos para reclamarla y dejarla permanente. Armamos: <strong>${escapeHtml(formatDemoLocalServices(lead.services))}</strong>. Al contratar, el Perfil de Empresa en Google Maps y un dominio tuyo.`
        )
      : liquidParagraph(
          `Armamos: <strong>${escapeHtml(formatDemoLocalServices(lead.services))}</strong>. El siguiente paso es un boceto. Si contratas, te publicamos el Perfil de Empresa en Google Maps y un dominio tuyo. El modelo de ejemplo vive en SISU hasta esa compra.`
        ),
    liquidParagraph(
      'Te escribimos por este correo o por WhatsApp con el precio y para confirmar zona y el número que quieres publicar. Si no te gusta, no pagas nada.'
    ),
    liquidCta(pageUrl, liveUrl ? 'Ver mi página' : 'Volver a la página del servicio'),
  ].join('')

  return {
    subject: `Tu página local — ${lead.businessName}`,
    html: wrapLiquidEmail({
      title: 'Datos recibidos',
      subtitle: 'Boceto de tu web, reservas y Google Maps para tu negocio de barrio',
      badge: 'Demo local',
      bodyHtml,
      footerNote: 'Humano SISU · presencia digital para negocios locales. Puedes responder este correo.',
    }),
  }
}

export function buildDemoLocalInternalEmail(
  lead: DemoLocalLead,
  receivedAt: Date,
  options?: { publicUrl?: string }
): { subject: string; html: string } {
  const catalog = catalogForRubro(lead.rubro)
  const when = formatDateTimeForHonduras(receivedAt)
  const bodyHtml = [
    liquidParagraph('Nuevo lead de /webycitas (página y/o reservas; Maps incluido al contratar).'),
    liquidParagraph(`Bandeja: ${escapeHtml(DEMO_LOCAL_ADMIN_PATH)}`),
    liquidKeyValueTable([
      { label: 'Dueño', value: lead.ownerName, emphasize: true },
      { label: 'Negocio', value: lead.businessName },
      { label: 'Rubro', value: catalog.label },
      { label: 'Zona', value: lead.city },
      { label: 'Correo', value: lead.email },
      { label: 'Teléfono / WhatsApp', value: lead.phone },
      { label: 'Servicios', value: formatDemoLocalServices(lead.services) },
      { label: 'Nota', value: lead.note || '—' },
      { label: 'Maqueta', value: options?.publicUrl || '—' },
      { label: 'Recibido (HN)', value: when },
    ]),
  ].join('')

  return {
    subject: `Lead webycitas · ${lead.businessName} · ${catalog.label}`,
    html: wrapLiquidEmail({
      title: 'Lead negocio local',
      subtitle: lead.businessName,
      badge: 'Prospección',
      bodyHtml,
      footerNote: 'Aviso interno de captura /webycitas.',
    }),
  }
}
