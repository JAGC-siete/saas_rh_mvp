/**
 * Schema.org JSON-LD generators for SEO
 */

import { SOCIAL_SAME_AS } from '../marketing/social-links'

const BASE_URL = 'https://humanosisu.net'

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
    areaServed: string | string[]
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
    description:
      'Humano SISU es software de recursos humanos y control de asistencia para MIPYMES en Honduras, El Salvador y Guatemala. Nómina automatizada, biometría integrada y deducciones de ley locales.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+504 32226773',
      contactType: 'customer service',
      areaServed: ['SV', 'GT', 'HN'],
      availableLanguage: 'Spanish'
    },
    sameAs: SOCIAL_SAME_AS,
  }
}

export interface WebSiteSchema {
  '@context': string
  '@type': string
  name: string
  url: string
  description?: string
}

/**
 * Generates WebSite schema (sin SearchAction hasta exista búsqueda interna real).
 */
export function generateWebSiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Humano SISU',
    url: BASE_URL,
    description:
      'Software de recursos humanos y control de asistencia para Honduras, El Salvador y Guatemala.',
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
  inLanguage?: string
}): WebPageSchema {
  const { url, title, description, image, inLanguage = 'es-HN' } = options
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': fullUrl,
    url: fullUrl,
    name: title,
    description: description,
    inLanguage: inLanguage,
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

export interface LocalBusinessSchema {
  '@context': string
  '@type': string
  name: string
  url: string
  telephone?: string
  address?: {
    '@type': string
    addressCountry: string
    addressRegion?: string
    addressLocality?: string
  }
  areaServed: {
    '@type': string
    name: string
  } | Array<{ '@type': string; name: string }>
  priceRange?: string
}

/**
 * Generates LocalBusiness schema for local SEO
 */
export function generateLocalBusinessSchema(options: {
  address?: {
    country: string
    region?: string
    locality?: string
  }
} = {}): LocalBusinessSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Humano SISU',
    url: BASE_URL,
    telephone: '+504 32226773',
    address: options.address ? {
      '@type': 'PostalAddress',
      addressCountry: options.address.country,
      addressRegion: options.address.region,
      addressLocality: options.address.locality
    } : undefined,
    areaServed: [
      { '@type': 'Country', name: 'El Salvador' },
      { '@type': 'Country', name: 'Guatemala' },
      { '@type': 'Country', name: 'Honduras' },
    ],
    priceRange: '$$'
  }
}

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQPageSchema {
  '@context': string
  '@type': string
  mainEntity: Array<{
    '@type': string
    name: string
    acceptedAnswer: {
      '@type': string
      text: string
    }
  }>
}

/**
 * Generates FAQPage schema for featured snippets
 */
export function generateFAQPageSchema(faqs: FAQItem[]): FAQPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
}

export interface ArticleSchema {
  '@context': string
  '@type': string
  headline: string
  description?: string
  datePublished: string
  dateModified?: string
  image?: string
  author?: { '@type': string; name: string }
  publisher: { '@type': string; name: string; logo: { '@type': string; url: string } }
  url: string
  articleSection?: string
}

/**
 * Generates BlogPosting/Article schema for article pages (SEO)
 */
export function generateArticleSchema(options: {
  url: string
  headline: string
  description?: string
  datePublished: string
  dateModified?: string
  image?: string
  author?: string
  articleSection?: string
}): ArticleSchema {
  const { url, headline, description, datePublished, dateModified, image, author, articleSection } = options
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    description,
    datePublished,
    dateModified,
    image: image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : undefined,
    author: author ? { '@type': 'Person', name: author } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Humano SISU',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/logo-humano-sisu.png` }
    },
    url: fullUrl,
    ...(articleSection ? { articleSection } : {}),
  }
}

export interface ReviewSchema {
  '@context': string
  '@type': string
  itemReviewed: {
    '@type': string
    name: string
  }
  author: {
    '@type': string
    name: string
  }
  reviewRating: {
    '@type': string
    ratingValue: string
    bestRating: string
    worstRating: string
  }
  reviewBody: string
  datePublished?: string
}

/**
 * Generates Review schema for testimonials
 */
export function generateReviewSchema(options: {
  productName: string
  authorName: string
  rating: number
  reviewText: string
  datePublished?: string
}): ReviewSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: options.productName
    },
    author: {
      '@type': 'Person',
      name: options.authorName
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: options.rating.toString(),
      bestRating: '5',
      worstRating: '1'
    },
    reviewBody: options.reviewText,
    datePublished: options.datePublished
  }
}

