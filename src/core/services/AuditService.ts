import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { Logger } from './Logger';
import { BaseService } from './BaseService';

/**
 * Audit Service - Enterprise-grade audit logging
 * Follows Implementation Guide requirements for audit trail and compliance
 * MATCHES the actual Prisma schema
 */

export interface AuditEvent {
  tenantId: string;
  actorId: string; // matches schema field name
  entity: string;  // matches schema field name
  entityId: string;
  action: string;
  changes?: Record<string, unknown>; // matches schema JSON field
  correlationId?: string;
}

export interface AuditQuery {
  tenantId: string;
  entity?: string;     // matches schema field name
  entityId?: string;
  actorId?: string;    // matches schema field name
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditResult {
  events: unknown[];
  total: number;
  hasMore: boolean;
}

/**
 * Audit Service Class
 * Implementation Guide: Audit trail (append-only, tamper-evidence)
 * Schema-compliant implementation
 */
export class AuditService extends BaseService {
  constructor(
    prisma: PrismaClient,
    redis: Redis,
    logger: Logger,
    tenantId: string
  ) {
    super(prisma, redis, logger, tenantId);
  }

  /**
   * Log audit event
   * Implementation Guide: Audit coverage ≥ 95% for critical paths
   */
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      this.validateTenantContext();
      
      this.logger.businessEvent(event.action, event.entityId, {
        correlationId: event.correlationId,
        tenantId: event.tenantId,
        actorId: event.actorId,
        entity: event.entity,
        action: event.action
      });

      // Store in database - using correct schema fields
      await this.prisma.auditEvent.create({
        data: {
          tenantId: event.tenantId,
          actorId: event.actorId,
          entity: event.entity,
          entityId: event.entityId,
          action: event.action,
          changes: event.changes ?? {} as any,
          hash: this.generateHash(event)
        }
      });

      // Cache recent audit events for quick access
      await this.cacheAuditEvent(event);

    } catch (error) {
      this.logger.error('Failed to log audit event', {
        correlationId: event.correlationId,
        tenantId: event.tenantId,
        actorId: event.actorId,
        entity: event.entity,
        entityId: event.entityId,
        action: event.action,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Don't throw error for audit logging failures - business operations should continue
    }
  }

  /**
   * Query audit events
   * Implementation Guide: Audit trail querying for compliance
   */
  async queryEvents(query: AuditQuery): Promise<AuditResult> {
    this.validateTenantContext();

          const where: {
        tenantId: string;
        entity?: string;
        entityId?: string;
        actorId?: string;
        action?: string;
        createdAt?: {
          gte?: Date;
          lte?: Date;
        };
      } = {
        tenantId: query.tenantId
      };

      // Use correct schema field names
      if (query.entity) where.entity = query.entity;
      if (query.entityId) where.entityId = query.entityId;
      if (query.actorId) where.actorId = query.actorId;
      if (query.action) where.action = query.action;
      
      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = query.startDate;
        if (query.endDate) where.createdAt.lte = query.endDate;
      }

    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    try {
      const [events, total] = await Promise.all([
        this.prisma.auditEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            tenantId: true,
            actorId: true,
            entity: true,
            entityId: true,
            action: true,
            changes: true,
            createdAt: true,
            hash: true
          }
        }),
        this.prisma.auditEvent.count({ where })
      ]);

      return {
        events,
        total,
        hasMore: offset + limit < total
      };

    } catch (error) {
      this.logger.error('Failed to query audit events', {
        tenantId: query.tenantId,
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get audit trail for specific entity
   * Implementation Guide: Entity-level audit trail
   */
  async getEntityAuditTrail(
    entity: string,
    entityId: string,
    limit = 50
  ): Promise<unknown[]> {
    this.validateTenantContext();

    try {
      const events = await this.prisma.auditEvent.findMany({
        where: {
          tenantId: this.tenantId,
          entity,
          entityId
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          actorId: true,
          action: true,
          changes: true,
          createdAt: true,
          hash: true
        }
      });

      return events;

    } catch (error) {
      this.logger.error('Failed to get entity audit trail', {
        tenantId: this.tenantId,
        entity,
        entityId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get user activity summary
   * Implementation Guide: User activity tracking
   */
  async getUserActivitySummary(
    actorId: string,
    days = 30
  ): Promise<Record<string, number>> {
    this.validateTenantContext();

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const events = await this.prisma.auditEvent.groupBy({
        by: ['action'],
        where: {
          tenantId: this.tenantId,
          actorId,
          createdAt: { gte: startDate }
        },
        _count: {
          action: true
        }
      });

      const summary: Record<string, number> = {};
      events.forEach(event => {
        if (event._count && typeof event._count === 'object' && 'action' in event._count) {
          summary[event.action] = (event._count as { action: number }).action;
        }
      });

      return summary;

    } catch (error) {
      this.logger.error('Failed to get user activity summary', {
        tenantId: this.tenantId,
        actorId,
        days,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate audit report
   * Implementation Guide: Compliance reporting
   */
  async generateAuditReport(
    startDate: Date,
    endDate: Date,
    entities?: string[]
  ): Promise<Record<string, unknown>> {
    this.validateTenantContext();

    try {
      const where: {
        tenantId: string;
        createdAt: { gte: Date; lte: Date };
        entity?: { in: string[] };
      } = {
        tenantId: this.tenantId,
        createdAt: { gte: startDate, lte: endDate }
      };

      if (entities && entities.length > 0) {
        where.entity = { in: entities };
      }

      const [totalEvents, actionSummary] = await Promise.all([
        this.prisma.auditEvent.count({ where }),
        this.prisma.auditEvent.groupBy({
          by: ['action'],
          where,
          _count: { action: true }
        })
      ]);

      return {
        period: { startDate, endDate },
        totalEvents,
        actionSummary: actionSummary.reduce((acc, item) => {
          if (item._count && typeof item._count === 'object' && 'action' in item._count) {
            acc[item.action] = (item._count as { action: number }).action;
          }
          return acc;
        }, {} as Record<string, number>),
        generatedAt: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to generate audit report', {
        tenantId: this.tenantId,
        startDate,
        endDate,
        entities,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Cache recent audit event for quick access
   */
  private async cacheAuditEvent(event: AuditEvent): Promise<void> {
    try {
      const cacheKey = this.getTenantCacheKey(`audit:recent:${event.entity}:${event.entityId}`);
      const cachedEvents = await this.redis.get(cacheKey);
      
      let events: Array<AuditEvent & { timestamp: string }> = cachedEvents ? JSON.parse(cachedEvents) : [];
      events.unshift({
        ...event,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 10 events
      events = events.slice(0, 10);
      
      await this.redis.setex(cacheKey, 3600, JSON.stringify(events)); // 1 hour TTL
      
    } catch (error) {
      // Cache failure shouldn't affect audit logging
      this.logger.warn('Failed to cache audit event', {
        tenantId: this.tenantId,
        entity: event.entity,
        entityId: event.entityId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Generate hash for audit events
   */
  private generateHash(event: AuditEvent): string {
    const data = `${event.tenantId}-${event.actorId}-${event.entity}-${event.entityId}-${event.action}-${Date.now()}`;
    return Buffer.from(data).toString('base64').substring(0, 16);
  }
}
