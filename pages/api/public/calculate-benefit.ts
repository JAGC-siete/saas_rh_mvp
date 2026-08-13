import { NextApiRequest, NextApiResponse } from 'next'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import { benefitCalculateRequestSchema } from '../../../lib/payroll/thirteenth-fourteenth/schema'
import { calculateBenefit } from '../../../lib/payroll/thirteenth-fourteenth/calculate'

async function calculateBenefitHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const startTime = Date.now()

  try {
    const parseResult = benefitCalculateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const formatted = parseResult.error.format()
      logger.warn('Validación fallida en calculadora pública de beneficio', {
        source: 'public_calculator',
        errors: formatted,
      })
      return res.status(400).json({
        error: 'Parámetros inválidos',
        validation: formatted,
      })
    }

    const result = calculateBenefit(parseResult.data)

    logger.info('Cálculo de beneficio completado', {
      source: 'public_calculator',
      tipo: result.tipo,
      duration: Date.now() - startTime,
      monto: result.monto,
    })

    return res.status(200).json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error calculando beneficio (público)', {
      source: 'public_calculator',
      error: message,
      duration: Date.now() - startTime,
    })
    return res.status(500).json({
      error: 'Error interno del servidor al calcular el beneficio',
      details: process.env.NODE_ENV === 'development' ? message : undefined,
    })
  }
}

export default withRateLimit(RATE_LIMITS.PUBLIC_CALCULATOR, calculateBenefitHandler)
