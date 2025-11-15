/**
 * Payroll Calculation Engine
 * 
 * Motor genérico de cálculo de payroll basado en configuración de base de datos.
 * Permite escalar a 100+ empresas sin necesidad de código específico por cliente.
 */

interface CalculationConfig {
  earnings_formula?: string
  deductions_formula?: string
  custom_calculations?: Record<string, string>
}

interface CustomField {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' | 'calculation_helper'
  required: boolean
  default: any
}

export interface PayrollCalculationResult {
  totalIngresosAdicionales: number
  totalDeduccionesAdicionales: number
  calculatedFields: Record<string, any>
}

interface CalculationContext {
  baseSalary: number
  metadata: Record<string, any>
  calculatedFields: Record<string, any>
}

/**
 * Motor de cálculo genérico basado en configuración de BD
 */
export async function calculatePayrollFromConfig(
  companyId: string,
  baseSalary: number,
  metadata: Record<string, any>,
  supabase: any
): Promise<PayrollCalculationResult> {
  
  // 1. Obtener configuración desde BD
  const { data: config, error } = await supabase
    .from('company_payroll_configs')
    .select('calculation_type, custom_fields, calculation_config, calculation_script')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (error || !config) {
    // Fallback a cálculo estándar (sin campos personalizados)
    return {
      totalIngresosAdicionales: 0,
      totalDeduccionesAdicionales: 0,
      calculatedFields: {}
    }
  }

  // 2. Calcular según tipo (pero SIEMPRE aplicar campos personalizados)
  const customFields = config.custom_fields as Record<string, CustomField> | undefined
  
  let result: PayrollCalculationResult
  
  switch (config.calculation_type) {
    case 'formula_based':
      result = calculateWithFormulas(
        config.calculation_config as CalculationConfig,
        baseSalary,
        metadata
      )
      break
    
    case 'custom':
      // Para casos complejos, ejecutar script almacenado
      result = executeCalculationScript(
        config.calculation_script,
        baseSalary,
        metadata
      )
      break
    
    case 'standard':
    default:
      // En modo estándar, solo aplicar campos personalizados
      result = {
        totalIngresosAdicionales: 0,
        totalDeduccionesAdicionales: 0,
        calculatedFields: {}
      }
      break
  }
  
  // 3. SIEMPRE aplicar campos personalizados automáticamente (sumar/restar según categoría)
  const customFieldsResult = applyCustomFields(customFields, metadata)
  
  return {
    totalIngresosAdicionales: result.totalIngresosAdicionales + customFieldsResult.totalIngresosAdicionales,
    totalDeduccionesAdicionales: result.totalDeduccionesAdicionales + customFieldsResult.totalDeduccionesAdicionales,
    calculatedFields: {
      ...result.calculatedFields,
      ...customFieldsResult.calculatedFields
    }
  }
}

/**
 * Calcular usando fórmulas desde configuración
 */
function calculateWithFormulas(
  config: CalculationConfig,
  baseSalary: number,
  metadata: Record<string, any>
): PayrollCalculationResult {
  
  const calculatedFields: Record<string, any> = {}
  
  // 1. Ejecutar cálculos personalizados primero
  if (config.custom_calculations) {
    for (const [fieldName, formula] of Object.entries(config.custom_calculations)) {
      try {
        // Evaluar fórmula de forma segura
        calculatedFields[fieldName] = evaluateFormula(
          formula,
          { baseSalary, metadata, calculatedFields }
        )
      } catch (error) {
        console.error(`Error calculating ${fieldName}:`, error)
        calculatedFields[fieldName] = 0
      }
    }
  }
  
  // 2. Calcular ingresos adicionales
  let totalIngresosAdicionales = 0
  if (config.earnings_formula) {
    try {
      totalIngresosAdicionales = evaluateFormula(
        config.earnings_formula,
        { baseSalary, metadata, calculatedFields }
      )
    } catch (error) {
      console.error('Error calculating earnings:', error)
    }
  }
  
  // 3. Calcular deducciones adicionales
  let totalDeduccionesAdicionales = 0
  if (config.deductions_formula) {
    try {
      totalDeduccionesAdicionales = evaluateFormula(
        config.deductions_formula,
        { baseSalary, metadata, calculatedFields }
      )
    } catch (error) {
      console.error('Error calculating deductions:', error)
    }
  }
  
  return {
    totalIngresosAdicionales,
    totalDeduccionesAdicionales,
    calculatedFields
  }
}

