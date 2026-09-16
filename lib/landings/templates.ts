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
    description: 'Copias, impresiones, útiles escolares y trámites de mostrador.',
    slugHint: 'papeleria',
  },
  {
    key: 'barberia',
    label: 'Barbería',
    description: 'Cortes, barba y citas por WhatsApp para barberías de barrio.',
    slugHint: 'barberia',
  },
  {
    key: 'salon_belleza',
    label: 'Salón de Belleza',
    description: 'Uñas, color, tratamientos y paquetes con reserva previa.',
    slugHint: 'salon-de-belleza',
  },
  {
    key: 'comercial',
    label: 'Comercial',
    description: 'Muebles, línea blanca y electrodomésticos con crédito propio.',
    slugHint: 'comercial',
  },
]

const CONSENT_TEXT =
  'Acepto que este negocio me contacte por WhatsApp, teléfono o correo sobre mi solicitud.'

const TEMPLATE_CONTENT: Record<LandingTemplateKey, LandingPageContentInput> = {
  papeleria: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Papelería y copias cerca de ti | Impresiones y útiles',
      seoDescription:
        'Copias en blanco y negro o color, impresiones desde USB, engargolados, plastificado y útiles escolares. Cotiza por WhatsApp y recoge en el local.',
      keywords: 'papelería, copias, impresiones, engargolado, útiles escolares, plastificado',
      noindex: false,
    },
    theme: {
      tone: 'light',
      primary: '#1d4ed8',
      accent: '#f59e0b',
      surface: '#f8fafc',
      font: 'sans',
      radius: 'lg',
    },
    business: {
      name: 'Papelería Tu Nombre',
      tagline: 'Copias, impresiones y útiles a una cuadra de ti',
      address: 'Escribe aquí tu dirección exacta',
      city: 'Tu ciudad',
      mapsQuery: 'papelería cerca de mí',
      socials: {},
    },
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        badge: 'Abierto hoy',
        headline: 'Copias, impresiones y útiles sin hacer fila',
        subheadline:
          'Manda el archivo por WhatsApp, pasa y recógelo listo. Trabajos escolares, trámites y engargolados el mismo día.',
        primaryCta: { label: 'Cotizar por WhatsApp', action: 'whatsapp' },
        secondaryCta: { label: 'Ver precios', action: 'lead-form' },
      },
      {
        id: 'servicios',
        kind: 'items',
        title: 'Servicios de mostrador',
        subtitle: 'Precios de referencia. Ajusta cada línea a tu tarifa real.',
        layout: 'grid',
        items: [
          { name: 'Copia carta B/N', detail: 'Por página, desde 1 copia', priceLabel: 'L. 1' },
          { name: 'Copia carta color', detail: 'Ideal para tareas e informes', priceLabel: 'L. 8' },
          { name: 'Impresión desde USB', detail: 'Carta u oficio, B/N o color', priceLabel: 'Desde L. 2' },
          { name: 'Engargolado', detail: 'Hasta 100 hojas, con portada', priceLabel: 'L. 45' },
          { name: 'Plastificado carta', detail: 'Carnés, diplomas, listas', priceLabel: 'L. 25' },
          { name: 'Escaneo y envío', detail: 'A tu correo o WhatsApp', priceLabel: 'L. 10' },
        ],
      },
      {
        id: 'utiles',
        kind: 'items',
        title: 'Útiles y papelería',
        subtitle: 'Lo que más piden padres, oficinas y estudiantes.',
        layout: 'list',
        items: [
          { name: 'Lista escolar completa', detail: 'La armamos con tu lista del colegio', priceLabel: 'Según lista' },
          { name: 'Resma carta 500 hojas', detail: 'Marca de línea', priceLabel: 'L. 140' },
          { name: 'Cuadernos y folders', detail: 'Unidad o por docena', priceLabel: 'Desde L. 18' },
          { name: 'Tinta y recargas', detail: 'Consulta modelo de impresora', priceLabel: 'Desde L. 120' },
        ],
      },
      {
        id: 'horario',
        kind: 'hours',
        title: 'Horario de atención',
        rows: [
          { label: 'Lunes a viernes', value: '8:00 – 18:00' },
          { label: 'Sábado', value: '8:00 – 14:00' },
          { label: 'Domingo', value: 'Cerrado' },
        ],
        note: 'En temporada escolar abrimos más temprano. Confirma por WhatsApp.',
      },
      {
        id: 'preguntas',
        kind: 'faq',
        title: 'Preguntas frecuentes',
        items: [
          {
            question: '¿Puedo enviar el archivo por WhatsApp?',
            answer: 'Sí. Envía el PDF o la foto, te confirmamos el total y lo dejamos listo para recoger.',
          },
          {
            question: '¿Hacen trabajos urgentes?',
            answer: 'Copias e impresiones salen en minutos. Engargolados y plastificados el mismo día.',
          },
          {
            question: '¿Aceptan tarjeta o transferencia?',
            answer: 'Edita esta respuesta con los medios de pago que realmente aceptas.',
          },
        ],
      },
      {
        id: 'cotizacion',
        kind: 'leadForm',
        title: 'Pide tu cotización',
        subtitle: 'Cuéntanos qué necesitas imprimir o comprar y te respondemos con el total.',
        submitLabel: 'Enviar solicitud',
        consentText: CONSENT_TEXT,
        fields: { phone: true, message: true },
        successTitle: 'Solicitud recibida',
        successBody: 'Te escribimos con el precio y el tiempo de entrega. Revisa también tu correo.',
      },
      {
        id: 'contacto',
        kind: 'contact',
        title: 'Cómo llegar',
        note: 'Estamos sobre la calle principal, con parqueo al frente.',
        showWhatsapp: true,
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showMap: true,
      },
      {
        id: 'cierre',
        kind: 'cta',
        headline: 'Deja de perder el viaje al centro',
        subheadline: 'Tus copias, tus impresiones y tus útiles a la vuelta de la esquina.',
        primaryCta: { label: 'Escribir por WhatsApp', action: 'whatsapp' },
      },
    ],
  },

  barberia: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Barbería cerca de ti | Cortes, barba y citas',
      seoDescription:
        'Corte clásico, fade, perfilado de barba y atención a niños. Reserva por WhatsApp y evita la espera. Encuéntranos en el mapa.',
      keywords: 'barbería, corte de cabello, fade, barba, barbero cerca de mí',
      noindex: false,
    },
    theme: {
      tone: 'dark',
      primary: '#111827',
      accent: '#d4a24a',
      surface: '#0b0f19',
      font: 'sans',
      radius: 'md',
    },
    business: {
      name: 'Barbería Tu Nombre',
      tagline: 'Cortes de barrio, acabado de barbería',
      address: 'Escribe aquí tu dirección exacta',
      city: 'Tu ciudad',
      mapsQuery: 'barbería cerca de mí',
      socials: {},
    },
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        badge: 'Sin cita también te atendemos',
        headline: 'Tu corte listo a la hora que pasas',
        subheadline:
          'Fade, corte clásico y barba con toalla caliente. Aparta tu turno por WhatsApp y llega cuando te toque.',
        primaryCta: { label: 'Apartar turno', action: 'whatsapp' },
        secondaryCta: { label: 'Ver servicios', action: 'lead-form' },
      },
      {
        id: 'servicios',
        kind: 'items',
        title: 'Servicios y precios',
        subtitle: 'Tiempos reales por silla. Ajusta a tu tarifa.',
        layout: 'grid',
        items: [
          { name: 'Corte clásico', detail: 'Máquina y tijera, 30 min', priceLabel: 'L. 150' },
          { name: 'Corte + barba', detail: 'Perfilado con toalla caliente', priceLabel: 'L. 220' },
          { name: 'Fade / diseño', detail: 'Degradado y diseño a pedido', priceLabel: 'L. 200' },
          { name: 'Barba sola', detail: 'Perfilado y aceite', priceLabel: 'L. 90' },
          { name: 'Niños', detail: 'Hasta 12 años', priceLabel: 'L. 120' },
          { name: 'Cejas', detail: 'Perfilado rápido', priceLabel: 'L. 50' },
        ],
      },
      {
        id: 'horario',
        kind: 'hours',
        title: 'Horario',
        rows: [
          { label: 'Lunes a sábado', value: '9:00 – 19:00' },
          { label: 'Domingo', value: '9:00 – 13:00' },
        ],
        note: 'Última silla 30 minutos antes del cierre.',
      },
      {
        id: 'clientes',
        kind: 'testimonials',
        title: 'Lo que dicen los clientes',
        items: [
          {
            author: 'Cliente frecuente',
            role: 'Vecino de la colonia',
            quote: 'Reemplaza esta reseña con una real de tus clientes. Pídela después del corte.',
          },
          {
            author: 'Papá de familia',
            quote: 'Traigo a los dos niños y salimos en media hora. Escribe aquí tu propio testimonio.',
          },
        ],
      },
      {
        id: 'reserva',
        kind: 'leadForm',
        title: 'Aparta tu turno',
        subtitle: 'Déjanos tu nombre y a qué hora te queda mejor.',
        submitLabel: 'Pedir turno',
        consentText: CONSENT_TEXT,
        fields: { phone: true, message: true },
        successTitle: 'Turno solicitado',
        successBody: 'Te confirmamos por WhatsApp la hora disponible más cercana.',
      },
      {
        id: 'contacto',
        kind: 'contact',
        title: 'Dónde estamos',
        note: 'A dos cuadras del parque, portón negro.',
        showWhatsapp: true,
        showPhone: true,
        showEmail: false,
        showAddress: true,
        showMap: true,
      },
      {
        id: 'cierre',
        kind: 'cta',
        headline: 'La silla está libre a la hora que quieras',
        subheadline: 'Escribe y te decimos el turno más cercano de hoy.',
        primaryCta: { label: 'Escribir por WhatsApp', action: 'whatsapp' },
      },
    ],
  },

  salon_belleza: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Salón de belleza cerca de ti | Uñas, color y tratamientos',
      seoDescription:
        'Manicura, pedicura, color, keratina y peinados para eventos. Reserva tu cita por WhatsApp y llega a tu hora.',
      keywords: 'salón de belleza, uñas acrílicas, keratina, tinte, peinado de novia, spa de pies',
      noindex: false,
    },
    theme: {
      tone: 'light',
      primary: '#be185d',
      accent: '#f59ec4',
      surface: '#fff7fb',
      font: 'serif',
      radius: 'lg',
    },
    business: {
      name: 'Salón Tu Nombre',
      tagline: 'Cita puntual, resultado que dura',
      address: 'Escribe aquí tu dirección exacta',
      city: 'Tu ciudad',
      mapsQuery: 'salón de belleza cerca de mí',
      socials: {},
    },
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        badge: 'Citas esta semana',
        headline: 'Tu cita de belleza, sin esperas',
        subheadline:
          'Uñas, color, tratamiento y peinado con hora reservada. Te confirmamos por WhatsApp y respetamos tu tiempo.',
        primaryCta: { label: 'Reservar cita', action: 'lead-form' },
        secondaryCta: { label: 'Ver servicios', action: 'whatsapp' },
      },
      {
        id: 'servicios',
        kind: 'items',
        title: 'Servicios',
        subtitle: 'Duración aproximada por servicio. Ajusta precios a tu salón.',
        layout: 'grid',
        items: [
          { name: 'Manicura tradicional', detail: 'Limado, cutícula y esmalte', priceLabel: 'L. 180' },
          { name: 'Uñas acrílicas', detail: 'Juego completo, 2 h', priceLabel: 'L. 650' },
          { name: 'Pedicura spa', detail: 'Exfoliación y masaje', priceLabel: 'L. 300' },
          { name: 'Tinte / retoque', detail: 'Según largo de cabello', priceLabel: 'Desde L. 700' },
          { name: 'Keratina', detail: 'Alisado y brillo, 3 h', priceLabel: 'Desde L. 1,200' },
          { name: 'Peinado de evento', detail: 'Boda, quince, graduación', priceLabel: 'Desde L. 500' },
        ],
      },
      {
        id: 'paquetes',
        kind: 'items',
        title: 'Paquetes',
        subtitle: 'Combinaciones que ya piden tus clientas.',
        layout: 'list',
        items: [
          { name: 'Manos y pies', detail: 'Manicura + pedicura el mismo día', priceLabel: 'L. 430' },
          { name: 'Novia', detail: 'Prueba, peinado, maquillaje y uñas', priceLabel: 'Cotización' },
          { name: 'Quince años', detail: 'Peinado y maquillaje para la quinceañera', priceLabel: 'Desde L. 900' },
        ],
      },
      {
        id: 'horario',
        kind: 'hours',
        title: 'Horario de citas',
        rows: [
          { label: 'Martes a viernes', value: '9:00 – 18:00' },
          { label: 'Sábado', value: '8:00 – 17:00' },
          { label: 'Domingo y lunes', value: 'Cerrado' },
        ],
        note: 'Los servicios de más de 2 horas requieren cita previa.',
      },
      {
        id: 'preguntas',
        kind: 'faq',
        title: 'Antes de tu cita',
        items: [
          {
            question: '¿Necesito reservar?',
            answer: 'Para uñas, color y keratina sí. Manicura rápida suele tener espacio el mismo día.',
          },
          {
            question: '¿Cuánto dura la keratina?',
            answer: 'Edita esta respuesta con la duración real según el producto que usas.',
          },
        ],
      },
      {
        id: 'reserva',
        kind: 'leadForm',
        title: 'Reserva tu cita',
        subtitle: 'Dinos el servicio y el día que prefieres.',
        submitLabel: 'Solicitar cita',
        consentText: CONSENT_TEXT,
        fields: { phone: true, message: true },
        successTitle: 'Cita solicitada',
        successBody: 'Te confirmamos hora y duración por WhatsApp. Revisa también tu correo.',
      },
      {
        id: 'contacto',
        kind: 'contact',
        title: 'Cómo llegar',
        note: 'Local con parqueo, dentro de la plaza comercial.',
        showWhatsapp: true,
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showMap: true,
      },
      {
        id: 'cierre',
        kind: 'cta',
        headline: 'Aparta tu hora antes de que se llene la semana',
        subheadline: 'Las citas de sábado se agotan primero.',
        primaryCta: { label: 'Reservar ahora', action: 'lead-form' },
      },
    ],
  },

  comercial: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Muebles, línea blanca y electrodomésticos | Crédito propio',
      seoDescription:
        'Salas, comedores, refrigeradoras, lavadoras y estufas con crédito propio y entrega a domicilio. Cotiza tu plan de pagos hoy.',
      keywords: 'muebles, línea blanca, electrodomésticos, refrigeradora, lavadora, crédito propio',
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
      address: 'Escribe aquí tu dirección exacta',
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
          'Con tu identidad y un comprobante de ingreso definimos prima y abono semanal o quincenal. Te entregamos a domicilio dentro de la ciudad y el producto sale con garantía de fábrica. Edita este texto con tus requisitos reales, el plazo máximo y el costo de envío fuera de la ciudad.',
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
            answer: 'Identidad vigente y comprobante de ingreso. Ajusta esta lista a tus requisitos.',
          },
          {
            question: '¿La entrega tiene costo?',
            answer: 'Dentro de la ciudad es gratis. Fuera de la ciudad se cotiza según distancia.',
          },
          {
            question: '¿Los productos tienen garantía?',
            answer: 'Sí, garantía de fábrica. Indica aquí el plazo por categoría.',
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
  }
): LandingPageContent {
  return {
    ...content,
    meta: {
      ...content.meta,
      seoTitle: `${business.name} | ${content.meta.seoTitle}`.slice(0, 70),
    },
    business: {
      ...content.business,
      name: business.name,
      city: business.city ?? content.business.city,
      address: business.address ?? content.business.address,
      whatsapp: business.whatsapp ?? content.business.whatsapp,
      phone: business.phone ?? content.business.phone,
      email: business.email ?? content.business.email,
    },
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

/** Guardia de arranque: verifica que las 4 plantillas obligatorias existan y validen. */
export function assertTemplatesValid(): void {
  for (const key of LANDING_TEMPLATE_KEYS) {
    templateContentFor(key)
  }
}
