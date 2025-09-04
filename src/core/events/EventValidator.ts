import type { Logger } from '../services/Logger';
import type { EventEnvelope, EventValidationResult } from './types';

/**
 * Event Validator Implementation
 * Follows Implementation Guide requirements for event validation
 */
export class EventValidator {
  private readonly logger: Logger;
  private readonly maxEventSize: number;
  private readonly compressionEnabled: boolean;
  private readonly encryptionEnabled: boolean;

  constructor(
    logger: Logger,
    options: {
      maxEventSize?: number;
      compressionEnabled?: boolean;
      encryptionEnabled?: boolean;
    } = {}
  ) {
    this.logger = logger;
    this.maxEventSize = options.maxEventSize ?? 1024 * 1024; // 1MB default
    this.compressionEnabled = options.compressionEnabled ?? false;
    this.encryptionEnabled = options.encryptionEnabled ?? false;
  }

  /**
   * Validate event envelope
   * Implementation Guide: Schema validation untuk event payload
   */
  validateEvent(event: EventEnvelope): EventValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    this.validateRequiredFields(event, errors);
    
    // Validate field formats
    this.validateFieldFormats(event, errors);
    
    // Validate event size
    this.validateEventSize(event, errors, warnings);
    
    // Validate event type format
    this.validateEventType(event, errors, warnings);
    
    // Validate payload structure
    this.validatePayloadStructure(event, errors, warnings);
    
    // Validate versioning
    this.validateVersioning(event, errors, warnings);
    
