/** Errores explícitos para nómina / statutory (compliance, sin fallback silencioso). */

export class StatutoryParamsMissingError extends Error {
  readonly code = 'STATUTORY_PARAMS_MISSING_FOR_YEAR' as const

  constructor(
    readonly countryCode: string,
    readonly year: number
  ) {
    super(`No hay parámetros legales para ${countryCode} ${year}`)
    this.name = 'StatutoryParamsMissingError'
  }
}

export class StatutoryConfigInvalidError extends Error {
  readonly code = 'STATUTORY_CONFIG_INVALID' as const

  constructor(
    readonly countryCode: string,
    readonly detail: string
  ) {
    super(`statutory_config inválido (${countryCode}): ${detail}`)
    this.name = 'StatutoryConfigInvalidError'
  }
}

/** País registrado en la app cuyo motor de nómina todavía no existe (p. ej. COL en fase 1). */
export class PayrollEngineNotAvailableError extends Error {
  readonly code = 'PAYROLL_ENGINE_NOT_AVAILABLE' as const

  constructor(readonly countryCode: string) {
    super(`El cálculo de nómina para ${countryCode} todavía no está disponible`)
    this.name = 'PayrollEngineNotAvailableError'
  }
}

export function isPayrollEngineNotAvailableError(e: unknown): e is PayrollEngineNotAvailableError {
  return e instanceof PayrollEngineNotAvailableError
}

export function isStatutoryParamsMissingError(e: unknown): e is StatutoryParamsMissingError {
  return e instanceof StatutoryParamsMissingError
}

export function isStatutoryConfigInvalidError(e: unknown): e is StatutoryConfigInvalidError {
  return e instanceof StatutoryConfigInvalidError
}
