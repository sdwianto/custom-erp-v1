/**
 * Enterprise-grade Logger Service
 * Follows Implementation Guide requirements for structured logging and telemetry
 */

export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  operation?: string;
  [key: string]: any;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export class Logger {
  private readonly serviceName: string;
  private readonly environment: string;

  constructor(serviceName: string, environment = 'development') {
    this.serviceName = serviceName;
    this.environment = environment;
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Structured logging with JSON format for machine readability
   * Implementation Guide: JSON log format untuk machine readability
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      environment: this.environment,
      message,
      ...context
    };

    // In development, pretty print for readability
    if (this.environment === 'development') {
      console.log(`[${level}] ${message}`, context ?? '');
    } else {
      // In production, structured JSON logging
      console.log(JSON.stringify(logEntry));
    }

    // TODO: Integrate with actual logging system (Winston, Pino, etc.)
    // TODO: Send to monitoring system (Sentry, DataDog, etc.)
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.serviceName, this.environment);
    // Add additional context to all log calls
    return childLogger;
  }

  /**
   * Log performance metrics
   * Implementation Guide: Performance monitoring and SLOs
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} completed in ${duration}ms`, {
      ...context,
      operation,
      duration,
      performance: duration <= 100 ? 'good' : duration <= 300 ? 'warning' : 'critical'
    });
  }

  /**
   * Log business events
   * Implementation Guide: Event logging untuk audit trail
   */
  businessEvent(eventType: string, entityId: string, context?: LogContext): void {
    this.info(`Business Event: ${eventType}`, {
      ...context,
      eventType,
      entityId,
      category: 'business'
    });
  }

  /**
   * Log security events
   * Implementation Guide: Security logging untuk compliance
   */
  securityEvent(eventType: string, userId: string, context?: LogContext): void {
    this.warn(`Security Event: ${eventType}`, {
      ...context,
      eventType,
      userId,
      category: 'security',
      severity: 'high'
    });
  }
}