/**
 * Evaluar fórmula de forma segura
 * Soporta: +, -, *, /, || (default), &&, comparaciones
 * 
 * NOTA: En producción, considerar usar una librería como mathjs para mayor seguridad
 */
function evaluateFormula(
  formula: string,
  context: CalculationContext
): number {
  if (!formula || typeof formula !== 'string') {
    return 0
  }
  
  // Reemplazar referencias a campos
  let safeFormula = formula.trim()
  
  // Manejar coalesce() primero (función SQL-like para valores por defecto)
  // Soporta: coalesce(metadata.field, default) o coalesce(expression, default)
  if (safeFormula.includes('coalesce')) {
    // Regex mejorado para manejar expresiones más complejas
    safeFormula = safeFormula.replace(
      /coalesce\(([^,()]+(?:\([^)]*\))?[^,()]*),\s*([^)]+)\)/gi,
      (match, firstValue, defaultValue) => {
        const first = firstValue.trim()
        const def = defaultValue.trim()
        
        // Evaluar el primer valor
        let firstResult: number | null = null
        
        // Si contiene metadata., extraer el campo
        if (first.includes('metadata.')) {
          const fieldMatch = first.match(/metadata\.([a-z_]+)/i)
          if (fieldMatch) {
            const fieldName = fieldMatch[1]
            const value = context.metadata[fieldName]
            if (value !== undefined && value !== null) {
              firstResult = typeof value === 'number' ? value : parseFloat(String(value)) || 0
              // Si es 0, considerarlo como válido (puede ser un valor real)
              if (!isNaN(firstResult)) {
                return String(firstResult)
              }
            }
          }
        } else {
          // Es una expresión matemática, evaluarla
          // Reemplazar referencias temporales antes de evaluar
          let tempExpr = first
          tempExpr = tempExpr.replace(/\bbaseSalary\b/gi, String(context.baseSalary))
          tempExpr = tempExpr.replace(/\bbase_salary\b/gi, String(context.baseSalary))
          
          // Reemplazar campos de metadata
          tempExpr = tempExpr.replace(/\b([a-z_]+)\b/gi, (_match: string, fieldName: string) => {
            if (context.metadata[fieldName] !== undefined) {
              const value = context.metadata[fieldName]
              return typeof value === 'number' ? String(value) : String(parseFloat(String(value)) || 0)
            }
            return '0'
          })
          
          firstResult = evaluateMathExpression(tempExpr)
          if (firstResult !== 0 && !isNaN(firstResult)) {
            return String(firstResult)
          }
        }
        
        // Si el primer valor no es válido, usar el valor por defecto
        // El valor por defecto puede ser una expresión también
        let defaultResult = def
        defaultResult = defaultResult.replace(/\bbaseSalary\b/gi, String(context.baseSalary))
        defaultResult = defaultResult.replace(/\bbase_salary\b/gi, String(context.baseSalary))
        
        // Evaluar el valor por defecto
        const evaluatedDefault = evaluateMathExpression(defaultResult)
        return String(evaluatedDefault)
      }
    )
  }
  
  // Reemplazar referencias a metadata.field_name
  safeFormula = safeFormula.replace(
    /metadata\.([a-z_]+)/gi,
    (match, fieldName) => {
      const value = context.metadata[fieldName]
      if (value === undefined || value === null) {
        return '0'
      }
      return typeof value === 'number' ? String(value) : String(parseFloat(value) || 0)
    }
  )
  
  // Reemplazar referencias directas a campos (sin metadata.)
  safeFormula = safeFormula.replace(
    /\b([a-z_]+)\b/g,
    (match, fieldName) => {
      // Buscar en calculatedFields primero
      if (context.calculatedFields[fieldName] !== undefined) {
        const value = context.calculatedFields[fieldName]
        return typeof value === 'number' ? String(value) : String(parseFloat(value) || 0)
      }
      // Luego en metadata
      if (context.metadata[fieldName] !== undefined) {
        const value = context.metadata[fieldName]
        if (typeof value === 'boolean') {
          return value ? '1' : '0'
        }
        return typeof value === 'number' ? String(value) : String(parseFloat(value) || 0)
      }
      // Valores especiales
      if (fieldName === 'baseSalary' || fieldName === 'base_salary') {
        return String(context.baseSalary)
      }
      return '0'
    }
  )
  
  // Manejar operador || (default value)
  if (safeFormula.includes('||')) {
    const parts = safeFormula.split('||').map(p => p.trim())
    let result = 0
    for (const part of parts) {
      const value = evaluateMathExpression(part)
      if (value !== 0 && !isNaN(value)) {
        result = value
        break
      }
    }
    return result || 0
  }
  
  // Evaluar expresión matemática
  return evaluateMathExpression(safeFormula)
}

