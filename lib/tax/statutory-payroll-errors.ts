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

export function isStatutoryParamsMissingError(e: unknown): e is StatutoryParamsMissingError {
  return e instanceof StatutoryParamsMissingError
}

export function isStatutoryConfigInvalidError(e: unknown): e is StatutoryConfigInvalidError {
  return e instanceof StatutoryConfigInvalidError
}
