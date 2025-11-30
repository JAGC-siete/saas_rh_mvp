/**
 * Conditional Logger for Production
 * 
 * Only logs in development to avoid Railway rate limits
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isDebugEnabled = process.env.ENABLE_DEBUG_LOGS === 'true'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(...args)
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.info(...args)
    }
  },
  
  warn: (...args: any[]) => {
    // Always log warnings
    console.warn(...args)
  },
  
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args)
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment || isDebugEnabled) {
      console.log('🔍 DEBUG -', ...args)
    }
  }
}

export default logger




