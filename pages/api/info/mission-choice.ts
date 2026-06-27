import type { NextApiRequest, NextApiResponse } from 'next'
import { createErrorResponse, createSuccessResponse } from '../../../lib/security/api-responses'
import { getMissionFeedback } from '../../../lib/info-game/mission-feedback'
import { parseMissionId, isValidMissionChoice } from '../../../lib/marketing/mission-config'
import { recordMissionChoice } from '../../../lib/marketing/record-mission-choice'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  const payload = req.method === 'POST' ? req.body : req.query
  const missionId = parseMissionId(payload.mission ?? payload.id)
  const leadToken = typeof payload.lead === 'string' ? payload.lead.trim() : ''
  const choice = typeof payload.choice === 'string' ? payload.choice.trim() : ''

  if (!missionId || !leadToken || !choice) {
    return res.status(400).json(createErrorResponse('Parámetros inválidos', 'VALIDATION_ERROR'))
  }

  if (!isValidMissionChoice(missionId, choice)) {
    return res.status(400).json(createErrorResponse('Decisión no válida para esta misión', 'VALIDATION_ERROR'))
  }

  try {
    const recorded = await recordMissionChoice({ missionId, leadToken, choice })
    if (!recorded.ok) {
      const status = recorded.reason === 'lead_not_found' ? 404 : 400
      return res.status(status).json(createErrorResponse('No se pudo registrar la misión', recorded.reason))
    }

    const feedback = getMissionFeedback(missionId, choice, recorded.firstName ?? 'Curioso', leadToken)

    return res.status(200).json(
      createSuccessResponse({
        missionId,
        choice,
        alreadyRecorded: recorded.alreadyRecorded,
        feedback,
      })
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Mission choice API error', { message, missionId })
    return res.status(500).json(createErrorResponse('Internal server error', 'INTERNAL_ERROR'))
  }
}
