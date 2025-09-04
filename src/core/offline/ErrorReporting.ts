/**
 * Error Reporting System
 * Production-ready error reporting and monitoring
 */

// Simple console logger for client-side
class SimpleLogger {
  error(message: string, context?: Record<string, unknown>): void {
    console.error(message, context);
  }
  
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(message, context);
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    console.info(message, context);
  }
}

export interface ErrorReport {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'critical';
  component: string;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByComponent: Record<string, number>;
  errorRate: number;
  criticalErrors: number;
  resolvedErrors: number;
  averageResolutionTime: number;
}

export class ErrorReporting {
  private readonly logger: SimpleLogger;
  private readonly errors = new Map<string, ErrorReport>();
  private readonly maxErrors: number = 1000;
  private readonly errorThresholds = {
    error: 10,      // 10 errors per minute
    warning: 50,    // 50 warnings per minute
    critical: 1     // 1 critical error per minute
  };

  constructor() {
    this.logger = new SimpleLogger();
  }

  /**
   * Report an error
   */
  reportError(
    error: Error,
    component: string,
    context: Record<string, unknown> = {},
    level: 'error' | 'warning' | 'critical' = 'error'
  ): string {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    const errorReport: ErrorReport = {
      id: errorId,
      timestamp,
      level,
      component,
      message: error.message,
      stack: error.stack,
      context: {
        ...context,
        errorName: error.name,
        errorMessage: error.message
      },
      resolved: false
    };

    // Add browser context if available
    if (typeof window !== 'undefined') {
      errorReport.userAgent = window.navigator.userAgent;
      errorReport.url = window.location.href;
      errorReport.sessionId = this.getSessionId();
    }

    // Store error
    this.errors.set(errorId, errorReport);

    // Log error
    this.logger.error(`Error reported: ${error.message}`, {
      errorId,
      component,
      level,
      context: errorReport.context
    });

    // Check thresholds
    this.checkErrorThresholds(level);

    // Cleanup old errors
    this.cleanupOldErrors();

    return errorId;
  }

  /**
   * Report a critical error
   */
  reportCriticalError(
    error: Error,
    component: string,
    context: Record<string, unknown> = {}
  ): string {
    return this.reportError(error, component, context, 'critical');
  }

  /**
   * Report a warning
   */
  reportWarning(
    message: string,
    component: string,
    context: Record<string, unknown> = {}
  ): string {
    const error = new Error(message);
    return this.reportError(error, component, context, 'warning');
  }

  /**
   * Resolve an error
   */
  resolveError(errorId: string, resolvedBy = 'system'): boolean {
    const error = this.errors.get(errorId);
    if (!error) {
      return false;
    }

    error.resolved = true;
    error.resolvedAt = new Date().toISOString();
    error.resolvedBy = resolvedBy;

    this.logger.info(`Error resolved: ${errorId}`, {
      errorId,
      resolvedBy,
      resolutionTime: this.calculateResolutionTime(error)
    });

    return true;
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): ErrorReport | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Get all errors
   */
  getAllErrors(): ErrorReport[] {
    return Array.from(this.errors.values());
  }

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): ErrorReport[] {
    return Array.from(this.errors.values()).filter(error => !error.resolved);
  }

  /**
   * Get errors by component
   */
  getErrorsByComponent(component: string): ErrorReport[] {
    return Array.from(this.errors.values()).filter(error => error.component === component);
  }

  /**
   * Get errors by level
   */
  getErrorsByLevel(level: 'error' | 'warning' | 'critical'): ErrorReport[] {
    return Array.from(this.errors.values()).filter(error => error.level === level);
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    const errors = Array.from(this.errors.values());
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Filter errors from last hour
    const recentErrors = errors.filter(error => 
      new Date(error.timestamp) > oneHourAgo
    );

    const errorsByLevel = recentErrors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByComponent = recentErrors.reduce((acc, error) => {
      acc[error.component] = (acc[error.component] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const resolvedErrors = errors.filter(error => error.resolved);
    const averageResolutionTime = this.calculateAverageResolutionTime(resolvedErrors);

    return {
      totalErrors: recentErrors.length,
      errorsByLevel,
      errorsByComponent,
      errorRate: recentErrors.length / 60, // errors per minute
      criticalErrors: errorsByLevel.critical ?? 0,
      resolvedErrors: resolvedErrors.length,
      averageResolutionTime
    };
  }

  /**
   * Check if error thresholds are exceeded
   */
  private checkErrorThresholds(level: 'error' | 'warning' | 'critical'): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const recentErrors = Array.from(this.errors.values()).filter(error => 
      error.level === level && new Date(error.timestamp) > oneMinuteAgo
    );

    const threshold = this.errorThresholds[level];
    if (recentErrors.length > threshold) {
      this.logger.warn(`Error threshold exceeded for ${level}`, {
        level,
        count: recentErrors.length,
        threshold,
        recentErrors: recentErrors.map(e => e.id)
      });

      // In production, this would trigger alerts
      this.triggerAlert(level, recentErrors.length, threshold);
    }
  }

  /**
   * Trigger alert for threshold exceeded
   */
  private triggerAlert(
    level: 'error' | 'warning' | 'critical',
    count: number,
    threshold: number
  ): void {
    const alert = {
      type: 'error_threshold_exceeded',
      level,
      count,
      threshold,
      timestamp: new Date().toISOString(),
      message: `${level} error threshold exceeded: ${count} errors in the last minute (threshold: ${threshold})`
    };

    this.logger.error('Error threshold alert', alert);

    // In production, this would send to monitoring system
    this.sendToMonitoringSystem(alert);
  }

  /**
   * Send alert to monitoring system
   */
  private sendToMonitoringSystem(alert: Record<string, unknown>): void {
    // In production, this would integrate with monitoring systems like:
    // - Sentry
    // - DataDog
    // - New Relic
    // - Custom monitoring dashboard
    
    console.warn('Monitoring alert:', alert);
  }

  /**
   * Cleanup old errors
   */
  private cleanupOldErrors(): void {
    if (this.errors.size <= this.maxErrors) {
      return;
    }

    const errors = Array.from(this.errors.values());
    errors.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const toDelete = errors.slice(0, errors.length - this.maxErrors);
    toDelete.forEach(error => this.errors.delete(error.id));

    this.logger.info(`Cleaned up ${toDelete.length} old errors`);
  }

  /**
   * Calculate resolution time for an error
   */
  private calculateResolutionTime(error: ErrorReport): number {
    if (!error.resolvedAt) {
      return 0;
    }

    const created = new Date(error.timestamp).getTime();
    const resolved = new Date(error.resolvedAt).getTime();
    return resolved - created;
  }

  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(errors: ErrorReport[]): number {
    if (errors.length === 0) {
      return 0;
    }

    const totalTime = errors.reduce((sum, error) => {
      return sum + this.calculateResolutionTime(error);
    }, 0);

    return totalTime / errors.length;
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') {
      return 'server-session';
    }

    let sessionId = sessionStorage.getItem('error-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error-session-id', sessionId);
    }

    return sessionId;
  }

  /**
   * Export errors for analysis
   */
  exportErrors(): string {
    const errors = Array.from(this.errors.values());
    return JSON.stringify(errors, null, 2);
  }

  /**
   * Import errors from backup
   */
  importErrors(exportedData: string): void {
    try {
      const errors = JSON.parse(exportedData) as ErrorReport[];
      errors.forEach(error => {
        this.errors.set(error.id, error);
      });
      this.logger.info(`Imported ${errors.length} errors from backup`);
    } catch (error) {
      this.logger.error('Failed to import errors', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
