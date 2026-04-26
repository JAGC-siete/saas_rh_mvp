/**
 * Endpoints y páginas de diagnóstico solo en desarrollo o si se activa explícitamente en servidor.
 * No usar NEXT_PUBLIC_* para esto (evitar filtrar el flag al cliente).
 */
export function isServerDiagnosticsEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  return process.env.ENABLE_SERVER_DIAGNOSTICS === 'true'
}
