import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import { calcularLiquidacionHonduras } from '../../../lib/payroll/cesantias'
import { motivoSalidaEnum } from '../../../lib/payroll/cesantias-schema'

const prestacionesRequestSchema = z
  .object({
    datosManuales: z.object({
      salarioBaseMensual: z.number().positive(),
      fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'La fecha de ingreso debe tener formato YYYY-MM-DD',
      }),
      fechaEgreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'La fecha de egreso debe tener formato YYYY-MM-DD',
      }),
    }),
    parametrosCalculo: z.object({
      motivoSalida: motivoSalidaEnum,
      montoRapAcumulado: z.number().min(0).optional().default(0),
      preavisoGozado: z.boolean().optional().default(false),
    }),
  })
  .superRefine((val, ctx) => {
    const { fechaIngreso, fechaEgreso } = val.datosManuales
    const start = new Date(fechaIngreso)
    const end = new Date(fechaEgreso)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['datosManuales', 'fechaEgreso'],
        message: 'Las fechas de ingreso y egreso deben ser válidas',
      })
      return
    }

    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['datosManuales', 'fechaEgreso'],
        message: 'La fecha de egreso no puede ser anterior a la fecha de ingreso',
      })
    }
  })

async function calculatePrestacionesHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const startTime = Date.now()

  try {
    const parseResult = prestacionesRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const formatted = parseResult.error.format()
      logger.warn('Validación fallida en calculadora pública de prestaciones', {
        source: 'public_calculator',
        errors: formatted,
      })
      return res.status(400).json({
        error: 'Parámetros inválidos',
        validation: formatted,
      })
    }

    const input = parseResult.data

    logger.info('Cálculo de prestaciones iniciado', {
      source: 'public_calculator',
      motivoSalida: input.parametrosCalculo.motivoSalida,
    })

    const result = calcularLiquidacionHonduras({
      empleadoId: undefined,
      ...input,
    })

    const duration = Date.now() - startTime
    logger.info('Cálculo de prestaciones completado', {
      source: 'public_calculator',
      duration,
      totalPagar: result.rubros.totalPagar,
    })

    return res.status(200).json(result)
  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Error calculando prestaciones (público)', {
      source: 'public_calculator',
      error: error?.message,
      duration,
    })

    return res.status(500).json({
      error: 'Error interno del servidor al calcular prestaciones',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
}

export default withRateLimit(RATE_LIMITS.PUBLIC_CALCULATOR, calculatePrestacionesHandler)

