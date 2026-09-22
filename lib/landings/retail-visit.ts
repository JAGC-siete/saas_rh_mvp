/**
 * Plantilla de visita física para rubros Retail de WEBYCITAS.
 * Esqueleto copiado de /mercadosanpablosiguav2: hero con búsqueda, visita, horario,
 * beneficios y áreas del local. Sin WhatsApp, sin formulario, sin lista de precios.
 */

import { LANDING_SCHEMA_VERSION, type LandingBlock, type LandingPageContent, type LandingPageContentInput } from './page-schema'
import { LANDING_STOCK } from './stock'

export const RETAIL_VISIT_TEMPLATE_KEYS = ['papeleria', 'ferreteria', 'mercadito', 'supermercado'] as const
export type RetailVisitTemplateKey = (typeof RETAIL_VISIT_TEMPLATE_KEYS)[number]

export const RETAIL_VISIT_BLOCK_TREE = ['hero', 'visit', 'hours', 'benefits', 'areas'] as const

export const RETAIL_VISIT_THEME = {
  tone: 'light' as const,
  primary: '#2a1810',
  accent: '#9f1239',
  surface: '#f6f1e8',
  font: 'sans' as const,
  radius: 'lg' as const,
}

const RETAIL_STOCK = {
  pasillo: '/mercado/pasillo-san-pablo.png',
  verduras: '/mercado/verduras-dona-marta-mesa.png',
  carnes: '/mercado/carniceria-la-esquina-cortes.png',
  abarrotes: '/mercado/abarrotes-el-ahorro-anaquel.png',
  comedor: '/mercado/comedor-el-patio-plato.png',
} as const

type AreaSeed = {
  id: string
  title: string
  aisle: string
  description: string
  ctaLabel: string
  imageUrl?: string
  imageAlt?: string
  hintLabel?: string
  needles: string[]
}

type RetailVisitSeed = {
  meta: LandingPageContentInput['meta']
  business: LandingPageContentInput['business']
  hero: {
    badge: string
    headline: string
    subheadline: string
    imageUrl?: string
    searchPlaceholder: string
    searchHint: string
    searchSubmitLabel: string
    primaryCtaLabel: string
    secondaryCtaLabel: string
  }
  visit: {
    title: string
    body: string
    geoLabel?: string
    mapsCtaLabel: string
    hoursCtaLabel: string
    mapPlaceholder: string
  }
  hours: {
    title: string
    rows: Array<{ label: string; value: string }>
    note?: string
  }
  benefits: {
    title: string
    items: Array<{ mark: string; title: string; body: string }>
  }
  areas: {
    title: string
    subtitle: string
    emptyMessage: string
    items: AreaSeed[]
  }
}

function retailVisitTemplate(seed: RetailVisitSeed): LandingPageContentInput {
  return {
    version: LANDING_SCHEMA_VERSION,
    meta: seed.meta,
    theme: RETAIL_VISIT_THEME,
    business: seed.business,
    blocks: [
      {
        id: 'hero',
        kind: 'hero',
        layout: 'visit',
        badge: seed.hero.badge,
        headline: seed.hero.headline,
        subheadline: seed.hero.subheadline,
        imageUrl: seed.hero.imageUrl,
        searchPlaceholder: seed.hero.searchPlaceholder,
        searchHint: seed.hero.searchHint,
        searchSubmitLabel: seed.hero.searchSubmitLabel,
        primaryCta: { label: seed.hero.primaryCtaLabel, action: 'maps' },
        secondaryCta: { label: seed.hero.secondaryCtaLabel, action: 'link', href: '#horarios' },
      },
      {
        id: 'visita',
        kind: 'visit',
        title: seed.visit.title,
        body: seed.visit.body,
        geoLabel: seed.visit.geoLabel,
        mapsCtaLabel: seed.visit.mapsCtaLabel,
        hoursCtaLabel: seed.visit.hoursCtaLabel,
        mapPlaceholder: seed.visit.mapPlaceholder,
      },
      {
        id: 'horarios',
        kind: 'hours',
        title: seed.hours.title,
        rows: seed.hours.rows,
        note: seed.hours.note,
      },
      {
        id: 'beneficios',
        kind: 'benefits',
        title: seed.benefits.title,
        items: seed.benefits.items,
      },
      {
        id: 'encontraras',
        kind: 'areas',
        title: seed.areas.title,
        subtitle: seed.areas.subtitle,
        emptyMessage: seed.areas.emptyMessage,
        items: seed.areas.items,
      },
    ],
  }
}

