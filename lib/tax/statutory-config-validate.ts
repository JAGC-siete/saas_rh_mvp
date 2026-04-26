import { z } from 'zod'

import type { CountryCode } from '../country/supported'
import { StatutoryConfigInvalidError } from './statutory-payroll-errors'

const isrBracketLegacy = z.object({
  limit: z.number(),
  rate: z.number(),
  base: z.number(),
  lower: z.number()
})

const slvMonthlyBracket = z.object({
  from: z.number(),
  to: z.number().nullable().optional(),
  rate: z.number(),
  fixed: z.number()
})

const slvV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    engine: z.literal('SLV'),
    currency: z.string().optional(),
    isss: z.object({
      employeeRate: z.number(),
      monthlyCeiling: z.number().optional(),
      employerRate: z.number().optional()
    }),
    afp: z.object({
      employeeRate: z.number(),
      employerRate: z.number().optional()
    }),
    insafrop: z
      .object({
        employerRate: z.number(),
        minEmployees: z.number().optional()
      })
      .passthrough()
      .optional(),
    isr_brackets: z.array(isrBracketLegacy),
    disclaimer: z.string().optional()
  })
  .passthrough()

const slvV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    engine: z.literal('SLV'),
    isss: z.object({
      employeeRate: z.number(),
      monthlyCeiling: z.number(),
      employerRate: z.number().optional()
    }),
    afp: z.object({
      employeeRate: z.number(),
      employerRate: z.number().optional()
    }),
    insafrop: z
      .object({
        employerRate: z.number(),
        minEmployees: z.number().optional()
      })
      .passthrough()
      .optional(),
    isr_monthly_brackets_usd: z.array(slvMonthlyBracket),
    isr_brackets: z.array(z.unknown()).optional(),
    minimum_wage_usd: z.record(z.string(), z.number()).optional(),
    disclaimer: z.string().optional()
  })
  .passthrough()

const slvUnion = z.union([slvV1Schema, slvV2Schema])

const gtmV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    engine: z.literal('GTM'),
    currency: z.string().optional(),
    igss: z.object({
      employeeRate: z.number(),
      employerRate: z.number().optional()
    }),
    intecap: z.object({ employerRate: z.number() }).optional(),
    irtra: z.object({ employerRate: z.number() }).optional(),
    minimum_incentive_bonus: z.number().optional(),
    isr_mode: z.string().optional(),
    isr_brackets: z.array(z.unknown()).optional(),
    disclaimer: z.string().optional()
  })
  .passthrough()

const gtmV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    engine: z.literal('GTM'),
    igss: z.object({
      employeeRate: z.number(),
      employerRate: z.number()
    }),
    intecap: z.object({ employerRate: z.number() }).optional(),
    irtra: z.object({ employerRate: z.number() }).optional(),
    isr_annual: z.object({
      up_to: z.number(),
      rate: z.number(),
      over: z.object({
        fixed: z.number(),
        rate: z.number()
      })
    }),
    minimum_wage_gtq: z.record(z.string(), z.record(z.string(), z.number())).optional(),
    disclaimer: z.string().optional()
  })
  .passthrough()

const gtmUnion = z.union([gtmV1Schema, gtmV2Schema])

/** Staging: STATUTORY_VALIDATE_MODE=warn registra y devuelve JSON sin validar. */
export function isStatutoryValidationWarnMode(): boolean {
  return process.env.STATUTORY_VALIDATE_MODE === 'warn'
}

/** Producción o explícito: forzar fallo ante JSON inválido (anula warn). */
export function isStatutoryValidationStrictEnv(): boolean {
  return process.env.STATUTORY_VALIDATE_STRICT === '1' || process.env.STATUTORY_VALIDATE_STRICT === 'true'
}

function shouldThrowOnInvalidSchema(): boolean {
  if (isStatutoryValidationStrictEnv()) return true
  if (isStatutoryValidationWarnMode()) return false
  return true
}

function formatZodError(err: z.ZodError): string {
  try {
    return JSON.stringify(err.flatten())
  } catch {
    return err.message
  }
}

/**
 * Valida `payroll_statutory_params.statutory_config` para SLV/GTM.
 * En modo warn (staging), ante fallo registra y devuelve el objeto crudo.
 */
export function parseStatutoryConfigForPayroll(
  countryCode: Extract<CountryCode, 'SLV' | 'GTM'>,
  raw: unknown
): Record<string, unknown> {
  if (raw === null || typeof raw !== 'object') {
    const msg = 'statutory_config debe ser un objeto JSON'
    if (shouldThrowOnInvalidSchema()) {
      throw new StatutoryConfigInvalidError(countryCode, msg)
    }
    console.warn(`[statutory] ${countryCode} ${msg} (warn mode)`)
    return (raw as Record<string, unknown>) ?? {}
  }

  const engine = (raw as { engine?: unknown }).engine
  if (countryCode === 'SLV' && engine !== 'SLV') {
    const msg = `engine esperado SLV, recibido ${String(engine)}`
    if (shouldThrowOnInvalidSchema()) throw new StatutoryConfigInvalidError(countryCode, msg)
    console.warn(`[statutory] ${msg}`)
    return raw as Record<string, unknown>
  }
  if (countryCode === 'GTM' && engine !== 'GTM') {
    const msg = `engine esperado GTM, recibido ${String(engine)}`
    if (shouldThrowOnInvalidSchema()) throw new StatutoryConfigInvalidError(countryCode, msg)
    console.warn(`[statutory] ${msg}`)
    return raw as Record<string, unknown>
  }

  const schema = countryCode === 'SLV' ? slvUnion : gtmUnion
  const parsed = schema.safeParse(raw)
  if (parsed.success) {
    return parsed.data as Record<string, unknown>
  }

  const detail = formatZodError(parsed.error)
  if (shouldThrowOnInvalidSchema()) {
    throw new StatutoryConfigInvalidError(countryCode, detail)
  }
  console.warn(`[statutory] Zod warn ${countryCode}:`, detail)
  return raw as Record<string, unknown>
}
