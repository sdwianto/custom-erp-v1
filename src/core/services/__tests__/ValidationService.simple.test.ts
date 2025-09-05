/**
 * Simple ValidationService Test
 * Basic functionality test for ValidationService
 */

import { ValidationService, type ValidationRule } from '../ValidationService';
import type { Logger } from '../Logger';

// Mock Logger
jest.mock('../Logger');

describe('ValidationService Simple Test', () => {
  let validationService: ValidationService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    validationService = new ValidationService(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ValidationRule interface', () => {
    it('should create validation rule with correct properties', () => {
      const rule: ValidationRule = {
        field: 'email',
        type: 'email',
        required: true,
        minLength: 5,
        maxLength: 100,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        customValidator: (value: unknown) => typeof value === 'string' && value.includes('@')
      };

      expect(rule.field).toBe('email');
      expect(rule.type).toBe('email');
      expect(rule.required).toBe(true);
    });
  });

  describe('validateField', () => {
    it('should validate required fields', () => {
      const rule: ValidationRule = {
        field: 'name',
        type: 'string',
        required: true
      };

      const result = validationService.validateField('name', 'John Doe', rule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const resultEmpty = validationService.validateField('name', '', rule);
      expect(resultEmpty.isValid).toBe(false);
      expect(resultEmpty.errors[0].message).toContain('Required field \'name\' is missing');
    });

    it('should validate string types', () => {
      const rule: ValidationRule = {
        field: 'name',
        type: 'string',
        minLength: 2,
        maxLength: 50
      };

      const result = validationService.validateField('name', 'John', rule);
      expect(result.isValid).toBe(true);

      const resultShort = validationService.validateField('name', 'J', rule);
      expect(resultShort.isValid).toBe(false);
      expect(resultShort.errors[0].message).toContain('Field \'name\' must be at least 2 characters long');
    });

    it('should validate email types', () => {
      const rule: ValidationRule = {
        field: 'email',
        type: 'email'
      };

      const result = validationService.validateField('email', 'test@example.com', rule);
      expect(result.isValid).toBe(true);

      const resultInvalid = validationService.validateField('email', 'invalid-email', rule);
      expect(resultInvalid.isValid).toBe(false);
      expect(resultInvalid.errors[0].message).toContain('Field \'email\' has invalid format');
    });
  });

  describe('validateObject', () => {
    it('should validate object with multiple rules', () => {
      const rules: ValidationRule[] = [
        { field: 'name', type: 'string', required: true, minLength: 2 },
        { field: 'email', type: 'email', required: true },
        { field: 'age', type: 'number', min: 0, max: 120 }
      ];

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const result = validationService.validateObject(validData, rules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

});
