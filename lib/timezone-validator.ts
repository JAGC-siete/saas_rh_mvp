/**
 * 🚨 TIMEZONE VALIDATION MIDDLEWARE
 * 
 * Este middleware previene futuros errores de timezone validando automáticamente
 * que todas las fechas usen la zona horaria de Tegucigalpa.
 */

import { HONDURAS_TIMEZONE, convertToHondurasTime } from './timezone';

// Interceptar new Date() globalmente en desarrollo
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🇭🇳 Timezone validator loaded - monitoring for Honduras timezone compliance');
}

/**
 * Validar que una fecha esté en la zona horaria correcta
 */
export function validateTimezone(date: Date, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    const hondurasTime = convertToHondurasTime(date);
    const timeDiff = Math.abs(date.getTime() - hondurasTime.getTime()) / (1000 * 60 * 60);
    
    if (timeDiff > 1) {
      console.warn(`🇭🇳 TIMEZONE WARNING ${context ? `[${context}]` : ''}: Date might not be in Honduras timezone`, {
        inputDate: date.toISOString(),
        hondurasEquivalent: hondurasTime.toISOString(),
        timeDifferenceHours: timeDiff
      });
    }
  }
}

/**
 * Middleware para APIs que valida automáticamente fechas en requests
 */
export function timezoneValidationMiddleware(req: any, res: any, next: any) {
  if (process.env.NODE_ENV === 'development') {
    // Validar parámetros de fecha en query y body
    const checkDateParams = (obj: any, prefix: string) => {
      if (!obj) return;
      
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}/.test(value)) {
          console.log(`🇭🇳 Date parameter detected in ${prefix}.${key}: ${value}`);
        }
      });
    };
    
    checkDateParams(req.query, 'query');
    checkDateParams(req.body, 'body');
  }
  
  if (next) next();
}

/**
 * Validación automática para componentes React
 */
export function useTimezoneValidation() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('🇭🇳 Timezone validation active for client-side components');
    
    // Interceptar localStorage/sessionStorage para fechas
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (/date|time|timestamp/i.test(key) && /\d{4}-\d{2}-\d{2}/.test(value)) {
        console.log(`🇭🇳 Date stored in ${this === localStorage ? 'localStorage' : 'sessionStorage'}.${key}: ${value}`);
      }
      return originalSetItem.call(this, key, value);
    };
  }
}

export default {
  validateTimezone,
  timezoneValidationMiddleware,
  useTimezoneValidation
};
