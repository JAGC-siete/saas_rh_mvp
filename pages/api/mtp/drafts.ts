import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { withGeneralRateLimit } from '../../../lib/security/rate-limiting'
import {
  assertMtpPayloadSize,
  createMtpDraftSchema,
  updateMtpDraftSchema,
  type MTPDraft
} from '../../../lib/mtp/schema'

const draftIdSchema = z.string().uuid('ID de borrador inválido')

function parseId(req: NextApiRequest): string {
  const raw = req.query.id ?? req.body?.id
  const id = Array.isArray(raw) ? raw[0] : raw
  return draftIdSchema.parse(id)
}

function handleValidationError(res: NextApiResponse, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: error.issues.map((issue) => issue.message)
    })
  }
  if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
    return res.status(413).json({
      error: 'El borrador excede el tamaño máximo permitido'
    })
  }
  return null
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { companyId, user, role } = await requireCompanyAccess(req, res)
    const requestedCompanyId = typeof req.query.company_id === 'string' ? req.query.company_id : null
    const effectiveCompanyId = companyId ?? requestedCompanyId

    if (!effectiveCompanyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (role !== 'super_admin' && companyId !== effectiveCompanyId) {
      return res.status(403).json({ error: 'No tiene permiso para esta empresa' })
    }

    const supabase = createAdminClient()

    if (req.method === 'GET') {
      const id = typeof req.query.id === 'string' ? req.query.id : null
      let query = supabase
        .from('mtp_job_description_drafts')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('updated_at', { ascending: false })

      if (id) {
        draftIdSchema.parse(id)
        query = query.eq('id', id)
      }

      const { data, error } = await query
      if (error) throw error

      return res.status(200).json({
        drafts: (data ?? []) as MTPDraft[]
      })
    }

    if (req.method === 'POST') {
      assertMtpPayloadSize(req.body)
      const input = createMtpDraftSchema.parse(req.body)

      const { data, error } = await supabase
        .from('mtp_job_description_drafts')
        .insert({
          company_id: effectiveCompanyId,
          title: input.title,
          role_name: input.role_name,
          department_id: input.department_id ?? null,
          items: input.items,
          status: input.status,
          version: 1,
          previous_items: null,
          created_by: user.id
        })
        .select('*')
        .single()

      if (error) throw error
      return res.status(201).json({ draft: data as MTPDraft })
    }

    if (req.method === 'PATCH') {
      assertMtpPayloadSize(req.body)
      const input = updateMtpDraftSchema.parse(req.body)

      const { data: existing, error: existingError } = await supabase
        .from('mtp_job_description_drafts')
        .select('*')
        .eq('id', input.id)
        .eq('company_id', effectiveCompanyId)
        .maybeSingle()

      if (existingError) throw existingError
      if (!existing) {
        return res.status(404).json({ error: 'Borrador no encontrado' })
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      }

      if (input.title !== undefined) updateData.title = input.title
      if (input.role_name !== undefined) updateData.role_name = input.role_name
      if (input.department_id !== undefined) updateData.department_id = input.department_id
      if (input.status !== undefined) updateData.status = input.status
      if (input.items !== undefined) {
        updateData.items = input.items
        updateData.previous_items = existing.items ?? []
        updateData.version = Number(existing.version ?? 1) + 1
      }

      const { data, error } = await supabase
        .from('mtp_job_description_drafts')
        .update(updateData)
        .eq('id', input.id)
        .eq('company_id', effectiveCompanyId)
        .select('*')
        .single()

      if (error) throw error
      return res.status(200).json({ draft: data as MTPDraft })
    }

    if (req.method === 'DELETE') {
      const id = parseId(req)
      const { error } = await supabase
        .from('mtp_job_description_drafts')
        .delete()
        .eq('id', id)
        .eq('company_id', effectiveCompanyId)

      if (error) throw error
      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    const handled = handleValidationError(res, error)
    if (handled) return handled

    if (['UNAUTHORIZED', 'PROFILE_REQUIRED', 'COMPANY_ACCESS_REQUIRED'].includes(error?.message)) {
      return
    }

    console.error('MTP drafts API error:', error)
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    })
  }
}

export default withGeneralRateLimit(['GET', 'POST', 'PATCH', 'DELETE'])(handler)
