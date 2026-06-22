import type { NextApiResponse } from 'next'

/** Revalidate public /recursos pages after admin mutations. */
export async function revalidateRecursosPages(
  res: NextApiResponse,
  slug: string
): Promise<void> {
  const paths = [
    '/recursos',
    '/recursos/rrhh',
    '/recursos/responsabilidad-individual',
    `/recursos/${slug}`,
  ]

  for (const path of paths) {
    try {
      await res.revalidate(path)
    } catch (err) {
      // Slug pages may not exist in the prerender cache yet; index revalidation is the critical one.
      console.error(`[recursos/revalidate] failed for ${path}:`, err)
    }
  }
}
