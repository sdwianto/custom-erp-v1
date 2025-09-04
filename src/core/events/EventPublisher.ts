import type { Redis } from 'ioredis';
import type { Logger } from '../services/Logger';
import { ulid } from 'ulid';
import type { EventEnvelope, EventPublisher as IEventPublisher } from './types';

/**
 * Event Publisher Implementation
 * Follows Implementation Guide requirements for event publishing
 */
export class EventPublisher implements IEventPublisher {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly tenantId: string;

  constructor(redis: Redis, logger: Logger, tenantId: string) {
    this.redis = redis;
    this.logger = logger;
    this.tenantId = tenantId;
  }

  /**
   * Publish tenant-scoped event
   * Implementation Guide: Tenant scoping untuk multi-tenancy
   */
  async publishTenantEvent(
    tenantId: string, 
    eventType: string, 
    payload: unknown
  ): Promise<void> {
    const correlationId = this.generateCorrelationId();
    
    try {
      const event: EventEnvelope = {
        id: ulid(),
        tenantId,
        type: eventType,
        entity: this.extractEntityFromEventType(eventType),
        entityId: this.extractEntityIdFromPayload(payload),
        version: this.extractVersionFromPayload(payload),
        timestamp: new Date().toISOString(),
        payload: payload as Record<string, unknown>,
        correlationId,
        metadata: {
          publishedBy: 'EventPublisher',
          publishedAt: new Date().toISOString()
        }
      };

      await this.publishToRedisStreams(event);
      await this.publishToRedisPubSub(event);

      this.logger.info('Event published successfully', {
        correlationId,
        tenantId,
        eventType,
        eventId: event.id,
        entity: event.entity,
        entityId: event.entityId
      });

    } catch (error) {
      this.logger.error('Failed to publish tenant event', {
        correlationId,
        tenantId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Publish batch events
   * Implementation Guide: Batch processing untuk high-volume operations
   */
  async publishBatchEvents(events: EventEnvelope[]): Promise<void> {
    const correlationId = this.generateCorrelationId();
    
    try {
      this.logger.info('Publishing batch events', {
        correlationId,
        tenantId: this.tenantId,
        eventCount: events.length
      });

      // Publish to Redis Streams in batch
      await this.publishBatchToRedisStreams(events);
      
      // Publish to Redis Pub/Sub individually for real-time delivery
      for (const event of events) {
        await this.publishToRedisPubSub(event);
      }

      this.logger.info('Batch events published successfully', {
        correlationId,
        tenantId: this.tenantId,
        eventCount: events.length
      });

    } catch (error) {
      this.logger.error('Failed to publish batch events', {
        correlationId,
        tenantId: this.tenantId,
        eventCount: events.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Publish system-wide event
   * Implementation Guide: System events untuk cross-tenant operations
   */
  async publishSystemEvent(eventType: string, payload: unknown): Promise<void> {
    const correlationId = this.generateCorrelationId();
    
    try {
      const event: EventEnvelope = {
        id: ulid(),
        tenantId: 'system',
        type: eventType,
        entity: this.extractEntityFromEventType(eventType),
        entityId: this.extractEntityIdFromPayload(payload),
        version: this.extractVersionFromPayload(payload),
        timestamp: new Date().toISOString(),
        payload: payload as Record<string, unknown>,
        correlationId,
        metadata: {
          publishedBy: 'EventPublisher',
          publishedAt: new Date().toISOString(),
          isSystemEvent: true
        }
      };

      await this.publishToRedisStreams(event);
      await this.publishToRedisPubSub(event);

      this.logger.info('System event published successfully', {
        correlationId,
        eventType,
        eventId: event.id,
        entity: event.entity,
        entityId: event.entityId
      });

    } catch (error) {
      this.logger.error('Failed to publish system event', {
        correlationId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Publish to Redis Streams
   * Implementation Guide: Redis Streams untuk event replay dan persistence
   */
  private async publishToRedisStreams(event: EventEnvelope): Promise<void> {
    const streamKey = this.getTenantStreamKey(event.tenantId);
    const eventData = JSON.stringify(event);
    
    await this.redis.xadd(
      streamKey,
      '*', // Auto-generate message ID
      'event', eventData,
      'timestamp', event.timestamp,
      'type', event.type,
      'entity', event.entity,
      'entityId', event.entityId
    );
  }

  /**
   * Publish batch to Redis Streams
   * Implementation Guide: Batch processing untuk performance
   */
  private async publishBatchToRedisStreams(events: EventEnvelope[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const event of events) {
      const streamKey = this.getTenantStreamKey(event.tenantId);
      const eventData = JSON.stringify(event);
      
      pipeline.xadd(
        streamKey,
        '*',
        'event', eventData,
        'timestamp', event.timestamp,
        'type', event.type,
        'entity', event.entity,
        'entityId', event.entityId
      );
    }
    
    await pipeline.exec();
  }

  /**
   * Publish to Redis Pub/Sub
   * Implementation Guide: Redis Pub/Sub untuk real-time delivery
   */
  private async publishToRedisPubSub(event: EventEnvelope): Promise<void> {
    const channel = this.getTenantPubSubKey(event.tenantId);
    const message = JSON.stringify(event);
    
    await this.redis.publish(channel, message);
  }

  /**
   * Get tenant-specific stream key
   * Implementation Guide: Tenant scoping untuk Redis Streams
   */
  private getTenantStreamKey(tenantId: string): string {
    return `events:stream:${tenantId}`;
  }

  /**
   * Get tenant-specific pub/sub key
   * Implementation Guide: Tenant scoping untuk Redis Pub/Sub
   */
  private getTenantPubSubKey(tenantId: string): string {
    return `events:pubsub:${tenantId}`;
  }

  /**
   * Extract entity name from event type
   * Example: 'inventory.item.created' -> 'Item'
   */
  private extractEntityFromEventType(eventType: string): string {
    const parts = eventType.split('.');
    if (parts.length >= 2) {
      return parts[1]!.charAt(0).toUpperCase() + parts[1]!.slice(1);
    }
    return 'Unknown';
  }

  /**
   * Extract entity ID from payload
   */
  private extractEntityIdFromPayload(payload: unknown): string {
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      return obj.id as string || obj.entityId as string || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Extract version from payload
   */
  private extractVersionFromPayload(payload: unknown): number {
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      return (obj.version as number) || 1;
    }
    return 1;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return ulid();
  }
}
