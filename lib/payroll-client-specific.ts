/**
 * Client-Specific Payroll Configuration
 * 
 * This module handles client-specific payroll fields without affecting other clients.
 * Each client can have their own calculation logic and additional fields stored in
 * the metadata JSONB column of payroll_run_lines.
 * 
 * REFACTORED: Now supports database-backed configuration for scalability.
 * Falls back to hardcoded configs for backward compatibility.
 */

import { calculatePayrollFromConfig, getCustomFieldsFromDB, validateCustomFields } from './payroll-calculation-engine'

export interface ClientPayrollConfig {
  companyId: string
  companyName?: string
  calculationType: 'standard' | 'prohalca' | 'almacenes_extra' | 'formula_based' | 'custom'
  customFields?: {
    [key: string]: string | {
      label: string
      type: 'number' | 'string' | 'boolean'
      category: 'earnings' | 'deductions' | 'calculation_helper'
      required: boolean
      default: any
    }
  }
}

// Client-specific payroll configurations
export const CLIENT_PAYROLL_CONFIGS: ClientPayrollConfig[] = [
  {
    companyId: '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c',
    companyName: 'PROHALCA',
    calculationType: 'prohalca',
    customFields: {
      // Earnings (Ingresos)
      'horas_extras': 'Horas extras trabajadas',
      'feriado_trabajado': 'Día feriado trabajado (monto adicional)',
      'estipendio_transporte': 'Estipendio de transporte',
      
      // Deductions (Deducciones)
      'comedor': 'Descuento por comedor/cafeteria',
      
      // Cooperativa CACEENP
      'cooperativa_aportaciones': 'Aportaciones a cooperativa',
      'cooperativa_retirable': 'Retirable de cooperativa',
      'cooperativa_prestamo': 'Préstamo de cooperativa',
      
      // Other Deductions
      'embargo_alimentos': 'Embargo de alimentos (child support)',
      'otras_deducciones_materiales': 'Otras deducciones - Materiales',
      'otras_deducciones_medicamentos': 'Otras deducciones - Medicamentos/Consultas',
      'otras_deducciones_efectivo': 'Otras deducciones - Efectivo',
      
      // Calculation helpers
      'valor_hora_extra': 'Valor de hora extra',
      'descanso_por_turno_noche': 'Compensación por turno nocturno (boolean)',
      'doble_turno': 'Compensación por doble turno (boolean)',
      'pausa_almuerzo': 'Pausa de almuerzo en minutos'
    }
  },
  {
    companyId: '2e4781b1-f1f5-449f-b0b1-b9cf1630f5a6',
    companyName: 'Almacenes EXTRA',
    calculationType: 'almacenes_extra',
    customFields: {
      // Earnings / Adjustments (Ingresos/Ajustes)
      'incapacidad': 'Pago por incapacidad (lempiras por día)',
      'dias_faltados': 'Días faltados (afecta cálculo de horas)',
      
      // Deductions (Deducciones)
      'prestamo_banrural': 'Préstamo BANRURAL',
      'prestamo_celular': 'Préstamo celular',
      'anticipo_prestamo': 'Anticipo/Préstamo',
      'impuesto_vecinal': 'Impuesto vecinal (anual - una vez al año)'
      
      // NOTA: RAP ya existe en el schema estándar (calc_rap/eff_rap)
    }
  }
]

/**
 * Get payroll configuration for a specific company
 * 
 * NEW: Tries to get from database first, falls back to hardcoded configs
 */
export async function getPayrollConfig(
  companyId: string,
  supabase?: any
): Promise<ClientPayrollConfig | undefined> {
  // Try database first if supabase client is provided
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('company_payroll_configs')
        .select('company_id, calculation_type, custom_fields')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single()

      if (!error && data) {
        // Convert DB format to ClientPayrollConfig format
        const customFields: Record<string, string> = {}
        if (data.custom_fields) {
          for (const [fieldName, fieldDef] of Object.entries(data.custom_fields)) {
            const def = fieldDef as any
            customFields[fieldName] = typeof def === 'string' 
              ? def 
              : def.label || fieldName
          }
        }

        return {
          companyId: data.company_id,
          calculationType: data.calculation_type as any,
          customFields
        }
      }
    } catch (error) {
      // Fallback to hardcoded configs
    }
  }

  // Fallback to hardcoded configs
  return CLIENT_PAYROLL_CONFIGS.find(config => config.companyId === companyId)
}

