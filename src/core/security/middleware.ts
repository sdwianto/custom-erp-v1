/**
 * Security Middleware
 * Enterprise-grade security middleware for API routes
 * Follows Implementation Guide security requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecurityService, type SecurityContext } from './SecurityService';
import { Logger } from '../services/Logger';
import { ValidationService } from '../services/ValidationService';
import { ErrorHandler } from '../services/ErrorHandler';

export interface SecurityMiddlewareConfig {
  enableRateLimiting: boolean;
  enableIpWhitelisting: boolean;
  enableAuditLogging: boolean;
  allowedIpRanges: string[];
  maxRequestsPerMinute: number;
}

export class SecurityMiddleware {
  private securityService: SecurityService;
  private config: SecurityMiddlewareConfig;

  constructor(
    securityService: SecurityService,
    config: SecurityMiddlewareConfig
  ) {
    this.securityService = securityService;
    this.config = config;
  }

  /**
   * Main security middleware function
   */
  async handleRequest(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const securityContext: SecurityContext = {
      ipAddress: this.getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? undefined,
      correlationId: this.generateCorrelationId()
    };

    try {
      // 1. IP Whitelisting Check
      if (this.config.enableIpWhitelisting) {
        const ipAllowed = this.securityService.isIpAllowed(
          securityContext.ipAddress ?? '',
          this.config.allowedIpRanges
        );

        if (!ipAllowed) {
          return this.createSecurityResponse(
            'IP_NOT_ALLOWED',
            'Access denied: IP address not in whitelist',
            403,
            securityContext
          );
        }
      }

      // 2. Rate Limiting Check
      if (this.config.enableRateLimiting) {
        const rateLimitResult = await this.securityService.checkRateLimit(
          securityContext.ipAddress ?? 'unknown',
          'api_request',
          securityContext
        );

        if (!rateLimitResult.allowed) {
          return this.createSecurityResponse(
            'RATE_LIMIT_EXCEEDED',
            'Rate limit exceeded',
            429,
            securityContext,
            {
              'X-RateLimit-Limit': this.config.maxRequestsPerMinute.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
            }
          );
        }
      }

      // 3. Input Sanitization
      const sanitizedRequest = await this.sanitizeRequest(request);

      // 4. Execute handler
      const response = await handler(sanitizedRequest);

      // 5. Audit successful request
      if (this.config.enableAuditLogging) {
        this.auditRequest(request, response, securityContext, Date.now() - startTime);
      }

      return response;

    } catch (error) {
      // 6. Handle security errors
      return this.handleSecurityError(error, securityContext);
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0]?.trim() ?? 'unknown';
    }
    
    if (realIp) {
      return realIp;
    }
    
    return request.headers.get('x-forwarded-for') ?? 'unknown';
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize request data
   */
  private async sanitizeRequest(request: NextRequest): Promise<NextRequest> {
    // Create a new request with sanitized data
    const url = new URL(request.url);
    
    // Sanitize query parameters
    const sanitizedParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      const sanitizedKey = this.securityService.sanitizeInput(key);
      const sanitizedValue = this.securityService.sanitizeInput(value);
      sanitizedParams.set(sanitizedKey, sanitizedValue);
    }
    
    // Create new URL with sanitized parameters
    const sanitizedUrl = new URL(url.pathname, url.origin);
    sanitizedParams.forEach((value, key) => {
      sanitizedUrl.searchParams.set(key, value);
    });

    // Create new request with sanitized URL
    return new NextRequest(sanitizedUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
  }

  /**
   * Create security response
   */
  private createSecurityResponse(
    code: string,
    message: string,
    status: number,
    context: SecurityContext,
    headers: Record<string, string> = {}
  ): NextResponse {
    const response = NextResponse.json(
      {
        error: code,
        message,
        timestamp: new Date().toISOString(),
        correlationId: context.correlationId
      },
      { status }
    );

    // Add security headers
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add standard security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  }

  /**
   * Audit request
   */
  private auditRequest(
    request: NextRequest,
    response: NextResponse,
    context: SecurityContext,
    duration: number
  ): void {
    this.securityService.auditSecurityEvent(
      'api_request',
      {
        method: request.method,
        url: request.url,
        status: response.status,
        duration,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress
      },
      context
    );
  }

  /**
   * Handle security errors
   */
  private handleSecurityError(error: unknown, context: SecurityContext): NextResponse {
    this.securityService.auditSecurityEvent(
      'security_error',
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      context
    );

    return this.createSecurityResponse(
      'SECURITY_ERROR',
      'A security error occurred',
      500,
      context
    );
  }
}

/**
 * Create security middleware instance
 */
export function createSecurityMiddleware(config: SecurityMiddlewareConfig): SecurityMiddleware {
  const logger = new Logger('SecurityMiddleware');
  const validationService = new ValidationService(logger);
  const errorHandler = new ErrorHandler(logger);
  
  const securityService = new SecurityService(
    logger,
    validationService,
    errorHandler,
    {
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      sessionTimeout: 30,
      enableRateLimiting: true,
      enableAuditLogging: true
    }
  );

  return new SecurityMiddleware(securityService, config);
}
