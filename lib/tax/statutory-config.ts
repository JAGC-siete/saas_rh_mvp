/** Parse payroll_statutory_params.statutory_config for Honduras (engine HND). */

export type ParsedHndTaxConstants = {
  minimum_wage: number
  ihss_ceiling: number
  ihss_employee_rate: number
  rap_rate: number
  isr_brackets: Array<{ limit: number; rate: number; base: number; lower: number }>
  medical_deduction_limit?: number
}

type HndStatutoryV1 = {
  schemaVersion?: number
  engine?: string
  minimum_wage?: number
  ihss_ceiling?: number
  ihss_employee_rate?: number
  rap_rate?: number
  isr_brackets?: Array<{ limit?: number; rate?: number; base?: number; lower?: number }>
  medical_deduction_limit?: number
}

export function statutoryJsonToHndTaxConstants(raw: unknown): ParsedHndTaxConstants | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as HndStatutoryV1
  if (o.engine && o.engine !== 'HND') return null
  const bracketsRaw = o.isr_brackets
  if (!Array.isArray(bracketsRaw) || bracketsRaw.length === 0) return null

  const isr_brackets = bracketsRaw.map(b => ({
    limit: b.limit === 999999999 ? Infinity : Number(b.limit),
    rate: Number(b.rate),
    base: Number(b.base),
    lower: Number(b.lower)
  }))

  return {
    minimum_wage: Number(o.minimum_wage),
    ihss_ceiling: Number(o.ihss_ceiling),
    ihss_employee_rate: Number(o.ihss_employee_rate),
    rap_rate: Number(o.rap_rate),
    isr_brackets,
    medical_deduction_limit: Number(o.medical_deduction_limit) || 40000
  }
}
