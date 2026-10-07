/**
 * Rutas de las calculadoras matrix (lib/public-calculator/registry.ts), sin importar el registro.
 * Lo usa public-ssr-routes (cargado en _app); tests/calculator-registry.test.ts verifica que coincidan.
 */
export const MATRIX_CALCULATOR_PATHS = [
  '/calculadora-vacaciones-honduras',
  '/calculadora-horas-extra-honduras',
  '/calculadora-aguinaldo-el-salvador',
  '/calculadora-indemnizacion-el-salvador',
  '/calculadora-vacaciones-el-salvador',
  '/calculadora-bono-14-guatemala',
  '/calculadora-aguinaldo-guatemala',
  '/calculadora-indemnizacion-guatemala',
] as const
