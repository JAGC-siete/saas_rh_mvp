import { NextApiRequest, NextApiResponse } from 'next'
import {
  parseCountryCodeInput,
  SUPPORTED_COUNTRY_CODES,
  type CountryCode
} from '../../../lib/country/supported'
import { nowInHonduras } from '../../../lib/timezone'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { validateCalculatorInputs } from '../../../lib/deduction-validator/validation'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import {
  computePayrollEmployeeStatutoryDeductions,
  loadStatutoryConfigExact
} from '../../../lib/payroll/statutory-deductions-compute'
import { calculateINFOP } from '../../../lib/payroll/employer-contributions'
import { getTaxBracketsForYear } from '../../../lib/tax/honduras-tax'
import {
  isStatutoryConfigInvalidError,
  isStatutoryParamsMissingError,
  StatutoryParamsMissingError
} from '../../../lib/tax/statutory-payroll-errors'
import { createAdminClient } from '../../../lib/supabase/server'

interface CalculateDeductionsRequest {
  salary: number | string
  paymentModality: string
  year?: number | string
  country_code?: string
  deductions?: {
    ihss?: boolean
    rap?: boolean
    afp?: boolean
    infop?: boolean
    isr?: boolean
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function coerceBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') return value
  return defaultValue
}

async function loadCalculatorConstants(
  countryCode: CountryCode,
  year: number,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ minimumWage: number; ihssCeiling: number }> {
  if (countryCode === 'HND') {
    const constants = await getTaxBracketsForYear(year, 'HND')
    return {
      minimumWage: constants.minimum_wage,
      ihssCeiling: constants.ihss_ceiling
    }
  }

  const raw = await loadStatutoryConfigExact(countryCode, year, supabase)
  if (!raw) {
    throw new StatutoryParamsMissingError(countryCode, year)
  }

  if (countryCode === 'SLV') {
    const isss = (raw.isss as Record<string, number> | undefined) ?? {}
    return {
      minimumWage: Number(raw.minimum_wage ?? 262),
      ihssCeiling: Number(isss.monthlyCeiling ?? 1000)
    }
  }

  const igss = (raw.igss as Record<string, number> | undefined) ?? {}
  return {
    minimumWage: Number(raw.minimum_wage ?? 3621.81),
    ihssCeiling: Number(igss.monthlyCeiling ?? igss.ceiling ?? 5000)
  }
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
    const { salary, paymentModality, year, deductions, country_code }: CalculateDeductionsRequest = req.body

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

    const countryCode = parseCountryCodeInput(
      typeof country_code === 'string' ? country_code : undefined
    )
    if (!countryCode || !SUPPORTED_COUNTRY_CODES.includes(countryCode)) {
      return res.status(400).json({
        error: 'La calculadora pública solo incluye deducciones para Honduras, El Salvador y Guatemala.'
      })
    }

    const isQuincenal = sanitized.paymentModality === 'quincenal'
    const monthlyGrossSalary = isQuincenal ? sanitized.salary * 2 : sanitized.salary
    const factor2Pagos = isQuincenal ? 0.5 : 1
    const supabase = createAdminClient()

    const applyRap =
      countryCode === 'SLV'
        ? coerceBoolean(deductions?.rap, true) || coerceBoolean(deductions?.afp, false)
        : coerceBoolean(deductions?.rap, true)

    logger.info('Cálculo de deducciones iniciado (SaaS Core Engine)', {
      salary: sanitized.salary,
      paymentModality: sanitized.paymentModality,
      year: targetYear,
      countryCode,
      ip: clientIP
    })

    const [result, constants] = await Promise.all([
      computePayrollEmployeeStatutoryDeductions({
        countryCode,
        year: targetYear,
        baseMonthlySalary: monthlyGrossSalary,
        factor2Pagos,
        legalDeductions: {
          ihss: coerceBoolean(deductions?.ihss, true),
          rap: applyRap,
          isr: coerceBoolean(deductions?.isr, true)
        },
        simpleIsrMonthlyBase: monthlyGrossSalary,
        useIsrProjection: false,
        statutoryYearResolution: 'exact',
        supabase
      }),
      loadCalculatorConstants(countryCode, targetYear, supabase)
    ])

    const ihss = round2(result.ihss)
    const rap = round2(result.rap)
    const isr = round2(result.isr)

    let infop = 0
    if (countryCode === 'HND' && coerceBoolean(deductions?.infop, false)) {
      infop = round2(calculateINFOP(monthlyGrossSalary) * factor2Pagos)
    }

    const totalDeductions = round2(ihss + rap + isr + infop)
    const netSalary = round2(sanitized.salary - totalDeductions)

    const responseData = {
      grossSalary: round2(sanitized.salary),
      monthlyGrossSalary: round2(monthlyGrossSalary),
      ihss,
      ihssPercentage: sanitized.salary > 0 ? round2((ihss / sanitized.salary) * 100) : 0,
      rap,
      rapPercentage: sanitized.salary > 0 ? round2((rap / sanitized.salary) * 100) : 0,
      afp: countryCode === 'SLV' ? rap : 0,
      afpPercentage: countryCode === 'SLV' && sanitized.salary > 0 ? round2((rap / sanitized.salary) * 100) : 0,
      infop,
      infopPercentage: sanitized.salary > 0 ? round2((infop / sanitized.salary) * 100) : 0,
      isr,
      isrPercentage: sanitized.salary > 0 ? round2((isr / sanitized.salary) * 100) : 0,
      totalDeductions,
      netSalary,
      year: targetYear,
      paymentModality: sanitized.paymentModality,
      countryCode,
      constants: {
        minimumWage: constants.minimumWage,
        ihssCeiling: constants.ihssCeiling
      }
    }

    const duration = Date.now() - startTime
    logger.info('Cálculo de deducciones completado', {
      duration,
      netSalary: responseData.netSalary,
      totalDeductions: responseData.totalDeductions,
      ip: clientIP,
      countryCode
    })

    return res.status(200).json(responseData)
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined

    if (isStatutoryParamsMissingError(error) || isStatutoryConfigInvalidError(error)) {
      logger.warn('Parámetros legales no disponibles para calculadora pública', {
        error: message,
        duration,
        ip: clientIP
      })
      return res.status(404).json({ error: message })
    }

    logger.error('Error calculando deducciones', {
      error: message,
      stack,
      duration,
      ip: clientIP
    })

    return res.status(500).json({
      error: 'Error interno del servidor al calcular deducciones',
      details: process.env.NODE_ENV === 'development' ? message : undefined
    })
  }
}

export default withRateLimit(RATE_LIMITS.PUBLIC_CALCULATOR, calculateDeductionsHandler)