/**
 * Get payroll configuration (synchronous version for backward compatibility)
 * @deprecated Use async version with supabase client
 */
export function getPayrollConfigSync(companyId: string): ClientPayrollConfig | undefined {
  return CLIENT_PAYROLL_CONFIGS.find(config => config.companyId === companyId)
}

/**
 * Check if a company has custom payroll fields
 * 
 * NEW: Supports database-backed configs
 */
export async function hasCustomFields(
  companyId: string,
  supabase?: any
): Promise<boolean> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('company_payroll_configs')
        .select('custom_fields')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single()

      if (!error && data?.custom_fields) {
        return Object.keys(data.custom_fields).length > 0
      }
    } catch (error) {
      // Fallback to hardcoded check
    }
  }

  // Fallback
  const config = getPayrollConfigSync(companyId)
  return config?.customFields ? Object.keys(config.customFields).length > 0 : false
}

/**
 * Get custom fields definition for a company
 * 
 * NEW: Supports database-backed configs
 */
export async function getCustomFields(
  companyId: string,
  supabase?: any
): Promise<{ [key: string]: string } | undefined> {
  if (supabase) {
    const fields = await getCustomFieldsFromDB(companyId, supabase)
    if (fields) {
      // Convert to simple format for backward compatibility
      const result: Record<string, string> = {}
      for (const [fieldName, fieldDef] of Object.entries(fields)) {
        result[fieldName] = typeof fieldDef === 'string' 
          ? fieldDef 
          : fieldDef.label || fieldName
      }
      return result
    }
  }

  // Fallback
  const config = getPayrollConfigSync(companyId)
  if (config?.customFields) {
    // Convert to simple format
    const result: Record<string, string> = {}
    for (const [fieldName, fieldDef] of Object.entries(config.customFields)) {
      result[fieldName] = typeof fieldDef === 'string' ? fieldDef : (fieldDef as any).label || fieldName
    }
    return result
  }
  return undefined
}

/**
 * Calculate PROHALCA-specific payroll values
 */
export function calculateProhalcaPayroll(baseSalary: number, metadata: any): {
  // Earnings
  horasExtras: number
  feriadoTrabajado: number
  estipendioTransporte: number
  
  // Deductions
  comedor: number
  cooperativaAportaciones: number
  cooperativaRetirable: number
  cooperativaPrestamo: number
  embargoAlimentos: number
  otrasDeduccionesMateriales: number
  otrasDeduccionesMedicamentos: number
  otrasDeduccionesEfectivo: number
  
  // Calculation helpers
  valorHoraExtra: number
  descansoTurnoNoche: boolean
  dobleTurno: boolean
  
  // Totals
  totalIngresosAdicionales: number
  totalDeduccionesAdicionales: number
} {
  // Extract earnings from metadata
  const horasExtras = parseFloat(metadata?.horas_extras || '0')
  const feriadoTrabajado = parseFloat(metadata?.feriado_trabajado || '0')
  const estipendioTransporte = parseFloat(metadata?.estipendio_transporte || '0')
  
  // Extract deductions from metadata
  const comedor = parseFloat(metadata?.comedor || '0')
  const cooperativaAportaciones = parseFloat(metadata?.cooperativa_aportaciones || '0')
  const cooperativaRetirable = parseFloat(metadata?.cooperativa_retirable || '0')
  const cooperativaPrestamo = parseFloat(metadata?.cooperativa_prestamo || '0')
  const embargoAlimentos = parseFloat(metadata?.embargo_alimentos || '0')
  const otrasDeduccionesMateriales = parseFloat(metadata?.otras_deducciones_materiales || '0')
  const otrasDeduccionesMedicamentos = parseFloat(metadata?.otras_deducciones_medicamentos || '0')
  const otrasDeduccionesEfectivo = parseFloat(metadata?.otras_deducciones_efectivo || '0')
  
  // Calculation helpers
  const valorHoraExtra = parseFloat(metadata?.valor_hora_extra || '0') || (baseSalary / 220) * 1.5
  const descansoTurnoNoche = metadata?.descanso_por_turno_noche || false
  const dobleTurno = metadata?.doble_turno || false
  
  // Calculate totals
  const totalIngresosAdicionales = horasExtras + feriadoTrabajado + estipendioTransporte
  const totalDeduccionesAdicionales = comedor + cooperativaAportaciones + cooperativaRetirable + 
    cooperativaPrestamo + embargoAlimentos + otrasDeduccionesMateriales + 
    otrasDeduccionesMedicamentos + otrasDeduccionesEfectivo

  return {
    // Earnings
    horasExtras,
    feriadoTrabajado,
    estipendioTransporte,
    
    // Deductions
    comedor,
    cooperativaAportaciones,
    cooperativaRetirable,
    cooperativaPrestamo,
    embargoAlimentos,
    otrasDeduccionesMateriales,
    otrasDeduccionesMedicamentos,
    otrasDeduccionesEfectivo,
    
    // Calculation helpers
    valorHoraExtra,
    descansoTurnoNoche,
    dobleTurno,
    
    // Totals
    totalIngresosAdicionales,
    totalDeduccionesAdicionales
  }
}

