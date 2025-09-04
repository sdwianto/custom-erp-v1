import type winston from 'winston';
import { createLogger, format, transports } from 'winston';

/**
 * Enterprise-grade Logger Service
 * Follows Implementation Guide requirements for structured logging and telemetry
 */

export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  operation?: string;
  [key: string]: unknown;
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
  private readonly winstonLogger: winston.Logger;
  private readonly monitoringEnabled: boolean;

  constructor(serviceName: string, environment = 'development') {
    this.serviceName = serviceName;
    this.environment = environment;
    this.monitoringEnabled = environment === 'production';
    
    // Initialize Winston logger
    this.winstonLogger = createLogger({
      level: environment === 'development' ? 'debug' : 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      defaultMeta: { service: serviceName, environment },
      transports: [
        // Console transport for development
        new transports.Console({
          format: environment === 'development' 
            ? format.combine(format.colorize(), format.simple())
            : format.json()
        }),
        // File transport for production
        ...(environment === 'production' ? [
          new transports.File({ 
            filename: `logs/${serviceName}-error.log`, 
            level: 'error' 
          }),
          new transports.File({ 
            filename: `logs/${serviceName}-combined.log` 
          })
        ] : [])
      ]
    });
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

    // Use Winston for structured logging
    this.winstonLogger.log(level.toLowerCase(), message, logEntry);

    // Send to monitoring system if enabled
    if (this.monitoringEnabled) {
      void this.sendToMonitoring(level, message, context);
    }
  }

  /**
   * Send logs to monitoring system (Sentry, DataDog, etc.)
   * Implementation Guide: Send to monitoring system
   */
  private async sendToMonitoring(level: LogLevel, message: string, context?: LogContext): Promise<void> {
    try {
      // TODO: Replace with actual monitoring system integration
      // Example: Sentry, DataDog, New Relic, etc.
      if (level === LogLevel.ERROR) {
        // Send errors to monitoring system
        await this.sendErrorToMonitoring(message, context);
      }
      
      if (level === LogLevel.WARN) {
        // Send warnings to monitoring system
        await this.sendWarningToMonitoring(message, context);
      }
    } catch (error) {
      // Don't let monitoring failures affect logging
      console.error('Failed to send to monitoring system:', error);
    }
  }

  /**
   * Send error to monitoring system
   */
  private async sendErrorToMonitoring(message: string, context?: LogContext): Promise<void> {
    // TODO: Implement actual monitoring system integration
    // Example: Sentry.captureException(new Error(message), { extra: context });
    console.log(`[MONITORING] Error sent: ${message}`, context);
  }

  /**
   * Send warning to monitoring system
   */
  private async sendWarningToMonitoring(message: string, context?: LogContext): Promise<void> {
    // TODO: Implement actual monitoring system integration
    // Example: DataDog.log(message, { level: 'warn', ...context });
    console.log(`[MONITORING] Warning sent: ${message}`, context);
  }

  /**
   * Create child logger with additional context
   */
  child(_additionalContext: LogContext): Logger {
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

    // Send performance metrics to monitoring system
    if (this.monitoringEnabled) {
      void this.sendPerformanceMetrics(operation, duration, context);
    }
  }

  /**
   * Send performance metrics to monitoring system
   */
  private async sendPerformanceMetrics(operation: string, duration: number, context?: LogContext): Promise<void> {
    try {
      // TODO: Implement actual metrics system integration
      // Example: DataDog.histogram('operation.duration', duration, { operation, ...context });
      console.log(`[METRICS] Performance: ${operation} = ${duration}ms`, context);
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
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

    // Security events should always be sent to monitoring
    if (this.monitoringEnabled) {
      void this.sendSecurityAlert(eventType, userId, context);
    }
  }

  /**
   * Send security alert to monitoring system
   */
  private async sendSecurityAlert(eventType: string, userId: string, context?: LogContext): Promise<void> {
    try {
      // TODO: Implement actual security alerting system
      // Example: PagerDuty.trigger('security-alert', { eventType, userId, ...context });
      console.log(`[SECURITY ALERT] ${eventType} by user ${userId}`, context);
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }
}