/**
 * Evaluar expresión matemática simple de forma segura
 */
function evaluateMathExpression(expression: string): number {
  if (!expression || typeof expression !== 'string') {
    return 0
  }
  
  try {
    // Remover espacios
    const clean = expression.replace(/\s+/g, '')
    
    // Validar que solo contenga números, operadores y paréntesis
    if (!/^[0-9+\-*/().\s]+$/.test(clean)) {
      console.warn('Invalid characters in formula:', expression)
      return 0
    }
    
    // Evaluar usando Function constructor (más seguro que eval directo)
    // Solo permite operaciones matemáticas básicas
    const result = Function(`"use strict"; return (${clean})`)()
    
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result
    }
    
    return 0
  } catch (error) {
    console.error('Formula evaluation error:', error, 'Expression:', expression)
    return 0
  }
}

/**
 * Ejecutar script de cálculo personalizado (para casos complejos)
 * 
 * WARNING: Ejecutar código dinámico es riesgoso.
 * En producción, usar un sandbox como vm2 o isolated-vm.
 * Por ahora, solo permitir para super_admins y con validación estricta.
 */
function executeCalculationScript(
  script: string | null,
  baseSalary: number,
  metadata: Record<string, any>
): PayrollCalculationResult {
  if (!script || typeof script !== 'string') {
    return {
      totalIngresosAdicionales: 0,
      totalDeduccionesAdicionales: 0,
      calculatedFields: {}
    }
  }
  
  // Validación básica de seguridad
  // En producción, esto debe ser mucho más estricto
  const dangerousPatterns = [
    'require(',
    'import(',
    'eval(',
    'Function(',
    'process.',
    'global.',
    'window.',
    '__dirname',
    '__filename'
  ]
  
  for (const pattern of dangerousPatterns) {
    if (script.includes(pattern)) {
      console.error('Dangerous pattern detected in calculation script:', pattern)
      return {
        totalIngresosAdicionales: 0,
        totalDeduccionesAdicionales: 0,
        calculatedFields: {}
      }
    }
  }
  
  try {
    // WARNING: En producción, usar sandbox
    // Por ahora, solo permitir funciones matemáticas simples
    const calculationFunction = new Function(
      'baseSalary',
      'metadata',
      `
      ${script}
      // La función debe retornar un objeto con la estructura esperada
      if (typeof calculatePayroll === 'function') {
        return calculatePayroll(baseSalary, metadata)
      }
      return {
        totalIngresosAdicionales: 0,
        totalDeduccionesAdicionales: 0,
        calculatedFields: {}
      }
      `
    )
    
    const result = calculationFunction(baseSalary, metadata)
    
    // Validar estructura del resultado
    if (result && typeof result === 'object') {
      return {
        totalIngresosAdicionales: result.totalIngresosAdicionales || 0,
        totalDeduccionesAdicionales: result.totalDeduccionesAdicionales || 0,
        calculatedFields: result.calculatedFields || {}
      }
    }
    
    return {
      totalIngresosAdicionales: 0,
      totalDeduccionesAdicionales: 0,
      calculatedFields: {}
    }
  } catch (error) {
    console.error('Error executing calculation script:', error)
    return {
      totalIngresosAdicionales: 0,
      totalDeduccionesAdicionales: 0,
      calculatedFields: {}
    }
  }
}