/**
 * Calculate Almacenes EXTRA-specific payroll values
 */
export function calculateAlmacenesExtraPayroll(baseSalary: number, metadata: any): {
  // Earnings / Adjustments
  incapacidad: number
  diasFaltados: number
  
  // Deductions
  prestamoBanrural: number
  prestamoCelular: number
  anticipoPrestamo: number
  impuestoVecinal: number
  
  // Totals
  totalIngresosAdicionales: number
  totalDeduccionesAdicionales: number
} {
  // Extract earnings/adjustments from metadata
  const incapacidad = parseFloat(metadata?.incapacidad || '0')
  const diasFaltados = parseFloat(metadata?.dias_faltados || '0')
  
  // Extract deductions from metadata
  const prestamoBanrural = parseFloat(metadata?.prestamo_banrural || '0')
  const prestamoCelular = parseFloat(metadata?.prestamo_celular || '0')
  const anticipoPrestamo = parseFloat(metadata?.anticipo_prestamo || '0')
  const impuestoVecinal = parseFloat(metadata?.impuesto_vecinal || '0')
  
  // Calculate totals
  const totalIngresosAdicionales = incapacidad
  const totalDeduccionesAdicionales = prestamoBanrural + prestamoCelular + 
    anticipoPrestamo + impuestoVecinal

  return {
    // Earnings / Adjustments
    incapacidad,
    diasFaltados,
    
    // Deductions
    prestamoBanrural,
    prestamoCelular,
    anticipoPrestamo,
    impuestoVecinal,
    
    // Totals
    totalIngresosAdicionales,
    totalDeduccionesAdicionales
  }
}

/**
 * Save custom payroll metadata for a payroll line
 * 
 * NEW: Supports database-backed configs
 */
export async function buildPayrollMetadata(
  companyId: string,
  customData: any,
  supabase?: any
): Promise<any> {
  let customFields: Record<string, any> = {}

  if (supabase) {
    try {
      const fields = await getCustomFieldsFromDB(companyId, supabase)
      if (fields) {
        customFields = fields
      }
    } catch (error) {
      // Fallback to hardcoded fields
    }
  }

  // Fallback to hardcoded config
  if (Object.keys(customFields).length === 0) {
    const config = getPayrollConfigSync(companyId)
    if (config?.customFields) {
      // Convert to simple object for iteration
      customFields = config.customFields as any
    }
  }

  if (Object.keys(customFields).length === 0) {
    return {}
  }

  // Build metadata object with only known custom fields
  const metadata: any = {}
  
  for (const fieldName in customData) {
    if (customFields[fieldName]) {
      metadata[fieldName] = customData[fieldName]
    }
  }

  return metadata
}

/**
 * Extract custom fields from metadata for display
 * 
 * NEW: Supports database-backed configs
 */
