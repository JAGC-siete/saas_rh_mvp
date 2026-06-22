export type RecursoCategory = 'rrhh' | 'responsabilidad-individual'

export const RECURSO_CATEGORIES: RecursoCategory[] = ['rrhh', 'responsabilidad-individual']

/** URL segments reserved for collection pages — not valid article slugs. */
export const RESERVED_RECURSO_SLUGS = new Set(['rrhh', 'responsabilidad-individual'])

export interface RecursoCategoryMeta {
  slug: RecursoCategory
  path: string
  hubTitle: string
  hubSubtitle: string
  pageTitle: string
  pageDescription: string
  breadcrumbLabel: string
}

export const RECURSO_CATEGORY_META: Record<RecursoCategory, RecursoCategoryMeta> = {
  rrhh: {
    slug: 'rrhh',
    path: '/recursos/rrhh',
    hubTitle: 'Gestión y Nómina',
    hubSubtitle:
      'Guías técnicas, cumplimiento legal y eficiencia para PyMEs en Centroamérica.',
    pageTitle: 'Gestión y Nómina | Recursos | Humano SISU',
    pageDescription:
      'Artículos sobre nómina, IHSS, RAP, ISR, cesantías, asistencia biométrica y cumplimiento laboral en Honduras y la región.',
    breadcrumbLabel: 'Gestión y Nómina',
  },
  'responsabilidad-individual': {
    slug: 'responsabilidad-individual',
    path: '/recursos/responsabilidad-individual',
    hubTitle: 'El Factor Humano',
    hubSubtitle:
      'Reflexiones sobre liderazgo personal y arquitectura del ser por Jorge Arturo Gómez.',
    pageTitle: 'El Factor Humano | Recursos | Humano SISU',
    pageDescription:
      'Ensayos sobre responsabilidad individual, hábitos y liderazgo por Licenciado Jorge Arturo Gómez Coello.',
    breadcrumbLabel: 'El Factor Humano',
  },
}

export function isValidRecursoCategory(value: unknown): value is RecursoCategory {
  return value === 'rrhh' || value === 'responsabilidad-individual'
}

/** Map legacy frontmatter labels to DB category. */
export function parseCategoryFromFrontmatter(value: unknown): RecursoCategory {
  if (typeof value !== 'string') return 'rrhh'
  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'responsabilidad-individual' ||
    normalized === 'responsabilidad individual' ||
    normalized === 'liderazgo y cultura' ||
    normalized === 'el factor humano'
  ) {
    return 'responsabilidad-individual'
  }
  return 'rrhh'
}

export function inferCategoryFromSlug(slug: string): RecursoCategory {
  if (slug.includes('responsabilidad-individual') || slug.startsWith('arquitecto-de-si-mismo')) {
    return 'responsabilidad-individual'
  }
  return 'rrhh'
}
