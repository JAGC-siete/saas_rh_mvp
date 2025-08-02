/**
 * Simple structured logger for the application
 * Follows 12-factor app principles: logs as event streams
 * Compatible with Edge Runtime and Next.js
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

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
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
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
      service: 'hr-saas'
    };

    // In production, output as JSON for easy parsing
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(logEntry);
    }

    // In development, format for readability
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
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

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
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
    
    this.log('error', message, errorContext);
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

// Export for testing or custom instances
export default SimpleLogger;

// Export helper functions for backward compatibility
export const logEvent = (level: string, message: string, meta?: any) => {
  const logData = {
    message,
    ...meta,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '0.1.0',
  };
  
  logger.info(logData.message, logData);
};

export const logError = (error: Error, context?: any) => {
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
  });
};

export const logAuth = (action: string, userId?: string, details?: any) => {
  logger.auth(action, userId, details);
};

export const logDatabase = (operation: string, table: string, details?: any) => {
  logger.db(operation, table, details);
};

export const logPayroll = (action: string, employeeId?: string, details?: any) => {
  logger.payroll(action, employeeId, details);
};

export const logAttendance = (action: string, employeeId?: string, details?: any) => {
  logger.attendance(action, employeeId, details);
};
