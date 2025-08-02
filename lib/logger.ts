/**
 * Enhanced Winston logger for the application
 * Follows 12-factor app principles: logs as event streams
 * Combines Winston robustness with 12-factor simplicity
 */
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

// Configuración de niveles de log
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Colores para los logs
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

winston.addColors(logColors)

// Formato personalizado para los logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
)

// Formato para archivos (sin colores)
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

// Configuración de transportes
const transports: winston.transport[] = []

// Console transport para desarrollo
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: 'debug',
    })
  )
}

// File transport para producción (solo en desarrollo local)
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileLogFormat,
      level: 'info',
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileLogFormat,
      level: 'error',
    })
  )
}

// Vercel environment - usar console con formato estructurado
if (process.env.VERCEL) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      level: process.env.LOG_LEVEL || 'info',
    })
  )
}

// Crear el logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: fileLogFormat,
  transports,
  exitOnError: false,
})

// Middleware para logging de requests
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    }
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData)
    } else {
      logger.http('HTTP Request', logData)
    }
  })
  
  next()
}

// Función para logging estructurado
export const logEvent = (level: string, message: string, meta?: any) => {
  const logData = {
    message,
    ...meta,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '0.1.0',
  }
  
  logger.log(level, logData)
}

// Funciones helper específicas
export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
  })
}

export const logAuth = (action: string, userId?: string, details?: any) => {
  logger.info('Authentication event', {
    action,
    userId,
    details,
  })
}

export const logDatabase = (operation: string, table: string, details?: any) => {
  logger.info('Database operation', {
    operation,
    table,
    details,
  })
}

export const logPayroll = (action: string, employeeId?: string, details?: any) => {
  logger.info('Payroll operation', {
    action,
    employeeId,
    details,
  })
}

export const logAttendance = (action: string, employeeId?: string, details?: any) => {
  logger.info('Attendance operation', {
    action,
    employeeId,
    details,
  })
}

export default logger 

// Add 12-factor app helper methods to Winston logger
export const api = (method: string, path: string, statusCode: number, duration?: number, context?: any) => {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    duration: duration ? `${duration}ms` : undefined,
    ...context
  });
};

export const db = (operation: string, table: string, duration?: number, context?: any) => {
  logger.debug('Database Operation', {
    operation,
    table,
    duration: duration ? `${duration}ms` : undefined,
    ...context
  });
};

// Enhanced error logging with 12-factor principles
export const logErrorEnhanced = (message: string, error?: Error | unknown, context?: any) => {
  const errorContext: any = { ...context };
  
  if (error instanceof Error) {
    errorContext.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  } else if (error) {
    errorContext.error = error;
  }
  
  logger.error(message, errorContext);
};
