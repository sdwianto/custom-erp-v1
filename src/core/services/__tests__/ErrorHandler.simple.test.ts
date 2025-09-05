/**
 * Simple ErrorHandler Test
 * Basic functionality test for ErrorHandler service
 */

import { ErrorHandler, BaseError, ErrorCode } from '../ErrorHandler';
import type { Logger } from '../Logger';

// Create a concrete implementation for testing
class TestError extends BaseError {
  constructor(message: string, code: ErrorCode, context = {}) {
    super(message, code, context);
  }
}

// Mock Logger
jest.mock('../Logger');

describe('ErrorHandler Simple Test', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(),
      performance: jest.fn(),
      businessEvent: jest.fn(),
      securityEvent: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    errorHandler = new ErrorHandler(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ErrorCode enum', () => {
    it('should have correct error codes', () => {
      expect(ErrorCode.DATABASE_CONNECTION_ERROR).toBe('DATABASE_CONNECTION_ERROR');
      expect(ErrorCode.DATABASE_QUERY_ERROR).toBe('DATABASE_QUERY_ERROR');
      expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCode.ENTITY_NOT_FOUND).toBe('ENTITY_NOT_FOUND');
      expect(ErrorCode.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('BaseError', () => {
    it('should create BaseError with correct properties', () => {
      const error = new TestError(
        'Test error',
        ErrorCode.VALIDATION_ERROR,
        { userId: '123' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.context).toEqual({ userId: '123' });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('BaseError');
    });

    it('should create BaseError without context', () => {
      const error = new TestError('Test error', ErrorCode.VALIDATION_ERROR);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.context).toEqual({});
    });
  });

  describe('handleError', () => {
    it('should handle BaseError correctly', () => {
      const error = new TestError(
        'Test error',
        ErrorCode.VALIDATION_ERROR,
        { userId: '123' }
      );

      errorHandler.handleError(error, { operation: 'test-operation' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Operational error handled: Test error',
        expect.objectContaining({
          userId: '123',
          operation: 'test-operation'
        })
      );
    });

    it('should handle generic Error correctly', () => {
      const error = new Error('Generic error');

      errorHandler.handleError(error, { operation: 'test-operation' });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error: Generic error',
        expect.objectContaining({
          operation: 'test-operation',
          errorName: 'Error',
          errorMessage: 'Generic error'
        })
      );
    });
  });

  describe('createUserFriendlyMessage', () => {
    it('should create user-friendly messages for different error types', () => {
      const validationError = new TestError('Test', ErrorCode.VALIDATION_ERROR);
      const permissionError = new TestError('Test', ErrorCode.INSUFFICIENT_PERMISSIONS);
      const notFoundError = new TestError('Test', ErrorCode.ENTITY_NOT_FOUND);

      expect(errorHandler.createUserFriendlyMessage(validationError))
        .toBe('Please check your input and try again.');
      expect(errorHandler.createUserFriendlyMessage(permissionError))
        .toBe('You do not have permission to perform this action.');
      expect(errorHandler.createUserFriendlyMessage(notFoundError))
        .toBe('The requested item could not be found.');
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Generic error');

      expect(errorHandler.createUserFriendlyMessage(genericError))
        .toBe('An unexpected error occurred. Please try again or contact support.');
    });
  });

  describe('isOperationalError', () => {
    it('should identify operational errors', () => {
      const operationalError = new TestError('Test', ErrorCode.VALIDATION_ERROR);
      const systemError = new TestError('Test', ErrorCode.INTERNAL_SERVER_ERROR);

      expect(errorHandler.isOperationalError(operationalError)).toBe(true);
      expect(errorHandler.isOperationalError(systemError)).toBe(true);
    });

    it('should handle generic errors', () => {
      const genericError = new Error('Generic error');

      expect(errorHandler.isOperationalError(genericError)).toBe(false);
    });
  });
});
