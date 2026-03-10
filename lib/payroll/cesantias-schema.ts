import { z } from 'zod'

export const motivoSalidaEnum = z.enum([
  'RENUNCIA',
  'DESPIDO_JUSTIFICADO',
  'DESPIDO_INJUSTIFICADO'
])

export const cesantiasRequestSchema = z.object({
  empleadoId: z.string().uuid().optional(),
  datosManuales: z.object({
    salarioBaseMensual: z.number().positive(),
    fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'La fecha de ingreso debe tener formato YYYY-MM-DD'
    }),
    fechaEgreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'La fecha de egreso debe tener formato YYYY-MM-DD'
    })
  }),
  parametrosCalculo: z.object({
    motivoSalida: motivoSalidaEnum,
    montoRapAcumulado: z.number().min(0).optional().default(0),
    preavisoGozado: z.boolean().optional().default(false)
  })
}).superRefine((val, ctx) => {
  const { fechaIngreso, fechaEgreso } = val.datosManuales
  const start = new Date(fechaIngreso)
  const end = new Date(fechaEgreso)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['datosManuales', 'fechaEgreso'],
      message: 'Las fechas de ingreso y egreso deben ser válidas'
    })
    return
  }

  if (end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['datosManuales', 'fechaEgreso'],
      message: 'La fecha de egreso no puede ser anterior a la fecha de ingreso'
    })
  }
})

export type CesantiasRequestInput = z.infer<typeof cesantiasRequestSchema>

