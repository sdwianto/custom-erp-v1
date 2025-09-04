import { type PrismaClient } from '@prisma/client';
import { eventBus, type DomainEvent } from '../events/EventBus';
import { redis } from '../cache/redis';

// Base service interface
export interface BaseServiceInterface {
  tenantId: string;
  userId: string;
}

// Idempotency result
export interface IdempotencyResult<T> {
  isDuplicate: boolean;
  result?: T;
  error?: string;
}

// Audit log entry
export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Base service class
export abstract class BaseService implements BaseServiceInterface {
  protected prisma: PrismaClient;
  public tenantId: string;
  public userId: string;

  constructor(prisma: PrismaClient, tenantId: string, userId: string) {
    this.prisma = prisma;
    this.tenantId = tenantId;
    this.userId = userId;
  }

  // Ensure idempotency for operations
  protected async ensureIdempotency<T>(
    operationKey: string,
    operation: () => Promise<T>
  ): Promise<IdempotencyResult<T>> {
    const idempotencyKey = `${this.tenantId}:${this.userId}:${operationKey}`;
    
    try {
      // Check if operation was already executed
      const existingResult = await redis.get(idempotencyKey);
      if (existingResult) {
        return {
          isDuplicate: true,
          result: JSON.parse(existingResult)
        };
      }

      // Execute operation
      const result = await operation();
      
      // Store result for idempotency (with TTL)
      await redis.setex(idempotencyKey, 3600, JSON.stringify(result)); // 1 hour TTL
      
      return {
        isDuplicate: false,
        result
      };
    } catch (error) {
      console.error('Idempotency check failed:', error);
      return {
        isDuplicate: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create audit log entry
  protected async auditLog(entry: Omit<AuditLogEntry, 'tenantId' | 'userId'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        tenantId: this.tenantId,
        userId: this.userId
      };

      // Store in database
      const createdAuditLog = await this.prisma.auditLog.create({
        data: {
          id: this.generateId(),
          tenantId: auditEntry.tenantId,
          userId: auditEntry.userId,
          entityType: auditEntry.entityType,
          entityId: auditEntry.entityId,
          action: auditEntry.action,
          oldValues: auditEntry.changes ? auditEntry.changes.old as any : undefined,
          newValues: auditEntry.changes ? auditEntry.changes.new as any : undefined,
          ipAddress: null, // Will be set by middleware
          userAgent: null, // Will be set by middleware
          createdAt: new Date()
        }
      });

      // Publish audit event
      await this.publishEvent('audit.log.created', 'AuditLog', createdAuditLog.id, {
        ...auditEntry,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw error for audit logging failures
    }
  }

  // Publish domain event
  protected async publishEvent(
    eventType: string,
    entity: string,
    entityId: string,
    payload: Record<string, unknown> = {},
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const event: DomainEvent = {
        id: this.generateId(),
        tenantId: this.tenantId,
        type: eventType,
        entity,
        entityId,
        version: 1, // Will be incremented by entity
        payload,
        metadata,
        timestamp: new Date()
      };

      await eventBus.publish(event);
    } catch (error) {
      console.error('Failed to publish event:', error);
      // Don't throw error for event publishing failures
    }
  }

  // Generate unique ID
  protected generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate tenant access
  protected async validateTenantAccess(_entityId: string, _entityType: string): Promise<boolean> {
    // This is a basic implementation - can be enhanced based on requirements
    return true;
  }

  // Get current timestamp
  protected getCurrentTimestamp(): Date {
    return new Date();
  }

  // Format currency amount
  protected formatCurrency(amount: number, currency = 'IDR'): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency
    }).format(amount);
  }

  // Validate email format
  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Sanitize input string
  protected sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  // Generate random string
  protected generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Check if user has permission
  protected async hasPermission(permission: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: this.userId },
        include: { role: true }
      });

      if (!user || !user.role) return false;

      const permissions = user.role.permissions as string[];
      return permissions.includes(permission);
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  // Get user role
  protected async getUserRole(): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: this.userId },
        include: { role: true }
      });

      return user?.role?.name ?? null;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check Redis connection
      await redis.ping();
      
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}
