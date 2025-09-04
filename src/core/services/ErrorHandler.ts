import { Logger } from './Logger';
import type { LogContext } from './Logger';

/**
 * Centralized Error Handling Service
 * Follows Implementation Guide requirements for error handling and logging
 */

export enum ErrorCode {
  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  DUPLICATE_ENTITY = 'DUPLICATE_ENTITY',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Offline/Conflict errors
  OFFLINE_CONFLICT = 'OFFLINE_CONFLICT',
  IDEMPOTENCY_DUPLICATE = 'IDEMPOTENCY_DUPLICATE',
  VERSION_MISMATCH = 'VERSION_MISMATCH'
}

export interface ErrorContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  operation?: string;
  entityType?: string;
  entityId?: string;
  [key: string]: any;
}

/**
 * Base custom error class
 */
export abstract class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get error details for logging
   */
  getErrorDetails(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
      stack: this.stack
    };
  }
}

/**
 * Database-related errors
 */
export class DatabaseError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.DATABASE_QUERY_ERROR, context, true);
  }
}

export class DatabaseConnectionError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.DATABASE_CONNECTION_ERROR, context, false);
  }
}

export class DatabaseConstraintError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.DATABASE_CONSTRAINT_ERROR, context, true);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends BaseError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorCode.VALIDATION_ERROR, context, true);
  }
}

export class RequiredFieldMissingError extends BaseError {
  constructor(fieldName: string, context: ErrorContext = {}) {
    super(`Required field '${fieldName}' is missing`, ErrorCode.REQUIRED_FIELD_MISSING, {
      ...context,
      fieldName
    }, true);
  }
}

export class InvalidFormatError extends BaseError {
  constructor(fieldName: string, expectedFormat: string, context: ErrorContext = {}) {
    super(`Field '${fieldName}' has invalid format. Expected: ${expectedFormat}`, ErrorCode.INVALID_FORMAT, {
      ...context,
      fieldName,
      expectedFormat
    }, true);
  }
}

/**
 * Business logic errors
 */
export class BusinessRuleViolationError extends BaseError {
  constructor(rule: string, context: ErrorContext = {}) {
    super(`Business rule violation: ${rule}`, ErrorCode.BUSINESS_RULE_VIOLATION, {
      ...context,
      rule
    }, true);
  }
}

export class InsufficientPermissionsError extends BaseError {
  constructor(requiredPermission: string, context: ErrorContext = {}) {
    super(`Insufficient permissions. Required: ${requiredPermission}`, ErrorCode.INSUFFICIENT_PERMISSIONS, {
      ...context,
      requiredPermission
    }, true);
  }
}

export class EntityNotFoundError extends BaseError {
  constructor(entityType: string, entityId: string, context: ErrorContext = {}) {
    super(`${entityType} with ID '${entityId}' not found`, ErrorCode.ENTITY_NOT_FOUND, {
      ...context,
      entityType,
      entityId
    }, true);
  }
}

export class DuplicateEntityError extends BaseError {
  constructor(entityType: string, duplicateField: string, context: ErrorContext = {}) {
    super(`${entityType} with ${duplicateField} already exists`, ErrorCode.DUPLICATE_ENTITY, {
      ...context,
      entityType,
      duplicateField
    }, true);
  }
}

/**
 * Offline/Conflict errors
 */
export class OfflineConflictError extends BaseError {
  constructor(entityType: string, entityId: string, conflictType: string, context: ErrorContext = {}) {
    super(`Offline conflict detected for ${entityType} '${entityId}': ${conflictType}`, ErrorCode.OFFLINE_CONFLICT, {
      ...context,
      entityType,
      entityId,
      conflictType
    }, true);
  }
}

export class IdempotencyDuplicateError extends BaseError {
  constructor(operationKey: string, context: ErrorContext = {}) {
    super(`Operation with key '${operationKey}' was already executed`, ErrorCode.IDEMPOTENCY_DUPLICATE, {
      ...context,
      operationKey
    }, true);
  }
}

export class VersionMismatchError extends BaseError {
  constructor(entityType: string, entityId: string, expectedVersion: number, actualVersion: number, context: ErrorContext = {}) {
    super(`Version mismatch for ${entityType} '${entityId}'. Expected: ${expectedVersion}, Actual: ${actualVersion}`, ErrorCode.VERSION_MISMATCH, {
      ...context,
      entityType,
      entityId,
      expectedVersion,
      actualVersion
    }, true);
  }
}

/**
 * Centralized Error Handler
 */
export class ErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Handle and log errors
   * Implementation Guide: Error logging dengan correlation ID
   */
  handleError(error: Error | BaseError, context: ErrorContext = {}): void {
    if (error instanceof BaseError) {
      this.handleCustomError(error, context);
    } else {
      this.handleGenericError(error, context);
    }
  }

  /**
   * Handle custom errors
   */
  private handleCustomError(error: BaseError, context: ErrorContext = {}): void {
    const errorDetails = error.getErrorDetails();
    const logContext: LogContext = { ...errorDetails.context, ...context };

    if (error.isOperational) {
      this.logger.warn(`Operational error handled: ${error.message}`, logContext);
    } else {
      this.logger.error(`System error occurred: ${error.message}`, logContext);
    }

    // TODO: Send to monitoring system (Sentry, DataDog, etc.)
    // TODO: Send to error tracking service
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(error: Error, context: ErrorContext = {}): void {
    this.logger.error(`Unexpected error: ${error.message}`, {
      ...context,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    });

    // TODO: Send to monitoring system
  }

  /**
   * Create user-friendly error message
   * Implementation Guide: User-friendly error messages
   */
  createUserFriendlyMessage(error: Error | BaseError): string {
    if (error instanceof BaseError) {
      switch (error.code) {
        case ErrorCode.VALIDATION_ERROR:
          return 'Please check your input and try again.';
        case ErrorCode.INSUFFICIENT_PERMISSIONS:
          return 'You do not have permission to perform this action.';
        case ErrorCode.ENTITY_NOT_FOUND:
          return 'The requested item could not be found.';
        case ErrorCode.DUPLICATE_ENTITY:
          return 'This item already exists.';
        case ErrorCode.OFFLINE_CONFLICT:
          return 'There is a conflict with your offline changes. Please review and resolve.';
        case ErrorCode.IDEMPOTENCY_DUPLICATE:
          return 'This operation was already completed.';
        case ErrorCode.VERSION_MISMATCH:
          return 'The data has been updated by another user. Please refresh and try again.';
        default:
          return 'An error occurred. Please try again or contact support.';
      }
    }

    return 'An unexpected error occurred. Please try again or contact support.';
  }

  /**
   * Check if error is operational (recoverable)
   */
  isOperationalError(error: Error | BaseError): boolean {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Get error code for API responses
   */
  getErrorCode(error: Error | BaseError): string {
    if (error instanceof BaseError) {
      return error.code;
    }
    return ErrorCode.INTERNAL_SERVER_ERROR;
  }
}

