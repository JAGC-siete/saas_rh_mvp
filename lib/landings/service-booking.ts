/**
 * Plantillas de reserva para rubros Service de WEBYCITAS (salud y belleza).
 * Árbol: hero de un propósito → menú con precios → motor de reserva (3 pasos) →
 * equipo → prueba social → FAQ. El cromado (nav + barra móvil) vive en el renderer.
 */

import {
  LANDING_SCHEMA_VERSION,
  type LandingPageContent,
  type LandingPageContentInput,
} from './page-schema'
import { LANDING_STOCK } from './stock'

export const SERVICE_BOOKING_TEMPLATE_KEYS = ['barberia', 'salon_belleza', 'spa', 'clinica'] as const
export type ServiceBookingTemplateKey = (typeof SERVICE_BOOKING_TEMPLATE_KEYS)[number]

const CONSENT_TEXT =
  'Acepto que este negocio me contacte por WhatsApp, teléfono o correo sobre mi solicitud.'

const BOOKING_SLOTS = ['Hoy por la tarde', 'Mañana por la mañana', 'Este sábado', 'La próxima semana'] as const

type MenuItemSeed = {
  name: string
  detail?: string
  category?: string
  priceLabel?: string
}

type ServiceBookingSeed = {
  meta: LandingPageContentInput['meta']
  theme: LandingPageContentInput['theme']
  business: LandingPageContentInput['business']
  hero: {
    badge: string
    headline: string
    subheadline: string
    imageUrl: string
    primaryCtaLabel: string
    secondaryCtaLabel: string
    secondaryHref: string
  }
  gallery?: {
    title: string
    images: Array<{ url: string; alt: string }>
  }
  process?: {
    title: string
    items: Array<{ mark: string; title: string; body: string }>
  }
  menus: Array<{
    id: string
    title: string
    subtitle?: string
    layout: 'grid' | 'list'
    items: MenuItemSeed[]
  }>
  team: {
    title: string
    subtitle?: string
    items: Array<{ name: string; role: string; bio?: string }>
  }
  testimonials: {
    title: string
    items: Array<{ author: string; role?: string; quote: string }>
  }
  faq: {
    title: string
    items: Array<{ question: string; answer: string }>
  }
  booking: {
    title: string
    subtitle: string
    submitLabel: string
    successTitle: string
    successBody: string
  }
  hours: {
    title: string
    rows: Array<{ label: string; value: string }>
    note?: string
  }
  contact: {
    title: string
    note: string
    showEmail: boolean
  }
  cta: {
    headline: string
    subheadline: string
    primaryCtaLabel: string
  }
}

function serviceBookingTemplate(seed: ServiceBookingSeed): LandingPageContentInput {
  const blocks: LandingPageContentInput['blocks'] = [
    {
      id: 'hero',
      kind: 'hero',
      layout: 'booking',
      badge: seed.hero.badge,
      headline: seed.hero.headline,
      subheadline: seed.hero.subheadline,
      imageUrl: seed.hero.imageUrl,
      primaryCta: { label: seed.hero.primaryCtaLabel, action: 'lead-form' },
      secondaryCta: {
        label: seed.hero.secondaryCtaLabel,
        action: 'link',
        href: seed.hero.secondaryHref,
      },
    },
  ]

  if (seed.gallery) {
    blocks.push({
      id: 'espacio',
      kind: 'gallery',
      title: seed.gallery.title,
      images: seed.gallery.images,
    })
  }

  if (seed.process) {
    blocks.push({
      id: 'proceso',
      kind: 'benefits',
      title: seed.process.title,
      items: seed.process.items,
    })
  }

  for (const menu of seed.menus) {
    blocks.push({
      id: menu.id,
      kind: 'items',
      title: menu.title,
      subtitle: menu.subtitle,
      layout: menu.layout,
      items: menu.items,
    })
  }

  blocks.push(
    {
      id: 'reserva',
      kind: 'leadForm',
      layout: 'booking',
      title: seed.booking.title,
      subtitle: seed.booking.subtitle,
      submitLabel: seed.booking.submitLabel,
      consentText: CONSENT_TEXT,
      slotHints: [...BOOKING_SLOTS],
      fields: { phone: true, message: true },
      successTitle: seed.booking.successTitle,
      successBody: seed.booking.successBody,
    },
    {
      id: 'equipo',
      kind: 'team',
      title: seed.team.title,
      subtitle: seed.team.subtitle,
      items: seed.team.items,
    },
    {
      id: 'clientes',
      kind: 'testimonials',
      title: seed.testimonials.title,
      items: seed.testimonials.items,
    },
    {
      id: 'preguntas',
      kind: 'faq',
      title: seed.faq.title,
      items: seed.faq.items,
    },
    {
      id: 'horario',
      kind: 'hours',
      title: seed.hours.title,
      rows: seed.hours.rows,
      note: seed.hours.note,
    },
    {
      id: 'contacto',
      kind: 'contact',
      title: seed.contact.title,
      note: seed.contact.note,
      showWhatsapp: true,
      showPhone: true,
      showEmail: seed.contact.showEmail,
      showAddress: true,
      showMap: true,
    },
    {
      id: 'cierre',
      kind: 'cta',
      headline: seed.cta.headline,
      subheadline: seed.cta.subheadline,
      primaryCta: { label: seed.cta.primaryCtaLabel, action: 'lead-form' },
    }
  )

  return {
    version: LANDING_SCHEMA_VERSION,
    meta: seed.meta,
    theme: seed.theme,
    business: seed.business,
    blocks,
  }
}

