/**
 * Fotos de semilla, same-origin en /public. No remotePatterns.
 * R2/CDN es un cambio de hostname después; las rutas internas siguen válidas.
 */

export const LANDING_STOCK = {
  clinicaHero: '/landings/stock/clinica-hero.png',
  clinicaConsultorio: '/landings/stock/clinica-consultorio.png',
  supermercadoHero: '/landings/stock/supermercado-hero.png',
  supermercadoCarniceria: '/landings/stock/supermercado-carniceria.png',
  supermercadoVerduras: '/landings/stock/supermercado-verduras.png',
  salonHero: '/landings/stock/salon-hero.png',
  salonManicura: '/landings/stock/salon-manicura.png',
  barberiaHero: '/landings/stock/barberia-hero.png',
} as const
