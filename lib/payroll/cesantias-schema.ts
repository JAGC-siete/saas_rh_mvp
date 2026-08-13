import { z } from 'zod'
import { parseDateYmd } from './thirteenth-fourteenth/calendar'

export const motivoSalidaEnum = z.enum([
  'RENUNCIA',
  'DESPIDO_JUSTIFICADO',
  'DESPIDO_INJUSTIFICADO',
  'CAUSA_AJENA_TRABAJADOR',
  'FALLECIMIENTO',
  'PENSION_JUBILACION_EQUIVALENTE',
  'FIN_CONTRATO',
  'MUTUO_ACUERDO'
])

export const cesantiasRequestSchema = z.object({
  empleadoId: z.string().uuid().optional(),
  datosManuales: z.object({
    salarioBaseMensual: z.number().positive(),
    /**
     * Art. 123: promedio de los últimos 6 meses (o fracción si menor).
     * Opcional para mantener compatibilidad con la calculadora pública.
     */
    salarioPromedioMensual: z.number().positive().optional(),
    salariosUltimos6Meses: z.array(z.number().nonnegative()).min(1).max(6).optional(),
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
    preavisoGozado: z.boolean().optional().default(false),
    condiciones: z
      .object({
        fallecimientoNatural: z.boolean().optional(),
        tienePensionEquivalente: z.boolean().optional(),
        retiroVoluntario: z.boolean().optional()
      })
      .optional()
  })
}).superRefine((val, ctx) => {
  const { fechaIngreso, fechaEgreso } = val.datosManuales
  const start = parseDateYmd(fechaIngreso)
  const end = parseDateYmd(fechaEgreso)

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

/** Input shape (defaults applied at runtime / by Zod parse). */
export type CesantiasRequestInput = z.input<typeof cesantiasRequestSchema>
/** Parsed shape after defaults (`montoRapAcumulado`, `preavisoGozado`, …). */
export type CesantiasRequest = z.infer<typeof cesantiasRequestSchema>

