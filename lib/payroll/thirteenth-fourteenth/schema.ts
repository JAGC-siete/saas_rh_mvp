import { z } from 'zod'

export const benefitTipoEnum = z.enum(['13AVO', '14AVO'])
export const benefitModoCalculoEnum = z.enum(['proporcional', 'anual'])

export const benefitCalculateRequestSchema = z
  .object({
    tipo: benefitTipoEnum,
    salarioBaseMensual: z.number().positive('El salario base debe ser mayor a cero'),
    salarioPromedioMensual: z.number().positive().optional(),
    fechaIngreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'La fecha de ingreso debe tener formato YYYY-MM-DD',
    }),
    fechaCalculo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'La fecha de cálculo debe tener formato YYYY-MM-DD',
    }),
    modoCalculo: benefitModoCalculoEnum.optional().default('proporcional'),
    diasTrabajadosPeriodo: z.number().int().min(0).max(360).optional(),
  })
  .superRefine((val, ctx) => {
    const start = new Date(val.fechaIngreso)
    const end = new Date(val.fechaCalculo)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fechaCalculo'],
        message: 'Las fechas deben ser válidas',
      })
      return
    }
    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fechaCalculo'],
        message: 'La fecha de cálculo no puede ser anterior a la fecha de ingreso',
      })
    }
    if (val.modoCalculo === 'anual' && val.salarioPromedioMensual == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salarioPromedioMensual'],
        message: 'En modo anual ingresa el salario promedio ordinario del período',
      })
    }
  })

export type BenefitCalculateRequest = z.infer<typeof benefitCalculateRequestSchema>
