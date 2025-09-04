/**
 * Core Services Index
 * Enterprise-grade service layer for NextGen ERP
 * Follows Implementation Guide and JDE Knowledge Recommendations
 */

// Base Service Layer
export { BaseService } from './BaseService';
export { ServiceFactory, RegisterService } from './ServiceFactory';

// Core Services
export { Logger } from './Logger';
export type { LogLevel, LogContext } from './Logger';
export { ErrorHandler, BaseError } from './ErrorHandler';
export type { ErrorCode, ErrorContext } from './ErrorHandler';
export { ValidationService } from './ValidationService';
export type { ValidationRule, ValidationResult, ValidationContext } from './ValidationService';
export { AuditService } from './AuditService';
export type { AuditEvent, AuditQuery, AuditResult } from './AuditService';
export { DatabaseService } from './DatabaseService';
export type { DatabaseStats, QueryPerformance, IndexUsage } from './DatabaseService';
export { CacheService } from './CacheService';
export type { CacheOptions, CacheStats, CacheKey } from './CacheService';

// Business Services
export { ItemService } from './business/ItemService';

// Service Types
export type { ServiceDependencies, ServiceRegistry } from './ServiceFactory';
