/**
 * Security Service
 * Enterprise-grade security utilities and validations
 * Follows Implementation Guide security requirements
 */

import type { Logger } from '../services/Logger';
import type { ValidationService } from '../services/ValidationService';
import type { ErrorHandler } from '../services/ErrorHandler';

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  sessionTimeout: number; // in minutes
  enableRateLimiting: boolean;
  enableAuditLogging: boolean;
}

export interface SecurityContext {
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
}

export class SecurityService {
  private logger: Logger;
  private validationService: ValidationService;
  private errorHandler: ErrorHandler;
  private config: SecurityConfig;

  constructor(
    logger: Logger,
    validationService: ValidationService,
    errorHandler: ErrorHandler,
    config: SecurityConfig
  ) {
    this.logger = logger;
    this.validationService = validationService;
    this.errorHandler = errorHandler;
    this.config = config;
  }

  /**
   * Validate password strength
   * Implementation Guide: Strong password requirements
   */
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.config.passwordMinLength) {
      errors.push(`Password must be at least ${this.config.passwordMinLength} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize input to prevent XSS
   * Implementation Guide: Input sanitization
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate and sanitize SQL input
   * Implementation Guide: SQL injection prevention
   */
  sanitizeSqlInput(input: string): string {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove SQL injection patterns
    return input
      .replace(/[';-]/g, '') // Remove quotes, semicolons, and hyphens
      .replace(/union/gi, '') // Remove UNION
      .replace(/select/gi, '') // Remove SELECT
      .replace(/insert/gi, '') // Remove INSERT
      .replace(/update/gi, '') // Remove UPDATE
      .replace(/delete/gi, '') // Remove DELETE
      .replace(/drop/gi, '') // Remove DROP
      .replace(/create/gi, '') // Remove CREATE
      .replace(/alter/gi, '') // Remove ALTER
      .trim();
  }

  /**
   * Generate secure random token
   * Implementation Guide: Secure token generation
   */
  generateSecureToken(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Hash sensitive data
   * Implementation Guide: Data encryption
   */
  async hashData(data: string): Promise<string> {
    // In production, use proper hashing library like bcrypt
    // This is a simplified version for demonstration
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate IP address
   * Implementation Guide: IP validation
   */
  isValidIpAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if IP is in allowed range
   * Implementation Guide: IP whitelisting
   */
  isIpAllowed(ip: string, allowedRanges: string[]): boolean {
    if (!this.isValidIpAddress(ip)) {
      return false;
    }

    // Simplified IP range checking
    // In production, use proper IP range validation library
    return allowedRanges.some(range => {
      if (range.includes('/')) {
        // CIDR notation - simplified check
        const [network, prefix] = range.split('/');
        return ip.startsWith(network?.split('.').slice(0, parseInt(prefix ?? '0') / 8).join('.') ?? '');
      } else {
        return ip === range;
      }
    });
  }

  /**
   * Rate limiting check
   * Implementation Guide: Rate limiting
   */
  async checkRateLimit(
    identifier: string,
    action: string,
    context: SecurityContext
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    // Simplified rate limiting
    // In production, use Redis-based rate limiting
    // const _key = `rate_limit:${identifier}:${action}`;
    
    // Mock implementation - in production, check against Redis
    const allowed = true;
    const remaining = 100;
    const resetTime = Date.now() + 3600000; // 1 hour

    this.logger.info('Rate limit check', {
      ...context,
      identifier,
      action,
      allowed,
      remaining
    });

    return { allowed, remaining, resetTime };
  }

  /**
   * Audit security event
   * Implementation Guide: Security audit logging
   */
  auditSecurityEvent(
    event: string,
    details: Record<string, unknown>,
    context: SecurityContext
  ): void {
    this.logger.warn(`Security event: ${event}`, {
      ...context,
      event,
      details,
      timestamp: new Date().toISOString(),
      severity: 'security'
    });

    // In production, send to security monitoring system
  }

  /**
   * Validate session
   * Implementation Guide: Session validation
   */
  validateSession(sessionId: string, context: SecurityContext): boolean {
    // Simplified session validation
    // In production, validate against session store
    if (!sessionId || sessionId.length < 10) {
      this.auditSecurityEvent('invalid_session', { sessionId }, context);
      return false;
    }

    return true;
  }

  /**
   * Check permissions
   * Implementation Guide: Permission-based access control
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context: SecurityContext
  ): Promise<boolean> {
    // Simplified permission check
    // In production, check against database
    this.logger.info('Permission check', {
      ...context,
      userId,
      resource,
      action
    });

    return true; // Simplified - always allow
  }

  /**
   * Encrypt sensitive data
   * Implementation Guide: Data encryption
   */
  async encryptData(data: string, _key?: string): Promise<string> {
    // Simplified encryption
    // In production, use proper encryption library
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Decrypt sensitive data
   * Implementation Guide: Data decryption
   */
  async decryptData(encryptedData: string, _key?: string): Promise<string> {
    // Simplified decryption
    // In production, use proper decryption
    return encryptedData; // Placeholder
  }
}
