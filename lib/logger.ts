/**
 * Simple structured logger for the application
 * Follows 12-factor app principles: logs as event streams
 * Compatible with Edge Runtime and Next.js
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'http';

interface LogContext {
  [key: string]: any;
}

class SimpleLogger {
  private level: LogLevel;
  
  constructor() {
    // Use LOG_LEVEL env var or default to 'info' for production, 'debug' for development
    this.level = (process.env.LOG_LEVEL as LogLevel) || 
                 (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'http', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
      // Add useful metadata
      env: process.env.NODE_ENV || 'development',
      service: 'hr-saas',
      // Add Vercel/Railway specific metadata if available
      ...(process.env.VERCEL && { vercel: true }),
      ...(process.env.RAILWAY_ENVIRONMENT && { railway: process.env.RAILWAY_ENVIRONMENT })
    };

    // In production or when VERCEL is set, output as JSON for easy parsing
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      return JSON.stringify(logEntry);
    }

    // In development, format for readability
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private writeLog(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const formattedLog = this.formatLog(level, message, context);
    
    // Use appropriate console method
    switch (level) {
      case 'error':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      default:
        console.log(formattedLog);
    }
  }

  // Core logging methods
  debug(message: string, context?: LogContext) {
    this.writeLog('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.writeLog('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.writeLog('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };
    
    if (error instanceof Error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error) {
      errorContext.error = error;
    }
    
    this.writeLog('error', message, errorContext);
  }

  // Winston compatibility method
  log(level: string, message: string | any, meta?: any) {
    // Handle Winston-style calls
    if (typeof message === 'object') {
      this.writeLog(level as LogLevel, message.message || 'Log entry', message);
    } else {
      this.writeLog(level as LogLevel, message, meta);
    }
  }

  // HTTP logging (Winston compatibility)
  http(message: string, context?: LogContext) {
    this.writeLog('http', message, context);
  }

  // Helper method for API logging
  api(method: string, path: string, statusCode: number, duration?: number, context?: LogContext) {
    this.info('API Request', {
      method,
      path,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  // Helper method for database operations
  db(operation: string, table: string, duration?: number, context?: LogContext) {
    this.debug('Database Operation', {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  // Helper method for authentication events
  auth(action: string, userId?: string, details?: any) {
    this.info('Authentication event', {
      action,
      userId,
      details,
    });
  }

  // Helper method for payroll operations
  payroll(action: string, employeeId?: string, details?: any) {
    this.info('Payroll operation', {
      action,
      employeeId,
      details,
    });
  }

  // Helper method for attendance operations
  attendance(action: string, employeeId?: string, details?: any) {
    this.info('Attendance operation', {
      action,
      employeeId,
      details,
    });
  }
}

// Export singleton instance
export const logger = new SimpleLogger();

// Winston compatibility exports
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get?.('User-Agent') || req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for']
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
};

// Compatibility functions for existing code
export const logEvent = (level: string, message: string, meta?: any) => {
  logger.log(level, message, meta);
};

export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', error, context);
};

export const logAuth = (action: string, userId?: string, details?: any) => {
  logger.info('Authentication event', {
    action,
    userId,
    details
  });
};

export const logDatabase = (operation: string, table: string, details?: any) => {
  logger.db(operation, table, undefined, details);
};

export const logPayroll = (action: string, employeeId?: string, details?: any) => {
  logger.info('Payroll operation', {
    action,
    employeeId,
    details
  });
};

export const logAttendance = (action: string, employeeId?: string, details?: any) => {
  logger.info('Attendance operation', {
    action,
    employeeId,
    details
  });
};

// Export for testing or custom instances
export default SimpleLogger;