export async function extractCustomFields(
  companyId: string,
  metadata: any,
  supabase?: any
): Promise<any> {
  if (!metadata) {
    return {}
  }

  let customFields: Record<string, any> = {}

  if (supabase) {
    try {
      const fields = await getCustomFieldsFromDB(companyId, supabase)
      if (fields) {
        customFields = fields
      }
    } catch (error) {
      // Fallback to hardcoded fields
    }
  }

  // Fallback to hardcoded config
  if (Object.keys(customFields).length === 0) {
    const config = getPayrollConfigSync(companyId)
    if (config?.customFields) {
      customFields = config.customFields as any
    }
  }

  if (Object.keys(customFields).length === 0) {
    return {}
  }

  const extracted: any = {}
  
  for (const fieldName in customFields) {
    if (metadata[fieldName] !== undefined) {
      extracted[fieldName] = metadata[fieldName]
    }
  }

  return extracted
}

/**
 * Validate custom payroll data for a company
 * 
 * NEW: Supports database-backed configs with proper validation
 */
export async function validateCustomPayrollData(
  companyId: string,
  data: any,
  supabase?: any
): Promise<{ valid: boolean; errors: string[] }> {
  let fieldDefinitions: Record<string, any> = {}

  if (supabase) {
    try {
      const fields = await getCustomFieldsFromDB(companyId, supabase)
      if (fields) {
        fieldDefinitions = fields
        // Use proper validation from engine
        return validateCustomFields(data, fields)
      }
    } catch (error) {
      // Fallback validation
    }
  }

  // Fallback to basic validation
  const config = getPayrollConfigSync(companyId)
  const errors: string[] = []

  if (!config || !config.customFields) {
    return { valid: true, errors: [] }
  }

  // Validate required fields
  for (const fieldName in config.customFields) {
    const fieldType = typeof data[fieldName]
    const fieldValue = data[fieldName]

    if (fieldValue === undefined) {
      continue // Optional fields
    }

    // Basic type validation
    if (fieldType === 'string' && fieldValue === '') {
      errors.push(`${fieldName} cannot be empty`)
    }

    if (fieldType === 'number' && isNaN(fieldValue)) {
      errors.push(`${fieldName} must be a valid number`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Calculate payroll using database configuration
 * 
 * NEW: Main function to use for payroll calculations
 * Automatically uses DB config if available, falls back to hardcoded functions
 */
export async function calculatePayroll(
  companyId: string,
  baseSalary: number,
  metadata: any,
  supabase: any
): Promise<{
  totalIngresosAdicionales: number
  totalDeduccionesAdicionales: number
  calculatedFields: Record<string, any>
}> {
  // Try database-backed calculation first
  if (supabase) {
    try {
      const result = await calculatePayrollFromConfig(
        companyId,
        baseSalary,
        metadata,
        supabase
      )
      
      // If we got a result (even if zeros), use it
      if (result !== null && result !== undefined) {
        return result
      }
    } catch (error) {
      // Fallback to hardcoded calculation
    }
  }

  // Fallback to hardcoded calculation functions
  const config = getPayrollConfigSync(companyId)
  
  if (config?.calculationType === 'prohalca') {
    const result = calculateProhalcaPayroll(baseSalary, metadata)
    return {
      totalIngresosAdicionales: result.totalIngresosAdicionales,
      totalDeduccionesAdicionales: result.totalDeduccionesAdicionales,
      calculatedFields: {
        horasExtras: result.horasExtras,
        feriadoTrabajado: result.feriadoTrabajado,
        estipendioTransporte: result.estipendioTransporte,
        valorHoraExtra: result.valorHoraExtra,
        descansoTurnoNoche: result.descansoTurnoNoche,
        dobleTurno: result.dobleTurno
      }
    }
  }

  if (config?.calculationType === 'almacenes_extra') {
    const result = calculateAlmacenesExtraPayroll(baseSalary, metadata)
    return {
      totalIngresosAdicionales: result.totalIngresosAdicionales,
      totalDeduccionesAdicionales: result.totalDeduccionesAdicionales,
      calculatedFields: {
        incapacidad: result.incapacidad,
        diasFaltados: result.diasFaltados
      }
    }
  }

  // Default: no custom calculations
  return {
    totalIngresosAdicionales: 0,
    totalDeduccionesAdicionales: 0,
    calculatedFields: {}
  }
}

