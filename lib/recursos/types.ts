/**
 * Types and adapter contract for /recursos content.
 * Pages and SEO depend only on this contract; the content source (files vs CMS) is behind the adapter.
 */

/** Full article metadata and content for the article page. */
export interface RecursoMeta {
  slug: string
  title: string
  description: string
  content: string
  datePublished: string
  dateModified?: string
  image?: string
  author?: string
}

/** List item for the /recursos index (no content body). */
export interface RecursoListItem {
  slug: string
  title: string
  description: string
  datePublished: string
  dateModified?: string
  image?: string
  author?: string
}

/** Adapter contract: slugs, list, and item by slug. */
export interface IRecursosAdapter {
  getAllSlugs(): Promise<{ slug: string }[]>
  getRecursoBySlug(slug: string): Promise<RecursoMeta | null>
  getRecursosList(): Promise<RecursoListItem[]>
}
