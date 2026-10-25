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

/**
 * Colombia: varios parámetros cambian a mitad de año (recargo dominical el 1-jul, jornada el 15-jul),
 * así que cada uno es una lista de vigencias por fecha y no un valor anual.
 */
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const periodBase = z.object({ from: ymd, to: ymd.nullable(), source: z.string().optional() })

function checkPeriods(periods: { from: string; to: string | null }[], ctx: z.RefinementCtx) {
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i]
    if (p.to != null && p.to < p.from) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, 'to'], message: 'to es anterior a from' })
    }
    const next = periods[i + 1]
    if (!next) continue
    if (p.to == null || next.from <= p.to) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i + 1, 'from'], message: 'vigencias desordenadas o traslapadas' })
    }
  }
}

function datedPeriods<T extends z.ZodRawShape>(shape: T) {
  return z
    .array(periodBase.extend(shape))
    .min(1)
    .superRefine((periods, ctx) => checkPeriods(periods as unknown as { from: string; to: string | null }[], ctx))
}

const colV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    engine: z.literal('COL'),
    currency: z.literal('COP'),
    smmlv: datedPeriods({ value: z.number().positive() }),
    transport_allowance: datedPeriods({ value: z.number().nonnegative() }),
    uvt: datedPeriods({ value: z.number().positive() }),
    ordinary_hours: datedPeriods({
      weekly_hours: z.number().positive(),
      monthly_divisor: z.number().positive()
    }),
    night_window: datedPeriods({ start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/) }),
    surcharges: datedPeriods({
      night: z.number().nonnegative(),
      sunday_holiday: z.number().nonnegative(),
      overtime_day: z.number().nonnegative(),
      overtime_night: z.number().nonnegative()
    }),
    disclaimer: z.string().optional()
  })
  .passthrough()

export type ColStatutoryConfig = z.infer<typeof colV1Schema>

/** Valida el JSON de Colombia. Siempre estricto: no hay modo warn mientras el motor no exista. */
export function parseColStatutoryConfig(raw: unknown): ColStatutoryConfig {
  const parsed = colV1Schema.safeParse(raw)
  if (!parsed.success) {
    throw new StatutoryConfigInvalidError('COL', formatZodError(parsed.error))
  }
  return parsed.data
}

/** Vigencia que cubre la fecha (YYYY-MM-DD), o null si ninguna aplica. */
export function resolveDatedPeriod<P extends { from: string; to: string | null }>(
  periods: readonly P[],
  dateYmd: string
): P | null {
  return periods.find((p) => p.from <= dateYmd && (p.to == null || dateYmd <= p.to)) ?? null
}

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
