/**
 * Client-side logger for browser environments
 * Lighter version without server-specific features
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class ClientLogger {
  private level: LogLevel;
  private isDevelopment: boolean;
  
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    // In production, only log warnings and errors to reduce console noise
    this.level = this.isDevelopment ? 'debug' : 'warn';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment) {
      // In production, keep it simple
      return context ? `${message} ${JSON.stringify(context)}` : message;
    }

    // In development, add more formatting
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const contextStr = context ? ` ${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const formattedLog = this.formatLog(level, message, context);
    
    // Use appropriate console method with styling in development
    if (this.isDevelopment) {
      const styles = {
        debug: 'color: #888',
        info: 'color: #0066cc',
        warn: 'color: #ff9900',
        error: 'color: #ff0000; font-weight: bold'
      };

      console.log(`%c${formattedLog}`, styles[level]);
    } else {
      // In production, use standard console methods
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
        stack: this.isDevelopment ? error.stack : undefined
      };
    } else if (error) {
      errorContext.error = error;
    }
    
    this.log('error', message, errorContext);
  }

  // Helper for tracking user actions
  track(action: string, properties?: LogContext) {
    this.info(`User Action: ${action}`, properties);
  }

  // Helper for performance monitoring
  performance(operation: string, duration: number, context?: LogContext) {
    const level = duration > 1000 ? 'warn' : 'debug';
    this.log(level, `Performance: ${operation}`, {
      duration: `${duration}ms`,
      slow: duration > 1000,
      ...context
    });
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger();

// Export for testing
export default ClientLogger;