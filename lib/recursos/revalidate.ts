import type { NextApiResponse } from 'next'

/** Revalidate public /recursos pages after admin mutations. */
export async function revalidateRecursosPages(
  res: NextApiResponse,
  slug: string
): Promise<void> {
  try {
    await res.revalidate('/recursos')
    await res.revalidate(`/recursos/${slug}`)
  } catch (err) {
    console.warn('[recursos/revalidate] failed:', err)
  }
}
