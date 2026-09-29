import { isStatutoryReservedCustomKey } from './payroll/statutory-reserved-custom-keys'
import { evaluateFormulaSafe } from './utils/formula-evaluator'

interface CustomField {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' | 'calculation_helper'
  required: boolean
  default: any
  formula?: string
  parameters?: Array<{ key: string; label: string; type: 'number' | 'string'; default: number | string }>
  track_plazos?: boolean
}

export interface PayrollCalculationResult {
  totalIngresosAdicionales: number
  totalDeduccionesAdicionales: number
  calculatedFields: Record<string, any>
}

function formulaMetadata(
  metadata: Record<string, any>
): Record<string, number | string | boolean> {
  const out: Record<string, number | string | boolean> = {}
  for (const [key, value] of Object.entries(metadata || {})) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      out[key] = value
    }
  }
  return out
}

/**
 * Custom fields from company_payroll_configs: sum earnings, subtract deductions.
 * If a field defines `formula`, evaluate it with formula-evaluator (no Function/eval).
 */
export async function calculatePayrollFromConfig(
  companyId: string,
  baseSalary: number,
  metadata: Record<string, any>,
  supabase: any
): Promise<PayrollCalculationResult> {
  const { data: config, error } = await supabase
    .from('company_payroll_configs')
    .select('custom_fields')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (error || !config) {
    return {
      totalIngresosAdicionales: 0,
      totalDeduccionesAdicionales: 0,
      calculatedFields: {},
    }
  }

  return applyCustomFields(
    config.custom_fields as Record<string, CustomField> | undefined,
    metadata,
    baseSalary
  )
}

function applyCustomFields(
  customFieldsDefinitions: Record<string, CustomField> | undefined,
  metadata: Record<string, any>,
  baseSalary: number = 0
): PayrollCalculationResult {
  let totalIngresosAdicionales = 0
  let totalDeduccionesAdicionales = 0
  const calculatedFields: Record<string, any> = {}

  if (!customFieldsDefinitions) {
    return {
      totalIngresosAdicionales: 0,
      totalDeduccionesAdicionales: 0,
      calculatedFields: {},
    }
  }

  const enginePaysOvertime =
    metadata?.overtime_pay != null && Number.isFinite(Number(metadata.overtime_pay))

  for (const [fieldName, fieldDef] of Object.entries(customFieldsDefinitions)) {
    if (fieldDef.category !== 'earnings' && fieldDef.category !== 'deductions') {
      continue
    }

    if (enginePaysOvertime && fieldName === 'horas_extras' && fieldDef.category === 'earnings') {
      continue
    }

    const reservedStatutory =
      fieldDef.category === 'deductions' && isStatutoryReservedCustomKey(fieldName)

    let numericValue = 0

    if (fieldDef.formula) {
      try {
        numericValue = evaluateFormulaSafe(fieldDef.formula, {
          baseSalary,
          metadata: formulaMetadata(metadata),
        })
        if (!isFinite(numericValue) || isNaN(numericValue)) numericValue = 0
      } catch {
        numericValue = 0
      }
    } else {
      const value = metadata[fieldName]
      if (value !== undefined && value !== null) {
        if (typeof value === 'number') {
          numericValue = value
        } else if (typeof value === 'boolean') {
          numericValue = value ? 1 : 0
        } else if (typeof value === 'string') {
          numericValue = parseFloat(value) || 0
        }
      }
    }

    calculatedFields[fieldName] = numericValue

    if (reservedStatutory) {
      continue
    }

    if (fieldDef.category === 'earnings') {
      totalIngresosAdicionales += numericValue
    } else if (fieldDef.category === 'deductions') {
      totalDeduccionesAdicionales += numericValue
    }
  }

  return {
    totalIngresosAdicionales,
    totalDeduccionesAdicionales,
    calculatedFields,
  }
}

export async function getCustomFieldsFromDB(
  companyId: string,
  supabase: any
): Promise<Record<string, CustomField> | null> {
  const { data, error } = await supabase
    .from('company_payroll_configs')
    .select('custom_fields')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (error || !data || !data.custom_fields) {
    return null
  }

  return data.custom_fields as Record<string, CustomField>
}

export function validateCustomFields(
  customFields: Record<string, any>,
  fieldDefinitions: Record<string, CustomField>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!fieldDefinitions || Object.keys(fieldDefinitions).length === 0) {
    return { valid: true, errors: [] }
  }

  for (const [fieldName, value] of Object.entries(customFields)) {
    const definition = fieldDefinitions[fieldName]

    if (!definition) {
      continue
    }

    if (definition.type === 'number') {
      if (typeof value === 'string' && value.trim() === '') {
        if (definition.required) {
          errors.push(`${fieldName} es requerido`)
        }
      } else if (typeof value !== 'number') {
        const numValue = parseFloat(value)
        if (isNaN(numValue)) {
          errors.push(`${fieldName} debe ser un número válido`)
        }
      }
    }

    if (
      definition.type === 'boolean' &&
      typeof value !== 'boolean' &&
      value !== 'true' &&
      value !== 'false' &&
      value !== 1 &&
      value !== 0
    ) {
      errors.push(`${fieldName} debe ser un booleano`)
    }

    if (definition.type === 'string' && typeof value !== 'string') {
      errors.push(`${fieldName} debe ser un string`)
    }

    if (definition.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldName} es requerido`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
