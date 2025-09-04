import { Logger } from './Logger';
import { ValidationError, RequiredFieldMissingError, InvalidFormatError } from './ErrorHandler';

/**
 * Validation Service - Enterprise-grade data validation
 * Follows Implementation Guide requirements for data validation
 */

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'uuid';
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  operation?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Validation Service Class
 */
export class ValidationService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate object against validation rules
   */
  validateObject(
    data: Record<string, unknown>,
    rules: ValidationRule[],
    context: ValidationContext = {}
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    this.logger.debug(`Starting validation for ${rules.length} fields`, {
      ...context,
      fieldCount: rules.length
    });

    for (const rule of rules) {
      const value = data[rule.field];
      
      try {
        // Required field validation
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(new RequiredFieldMissingError(rule.field, context));
          continue;
        }

        // Skip further validation if field is not required and value is empty
        if (!rule.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        // Type validation
        if (rule.type && !this.validateType(value, rule.type)) {
          errors.push(new InvalidFormatError(
            rule.field,
            rule.type,
            { ...context, actualValue: value, expectedType: rule.type }
          ));
          continue;
        }

        // String validation
        if (typeof value === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(new ValidationError(
              rule.message ?? `Field '${rule.field}' must be at least ${rule.minLength} characters long`,
              { ...context, field: rule.field, actualLength: value.length, minLength: rule.minLength }
            ));
          }

          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(new ValidationError(
              rule.message ?? `Field '${rule.field}' must not exceed ${rule.maxLength} characters`,
              { ...context, field: rule.field, actualLength: value.length, maxLength: rule.maxLength }
            ));
          }

          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(new ValidationError(
              rule.message ?? `Field '${rule.field}' has invalid format`,
              { ...context, field: rule.field, actualValue: value, pattern: rule.pattern.toString() }
            ));
          }
        }

        // Number validation
        if (typeof value === 'number') {
          if (rule.minValue !== undefined && value < rule.minValue) {
            errors.push(new ValidationError(
              rule.message ?? `Field '${rule.field}' must be at least ${rule.minValue}`,
              { ...context, field: rule.field, actualValue: value, minValue: rule.minValue }
            ));
          }

          if (rule.maxValue !== undefined && value > rule.maxValue) {
            errors.push(new ValidationError(
              rule.message ?? `Field '${rule.field}' must not exceed ${rule.maxValue}`,
              { ...context, field: rule.field, actualValue: value, maxValue: rule.maxValue }
            ));
          }
        }

        // Custom validation
        if (rule.custom) {
          const customResult = rule.custom(value);
          if (customResult !== true) {
            const message = typeof customResult === 'string' ? customResult : `Field '${rule.field}' failed custom validation`;
            errors.push(new ValidationError(
              rule.message ?? message,
              { ...context, field: rule.field, actualValue: value }
            ));
          }
        }

      } catch (error) {
        this.logger.error(`Validation error for field '${rule.field}'`, {
          ...context,
          field: rule.field,
          error: error instanceof Error ? error.message : String(error)
        });
        errors.push(new ValidationError(
          `Validation failed for field '${rule.field}'`,
          { ...context, field: rule.field, error: error instanceof Error ? error.message : String(error) }
        ));
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    if (result.isValid) {
      this.logger.debug(`Validation completed successfully`, {
        ...context,
        fieldCount: rules.length
      });
    } else {
      this.logger.warn(`Validation failed with ${errors.length} errors`, {
        ...context,
        fieldCount: rules.length,
        errorCount: errors.length,
        errors: errors.map(e => ({ field: e.context.field, message: e.message }))
      });
    }

    return result;
  }

  /**
   * Validate single field
   */
  validateField(
    field: string,
    value: any,
    rule: ValidationRule,
    context: ValidationContext = {}
  ): ValidationResult {
    return this.validateObject({ [field]: value }, [rule], context);
  }

  /**
   * Validate type
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value);
      case 'uuid':
        return typeof value === 'string' && this.isValidUUID(value);
      default:
        return true;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Create validation rules for common patterns
   */
  static createRules(): {
    requiredString: (field: string, maxLength?: number) => ValidationRule;
    requiredNumber: (field: string, minValue?: number, maxValue?: number) => ValidationRule;
    requiredEmail: (field: string) => ValidationRule;
    requiredUUID: (field: string) => ValidationRule;
    requiredDate: (field: string) => ValidationRule;
    optionalString: (field: string, maxLength?: number) => ValidationRule;
    optionalNumber: (field: string, minValue?: number, maxValue?: number) => ValidationRule;
  } {
    return {
      requiredString: (field: string, maxLength?: number) => ({
        field,
        required: true,
        type: 'string',
        maxLength,
        message: maxLength ? `Field '${field}' is required and must not exceed ${maxLength} characters` : `Field '${field}' is required`
      }),

      requiredNumber: (field: string, minValue?: number, maxValue?: number) => ({
        field,
        required: true,
        type: 'number',
        minValue,
        maxValue,
        message: `Field '${field}' is required and must be a number${minValue !== undefined ? ` >= ${minValue}` : ''}${maxValue !== undefined ? ` <= ${maxValue}` : ''}`
      }),

      requiredEmail: (field: string) => ({
        field,
        required: true,
        type: 'email',
        message: `Field '${field}' is required and must be a valid email address`
      }),

      requiredUUID: (field: string) => ({
        field,
        required: true,
        type: 'uuid',
        message: `Field '${field}' is required and must be a valid UUID`
      }),

      requiredDate: (field: string) => ({
        field,
        required: true,
        type: 'date',
        message: `Field '${field}' is required and must be a valid date`
      }),

      optionalString: (field: string, maxLength?: number) => ({
        field,
        required: false,
        type: 'string',
        maxLength,
        message: maxLength ? `Field '${field}' must not exceed ${maxLength} characters` : undefined
      }),

      optionalNumber: (field: string, minValue?: number, maxValue?: number) => ({
        field,
        required: false,
        type: 'number',
        minValue,
        maxValue,
        message: `Field '${field}' must be a number${minValue !== undefined ? ` >= ${minValue}` : ''}${maxValue !== undefined ? ` <= ${maxValue}` : ''}`
      })
    };
  }

  /**
   * Validate tenant context
   * Implementation Guide: Multi-tenancy validation
   */
  validateTenantContext(tenantId: string, context: ValidationContext = {}): ValidationResult {
    const rules = [
      ValidationService.createRules().requiredUUID('tenantId')
    ];

    return this.validateObject({ tenantId }, rules, context);
  }

  /**
   * Validate user context
   */
  validateUserContext(userId: string, context: ValidationContext = {}): ValidationResult {
    const rules = [
      ValidationService.createRules().requiredUUID('userId')
    ];

    return this.validateObject({ userId }, rules, context);
  }
}