export const RETAIL_VISIT_TEMPLATE_CONTENT: Record<RetailVisitTemplateKey, LandingPageContentInput> = {
  papeleria: retailVisitTemplate({
    meta: {
      seoTitle: 'Copias e impresiones',
      seoDescription:
        'Copias, impresiones y útiles en el local. Pasá, recorré el mostrador y recogeló el mismo día.',
      keywords: 'papelería, copias, impresiones, engargolado, útiles escolares',
      noindex: false,
    },
    business: {
      name: 'Papelería Tu Nombre',
      tagline: 'Copias, impresiones y útiles a una cuadra de ti',
      address: 'Calle principal, frente al colegio',
      city: 'Tu ciudad',
      mapsQuery: 'papelería cerca de mí',
      socials: {},
    },
    hero: {
      badge: 'Tu ciudad',
      headline: 'Papelería de mostrador, a una cuadra',
      subheadline:
        'Copias, impresiones desde USB y útiles escolares. La compra se hace en el local, el mismo día.',
      searchPlaceholder: '¿Qué necesitás? Ej. copias, engargolado, resma',
      searchHint: 'Te indicamos el área del local. El trabajo se recoge en el mostrador.',
      searchSubmitLabel: 'Buscar área',
      primaryCtaLabel: 'Ver cómo llegar',
      secondaryCtaLabel: 'Conocé el horario',
    },
    visit: {
      title: 'Planificá tu visita',
      body: 'Estamos sobre la calle principal, frente al colegio, con parqueo al frente. Llegás, dejás el archivo o la lista y lo recogés en el mostrador.',
      mapsCtaLabel: 'Ver cómo llegar',
      hoursCtaLabel: 'Ver horario',
      mapPlaceholder: 'Mapa: frente al colegio',
    },
    hours: {
      title: 'Horario de atención',
      rows: [
        { label: 'Lunes a viernes', value: '8:00 – 18:00' },
        { label: 'Sábado', value: '8:00 – 14:00' },
        { label: 'Domingo', value: 'Cerrado' },
      ],
      note: 'En temporada escolar el mostrador abre más temprano.',
    },
    benefits: {
      title: 'Por qué pasar al local',
      items: [
        { mark: '01', title: 'Mismo día', body: 'Copias e impresiones salen en minutos. Engargolados, el mismo día.' },
        { mark: '02', title: 'Frente al colegio', body: 'Útiles y listas escolares a una cuadra, sin ir al centro.' },
        { mark: '03', title: 'Mostrador completo', body: 'Copias, USB, engargolado, plastificado y papelería en un solo local.' },
        { mark: '04', title: 'Archivo en mano', body: 'USB, correo o papel: el trabajo se confirma en el mostrador.' },
        { mark: '05', title: 'Parqueo al frente', body: 'Dejás el carro un rato y pasás a recoger.' },
        { mark: '06', title: 'Horario de barrio', body: 'Lunes a viernes hasta las 18:00. Sábado hasta las 14:00.' },
      ],
    },
    areas: {
      title: 'Lo que encontrarás',
      subtitle: 'Recorré las áreas del local. Lo que ves es el mostrador, no un catálogo a distancia.',
      emptyMessage: 'No hay un área que coincida con esa búsqueda. Probá con copias, color, engargolado o útiles.',
      items: [
        {
          id: 'copias',
          title: 'Copias',
          aisle: 'Mostrador de copias',
          description: 'Carta y oficio, blanco y negro o color. Desde 1 hoja. El total se confirma al ver el original.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['copia', 'copias', 'blanco', 'negro', 'oficio', 'carta'],
          hintLabel: 'Copias carta y oficio · Mostrador de copias',
        },
        {
          id: 'impresiones',
          title: 'Impresiones',
          aisle: 'Estación de USB',
          description: 'Desde USB, correo o el teléfono. Trabajos escolares, trámites e informes salen en el local.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['impresion', 'impresión', 'usb', 'pdf', 'color', 'archivo'],
          hintLabel: 'Impresiones desde USB · Estación de USB',
        },
        {
          id: 'acabados',
          title: 'Engargolado y plastificado',
          aisle: 'Mesa de acabados',
          description: 'Engargolado hasta 100 hojas, portada y plastificado carta para carnés, diplomas y listas.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['engargolado', 'plastificado', 'tesis', 'portada', 'carnet'],
          hintLabel: 'Engargolado y plastificado · Mesa de acabados',
        },
        {
          id: 'utiles',
          title: 'Útiles y resmas',
          aisle: 'Anaquel escolar',
          description: 'Resma, cuadernos, folders y la lista del colegio armada en el mostrador.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['utiles', 'útiles', 'resma', 'cuaderno', 'folder', 'lista', 'escolar'],
          hintLabel: 'Útiles y resmas · Anaquel escolar',
        },
      ],
    },
  }),

  ferreteria: retailVisitTemplate({
    meta: {
      seoTitle: 'Materiales y herramientas',
      seoDescription:
        'Cemento, hierro, pintura y tornillería en el local. Cotizá la lista en el mostrador y cargá al costado.',
      keywords: 'ferretería, cemento, hierro, pintura, herramientas, tornillería',
      noindex: false,
    },
    business: {
      name: 'Ferretería Tu Nombre',
      tagline: 'Lo que te falta para terminar la obra, a una cuadra',
      address: 'Calle principal, con área de carga',
      city: 'Tu ciudad',
      mapsQuery: 'ferretería cerca de mí',
      socials: {},
    },
    hero: {
      badge: 'Tu ciudad',
      headline: 'Ferretería de mostrador, con área de carga',
      subheadline:
        'Materiales, herramienta y tornillería. La lista se arma en el local; el área de carga está al costado.',
      searchPlaceholder: '¿Qué buscás? Ej. cemento, varilla, pintura',
      searchHint: 'Te indicamos el pasillo. La compra se hace en el mostrador.',
      searchSubmitLabel: 'Buscar área',
      primaryCtaLabel: 'Ver cómo llegar',
      secondaryCtaLabel: 'Conocé el horario',
    },
    visit: {
      title: 'Planificá tu visita',
      body: 'Sobre la calle principal, con área de carga al costado. Llegás con la lista o la armamos en el mostrador. Pedidos grandes se confirman el mismo día.',
      mapsCtaLabel: 'Ver cómo llegar',
      hoursCtaLabel: 'Ver horario',
      mapPlaceholder: 'Mapa: calle principal, área de carga',
    },
    hours: {
      title: 'Horario de mostrador',
      rows: [
        { label: 'Lunes a sábado', value: '7:30 – 18:00' },
        { label: 'Domingo', value: 'Cerrado' },
      ],
      note: 'Los sábados de obra el mostrador abre a las 7:00.',
    },
    benefits: {
      title: 'Por qué venir a la ferretería',
      items: [
        { mark: '01', title: 'Área de carga', body: 'El material sale por el costado. No bloqueás la calle principal.' },
        { mark: '02', title: 'Lista en mostrador', body: 'Armamos el total con existencia. Lo que no hay, se dice de una.' },
        { mark: '03', title: 'Obra y casa', body: 'Cemento, hierro, pintura, plomería y tornillería bajo el mismo techo.' },
        { mark: '04', title: 'Precio de local', body: 'Pedidos grandes se cotizan el mismo día, viendo la lista.' },
        { mark: '05', title: 'Abre temprano', body: 'Lunes a sábado desde las 7:30. Los sábados de obra, desde las 7:00.' },
        { mark: '06', title: 'A una cuadra', body: 'No pares la obra por un tornillo. El mapa está abajo.' },
      ],
    },
    areas: {
      title: 'Lo que encontrarás',
      subtitle: 'Recorré los pasillos. Cada área junta lo que pide la obra y la casa.',
      emptyMessage: 'No hay un área que coincida con esa búsqueda. Probá con cemento, varilla, pintura o tornillo.',
      items: [
        {
          id: 'cemento',
          title: 'Cemento y agregados',
          aisle: 'Bodega de obra',
          description: 'Saco de línea, arena y piedra. Se carga al costado; confirmá existencia en el mostrador.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['cemento', 'arena', 'piedra', 'agregado', 'saco', 'block'],
          hintLabel: 'Cemento y agregados · Bodega de obra',
        },
        {
          id: 'hierro',
          title: 'Hierro y acero',
          aisle: 'Patio de hierro',
          description: 'Varilla, malla y perfiles. Cortes y cantidades se confirman en el local.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['hierro', 'varilla', 'acero', 'malla', 'perfil', 'varillas'],
          hintLabel: 'Varilla y malla · Patio de hierro',
        },
        {
          id: 'pinturas',
          title: 'Pinturas y solventes',
          aisle: 'Pasillo de pintura',
          description: 'Interior, exterior y thinner. Color de línea; el galón se lleva del anaquel.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['pintura', 'pinturas', 'thinner', 'brocha', 'rodillo', 'esmalte'],
          hintLabel: 'Pintura y thinner · Pasillo de pintura',
        },
        {
          id: 'herramienta',
          title: 'Herramienta',
          aisle: 'Mostrador de herramienta',
          description: 'Taladros, discos, brocas y herramienta de mano. Lo que falta para terminar el día.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['taladro', 'disco', 'broca', 'herramienta', 'sierra', 'martillo'],
          hintLabel: 'Taladro y discos · Mostrador de herramienta',
        },
        {
          id: 'plomeria',
          title: 'Plomería y electricidad',
          aisle: 'Pasillo técnico',
          description: 'Tubos, pegamento, llaves, cable, breakers e iluminación. El pasillo técnico junta las dos líneas.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['tubo', 'llave', 'cable', 'breaker', 'plomeria', 'plomería', 'electricidad'],
          hintLabel: 'Plomería y cable · Pasillo técnico',
        },
        {
          id: 'tornilleria',
          title: 'Tornillería',
          aisle: 'Caja surtida',
          description: 'Por kilo o caja surtida. El tornillo que para la obra está en el mostrador.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['tornillo', 'tornilleria', 'tornillería', 'clavo', 'tuerca', 'taquete'],
          hintLabel: 'Tornillos y clavos · Caja surtida',
        },
      ],
    },
  }),

  mercadito: retailVisitTemplate({
    meta: {
      seoTitle: 'Abarrotes de la colonia',
      seoDescription:
        'Canasta, lácteos del día y verdura en el mercadito de la cuadra. Pasá al local; el mandado se arma en el mostrador.',
      keywords: 'mercadito, abarrotería, pulpería, recargas, canasta básica',
      ogImageUrl: RETAIL_STOCK.pasillo,
      noindex: false,
    },
    business: {
      name: 'Mercadito Tu Nombre',
      tagline: 'El mandado de la cuadra, en el local de siempre',
      address: 'A media cuadra de la iglesia, portón verde',
      city: 'Tu ciudad',
      mapsQuery: 'abarrotería cerca de mí',
      socials: {},
    },
    hero: {
      badge: 'Tu ciudad',
      headline: 'El mercadito de la cuadra',
      subheadline:
        'Abarrotes, verdura del día y lácteos. El mandado se arma en el local, a media cuadra de la iglesia.',
      imageUrl: RETAIL_STOCK.pasillo,
      searchPlaceholder: '¿Qué querés encontrar? Ej. frijol, leche, recarga',
      searchHint: 'Te indicamos el anaquel. La compra se hace en el local.',
      searchSubmitLabel: 'Buscar área',
      primaryCtaLabel: 'Ver cómo llegar',
      secondaryCtaLabel: 'Conocé el horario',
    },
    visit: {
      title: 'Planificá tu visita',
      body: 'A media cuadra de la iglesia, portón verde. El mandado de última hora se arma en el mostrador; lo que llega en la mañana se acaba en la tarde.',
      mapsCtaLabel: 'Ver cómo llegar',
      hoursCtaLabel: 'Ver horario',
      mapPlaceholder: 'Mapa: portón verde, media cuadra de la iglesia',
    },
    hours: {
      title: 'Abierto los 7 días',
      rows: [{ label: 'Lunes a domingo', value: '6:30 – 21:00' }],
      note: 'Domingo la recarga de energía cierra a las 20:00.',
    },
    benefits: {
      title: 'Por qué venir al mercadito',
      items: [
        { mark: '01', title: 'De la cuadra', body: 'A media cuadra de la iglesia. El mandado no pide viaje al centro.' },
        { mark: '02', title: 'Del día', body: 'Lácteos y verdura que entran en la mañana. Lo fresco se acaba primero.' },
        { mark: '03', title: 'Canasta completa', body: 'Arroz, frijol, aceite, azúcar y el anaquel seco del mes.' },
        { mark: '04', title: 'Recargas', body: 'Claro, Tigo y energía en el mismo mostrador, sin recargo.' },
        { mark: '05', title: 'Siete días', body: 'Abierto de 6:30 a 21:00. El barrio no cierra el domingo.' },
        { mark: '06', title: 'Portón verde', body: 'Se ve desde la iglesia. El mapa está en la visita.' },
      ],
    },
    areas: {
      title: 'Lo que encontrarás',
      subtitle: 'Recorré el local. Cada rincón junta lo que el barrio pide en el día.',
      emptyMessage: 'No hay un área que coincida con esa búsqueda. Probá con frijol, leche, verdura o recarga.',
      items: [
        {
          id: 'canasta',
          title: 'Canasta básica',
          aisle: 'Anaquel seco',
          description: 'Arroz, frijol, azúcar y aceite. El mandado del mes está en el anaquel de siempre.',
          imageUrl: RETAIL_STOCK.abarrotes,
          imageAlt: 'Anaquel de granos, aceite y abarrotes del mercadito',
          ctaLabel: 'Ver ubicación del área',
          needles: ['frijol', 'arroz', 'aceite', 'azucar', 'azúcar', 'canasta', 'abarrotes', 'mandado'],
          hintLabel: 'Mandado seco · Anaquel seco',
        },
        {
          id: 'lacteos',
          title: 'Lácteos y huevos',
          aisle: 'Caja de frío',
          description: 'Leche, queso, crema y cartón del día. Lo que entra en la mañana se acaba en la tarde.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['leche', 'queso', 'crema', 'huevo', 'huevos', 'lacteo', 'lácteo'],
          hintLabel: 'Leche y huevos · Caja de frío',
        },
        {
          id: 'verduras',
          title: 'Verdura del día',
          aisle: 'Mesa de la mañana',
          description: 'Según lo que llegó del mercado. Tomate, chile y lo verde del día, por libra.',
          imageUrl: RETAIL_STOCK.verduras,
          imageAlt: 'Mesa de verduras frescas en el mercadito',
          ctaLabel: 'Ver ubicación del área',
          needles: ['tomate', 'chile', 'verdura', 'papa', 'cebolla', 'culantro', 'fruta'],
          hintLabel: 'Verdura del día · Mesa de la mañana',
        },
        {
          id: 'recargas',
          title: 'Recargas y pagos',
          aisle: 'Mostrador',
          description: 'Claro, Tigo y energía. Sin recargo. Domingo la recarga de energía cierra a las 20:00.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['recarga', 'claro', 'tigo', 'energia', 'energía', 'pago', 'luz'],
          hintLabel: 'Recarga y luz · Mostrador',
        },
      ],
    },
  }),

  supermercado: retailVisitTemplate({
    meta: {
      seoTitle: 'Ofertas y recoger en tienda',
      seoDescription:
        'Carnes, verduras, abarrotes y la compra de la semana. Recorré los pasillos y recogeló en caja, con parqueo al frente.',
      keywords: 'supermercado, ofertas, canasta básica, recoger en tienda',
      ogImageUrl: LANDING_STOCK.supermercadoHero,
      noindex: false,
    },
    business: {
      name: 'Súper Tu Nombre',
      tagline: 'La compra de la semana, en un solo recinto',
      address: 'Boulevard principal, parqueo al frente',
      city: 'Tu ciudad',
      mapsQuery: 'supermercado cerca de mí',
      socials: {},
    },
    hero: {
      badge: 'Tu ciudad',
      headline: 'Frescura, variedad y ahorro en cada pasillo',
      subheadline:
        'Abastecé el hogar en un solo recinto. Carnes, verdura, abarrotes y limpieza, con parqueo al frente.',
      imageUrl: LANDING_STOCK.supermercadoHero,
      searchPlaceholder: '¿Qué querés encontrar? Ej. carne, tomate, pan',
      searchHint: 'Te indicamos el pasillo. La compra se hace en la tienda.',
      searchSubmitLabel: 'Buscar área',
      primaryCtaLabel: 'Ver cómo llegar',
      secondaryCtaLabel: 'Conocé el horario',
    },
    visit: {
      title: 'Planificá tu visita',
      body: 'Sobre el boulevard principal, con parqueo al frente. Entrás, recorré los pasillos y recogeló en caja. El lote tiene personal de seguridad.',
      mapsCtaLabel: 'Ver cómo llegar',
      hoursCtaLabel: 'Ver horario',
      mapPlaceholder: 'Mapa: boulevard principal, parqueo al frente',
    },
    hours: {
      title: 'Horario de tienda',
      rows: [
        { label: 'Lunes a sábado', value: '7:00 – 20:00' },
        { label: 'Domingo', value: '8:00 – 18:00' },
      ],
      note: 'La carnicería y el pan del día abren con la tienda.',
    },
    benefits: {
      title: 'Por qué venir al súper',
      items: [
        { mark: '01', title: 'Parqueo al frente', body: 'Veinte minutos sin cobro mientras hacés la compra. Hay personal en el lote.' },
        { mark: '02', title: 'Frescura del día', body: 'Carnes, verdura y pan que entran por la mañana.' },
        { mark: '03', title: 'Un solo recinto', body: 'Canasta, limpieza, lácteos y carnes sin dar vueltas por la ciudad.' },
        { mark: '04', title: 'Ofertas de pasillo', body: 'La semana se arma en góndola. Lo que ves, es el precio de tienda.' },
        { mark: '05', title: 'Caja 1', body: 'Al entrar, a la izquierda. El mandado de recoger se entrega embolsado.' },
        { mark: '06', title: 'Toda la semana', body: 'Lunes a sábado 7:00–20:00. Domingo 8:00–18:00.' },
      ],
    },
    areas: {
      title: 'Lo que encontrarás',
      subtitle: 'Recorré las áreas de la tienda. Cada pasillo junta el departamento, no un anaquel suelto.',
      emptyMessage: 'No hay un área que coincida con esa búsqueda. Probá con carne, tomate, pan o detergente.',
      items: [
        {
          id: 'carniceria',
          title: 'Carnicería',
          aisle: 'Ala de carnes',
          description: 'Cortes de res, cerdo y pollo del día. El peso se confirma en el mostrador de carnes.',
          imageUrl: LANDING_STOCK.supermercadoCarniceria,
          imageAlt: 'Mostrador de carnes del supermercado',
          ctaLabel: 'Ver ubicación del área',
          needles: ['carne', 'carnita', 'lomo', 'cerdo', 'pollo', 'res', 'carniceria', 'carnicería'],
          hintLabel: 'Cortes del día · Ala de carnes',
        },
        {
          id: 'frutas-verduras',
          title: 'Frutas y verduras',
          aisle: 'Pasillo de frescos',
          description: 'Tomate, chile, piña y banano de la mañana. Frescura de recinto, por libra.',
          imageUrl: LANDING_STOCK.supermercadoVerduras,
          imageAlt: 'Pasillo de frutas y verduras',
          ctaLabel: 'Ver ubicación del área',
          needles: ['tomate', 'verdura', 'fruta', 'piña', 'pina', 'banano', 'chile', 'papa', 'cebolla'],
          hintLabel: 'Verdura y fruta · Pasillo de frescos',
        },
        {
          id: 'abarrotes',
          title: 'Abarrotes',
          aisle: 'Góndola central',
          description: 'Arroz, frijol, aceite, azúcar y enlatados. La canasta de la semana está en góndola.',
          imageUrl: RETAIL_STOCK.abarrotes,
          imageAlt: 'Góndola de abarrotes y canasta básica',
          ctaLabel: 'Ver ubicación del área',
          needles: ['frijol', 'arroz', 'aceite', 'azucar', 'azúcar', 'abarrotes', 'canasta', 'mandado'],
          hintLabel: 'Canasta de la semana · Góndola central',
        },
        {
          id: 'panaderia',
          title: 'Pan del día',
          aisle: 'Horno, hasta las 11:00',
          description: 'Pan de horno propio por la mañana. Llegá temprano; se acaba con la primera compra.',
          imageUrl: RETAIL_STOCK.comedor,
          imageAlt: 'Pan y comida de mostrador',
          ctaLabel: 'Ver ubicación del área',
          needles: ['pan', 'bolillo', 'horno', 'panaderia', 'panadería'],
          hintLabel: 'Pan del día · Horno',
        },
        {
          id: 'limpieza',
          title: 'Limpieza',
          aisle: 'Pasillo de hogar',
          description: 'Detergente, cloro y jabón. El pasillo de hogar cierra la compra de la semana.',
          ctaLabel: 'Ver ubicación del área',
          needles: ['detergente', 'cloro', 'jabon', 'jabón', 'limpieza', 'suavizante'],
          hintLabel: 'Detergente y cloro · Pasillo de hogar',
        },
      ],
    },
  }),
}

