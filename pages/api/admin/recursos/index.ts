import type { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import {
  createRecurso,
  listRecursosAdmin,
  ConflictError,
  ValidationError,
  type RecursoInput,
} from '../../../../lib/recursos/admin'
import { revalidateRecursosPages } from '../../../../lib/recursos/revalidate'
import { isValidRecursoStatus } from '../../../../lib/recursos/validation'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      const recursos = await listRecursosAdmin()
      return res.status(200).json({ success: true, recursos })
    }

    if (req.method === 'POST') {
      const body = req.body as Partial<RecursoInput>
      const status = body.status ?? 'draft'
      if (!isValidRecursoStatus(status)) {
        return res.status(400).json({ error: 'El estado debe ser draft o published' })
      }

      const recurso = await createRecurso({
        slug: body.slug ?? '',
        title: body.title ?? '',
        description: body.description ?? '',
        content: body.content ?? '',
        datePublished: body.datePublished,
        dateModified: body.dateModified,
        image: body.image,
        author: body.author,
        status,
      })

      await revalidateRecursosPages(res, recurso.slug)
      return res.status(201).json({ success: true, recurso })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
        return
      }
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message })
      }
      if (error instanceof ConflictError) {
        return res.status(409).json({ error: error.message })
      }
    }
    console.error('[api/admin/recursos] error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
