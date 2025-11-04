/**
 * Configuración centralizada para el sistema de trials
 * 
 * La duración del trial se puede configurar mediante variable de entorno:
 * - TRIAL_DURATION_DAYS: Número de días que dura el trial (default: 7)
 * - TRIAL_COOLDOWN_DAYS: Días de espera antes de poder solicitar otro trial (default: 30)
 */

export const TRIAL_CONFIG = {
  // Duración del trial en días
  DURATION_DAYS: parseInt(process.env.TRIAL_DURATION_DAYS || '7', 10),
  
  // Días de espera antes de poder solicitar otro trial
  COOLDOWN_DAYS: parseInt(process.env.TRIAL_COOLDOWN_DAYS || '30', 10),
  
  // Límites del formulario
  MAX_EMPLOYEES: 1000,
  MAX_DEPARTMENTS: 100,
  MIN_EMPLOYEES: 1,
  MIN_DEPARTMENTS: 1,
} as const

// Validar que la configuración sea válida
if (TRIAL_CONFIG.DURATION_DAYS < 1 || TRIAL_CONFIG.DURATION_DAYS > 365) {
  throw new Error('TRIAL_DURATION_DAYS debe estar entre 1 y 365 días')
}

if (TRIAL_CONFIG.COOLDOWN_DAYS < 1 || TRIAL_CONFIG.COOLDOWN_DAYS > 365) {
  throw new Error('TRIAL_COOLDOWN_DAYS debe estar entre 1 y 365 días')
}

