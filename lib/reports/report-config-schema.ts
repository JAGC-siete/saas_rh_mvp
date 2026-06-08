import { z } from 'zod'

/**
 * Report configuration schema for metadata-driven reports.
 * Validates config JSONB stored in report_configurations table.
 */

export const reportColumnSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  visible: z.boolean().default(true),
  order: z.number().int().min(0),
  source: z.enum(['standard', 'payroll_config']).optional(),
  sourceField: z.string().optional()
})

export const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  legalName: z.string().max(200).optional(),
  useLegalSuffix: z.boolean().optional()
})

export const reportConfigSchema = z.object({
  branding: brandingSchema.optional(),
  columns: z.array(reportColumnSchema).optional(),
  includeCustomPayrollFields: z.boolean().optional()
})

export type ReportColumnConfig = z.infer<typeof reportColumnSchema>
export type BrandingConfig = z.infer<typeof brandingSchema>
export type ReportConfig = z.infer<typeof reportConfigSchema>

export const reportTypeEnum = z.enum([
  'attendance', 'payroll', 'employees', 'work_certificate', 'severance', 'voucher'
])
export type ReportType = z.infer<typeof reportTypeEnum>

/** Orden y etiquetas UI: mismas pestañas que ReportBuilder y opciones en Parámetros de Reportes. */
export const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'attendance', label: 'Asistencia' },
  { value: 'payroll', label: 'Nómina' },
  { value: 'employees', label: 'Empleados' },
  { value: 'work_certificate', label: 'Constancias' },
  { value: 'severance', label: 'Liquidación' },
  { value: 'voucher', label: 'Recibo de pago' }
]
