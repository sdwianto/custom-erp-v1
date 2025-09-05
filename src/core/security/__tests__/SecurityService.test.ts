/**
 * SecurityService Test
 * Tests for security service functionality
 */

import { SecurityService, type SecurityConfig } from '../SecurityService';
import type { Logger } from '../../services/Logger';
import type { ValidationService } from '../../services/ValidationService';
import type { ErrorHandler } from '../../services/ErrorHandler';

// Mock dependencies
jest.mock('../../services/Logger');
jest.mock('../../services/ValidationService');
jest.mock('../../services/ErrorHandler');

describe('SecurityService', () => {
  let securityService: SecurityService;
  let mockLogger: jest.Mocked<Logger>;
  let mockValidationService: jest.Mocked<ValidationService>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;
  let config: SecurityConfig;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockValidationService = {
      validateField: jest.fn(),
      validateObject: jest.fn(),
    } as any;

    mockErrorHandler = {
      handleError: jest.fn(),
    } as any;

    config = {
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      sessionTimeout: 30,
      enableRateLimiting: true,
      enableAuditLogging: true
    };

    securityService = new SecurityService(
      mockLogger,
      mockValidationService,
      mockErrorHandler,
      config
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      const strongPassword = 'StrongPass123!';
      const result = securityService.validatePasswordStrength(strongPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const weakPassword = 'weak';
      const result = securityService.validatePasswordStrength(weakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require special characters when configured', () => {
      const passwordWithoutSpecial = 'StrongPass123';
      const result = securityService.validatePasswordStrength(passwordWithoutSpecial);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove XSS patterns', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const result = securityService.sanitizeInput(maliciousInput);
      
      expect(result).toBe('scriptalert("xss")/scriptHello');
    });

    it('should remove javascript protocol', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const result = securityService.sanitizeInput(maliciousInput);
      
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const maliciousInput = 'onclick=alert("xss")';
      const result = securityService.sanitizeInput(maliciousInput);
      
      expect(result).toBe('alert("xss")');
    });

    it('should handle non-string input', () => {
      const nonStringInput = 123;
      const result = securityService.sanitizeInput(nonStringInput as unknown as string);
      
      expect(result).toBe(123);
    });
  });

  describe('sanitizeSqlInput', () => {
    it('should remove SQL injection patterns', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = securityService.sanitizeSqlInput(maliciousInput);
      
      expect(result).toBe('TABLE users');
    });

    it('should remove SQL keywords', () => {
      const maliciousInput = 'SELECT * FROM users UNION SELECT * FROM passwords';
      const result = securityService.sanitizeSqlInput(maliciousInput);
      
      expect(result).toBe('* FROM users   * FROM passwords');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token = securityService.generateSecureToken(16);
      
      expect(token).toHaveLength(16);
      expect(typeof token).toBe('string');
    });

    it('should generate unique tokens', () => {
      const token1 = securityService.generateSecureToken(32);
      const token2 = securityService.generateSecureToken(32);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('isValidIpAddress', () => {
    it('should validate IPv4 addresses', () => {
      expect(securityService.isValidIpAddress('192.168.1.1')).toBe(true);
      expect(securityService.isValidIpAddress('127.0.0.1')).toBe(true);
      expect(securityService.isValidIpAddress('255.255.255.255')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(securityService.isValidIpAddress('256.256.256.256')).toBe(false);
      expect(securityService.isValidIpAddress('192.168.1')).toBe(false);
      expect(securityService.isValidIpAddress('not-an-ip')).toBe(false);
    });

    it('should validate IPv6 addresses', () => {
      expect(securityService.isValidIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });
  });

  describe('isIpAllowed', () => {
    it('should allow IPs in whitelist', () => {
      const allowedRanges = ['192.168.1.0/24', '10.0.0.1'];
      const allowedIp = '192.168.1.100';
      
      expect(securityService.isIpAllowed(allowedIp, allowedRanges)).toBe(true);
    });

    it('should reject IPs not in whitelist', () => {
      const allowedRanges = ['192.168.1.0/24'];
      const blockedIp = '203.0.113.1';
      
      expect(securityService.isIpAllowed(blockedIp, allowedRanges)).toBe(false);
    });

    it('should reject invalid IPs', () => {
      const allowedRanges = ['192.168.1.0/24'];
      const invalidIp = 'not-an-ip';
      
      expect(securityService.isIpAllowed(invalidIp, allowedRanges)).toBe(false);
    });
  });

  describe('validateSession', () => {
    it('should validate valid sessions', () => {
      const validSessionId = 'valid-session-id-12345';
      const context = { userId: 'user123', tenantId: 'tenant1' };
      
      expect(securityService.validateSession(validSessionId, context)).toBe(true);
    });

    it('should reject invalid sessions', () => {
      const invalidSessionId = 'short';
      const context = { userId: 'user123', tenantId: 'tenant1' };
      
      expect(securityService.validateSession(invalidSessionId, context)).toBe(false);
    });

    it('should reject empty sessions', () => {
      const emptySessionId = '';
      const context = { userId: 'user123', tenantId: 'tenant1' };
      
      expect(securityService.validateSession(emptySessionId, context)).toBe(false);
    });
  });

  describe('auditSecurityEvent', () => {
    it('should log security events', () => {
      const context = { userId: 'user123', ipAddress: '192.168.1.1' };
      const details = { action: 'login_attempt', success: false };
      
      securityService.auditSecurityEvent('login_attempt', details, context);
      
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security event: login_attempt',
        expect.objectContaining({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          event: 'login_attempt',
          details,
          severity: 'security'
        })
      );
    });
  });
});