export function isRetailVisitTemplateKey(value: string): value is RetailVisitTemplateKey {
  return (RETAIL_VISIT_TEMPLATE_KEYS as readonly string[]).includes(value)
}

export function isRetailVisitContent(content: LandingPageContent): boolean {
  return content.blocks.some((block) => block.kind === 'hero' && block.layout === 'visit')
}

export type RetailVisitArea = Extract<LandingBlock, { kind: 'areas' }>['items'][number]

function needleHits(needles: readonly string[], query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return false
  return needles.some((token) => {
    const value = token.toLowerCase()
    return value.startsWith(needle) || needle.startsWith(value) || value.includes(needle)
  })
}

export function retailAreasMatching(items: readonly RetailVisitArea[], query: string): RetailVisitArea[] {
  const needle = query.trim().toLowerCase()
  if (needle.length < 2) return [...items]
  const byNeedles = items.filter((item) => needleHits(item.needles, query))
  if (byNeedles.length > 0) return byNeedles
  return items.filter((item) => `${item.title} ${item.aisle}`.toLowerCase().includes(needle))
}

export function retailSearchHints(
  items: readonly RetailVisitArea[],
  query: string
): Array<{ label: string; areaId: string }> {
  return retailAreasMatching(items, query)
    .slice(0, 4)
    .map((item) => ({
      label: item.hintLabel || `${item.title} · ${item.aisle}`,
      areaId: item.id,
    }))
}
