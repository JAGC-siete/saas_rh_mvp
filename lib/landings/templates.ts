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
import { LANDING_STOCK } from './stock'

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
  {
    key: 'ferreteria',
    label: 'Ferretería',
    description: 'Tornillería, pintura, herramientas y pedido por WhatsApp.',
    slugHint: 'ferreteria',
  },
  {
    key: 'mercadito',
    label: 'Mercadito',
    description: 'Abarrotes, recargas y entrega a domicilio en la colonia.',
    slugHint: 'mercadito',
  },
  {
    key: 'supermercado',
    label: 'Supermercado',
    description: 'Canasta básica, ofertas de la semana y recoger en tienda.',
    slugHint: 'supermercado',
  },
  {
    key: 'clinica',
    label: 'Clínica',
    description: 'Consultas, controles y citas con horario reservado.',
    slugHint: 'clinica',
  },
]

const CONSENT_TEXT =
  'Acepto que este negocio me contacte por WhatsApp, teléfono o correo sobre mi solicitud.'

const TEMPLATE_CONTENT: Record<LandingTemplateKey, LandingPageContentInput> = {
  papeleria: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Copias e impresiones',
      seoDescription:
        'Copias B/N y color, impresiones desde USB o WhatsApp, engargolados y útiles escolares. Recoge en el local el mismo día.',
      keywords: 'papelería, copias, impresiones, engargolado, útiles escolares',
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
      address: 'Calle principal, frente al colegio',
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
        subtitle: 'Precios de mostrador. Confirmamos el total al ver el archivo.',
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
          { name: 'Lista escolar completa', detail: 'La armamos con la lista del colegio', priceLabel: 'Según lista' },
          { name: 'Resma carta 500 hojas', detail: 'Marca de línea', priceLabel: 'L. 140' },
          { name: 'Cuadernos y folders', detail: 'Unidad o por docena', priceLabel: 'Desde L. 18' },
          { name: 'Tinta y recargas', detail: 'Consulta el modelo de impresora', priceLabel: 'Desde L. 120' },
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
            answer:
              'Sí. Envía el PDF o la foto, te confirmamos el total y lo dejamos listo para recoger el mismo día.',
          },
          {
            question: '¿Hacen trabajos urgentes?',
            answer: 'Copias e impresiones salen en minutos. Engargolados y plastificados, el mismo día.',
          },
          {
            question: '¿Aceptan tarjeta o transferencia?',
            answer: 'Efectivo, transferencia y tarjeta. El total se confirma antes de imprimir.',
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
      seoTitle: 'Cortes y barba',
      seoDescription:
        'Corte clásico, fade, perfilado de barba y atención a niños. Reserva por WhatsApp y evita la espera.',
      keywords: 'barbería, corte de cabello, fade, barba, barbero cerca de mí',
      ogImageUrl: LANDING_STOCK.barberiaHero,
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
      address: 'A dos cuadras del parque, portón negro',
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
        imageUrl: LANDING_STOCK.barberiaHero,
        primaryCta: { label: 'Apartar turno', action: 'whatsapp' },
        secondaryCta: { label: 'Ver servicios', action: 'lead-form' },
      },
      {
        id: 'servicios',
        kind: 'items',
        title: 'Servicios y precios',
        subtitle: 'Tiempo real por silla. El fade lleva 40 minutos.',
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
            author: 'Kevin M.',
            role: 'Vecino de la colonia',
            quote: 'Pido el turno en el camino y llego cuando me toca. Ya no me quedo una hora en la silla de espera.',
          },
          {
            author: 'Don Raúl',
            role: 'Papá de dos',
            quote: 'Traigo a los dos niños un sábado y salimos en media hora. El fade queda parejo.',
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
      seoTitle: 'Uñas, color y citas',
      seoDescription:
        'Manicura, pedicura, color, keratina y peinados para eventos. Reserva tu cita por WhatsApp y llega a tu hora.',
      keywords: 'salón de belleza, uñas acrílicas, keratina, tinte, peinado de novia',
      ogImageUrl: LANDING_STOCK.salonHero,
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
      address: 'Plaza comercial, local 4',
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
        imageUrl: LANDING_STOCK.salonHero,
        primaryCta: { label: 'Reservar cita', action: 'lead-form' },
        secondaryCta: { label: 'Ver servicios', action: 'whatsapp' },
      },
      {
        id: 'espacio',
        kind: 'gallery',
        title: 'El salón',
        images: [
          { url: LANDING_STOCK.salonHero, alt: 'Estación de peinado y espejos del salón' },
          { url: LANDING_STOCK.salonManicura, alt: 'Mesa de manicura con esmaltes' },
        ],
      },
      {
        id: 'servicios',
        kind: 'items',
        title: 'Servicios',
        subtitle: 'Duración aproximada. La keratina lleva tres horas.',
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
        subtitle: 'Combinaciones que ya piden las clientas.',
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
            answer: 'Tres horas en salón. El alisado se mantiene de 8 a 12 semanas según el cabello y el lavado.',
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

  ferreteria: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Materiales y herramientas',
      seoDescription:
        'Herramientas, cemento, hierro y pinturas al mejor precio. Cotiza tu lista y visítanos hoy.',
      keywords: 'ferretería, cemento, hierro, pintura, herramientas, tornillería',
      noindex: false,
    },
    theme: {
      tone: 'light',
      primary: '#b45309',
      accent: '#0f766e',
      surface: '#fffbeb',
      font: 'sans',
      radius: 'md',
    },
    business: {
      name: 'Ferretería Tu Nombre',
      tagline: 'Lo que te falta para terminar la obra, a una cuadra',
      address: 'Calle principal, con área de carga',
      city: 'Tu ciudad',
      mapsQuery: 'ferretería cerca de mí',
      socials: {},
    },
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        badge: 'Mostrador y carga',
        headline: 'Materiales de construcción y ferretería cerca de ti',
        subheadline:
          'Herramientas, cemento, hierro y pinturas al mejor precio. Visítanos hoy o manda la lista por WhatsApp.',
        primaryCta: { label: 'Ver cómo llegar', action: 'maps' },
        secondaryCta: { label: 'Cotizar lista', action: 'whatsapp' },
      },
      {
        id: 'catalogo',
        kind: 'items',
        title: 'Nuestro catálogo',
        subtitle: 'Ocho líneas para obra, casa y mantenimiento.',
        layout: 'grid',
        items: [
          { name: 'Cemento y agregados', detail: 'Saco de línea, arena y piedra' },
          { name: 'Hierro y acero', detail: 'Varilla, malla y perfiles' },
          { name: 'Pinturas y solventes', detail: 'Interior, exterior y thinner' },
          { name: 'Herramienta manual', detail: 'Taladros, discos, brocas' },
          { name: 'Plomería', detail: 'Tubos, pegamento y llaves' },
          { name: 'Electricidad', detail: 'Cable, breakers e iluminación' },
          { name: 'Madera', detail: 'Tablas, triplay y listones' },
          { name: 'Tornillería', detail: 'Caja surtida y por kilo' },
        ],
      },
      {
        id: 'credito',
        kind: 'text',
        title: '¿Construyes a gran escala?',
        body:
          'Pregunta por nuestras líneas de crédito para proyectos de obra. Cotiza tu lista de materiales y te mejoramos el precio. Pedidos grandes se confirman el mismo día; el área de carga está al costado.',
      },
      {
        id: 'horario',
        kind: 'hours',
        title: 'Horario de mostrador',
        rows: [
          { label: 'Lunes a sábado', value: '7:30 – 18:00' },
          { label: 'Domingo', value: 'Cerrado' },
        ],
        note: 'Los sábados de obra el mostrador abre a las 7:00.',
      },
      {
        id: 'pedido',
        kind: 'leadForm',
        title: 'Cotiza tu lista',
        subtitle: 'Dinos qué necesitas y te armamos el total con existencia.',
        submitLabel: 'Enviar lista',
        consentText: CONSENT_TEXT,
        fields: { phone: true, message: true },
        successTitle: 'Lista recibida',
        successBody: 'Te confirmamos existencia y total por WhatsApp.',
      },
      {
        id: 'contacto',
        kind: 'contact',
        title: 'Cómo llegar',
        note: 'Sobre la calle principal, con área de carga al costado.',
        showWhatsapp: true,
        showPhone: true,
        showEmail: false,
        showAddress: true,
        showMap: true,
      },
      {
        id: 'cierre',
        kind: 'cta',
        headline: 'No pares la obra por un tornillo',
        subheadline: 'Abre el mapa y pásate hoy. La lista la cotizamos en el mostrador.',
        primaryCta: { label: 'Ver cómo llegar', action: 'maps' },
      },
    ],
  },

  mercadito: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Abarrotes de la colonia',
      seoDescription:
        'Canasta básica, lácteos del día, recargas y entrega a domicilio en un radio de 8 cuadras. Pide el mandado por WhatsApp.',
      keywords: 'mercadito, abarrotería, pulpería, recargas, entrega a domicilio',
      noindex: false,
    },
    theme: {
      tone: 'light',
      primary: '#15803d',
      accent: '#ca8a04',
      surface: '#f7fee7',
      font: 'sans',
      radius: 'lg',
    },
    business: {
      name: 'Mercadito Tu Nombre',
      tagline: 'El mandado de la cuadra, ahora por WhatsApp',
      address: 'A media cuadra de la iglesia, portón verde',
      city: 'Tu ciudad',
      mapsQuery: 'abarrotería cerca de mí',
      socials: {},
    },
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        badge: 'Entrega en 8 cuadras',
        headline: 'Tu mercadito de confianza a la vuelta de la esquina',
        subheadline:
          'Abarrotes, verduras frescas y lácteos de la mejor calidad. Todo sin hacer grandes filas.',
        primaryCta: { label: 'Pedir el mandado', action: 'whatsapp' },
        secondaryCta: { label: 'Ver qué hay', action: 'lead-form' },
      },
      {
        id: 'diario',
        kind: 'items',
        title: 'Productos frescos a diario',
        subtitle: 'Lo que entra en la mañana, se acaba en la tarde.',
        layout: 'list',
        items: [
          { name: 'Lácteos y huevos', detail: 'Leche, queso, crema y cartón del día', priceLabel: 'Variado' },
          { name: 'Verduras del día', detail: 'Según lo que llegó del mercado', priceLabel: 'Por libra' },
          { name: 'Canasta básica', detail: 'Arroz, frijol, azúcar, aceite', priceLabel: 'Desde L. 180' },
          { name: 'Recarga / pagos', detail: 'Claro, Tigo, energía', priceLabel: 'Sin recargo' },
        ],
      },
      {
        id: 'entrega',
        kind: 'text',
        title: 'Estamos en tu barrio',
        body:
          'Ubicados a media cuadra de la iglesia. Atendemos un radio de 8 cuadras para compras de última hora. A pie, si vives a menos de 4 cuadras; en bici o moto hasta las 8.',
      },
      {
        id: 'horario',
        kind: 'hours',
        title: 'Abierto los 7 días',
        rows: [{ label: 'Lunes a domingo', value: '6:30 – 21:00' }],
        note: 'Domingo la recarga de energía cierra a las 20:00.',
      },
      {
        id: 'preguntas',
        kind: 'faq',
        title: 'Antes de pedir',
        items: [
          {
            question: '¿Hacen entregas a domicilio?',
            answer: 'Entregamos a pie si vives a menos de 4 cuadras. Hasta 8 cuadras en bici o moto. Llama para confirmar disponibilidad.',
          },
          {
            question: '¿Hacen recargas de noche?',
            answer: 'Hasta las 20:30. Después solo abarrotes y lácteos.',
          },
        ],
      },
      {
        id: 'pedido',
        kind: 'leadForm',
        title: 'Manda tu lista',
        subtitle: 'Escríbenos lo que necesitas y la colonia.',
        submitLabel: 'Enviar pedido',
        consentText: CONSENT_TEXT,
        fields: { phone: true, message: true },
        successTitle: 'Pedido recibido',
        successBody: 'Te confirmamos total y hora de entrega por WhatsApp.',
      },
      {
        id: 'contacto',
        kind: 'contact',
        title: 'Dónde estamos',
        note: 'A media cuadra de la iglesia, portón verde.',
        showWhatsapp: true,
        showPhone: true,
        showEmail: false,
        showAddress: true,
        showMap: true,
      },
      {
        id: 'cierre',
        kind: 'cta',
        headline: 'Hoy no tienes que salir por el aceite',
        subheadline: 'Manda la lista y te la armamos.',
        primaryCta: { label: 'Pedir por WhatsApp', action: 'whatsapp' },
      },
    ],
  },

  supermercado: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Ofertas y recoger en tienda',
      seoDescription:
        'Canasta básica, carnes, lácteos y ofertas de la semana. Arma tu lista por WhatsApp y recógela en caja 1, con parqueo al frente.',
      keywords: 'supermercado, ofertas, canasta básica, recoger en tienda',
      ogImageUrl: LANDING_STOCK.supermercadoHero,
      noindex: false,
    },
    theme: {
      tone: 'light',
      primary: '#1d4ed8',
      accent: '#ea580c',
      surface: '#f8fafc',
      font: 'sans',
      radius: 'md',
    },
    business: {
      name: 'Súper Tu Nombre',
      tagline: 'La compra de la semana, sin perder la tarde',
      address: 'Boulevard principal, parqueo al frente',
      city: 'Tu ciudad',
      mapsQuery: 'supermercado cerca de mí',
      socials: {},
    },
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        badge: 'Ofertas de la semana',
        headline: 'Frescura, variedad y ahorro en cada pasillo',
        subheadline:
          'Abastece tu hogar con productos nacionales e importados. Manda la lista por WhatsApp y recógela en caja 1, con parqueo al frente.',
        imageUrl: LANDING_STOCK.supermercadoHero,
        primaryCta: { label: 'Pedir por WhatsApp', action: 'whatsapp' },
        secondaryCta: { label: 'Ver ofertas', action: 'lead-form' },
      },
      {
        id: 'ofertas',
        kind: 'items',
        title: 'Ofertas de la semana',
        subtitle: 'Vigentes hasta el domingo o agotar existencia.',
        layout: 'grid',
        items: [
          { name: 'Carnes con 15% OFF', detail: 'Cortes del día, según peso', priceLabel: 'Mostrador' },
          { name: 'Día de frutas y verduras', detail: 'Producto fresco de la mañana', priceLabel: 'Por libra' },
          { name: 'Descuentos en limpieza', detail: 'Detergente, cloro y jabón', priceLabel: 'Desde L. 45' },
          { name: 'Canasta de la semana', detail: 'Arroz, frijol, aceite, azúcar', priceLabel: 'Desde L. 220' },
          { name: 'Cartón de huevos 30', detail: 'De granja, esta semana', priceLabel: 'L. 115' },
          { name: 'Pan del día', detail: 'Horno propio, hasta las 11:00', priceLabel: 'Desde L. 8' },
        ],
      },
      {
        id: 'pasillos',
        kind: 'gallery',
        title: 'Carnicería y verduras',
        images: [
          { url: LANDING_STOCK.supermercadoCarniceria, alt: 'Mostrador de carnes del supermercado' },
          { url: LANDING_STOCK.supermercadoVerduras, alt: 'Pasillo de frutas y verduras' },
        ],
      },
      {
        id: 'departamentos',
        kind: 'items',
        title: 'Departamentos',
        subtitle: 'La compra completa en un solo pasillo de recoger.',
        layout: 'grid',
        items: [
          { name: 'Carnes y pollo', detail: 'Cortes del día, según peso', priceLabel: 'Mostrador' },
          { name: 'Lácteos y huevos', detail: 'Cadena de frío', priceLabel: 'Góndola' },
          { name: 'Abarrotes', detail: 'Canasta y enlatados', priceLabel: 'Góndola' },
          { name: 'Limpieza', detail: 'Hogar y ropa', priceLabel: 'Góndola' },
        ],
      },
      {
        id: 'horario',
        kind: 'hours',
        title: 'Horario de tienda',
        rows: [
          { label: 'Lunes a sábado', value: '7:00 – 20:00' },
          { label: 'Domingo', value: '8:00 – 18:00' },
        ],
        note: 'Pedidos para recoger se confirman 45 minutos antes.',
      },
      {
        id: 'preguntas',
        kind: 'faq',
        title: 'Recoger y parqueo',
        items: [
          {
            question: '¿Dónde recojo el pedido?',
            answer: 'Caja 1, a la izquierda al entrar. Di tu nombre; el mandado ya va embolsado.',
          },
          {
            question: '¿Tienen amplio parqueo?',
            answer: 'Sí. Parqueo al frente, 20 minutos sin cobro mientras recoges. Hay personal de seguridad en el lote.',
          },
          {
            question: '¿Puedo pedir para recoger?',
            answer: 'Sí. Envía tu lista por WhatsApp y te la tenemos lista en caja 1, embolsada con tu nombre.',
          },
        ],
      },
      {
        id: 'pedido',
        kind: 'leadForm',
        title: 'Arma tu lista',
        subtitle: 'Dinos qué llevas y a qué hora pasas.',
        submitLabel: 'Enviar lista',
        consentText: CONSENT_TEXT,
        fields: { phone: true, message: true },
        successTitle: 'Lista recibida',
        successBody: 'Te confirmamos existencias y total por WhatsApp.',
      },
      {
        id: 'contacto',
        kind: 'contact',
        title: 'Cómo llegar',
        note: 'Parqueo al frente. Recoges en caja 1.',
        showWhatsapp: true,
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showMap: true,
      },
      {
        id: 'cierre',
        kind: 'cta',
        headline: 'La compra de la semana, sin dar vueltas',
        subheadline: 'Manda la lista ahora y te la dejamos lista en caja.',
        primaryCta: { label: 'Escribir por WhatsApp', action: 'whatsapp' },
      },
    ],
  },

  clinica: {
    version: LANDING_SCHEMA_VERSION,
    meta: {
      seoTitle: 'Consultas y citas',
      seoDescription:
        'Consulta general, control y laboratorio. Reserva tu hora por WhatsApp y llega a tu cita sin espera en sala.',
      keywords: 'clínica, consulta médica, citas, laboratorio, control',
      ogImageUrl: LANDING_STOCK.clinicaHero,
      noindex: false,
    },
    theme: {
      tone: 'light',
      primary: '#0f766e',
      accent: '#0369a1',
      surface: '#f0fdfa',
      font: 'sans',
      radius: 'lg',
    },
    business: {
      name: 'Clínica Tu Nombre',
      tagline: 'Tu cita a la hora acordada',
      address: 'Consultorio con sala de espera y parqueo',
      city: 'Tu ciudad',
      mapsQuery: 'clínica cerca de mí',
      socials: {},
    },
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        badge: 'Citas esta semana',
        headline: 'Atención médica general, humana y profesional',
        subheadline:
          'Cuidamos la salud de tu familia con diagnósticos claros y un trato cálido. Reserva por WhatsApp y llega a tu hora.',
        imageUrl: LANDING_STOCK.clinicaHero,
        primaryCta: { label: 'Agendar cita por WhatsApp', action: 'whatsapp' },
        secondaryCta: { label: 'Ver servicios', action: 'lead-form' },
      },
      {
        id: 'espacio',
        kind: 'gallery',
        title: 'El consultorio',
        images: [
          { url: LANDING_STOCK.clinicaHero, alt: 'Sala de espera de la clínica' },
          { url: LANDING_STOCK.clinicaConsultorio, alt: 'Consultorio de medicina general' },
        ],
      },
      {
        id: 'servicios',
        kind: 'items',
        title: 'Nuestros servicios',
        subtitle: 'Primera vez: llega 15 minutos antes con tu identidad.',
        layout: 'grid',
        items: [
          { name: 'Consulta médica general', detail: '30 min, primera vez o control', priceLabel: 'L. 400' },
          { name: 'Toma de presión y glucosa', detail: 'Sin cita, mientras hay cupo', priceLabel: 'L. 80' },
          { name: 'Nebulizaciones', detail: 'En consultorio, con indicación', priceLabel: 'L. 120' },
          { name: 'Pequeñas cirugías', detail: 'Sutura y curación, con evaluación previa', priceLabel: 'Cotización' },
          { name: 'Certificados médicos', detail: 'El mismo día, con consulta', priceLabel: 'L. 150' },
          { name: 'Laboratorio básico', detail: 'Sangre y orina, resultados el mismo día', priceLabel: 'Desde L. 250' },
        ],
      },
      {
        id: 'pacientes',
        kind: 'testimonials',
        title: 'Pacientes de la colonia',
        items: [
          {
            author: 'María E.',
            role: 'Control de presión',
            quote: 'Excelente atención. El doctor fue paciente y explicó todo el tratamiento con claridad.',
          },
          {
            author: 'Luis P.',
            role: 'Papá de un niño de 4',
            quote: 'El control del niño sale el mismo día con receta clara. El laboratorio nos entregó resultados a las 3.',
          },
        ],
      },
      {
        id: 'preguntas',
        kind: 'faq',
        title: 'Antes de tu cita',
        items: [
          {
            question: '¿Qué llevo a la primera consulta?',
            answer: 'Identidad y, si tienes, exámenes previos. Llega 15 minutos antes para el registro.',
          },
          {
            question: '¿Atienden emergencias?',
            answer:
              'Atendemos urgencias menores en horario de clínica. Para emergencias mayores referimos al hospital más cercano.',
          },
          {
            question: '¿Hay parqueo?',
            answer: 'Sí, dos espacios frente al consultorio. No dejes el carro sobre la acera.',
          },
        ],
      },
      {
        id: 'horario',
        kind: 'hours',
        title: 'Horario de citas',
        rows: [
          { label: 'Lunes a viernes', value: '8:00 – 17:00' },
          { label: 'Sábado', value: '8:00 – 12:00' },
          { label: 'Domingo', value: 'Cerrado' },
        ],
        note: 'Las citas de la mañana se agotan primero.',
      },
      {
        id: 'reserva',
        kind: 'leadForm',
        title: 'Reserva tu cita',
        subtitle: 'Dinos el motivo y el día que prefieres.',
        submitLabel: 'Solicitar cita',
        consentText: CONSENT_TEXT,
        fields: { phone: true, message: true },
        successTitle: 'Cita solicitada',
        successBody: 'Te confirmamos hora por WhatsApp. Revisa también tu correo.',
      },
      {
        id: 'contacto',
        kind: 'contact',
        title: 'Cómo llegar',
        note: 'Consultorio con sala de espera y parqueo.',
        showWhatsapp: true,
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showMap: true,
      },
      {
        id: 'cierre',
        kind: 'cta',
        headline: 'Aparta tu hora antes de que se llene el día',
        subheadline: 'Te confirmamos por WhatsApp. Llega a tu hora, no a hacer fila.',
        primaryCta: { label: 'Agendar cita por WhatsApp', action: 'whatsapp' },
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
  },
  options?: { noindex?: boolean }
): LandingPageContent {
  const hero = content.blocks.find((block) => block.kind === 'hero')
  const ogFromHero = hero && hero.kind === 'hero' ? hero.imageUrl : undefined

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
      city: business.city ?? content.business.city,
      address: business.address ?? content.business.address,
      whatsapp: business.whatsapp ?? content.business.whatsapp,
      phone: business.phone ?? content.business.phone,
      email: business.email ?? content.business.email,
      mapsQuery:
        [business.address, business.city].filter(Boolean).join(', ') || content.business.mapsQuery,
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

/** Guardia de arranque: verifica que las plantillas existan y validen. */
export function assertTemplatesValid(): void {
  for (const key of LANDING_TEMPLATE_KEYS) {
    templateContentFor(key)
  }
}
