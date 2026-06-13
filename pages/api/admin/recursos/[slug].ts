import type { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import {
  deleteRecurso,
  getRecursoAdmin,
  updateRecurso,
  NotFoundError,
  ValidationError,
  type RecursoInput,
} from '../../../../lib/recursos/admin'
import { revalidateRecursosPages } from '../../../../lib/recursos/revalidate'
import { isValidRecursoStatus } from '../../../../lib/recursos/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slugParam = req.query.slug
  const slug = typeof slugParam === 'string' ? slugParam : Array.isArray(slugParam) ? slugParam[0] : undefined

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' })
  }

  try {
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      const recurso = await getRecursoAdmin(slug)
      if (!recurso) {
        return res.status(404).json({ error: 'Artículo no encontrado' })
      }
      return res.status(200).json({ success: true, recurso })
    }

    if (req.method === 'PATCH') {
      const body = req.body as Partial<RecursoInput>
      if (body.status !== undefined && !isValidRecursoStatus(body.status)) {
        return res.status(400).json({ error: 'El estado debe ser draft o published' })
      }

      const existing = await getRecursoAdmin(slug)
      if (!existing) {
        return res.status(404).json({ error: 'Artículo no encontrado' })
      }

      const recurso = await updateRecurso(slug, body)
      await revalidateRecursosPages(res, slug)
      return res.status(200).json({ success: true, recurso })
    }

    if (req.method === 'DELETE') {
      const existing = await getRecursoAdmin(slug)
      if (!existing) {
        return res.status(404).json({ error: 'Artículo no encontrado' })
      }

      await deleteRecurso(slug)
      await revalidateRecursosPages(res, slug)
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
        return
      }
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message })
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message })
      }
    }
    console.error('[api/admin/recursos/[slug]] error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
