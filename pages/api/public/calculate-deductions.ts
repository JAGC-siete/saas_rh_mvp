import { NextApiRequest, NextApiResponse } from 'next'
import { normalizeCountryCode } from '../../../lib/country/supported'
import { 
  getTaxBracketsForYear, 
  calculateISR, 
  calculateIHSS, 
  calculateRAP,
  TaxConstants
} from '../../../lib/tax/honduras-tax'
import { calculateINFOP } from '../../../lib/payroll/employer-contributions'
import { nowInHonduras } from '../../../lib/timezone'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { validateCalculatorInputs } from '../../../lib/deduction-validator/validation'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'

interface CalculateDeductionsRequest {
  salary: number | string
  paymentModality: string
  year?: number | string
  deductions?: {
    ihss?: boolean
    rap?: boolean
    afp?: boolean
    infop?: boolean
    isr?: boolean
  }
}

interface DeductionResult {
  grossSalary: number
  monthlyGrossSalary: number
  ihss: number
  ihssPercentage: number
  rap: number
  rapPercentage: number
  afp: number
  afpPercentage: number
  infop: number
  infopPercentage: number
  isr: number
  isrPercentage: number
  totalDeductions: number
  netSalary: number
  year: number
  paymentModality: 'quincenal' | 'mensual'
  constants: {
    minimumWage: number
    ihssCeiling: number
  }
}

function coerceBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value
  return defaultValue
}

async function calculateDeductionsHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const startTime = Date.now()
  const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown'

  try {
    const { salary, paymentModality, year, deductions }: CalculateDeductionsRequest = req.body

    // Validación robusta de inputs
    const validation = validateCalculatorInputs({
      salary,
      paymentModality,
      year
    })

    if (!validation.valid) {
      logger.warn('Validación fallida en calculadora de deducciones', {
        errors: validation.errors,
        ip: clientIP
      })
      return res.status(400).json({ 
        error: validation.errors[0] || 'Error de validación',
        errors: validation.errors
      })
    }

    const sanitized = validation.sanitized
    const currentYear = nowInHonduras().getFullYear()
    const targetYear = sanitized.year || currentYear

    const countryCode = normalizeCountryCode(
      typeof req.body?.country_code === 'string' ? req.body.country_code : 'HND'
    )
    if (countryCode !== 'HND') {
      return res.status(400).json({
        error: 'La calculadora pública solo incluye deducciones para Honduras (HND).'
      })
    }

    // Log para métricas
    logger.info('Cálculo de deducciones iniciado', {
      salary: sanitized.salary,
      paymentModality: sanitized.paymentModality,
      year: targetYear,
      ip: clientIP
    })

    // Obtener constantes fiscales para el año especificado
    const constants: TaxConstants = await getTaxBracketsForYear(targetYear, 'HND')

    // Convertir salario quincenal a mensual si es necesario
    const monthlyGrossSalary = sanitized.paymentModality === 'quincenal' 
      ? sanitized.salary * 2 
      : sanitized.salary

    const selected = {
      ihss: coerceBoolean(deductions?.ihss, true),
      rap: coerceBoolean(deductions?.rap, true),
      // AFP no aplica en Honduras en esta calculadora pública (se deja opcional para UI/futuras extensiones)
      afp: coerceBoolean(deductions?.afp, false),
      // INFOP es normalmente aporte patronal; se expone como “incluir en el cálculo” cuando el usuario lo activa
      infop: coerceBoolean(deductions?.infop, false),
      isr: coerceBoolean(deductions?.isr, true)
    }

    // Calcular deducciones mensuales (según selección)
    const ihssMonthly = selected.ihss ? calculateIHSS(monthlyGrossSalary, constants) : 0
    const rapMonthly = selected.rap ? calculateRAP(monthlyGrossSalary, constants) : 0
    const afpMonthly = 0
    const infopMonthly = selected.infop ? calculateINFOP(monthlyGrossSalary) : 0
    const isrMonthly = selected.isr ? calculateISR(monthlyGrossSalary, constants.isr_brackets) : 0

    // Si es quincenal, dividir todas las deducciones por 2
    const divisor = sanitized.paymentModality === 'quincenal' ? 2 : 1
    const ihss = Math.round((ihssMonthly / divisor) * 100) / 100
    const rap = Math.round((rapMonthly / divisor) * 100) / 100
    const afp = Math.round((afpMonthly / divisor) * 100) / 100
    const infop = Math.round((infopMonthly / divisor) * 100) / 100
    const isr = Math.round((isrMonthly / divisor) * 100) / 100

    const totalDeductions = Math.round((ihss + rap + afp + infop + isr) * 100) / 100
    const netSalary = Math.round((sanitized.salary - totalDeductions) * 100) / 100

    // Calcular porcentajes
    const ihssPercentage = sanitized.salary > 0 ? (ihss / sanitized.salary) * 100 : 0
    const rapPercentage = sanitized.salary > 0 ? (rap / sanitized.salary) * 100 : 0
    const afpPercentage = sanitized.salary > 0 ? (afp / sanitized.salary) * 100 : 0
    const infopPercentage = sanitized.salary > 0 ? (infop / sanitized.salary) * 100 : 0
    const isrPercentage = sanitized.salary > 0 ? (isr / sanitized.salary) * 100 : 0

    const result: DeductionResult = {
      grossSalary: Math.round(sanitized.salary * 100) / 100,
      monthlyGrossSalary: Math.round(monthlyGrossSalary * 100) / 100,
      ihss: Math.round(ihss * 100) / 100,
      ihssPercentage: Math.round(ihssPercentage * 100) / 100,
      rap: Math.round(rap * 100) / 100,
      rapPercentage: Math.round(rapPercentage * 100) / 100,
      afp: Math.round(afp * 100) / 100,
      afpPercentage: Math.round(afpPercentage * 100) / 100,
      infop: Math.round(infop * 100) / 100,
      infopPercentage: Math.round(infopPercentage * 100) / 100,
      isr: Math.round(isr * 100) / 100,
      isrPercentage: Math.round(isrPercentage * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      year: targetYear,
      paymentModality: sanitized.paymentModality,
      constants: {
        minimumWage: constants.minimum_wage,
        ihssCeiling: constants.ihss_ceiling
      }
    }

    // Log de éxito para métricas
    const duration = Date.now() - startTime
    logger.info('Cálculo de deducciones completado', {
      duration,
      netSalary: result.netSalary,
      totalDeductions: result.totalDeductions,
      ip: clientIP
    })

    return res.status(200).json(result)

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Error calculando deducciones', {
      error: error.message,
      stack: error.stack,
      duration,
      ip: clientIP
    })
    
    return res.status(500).json({ 
      error: 'Error interno del servidor al calcular deducciones',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Exportar handler con rate limiting aplicado
export default withRateLimit(RATE_LIMITS.PUBLIC_CALCULATOR, calculateDeductionsHandler)