/**
 * Aplicar campos personalizados automáticamente: sumar earnings, restar deductions
 * Esta función se aplica SIEMPRE, independientemente del tipo de cálculo
 */
function applyCustomFields(
  customFieldsDefinitions: Record<string, CustomField> | undefined,
  metadata: Record<string, any>
): PayrollCalculationResult {
  let totalIngresosAdicionales = 0
  let totalDeduccionesAdicionales = 0
  const calculatedFields: Record<string, any> = {}

  if (!customFieldsDefinitions) {
    return {
      totalIngresosAdicionales: 0,
      totalDeduccionesAdicionales: 0,
      calculatedFields: {}
    }
  }

  // Iterar sobre todos los campos personalizados definidos
  for (const [fieldName, fieldDef] of Object.entries(customFieldsDefinitions)) {
    // Solo procesar campos con categoría earnings o deductions
    if (fieldDef.category !== 'earnings' && fieldDef.category !== 'deductions') {
      continue
    }

    // Obtener el valor del campo desde metadata
    const value = metadata[fieldName]
    
    // Si el valor existe y no es null/undefined
    if (value !== undefined && value !== null) {
      // Convertir a número (si es string, parsear; si es boolean, convertir a 0/1)
      let numericValue = 0
      
      if (typeof value === 'number') {
        numericValue = value
      } else if (typeof value === 'boolean') {
        numericValue = value ? 1 : 0
      } else if (typeof value === 'string') {
        numericValue = parseFloat(value) || 0
      }
      
      // Guardar el valor procesado
      calculatedFields[fieldName] = numericValue
      
      // Sumar o restar según la categoría
      if (fieldDef.category === 'earnings') {
        totalIngresosAdicionales += numericValue
      } else if (fieldDef.category === 'deductions') {
        totalDeduccionesAdicionales += numericValue
      }
    }
  }

  return {
    totalIngresosAdicionales,
    totalDeduccionesAdicionales,
    calculatedFields
  }
}

/**
 * Obtener campos personalizados de una empresa desde BD
 */
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

/**
 * Validar que los campos personalizados sean correctos
 */
export function validateCustomFields(
  customFields: Record<string, any>,
  fieldDefinitions: Record<string, CustomField>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Si no hay definiciones de campos, permitir cualquier campo (modo permisivo)
  if (!fieldDefinitions || Object.keys(fieldDefinitions).length === 0) {
    // Solo validar tipos básicos si no hay configuración
    for (const [fieldName, value] of Object.entries(customFields)) {
      if (value !== null && value !== undefined && value !== '') {
        // Validación básica: si parece número, debe ser parseable
        if (typeof value === 'string' && !isNaN(parseFloat(value)) && value.trim() !== '') {
          // Es un string numérico válido, está bien
          continue
        }
        // Otros tipos están bien
      }
    }
    return { valid: true, errors: [] }
  }

  for (const [fieldName, value] of Object.entries(customFields)) {
    const definition = fieldDefinitions[fieldName]
    
    if (!definition) {
      // Campo no definido en configuración - solo warning, no error
      // Permitir campos adicionales que no estén en la configuración
      continue
    }

    // Validar tipo (permitir conversión de strings a números)
    if (definition.type === 'number') {
      if (typeof value === 'string' && value.trim() === '') {
        // String vacío - solo error si es requerido
        if (definition.required) {
          errors.push(`${fieldName} es requerido`)
        }
      } else if (typeof value !== 'number') {
        const numValue = parseFloat(value)
        if (isNaN(numValue)) {
          errors.push(`${fieldName} debe ser un número válido`)
        }
        // Si es un string numérico válido, está bien (se convertirá después)
      }
    }

    if (definition.type === 'boolean' && typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 1 && value !== 0) {
      errors.push(`${fieldName} debe ser un booleano`)
    }

    if (definition.type === 'string' && typeof value !== 'string') {
      errors.push(`${fieldName} debe ser un string`)
    }

    // Validar requerido
    if (definition.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldName} es requerido`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