export const SERVICE_BOOKING_TEMPLATE_CONTENT: Record<
  ServiceBookingTemplateKey,
  LandingPageContentInput
> = {
  barberia: serviceBookingTemplate({
    meta: {
      seoTitle: 'Cortes y barba con cita',
      seoDescription:
        'Fade, corte clásico y barba. Elige barbero, ves el horario y reservas en tres pasos. Llegas a tu hora.',
      keywords: 'barbería, corte de cabello, fade, barba, reservar cita barbero',
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
      tagline: 'Tu silla, a la hora que apartas',
      address: 'A dos cuadras del parque, portón negro',
      city: 'Tu ciudad',
      mapsQuery: 'barbería cerca de mí',
      socials: {},
    },
    hero: {
      badge: 'Turnos de hoy y de mañana',
      headline: 'Tu corte, a la hora que apartas',
      subheadline:
        'Fade, clásico y barba con toalla caliente. Eliges servicio y barbero, reservas en tres pasos y llegas cuando te toca. Sin silla de espera.',
      imageUrl: LANDING_STOCK.barberiaHero,
      primaryCtaLabel: 'Reservar cita',
      secondaryCtaLabel: 'Ver precios',
      secondaryHref: '#servicios',
    },
    menus: [
      {
        id: 'servicios',
        title: 'Servicios y precios',
        subtitle: 'Tiempo real por silla. El precio que ves es el que pagas.',
        layout: 'grid',
        items: [
          {
            name: 'Corte clásico',
            category: 'Cabello',
            detail: 'Máquina y tijera. Sales con el corte parejo y la nuca limpia. 30 min.',
            priceLabel: 'L. 150',
          },
          {
            name: 'Fade / diseño',
            category: 'Cabello',
            detail: 'Degradado a peine o navaja. Trae foto si quieres un diseño. 40 min.',
            priceLabel: 'L. 200',
          },
          {
            name: 'Corte + barba',
            category: 'Combo',
            detail: 'Corte y perfilado con toalla caliente. Sales con la barba alineada al fade. 50 min.',
            priceLabel: 'L. 220',
          },
          {
            name: 'Barba sola',
            category: 'Barba',
            detail: 'Perfilado, aceite y toalla. Para mantener la línea entre cortes. 20 min.',
            priceLabel: 'L. 90',
          },
          {
            name: 'Niños',
            category: 'Cabello',
            detail: 'Hasta 12 años. Ritmo calmo, sin prisa. Mejor en la mañana. 25 min.',
            priceLabel: 'L. 120',
          },
          {
            name: 'Cejas',
            category: 'Detalle',
            detail: 'Perfilado rápido con navaja. Entra en la misma visita del corte.',
            priceLabel: 'L. 50',
          },
        ],
      },
    ],
    team: {
      title: 'Quién te atiende',
      subtitle: 'La gente vuelve por el barbero, no solo por el local.',
      items: [
        {
          name: 'Carlos',
          role: 'Fade y diseño',
          bio: 'Degradados limpios. Si traes una foto de referencia, la seguimos en la silla.',
        },
        {
          name: 'Don Raúl',
          role: 'Corte clásico y niños',
          bio: 'Paciencia con los chicos. El corte queda parejo y la visita no se alarga.',
        },
      ],
    },
    testimonials: {
      title: 'Lo que dicen los clientes',
      items: [
        {
          author: 'Kevin M.',
          role: 'Fade con Carlos',
          quote:
            'Carlos me deja el fade parejo. Pido el turno en el camino y llego cuando me toca. Ya no me quedo una hora en la silla de espera.',
        },
        {
          author: 'Luis P.',
          role: 'Papá de dos · Don Raúl',
          quote:
            'Traigo a los dos niños un sábado con Don Raúl y salimos en media hora. El corte queda parejo y los chicos no lloran.',
        },
        {
          author: 'Mario G.',
          role: 'Corte + barba',
          quote: 'La toalla caliente y el perfilado valen el extra. Reservé el viernes y el sábado entré a mi hora.',
        },
      ],
    },
    faq: {
      title: 'Antes de tu turno',
      items: [
        {
          question: '¿Puedo llegar sin cita?',
          answer:
            'Si hay silla libre, sí. El sábado se llena: reserva si no quieres esperar. La última silla cierra 30 minutos antes.',
        },
        {
          question: '¿Elijo barbero?',
          answer:
            'Sí. En la reserva indica Carlos o Don Raúl. Si no eliges, te asignamos el primero libre en esa hora.',
        },
        {
          question: '¿Cómo pago?',
          answer: 'Efectivo y transferencia al terminar. El precio del menú es el que cobramos en silla.',
        },
      ],
    },
    booking: {
      title: 'Reserva tu silla',
      subtitle: 'Tres pasos: servicio, horario que te queda y tu número. Te confirmamos por WhatsApp.',
      submitLabel: 'Pedir turno',
      successTitle: 'Turno solicitado',
      successBody: 'Te confirmamos por WhatsApp la hora disponible más cercana con el barbero que elegiste.',
    },
    hours: {
      title: 'Horario de silla',
      rows: [
        { label: 'Lunes a sábado', value: '9:00 – 19:00' },
        { label: 'Domingo', value: '9:00 – 13:00' },
      ],
      note: 'Última silla 30 minutos antes del cierre.',
    },
    contact: {
      title: 'Dónde estamos',
      note: 'A dos cuadras del parque, portón negro. Toca el teléfono para llamar o la dirección para abrir Maps.',
      showEmail: false,
    },
    cta: {
      headline: 'La silla está libre a la hora que apartes',
      subheadline: 'Reserva ahora. Te confirmamos el turno por WhatsApp.',
      primaryCtaLabel: 'Reservar ahora',
    },
  }),

  salon_belleza: serviceBookingTemplate({
    meta: {
      seoTitle: 'Uñas, color y citas',
      seoDescription:
        'Manicura, color y keratina con hora reservada. Ves precios, eliges estilista y reservas en tres pasos.',
      keywords: 'salón de belleza, uñas acrílicas, keratina, tinte, reservar cita salón',
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
    hero: {
      badge: 'Citas esta semana',
      headline: 'Recupera el brillo de tu cabello',
      subheadline:
        'Uñas, color, keratina y peinado con hora reservada. Eliges el servicio, ves a quién te atiende y llegas a tu hora. Sin espera en recepción.',
      imageUrl: LANDING_STOCK.salonHero,
      primaryCtaLabel: 'Reservar cita',
      secondaryCtaLabel: 'Ver menú y precios',
      secondaryHref: '#servicios',
    },
    gallery: {
      title: 'El salón, no un catálogo',
      images: [
        { url: LANDING_STOCK.salonHero, alt: 'Estación de peinado y espejos del salón' },
        { url: LANDING_STOCK.salonManicura, alt: 'Mesa de manicura con esmaltes' },
      ],
    },
    menus: [
      {
        id: 'servicios',
        title: 'Menú y precios',
        subtitle: 'Cada servicio dice para qué sirve. El precio o el rango está a la vista.',
        layout: 'grid',
        items: [
          {
            name: 'Manicura tradicional',
            category: 'Uñas',
            detail: 'Limado, cutícula y esmalte. Manos prolijas para el trabajo o una salida. 45 min.',
            priceLabel: 'L. 180',
          },
          {
            name: 'Uñas acrílicas',
            category: 'Uñas',
            detail: 'Juego completo. Largo y forma a tu gusto. Duran tres semanas con cuidado. 2 h.',
            priceLabel: 'L. 650',
          },
          {
            name: 'Pedicura spa',
            category: 'Uñas',
            detail: 'Exfoliación y masaje. Para pies cansados de oficina o de estar de pie. 1 h.',
            priceLabel: 'L. 300',
          },
          {
            name: 'Tinte / retoque',
            category: 'Cabello',
            detail: 'Cubre canas o cambia el tono. El precio sube con el largo. 1.5 a 2.5 h.',
            priceLabel: 'Desde L. 700',
          },
          {
            name: 'Keratina',
            category: 'Cabello',
            detail: 'Alisado y brillo. Sales con el cabello dócil; se mantiene 8 a 12 semanas. 3 h.',
            priceLabel: 'Desde L. 1,200',
          },
          {
            name: 'Peinado de evento',
            category: 'Cabello',
            detail: 'Boda, quince o graduación. Prueba previa recomendada. 1 a 1.5 h.',
            priceLabel: 'Desde L. 500',
          },
        ],
      },
      {
        id: 'paquetes',
        title: 'Paquetes',
        subtitle: 'Combinaciones que ya piden las clientas. Ahorras frente a pedirlos sueltos.',
        layout: 'list',
        items: [
          {
            name: 'Manos y pies',
            category: 'Paquetes',
            detail: 'Manicura + pedicura el mismo día. Sales lista, sin volver.',
            priceLabel: 'L. 430',
          },
          {
            name: 'Novia',
            category: 'Paquetes',
            detail: 'Prueba, peinado, maquillaje y uñas. Se cotiza según fecha y largo de cabello.',
            priceLabel: 'Cotización',
          },
          {
            name: 'Quince años',
            category: 'Paquetes',
            detail: 'Peinado y maquillaje para la quinceañera. Reserva con dos semanas de anticipación.',
            priceLabel: 'Desde L. 900',
          },
        ],
      },
    ],
    team: {
      title: 'Quién te atiende',
      subtitle: 'Las clientas vuelven por la estilista. Elige con quién sentarte.',
      items: [
        {
          name: 'Ana',
          role: 'Color y keratina',
          bio: 'Tono que no carga el cabello. La keratina se calibra al rizo, no a un paquete genérico.',
        },
        {
          name: 'Sofía',
          role: 'Uñas y pedicura',
          bio: 'Acrílico que no lastima la uña natural. Manicura limpia, sin volumen de más.',
        },
      ],
    },
    testimonials: {
      title: 'Clientas del salón',
      items: [
        {
          author: 'María L.',
          role: 'Keratina con Ana',
          quote:
            'Ana me dejó el cabello dócil sin aplastarlo. A las diez semanas todavía se peinaba solo. Reservé la siguiente antes de salir.',
        },
        {
          author: 'Karla R.',
          role: 'Uñas con Sofía',
          quote:
            'Sofía hizo el set más limpio que me han puesto. Pedí el turno por la página un domingo y el martes ya estaba sentada.',
        },
        {
          author: 'Daniela P.',
          role: 'Peinado de quince',
          quote: 'La prueba y el día del evento salieron iguales. Llegamos a la hora reservada y no nos pusieron a esperar.',
        },
      ],
    },
    faq: {
      title: 'Antes de tu cita',
      items: [
        {
          question: '¿Necesito reservar?',
          answer:
            'Para uñas, color y keratina, sí. Manicura rápida a veces tiene espacio el mismo día: pregunta en la reserva y te decimos.',
        },
        {
          question: '¿Cuánto dura la keratina?',
          answer:
            'Tres horas en salón. El alisado se mantiene de 8 a 12 semanas según el cabello y con qué lo laves. Ana te indica el champú.',
        },
        {
          question: '¿Cómo pago?',
          answer: 'Efectivo, transferencia o tarjeta. El precio del menú se cobra al terminar, sin sorpresa en caja.',
        },
        {
          question: '¿Qué hago en la primera visita de color?',
          answer:
            'Llega con el cabello sucio de un día, sin aceite en la raíz. Ana mira el estado y te dice el tono realista antes de aplicar.',
        },
      ],
    },
    booking: {
      title: 'Reserva tu cita',
      subtitle: 'Servicio, día que prefieres y tu número. Te confirmamos hora y duración por WhatsApp.',
      submitLabel: 'Solicitar cita',
      successTitle: 'Cita solicitada',
      successBody: 'Te confirmamos hora, duración y estilista por WhatsApp. Revisa también tu correo.',
    },
    hours: {
      title: 'Horario de citas',
      rows: [
        { label: 'Martes a viernes', value: '9:00 – 18:00' },
        { label: 'Sábado', value: '8:00 – 17:00' },
        { label: 'Domingo y lunes', value: 'Cerrado' },
      ],
      note: 'Los servicios de más de 2 horas requieren cita previa. El sábado se agota primero.',
    },
    contact: {
      title: 'Cómo llegar',
      note: 'Local con parqueo, dentro de la plaza. Toca el teléfono para llamar o la dirección para abrir Maps.',
      showEmail: true,
    },
    cta: {
      headline: 'Aparta tu hora antes de que se llene la semana',
      subheadline: 'Las citas de sábado se agotan primero.',
      primaryCtaLabel: 'Reservar ahora',
    },
  }),

  spa: serviceBookingTemplate({
    meta: {
      seoTitle: 'Masaje y facial con cita',
      seoDescription:
        'Masaje, facial y rituales de 50 minutos. Eliges terapeuta, ves precios y reservas en tres pasos.',
      keywords: 'spa, masaje relajante, facial, reservar spa, pedicura spa',
      ogImageUrl: LANDING_STOCK.salonHero,
      noindex: false,
    },
    theme: {
      tone: 'light',
      primary: '#3f5d4a',
      accent: '#c4a574',
      surface: '#f4f1ea',
      font: 'serif',
      radius: 'lg',
    },
    business: {
      name: 'Spa Tu Nombre',
      tagline: 'Una hora tuya, sin interrupciones',
      address: 'Plaza del barrio, segundo nivel',
      city: 'Tu ciudad',
      mapsQuery: 'spa cerca de mí',
      socials: {},
    },
    hero: {
      badge: 'Rituales de 50 minutos',
      headline: 'Suelta la tensión. Empieza aquí.',
      subheadline:
        'Masaje, facial y pedicura con hora reservada. Eliges terapeuta, ves el precio y reservas en tres pasos. Llegas a tu hora, no a hacer sala.',
      imageUrl: LANDING_STOCK.salonHero,
      primaryCtaLabel: 'Reservar ahora',
      secondaryCtaLabel: 'Ver rituales y precios',
      secondaryHref: '#servicios',
    },
    gallery: {
      title: 'El espacio',
      images: [
        { url: LANDING_STOCK.salonHero, alt: 'Sala de tratamientos del spa, luz tibia' },
        { url: LANDING_STOCK.salonManicura, alt: 'Estación de manos y pies del spa' },
      ],
    },
    menus: [
      {
        id: 'servicios',
        title: 'Rituales y precios',
        subtitle: 'Cada ritual dice qué tensión trabaja y cómo sales. El precio está a la vista.',
        layout: 'grid',
        items: [
          {
            name: 'Masaje relajante',
            category: 'Cuerpo',
            detail: 'Para cuello y hombros de escritorio. Sales con el cuerpo suelto y sin esa presión en la nuca. 50 min.',
            priceLabel: 'L. 650',
          },
          {
            name: 'Masaje descontracturante',
            category: 'Cuerpo',
            detail: 'Presión firme en espalda y lumbares. Si llegas rígido de manejar o de obra. 50 min.',
            priceLabel: 'L. 750',
          },
          {
            name: 'Facial de limpieza',
            category: 'Rostro',
            detail: 'Limpieza, vapor y mascarilla. Piel menos opaca, sin resequedad al día siguiente. 50 min.',
            priceLabel: 'L. 480',
          },
          {
            name: 'Manicura spa',
            category: 'Manos y pies',
            detail: 'Exfoliación e hidratación. Manos suaves, no solo esmalte. 50 min.',
            priceLabel: 'L. 280',
          },
          {
            name: 'Pedicura spa',
            category: 'Manos y pies',
            detail: 'Para pies cansados. Exfoliación, masaje y esmalte. 1 h.',
            priceLabel: 'L. 380',
          },
        ],
      },
      {
        id: 'paquetes',
        title: 'Paquetes',
        subtitle: 'Dos rituales el mismo día, con un receso de té entre uno y otro.',
        layout: 'list',
        items: [
          {
            name: 'Día de spa',
            category: 'Paquetes',
            detail: 'Masaje relajante + facial. Sales sin la tensión de la semana. 2 h con receso.',
            priceLabel: 'L. 1,050',
          },
          {
            name: 'Manos y pies',
            category: 'Paquetes',
            detail: 'Manicura spa + pedicura spa el mismo día.',
            priceLabel: 'L. 600',
          },
        ],
      },
    ],
    team: {
      title: 'Quién te atiende',
      subtitle: 'En spa la gente es leal a la terapeuta. Elige con quién agendar.',
      items: [
        {
          name: 'Lucía',
          role: 'Masaje y descontracturante',
          bio: 'Presión que se ajusta en la mesa. Si una zona duele, baja; si está dura, insiste con calma.',
        },
        {
          name: 'Elena',
          role: 'Facial y rituales de manos',
          bio: 'Piel sensible incluida. El facial no deja la cara tirante al día siguiente.',
        },
      ],
    },
    testimonials: {
      title: 'Quienes ya vinieron',
      items: [
        {
          author: 'Andrea V.',
          role: 'Masaje con Lucía',
          quote:
            'Lucía me soltó el cuello que llevaba dos semanas trabado. Reservé desde el teléfono un domingo y el martes ya estaba en la mesa.',
        },
        {
          author: 'Sofía M.',
          role: 'Facial con Elena',
          quote:
            'Elena explicó cada paso. Salí con la cara limpia, no ardiendo. El precio del menú fue el de caja.',
        },
        {
          author: 'Paola G.',
          role: 'Paquete día de spa',
          quote: 'Masaje y facial el mismo día, con un té en el medio. No me movieron la hora. Volví a reservar antes de irme.',
        },
      ],
    },
    faq: {
      title: 'Antes de tu ritual',
      items: [
        {
          question: '¿Qué llevo?',
          answer:
            'Nada especial. Te damos bata y toalla. Llega 10 minutos antes para el té y para indicar si alguna zona no se toca.',
        },
        {
          question: '¿El masaje duele?',
          answer:
            'El relajante no. El descontracturante aprieta donde hay nudo; Lucía baja la presión en cuanto lo pides. No es un martirio.',
        },
        {
          question: '¿Puedo ir embarazada?',
          answer:
            'Con autorización de tu médico y después del primer trimestre. Avisa en la reserva para asignarte a Lucía y adaptar la mesa.',
        },
        {
          question: '¿Cómo pago?',
          answer: 'Efectivo o transferencia al terminar. El precio del menú es el de caja. El paquete día sale más barato que por separado.',
        },
      ],
    },
    booking: {
      title: 'Reserva tu ritual',
      subtitle: 'Servicio, terapeuta si tienes preferencia, y el día que te queda. Te confirmamos por WhatsApp.',
      submitLabel: 'Reservar ritual',
      successTitle: 'Ritual solicitado',
      successBody: 'Te confirmamos hora y terapeuta por WhatsApp. Llega 10 minutos antes.',
    },
    hours: {
      title: 'Horario de citas',
      rows: [
        { label: 'Martes a sábado', value: '9:00 – 18:00' },
        { label: 'Domingo y lunes', value: 'Cerrado' },
      ],
      note: 'Último ritual 70 minutos antes del cierre. El sábado se agota primero.',
    },
    contact: {
      title: 'Cómo llegar',
      note: 'Segundo nivel de la plaza, con parqueo. Toca el teléfono para llamar o la dirección para abrir Maps.',
      showEmail: true,
    },
    cta: {
      headline: 'Tu hora en la mesa, no en la sala',
      subheadline: 'Reserva el ritual. Te confirmamos terapeuta y hora por WhatsApp.',
      primaryCtaLabel: 'Reservar ahora',
    },
  }),

  clinica: serviceBookingTemplate({
    meta: {
      seoTitle: 'Consulta con cita',
      seoDescription:
        'Consulta general y laboratorio con hora reservada. Ves el proceso de la primera visita, precios y reservas en tres pasos.',
      keywords: 'clínica, consulta médica, citas, laboratorio, primera visita',
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
      tagline: 'Tu cita, a la hora acordada',
      address: 'Consultorio con sala de espera y parqueo',
      city: 'Tu ciudad',
      mapsQuery: 'clínica cerca de mí',
      socials: {},
    },
    hero: {
      badge: 'Primera vez: te explicamos cada paso',
      headline: 'Una consulta sin la ansiedad de la sala de espera',
      subheadline:
        'Reservas tu hora, llegas 15 minutos antes y sales con un plan claro. El médico explica el tratamiento en la consulta, no en un papel al irte.',
      imageUrl: LANDING_STOCK.clinicaHero,
      primaryCtaLabel: 'Reservar cita',
      secondaryCtaLabel: 'Qué esperar',
      secondaryHref: '#proceso',
    },
    gallery: {
      title: 'El consultorio',
      images: [
        { url: LANDING_STOCK.clinicaHero, alt: 'Sala de espera de la clínica' },
        { url: LANDING_STOCK.clinicaConsultorio, alt: 'Consultorio de medicina general' },
      ],
    },
    process: {
      title: 'Qué esperar en tu primera visita',
      items: [
        {
          mark: '01',
          title: 'Reservas tu hora',
          body: 'Elige el motivo y el día. Te confirmamos por WhatsApp. No vienes a hacer fila.',
        },
        {
          mark: '02',
          title: 'Llegas 15 minutos antes',
          body: 'Identidad y, si tienes, exámenes previos. El registro se hace sentado, no de pie en ventanilla.',
        },
        {
          mark: '03',
          title: 'La consulta dura lo anunciado',
          body: '30 minutos en primera vez. El médico escucha y explica el plan con palabras claras.',
        },
        {
          mark: '04',
          title: 'Sales con indicación, no con dudas',
          body: 'Receta o siguiente paso escrito. Laboratorio el mismo día si el envío sale en la mañana.',
        },
      ],
    },
    menus: [
      {
        id: 'servicios',
        title: 'Servicios y precios',
        subtitle: 'Precios a la vista. Primera vez: llega 15 minutos antes con tu identidad.',
        layout: 'grid',
        items: [
          {
            name: 'Consulta médica general',
            category: 'Consulta',
            detail: '30 min. Primera vez o control. Tiempo para contar síntomas sin que te corten.',
            priceLabel: 'L. 400',
          },
          {
            name: 'Control / seguimiento',
            category: 'Consulta',
            detail: '20 min. Para quien ya tiene plan de tratamiento y solo ajusta indicación.',
            priceLabel: 'L. 250',
          },
          {
            name: 'Toma de presión y glucosa',
            category: 'Enfermería',
            detail: 'Sin cita si hay cupo. Útil si te mandaron a control entre consultas.',
            priceLabel: 'L. 80',
          },
          {
            name: 'Nebulizaciones',
            category: 'Enfermería',
            detail: 'En consultorio, con indicación. Alivia la opresión de un cuadro respiratorio.',
            priceLabel: 'L. 120',
          },
          {
            name: 'Laboratorio básico',
            category: 'Laboratorio',
            detail: 'Sangre y orina. Resultados el mismo día si el envío sale en la mañana.',
            priceLabel: 'Desde L. 250',
          },
          {
            name: 'Certificados médicos',
            category: 'Trámites',
            detail: 'El mismo día, con consulta. Para trabajo, estudio o viaje corto.',
            priceLabel: 'L. 150',
          },
        ],
      },
    ],
    team: {
      title: 'Quién te atiende',
      subtitle: 'Foto, rol y enfoque. En clínica la confianza es con la persona, no solo con el letrero.',
      items: [
        {
          name: 'Dra. Elena Cruz',
          role: 'Medicina general',
          bio: 'Escucha primero. El plan se explica en la consulta, con tiempo para preguntas, no al cerrar la puerta.',
        },
        {
          name: 'Lic. Marco Díaz',
          role: 'Laboratorio clínico',
          bio: 'Toma de muestras con calma. Si te mareas, se avisa y se hace sentado. Resultados el mismo día cuando aplica.',
        },
      ],
    },
    testimonials: {
      title: 'Pacientes de la colonia',
      items: [
        {
          author: 'María E.',
          role: 'Control de presión · Dra. Elena',
          quote:
            'La Dra. Elena fue paciente y explicó el tratamiento con claridad. No me habló en difícil. Reservé el control siguiente antes de salir.',
        },
        {
          author: 'Luis P.',
          role: 'Papá de un niño de 4',
          quote:
            'El control del niño salió el mismo día con receta clara. El laboratorio de Marco nos entregó resultados a las 3.',
        },
        {
          author: 'Rosa H.',
          role: 'Primera consulta',
          quote:
            'Llegué con miedo de que me apuraran. Me escucharon los 30 minutos. Pagué el precio del menú, sin extras raros en caja.',
        },
      ],
    },
    faq: {
      title: 'Dudas que bajan la ansiedad',
      items: [
        {
          question: '¿Qué llevo a la primera consulta?',
          answer:
            'Identidad y, si tienes, exámenes previos. Llega 15 minutos antes para el registro. No hace falta ayuno salvo que el laboratorio te lo pida.',
        },
        {
          question: '¿Duele la toma de sangre?',
          answer:
            'Un pinchazo corto. Marco avisa antes. Si te mareas, se hace sentado. No es un procedimiento largo.',
        },
        {
          question: '¿Aceptan seguro médico?',
          answer:
            'Trabajamos de contado. Te damos factura para que tramites reembolso si tu seguro lo cubre. Pregunta en la reserva si necesitas un código de diagnóstico.',
        },
        {
          question: '¿Cómo pago?',
          answer: 'Efectivo o transferencia al terminar. El precio del menú es el de caja. Laboratorio se cotiza según el envío.',
        },
        {
          question: '¿Atienden emergencias?',
          answer:
            'Urgencias menores en horario de clínica. Para emergencias mayores referimos al hospital más cercano; no sustituimos una sala de emergencias.',
        },
      ],
    },
    booking: {
      title: 'Reserva tu cita',
      subtitle: 'Motivo, día que prefieres y tu número. Te confirmamos hora por WhatsApp. Llega a tu hora, no a hacer fila.',
      submitLabel: 'Solicitar cita',
      successTitle: 'Cita solicitada',
      successBody: 'Te confirmamos hora por WhatsApp. Primera vez: llega 15 minutos antes con tu identidad.',
    },
    hours: {
      title: 'Horario de citas',
      rows: [
        { label: 'Lunes a viernes', value: '8:00 – 17:00' },
        { label: 'Sábado', value: '8:00 – 12:00' },
        { label: 'Domingo', value: 'Cerrado' },
      ],
      note: 'Las citas de la mañana se agotan primero.',
    },
    contact: {
      title: 'Cómo llegar',
      note: 'Consultorio con sala de espera y dos espacios de parqueo. Toca el teléfono para llamar o la dirección para abrir Maps.',
      showEmail: true,
    },
    cta: {
      headline: 'Aparta tu hora antes de que se llene el día',
      subheadline: 'Te confirmamos por WhatsApp. Llega a tu cita, no a hacer fila.',
      primaryCtaLabel: 'Reservar cita',
    },
  }),
}

export function isServiceBookingTemplateKey(value: string): value is ServiceBookingTemplateKey {
  return (SERVICE_BOOKING_TEMPLATE_KEYS as readonly string[]).includes(value)
}

export function isServiceBookingContent(content: LandingPageContent): boolean {
  return content.blocks.some((block) => block.kind === 'hero' && block.layout === 'booking')
}

export type ServiceMenuItem = {
  name: string
  detail?: string
  category?: string
  priceLabel?: string
}

export function collectServiceOptions(content: LandingPageContent): ServiceMenuItem[] {
  const options: ServiceMenuItem[] = []
  for (const block of content.blocks) {
    if (block.kind !== 'items' || block.visible === false) continue
    for (const item of block.items) {
      options.push({
        name: item.name,
        detail: item.detail,
        category: item.category,
        priceLabel: item.priceLabel,
      })
    }
  }
  return options
}

export function groupServiceItems(items: readonly ServiceMenuItem[]): Array<{
  category: string | null
  items: ServiceMenuItem[]
}> {
  const order: string[] = []
  const buckets = new Map<string, ServiceMenuItem[]>()
  const uncategorized: ServiceMenuItem[] = []

  for (const item of items) {
    const key = item.category?.trim()
    if (!key) {
      uncategorized.push(item)
      continue
    }
    if (!buckets.has(key)) {
      order.push(key)
      buckets.set(key, [])
    }
    buckets.get(key)!.push(item)
  }

  const groups: Array<{ category: string | null; items: ServiceMenuItem[] }> = order.map((category) => ({
    category,
    items: buckets.get(category) ?? [],
  }))
  if (uncategorized.length > 0) groups.push({ category: null, items: uncategorized })
  return groups
}
