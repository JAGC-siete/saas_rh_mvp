/**
 * Schema.org JSON-LD generators for SEO
 */

const BASE_URL = 'https://humano-sisu.com'

export interface OrganizationSchema {
  '@context': string
  '@type': string
  name: string
  url: string
  logo: string
  description?: string
  contactPoint?: {
    '@type': string
    telephone: string
    contactType: string
    areaServed: string
    availableLanguage: string
  }
  sameAs?: string[]
}

/**
 * Generates Organization schema
 */
export function generateOrganizationSchema(): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Humano SISU',
    url: BASE_URL,
    logo: `${BASE_URL}/logo-humano-sisu.png`,
    description: 'Sistema automatizado de recursos humanos para MIPYMES en Honduras. Gestión de asistencia, nómina con deducciones IHSS, RAP, ISR y más.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+504-XXXX-XXXX',
      contactType: 'customer service',
      areaServed: 'HN',
      availableLanguage: 'Spanish'
    },
    sameAs: [
      // Add social media profiles if available
    ]
  }
}

export interface WebSiteSchema {
  '@context': string
  '@type': string
  name: string
  url: string
  potentialAction?: {
    '@type': string
    target: {
      '@type': string
      urlTemplate: string
    }
    'query-input': string
  }
}

/**
 * Generates WebSite schema with search action
 */
export function generateWebSiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Humano SISU',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  }
}

export interface WebPageSchema {
  '@context': string
  '@type': string
  '@id': string
  url: string
  name: string
  description?: string
  inLanguage?: string
  isPartOf?: {
    '@id': string
  }
  about?: {
    '@id': string
  }
  primaryImageOfPage?: {
    '@type': string
    url: string
  }
}

/**
 * Generates WebPage schema
 */
export function generateWebPageSchema(options: {
  url: string
  title: string
  description?: string
  image?: string
}): WebPageSchema {
  const { url, title, description, image } = options
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': fullUrl,
    url: fullUrl,
    name: title,
    description: description,
    inLanguage: 'es-HN',
    isPartOf: {
      '@id': `${BASE_URL}/#website`
    },
    about: {
      '@id': `${BASE_URL}/#organization`
    },
    primaryImageOfPage: image ? {
      '@type': 'ImageObject',
      url: image.startsWith('http') ? image : `${BASE_URL}${image}`
    } : undefined
  }
}

export interface SoftwareApplicationSchema {
  '@context': string
  '@type': string
  name: string
  applicationCategory: string
  operatingSystem: string
  offers: {
    '@type': string
    price: string
    priceCurrency: string
  }
  aggregateRating?: {
    '@type': string
    ratingValue: string
    ratingCount: string
  }
}

/**
 * Generates SoftwareApplication schema for the SaaS product
 */
export function generateSoftwareApplicationSchema(): SoftwareApplicationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Humano SISU',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'HNL'
    }
  }
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface BreadcrumbListSchema {
  '@context': string
  '@type': string
  itemListElement: Array<{
    '@type': string
    position: number
    name: string
    item: string
  }>
}

/**
 * Generates BreadcrumbList schema
 */
export function generateBreadcrumbListSchema(items: BreadcrumbItem[]): BreadcrumbListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`
    }))
  }
}