    // Validate tenant scoping
    this.validateTenantScoping(event, errors);

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn('Event validation failed', {
        eventId: event.id,
        eventType: event.type,
        tenantId: event.tenantId,
        errors,
        warnings
      });
    }

    return {
      isValid,
      errors,
      warnings
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(event: EventEnvelope, errors: string[]): void {
    const requiredFields = ['id', 'tenantId', 'type', 'entity', 'entityId', 'version', 'timestamp', 'payload'];
    
    for (const field of requiredFields) {
      if (!event[field as keyof EventEnvelope]) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
  }

  /**
   * Validate field formats
   */
  private validateFieldFormats(event: EventEnvelope, errors: string[]): void {
    // Validate ID format (should be ULID)
    if (event.id && !this.isValidULID(event.id)) {
      errors.push('Field "id" must be a valid ULID');
    }

    // Validate tenant ID format
    if (event.tenantId && !this.isValidTenantId(event.tenantId)) {
      errors.push('Field "tenantId" must be a valid tenant identifier');
    }

    // Validate timestamp format
    if (event.timestamp && !this.isValidISOTimestamp(event.timestamp)) {
      errors.push('Field "timestamp" must be a valid ISO timestamp');
    }

    // Validate version format
    if (event.version && (!Number.isInteger(event.version) || event.version < 1)) {
      errors.push('Field "version" must be a positive integer');
    }

    // Validate correlation ID format
    if (event.correlationId && !this.isValidCorrelationId(event.correlationId)) {
      errors.push('Field "correlationId" must be a valid correlation identifier');
    }
  }

  /**
   * Validate event size
   * Implementation Guide: Event size limits
   */
  private validateEventSize(event: EventEnvelope, errors: string[], warnings: string[]): void {
    const eventSize = JSON.stringify(event).length;
    
    if (eventSize > this.maxEventSize) {
      errors.push(`Event size (${eventSize} bytes) exceeds maximum allowed size (${this.maxEventSize} bytes)`);
    } else if (eventSize > this.maxEventSize * 0.8) {
      warnings.push(`Event size (${eventSize} bytes) is approaching maximum allowed size (${this.maxEventSize} bytes)`);
    }
  }

  /**
   * Validate event type format
   * Implementation Guide: Event versioning & compatibility
   */
  private validateEventType(event: EventEnvelope, errors: string[], warnings: string[]): void {
    if (!event.type) return;

    // Event type should follow pattern: domain.entity.action
    const eventTypePattern = /^[a-z]+\.[a-z]+\.[a-z]+$/;
    
    if (!eventTypePattern.test(event.type)) {
      errors.push('Event type must follow pattern: domain.entity.action (e.g., "inventory.item.created")');
    }

    // Check for deprecated event types
    const deprecatedTypes = ['legacy.', 'old.', 'deprecated.'];
    if (deprecatedTypes.some(deprecated => event.type.startsWith(deprecated))) {
      warnings.push(`Event type "${event.type}" appears to be deprecated`);
    }
  }

  /**
   * Validate payload structure
   */
  private validatePayloadStructure(event: EventEnvelope, errors: string[], warnings: string[]): void {
    if (!event.payload || typeof event.payload !== 'object') {
      errors.push('Payload must be a valid object');
      return;
    }

    // Check for required payload fields based on event type
    const requiredPayloadFields = this.getRequiredPayloadFields(event.type);
    
    for (const field of requiredPayloadFields) {
      if (!(field in event.payload)) {
        errors.push(`Required payload field "${field}" is missing for event type "${event.type}"`);
      }
    }

    // Check for circular references
    if (this.hasCircularReference(event.payload)) {
      errors.push('Payload contains circular references');
    }

    // Check for functions in payload
    if (this.containsFunctions(event.payload)) {
      warnings.push('Payload contains functions which may not serialize properly');
    }
  }

  /**
   * Validate versioning
   * Implementation Guide: Event versioning & compatibility
   */
  private validateVersioning(event: EventEnvelope, errors: string[], warnings: string[]): void {
    if (!event.version) return;

    // Version should be positive integer
    if (!Number.isInteger(event.version) || event.version < 1) {
      errors.push('Version must be a positive integer');
    }

    // Check for version compatibility
    const currentVersion = this.getCurrentEventVersion(event.type);
    if (currentVersion && event.version > currentVersion) {
      warnings.push(`Event version ${event.version} is newer than current version ${currentVersion} for event type "${event.type}"`);
    }
  }

  /**
   * Validate tenant scoping
   * Implementation Guide: Tenant scoping untuk multi-tenancy
   */
  private validateTenantScoping(event: EventEnvelope, errors: string[]): void {
    if (!event.tenantId) return;

    // Tenant ID should not be empty
    if (event.tenantId.trim() === '') {
      errors.push('Tenant ID cannot be empty');
    }

    // System events should have tenantId as 'system'
    if (event.type.startsWith('system.') && event.tenantId !== 'system') {
      errors.push('System events must have tenantId set to "system"');
    }

    // Non-system events should not have tenantId as 'system'
    if (!event.type.startsWith('system.') && event.tenantId === 'system') {
      errors.push('Non-system events cannot have tenantId set to "system"');
    }
  }

  /**
   * Get required payload fields for event type
   */
  private getRequiredPayloadFields(eventType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      'inventory.item.created': ['id', 'number', 'description'],
      'inventory.item.updated': ['id', 'version'],
      'inventory.item.deleted': ['id'],
      'inventory.transaction.created': ['id', 'itemId', 'quantity', 'type'],
      'user.created': ['id', 'email', 'name'],
      'user.updated': ['id', 'version'],
      'user.deleted': ['id']
    };

    return fieldMap[eventType] ?? [];
  }

  /**
   * Get current event version for event type
   */
  private getCurrentEventVersion(eventType: string): number | null {
    const versionMap: Record<string, number> = {
      'inventory.item.created': 1,
      'inventory.item.updated': 1,
      'inventory.item.deleted': 1,
      'inventory.transaction.created': 1,
      'user.created': 1,
      'user.updated': 1,
      'user.deleted': 1
    };

    return versionMap[eventType] ?? null;
  }

  /**
   * Check if string is valid ULID
   */
  private isValidULID(id: string): boolean {
    return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(id);
  }

  /**
   * Check if string is valid tenant ID
   */
  private isValidTenantId(tenantId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(tenantId) && tenantId.length >= 1 && tenantId.length <= 50;
  }

  /**
   * Check if string is valid ISO timestamp
   */
  private isValidISOTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && date.toISOString() === timestamp;
  }

  /**
   * Check if string is valid correlation ID
   */
  private isValidCorrelationId(correlationId: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(correlationId) && correlationId.length >= 1 && correlationId.length <= 100;
  }

  /**
   * Check for circular references in object
   */
  private hasCircularReference(obj: unknown, seen = new WeakSet()): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    if (seen.has(obj)) {
      return true;
    }

    seen.add(obj);

    for (const value of Object.values(obj)) {
      if (this.hasCircularReference(value, seen)) {
        return true;
      }
    }

    seen.delete(obj);
    return false;
  }

  /**
   * Check if object contains functions
   */
  private containsFunctions(obj: unknown): boolean {
    if (obj === null || typeof obj !== 'object') {
      return false;
    }

    for (const value of Object.values(obj)) {
      if (typeof value === 'function') {
        return true;
      }
      if (typeof value === 'object' && this.containsFunctions(value)) {
        return true;
      }
    }

    return false;
  }
}
