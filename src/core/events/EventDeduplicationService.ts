import type { Redis } from 'ioredis';
import type { Logger } from '../services/Logger';
import type { EventEnvelope } from './types';

/**
 * Event Deduplication Service Implementation
 * Follows Implementation Guide requirements for event deduplication
 */
export class EventDeduplicationService {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly tenantId: string;
  private readonly deduplicationWindow: number; // in milliseconds
  private readonly maxDeduplicationKeys: number;

  constructor(
    redis: Redis,
    logger: Logger,
    tenantId: string,
    options: {
      deduplicationWindow?: number;
      maxDeduplicationKeys?: number;
    } = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.tenantId = tenantId;
    this.deduplicationWindow = options.deduplicationWindow ?? 300000; // 5 minutes
    this.maxDeduplicationKeys = options.maxDeduplicationKeys ?? 100000;
  }

  /**
   * Check if event is duplicate
   * Implementation Guide: Event deduplication
   */
  async isDuplicate(event: EventEnvelope): Promise<boolean> {
    try {
      const deduplicationKey = this.generateDeduplicationKey(event);
      const exists = await this.redis.exists(deduplicationKey);
      
      if (exists) {
        this.logger.warn('Duplicate event detected', {
          eventId: event.id,
          eventType: event.type,
          tenantId: event.tenantId,
          deduplicationKey
        });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to check event duplication', {
        eventId: event.id,
        eventType: event.type,
        tenantId: event.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // In case of error, assume not duplicate to avoid blocking legitimate events
      return false;
    }
  }

  /**
   * Mark event as processed
   * Implementation Guide: Event deduplication
   */
  async markAsProcessed(event: EventEnvelope): Promise<void> {
    try {
      const deduplicationKey = this.generateDeduplicationKey(event);
      
      // Set with expiration to prevent memory leaks
      await this.redis.setex(
        deduplicationKey,
        Math.ceil(this.deduplicationWindow / 1000), // Convert to seconds
        JSON.stringify({
          eventId: event.id,
          eventType: event.type,
          tenantId: event.tenantId,
          processedAt: new Date().toISOString(),
          correlationId: event.correlationId
        })
      );

      this.logger.debug('Event marked as processed', {
        eventId: event.id,
        eventType: event.type,
        tenantId: event.tenantId,
        deduplicationKey
      });

    } catch (error) {
      this.logger.error('Failed to mark event as processed', {
        eventId: event.id,
        eventType: event.type,
        tenantId: event.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check and mark event as processed atomically
   * Implementation Guide: Event deduplication dengan atomic operations
   */
  async checkAndMarkAsProcessed(event: EventEnvelope): Promise<boolean> {
    try {
      const deduplicationKey = this.generateDeduplicationKey(event);
      
      // Use Redis SET with NX (only if not exists) and EX (expiration)
      const result = await this.redis.set(
        deduplicationKey,
        JSON.stringify({
          eventId: event.id,
          eventType: event.type,
          tenantId: event.tenantId,
          processedAt: new Date().toISOString(),
          correlationId: event.correlationId
        }),
        'EX',
        Math.ceil(this.deduplicationWindow / 1000),
        'NX'
      );

      // If result is 'OK', event was not duplicate and is now marked as processed
      // If result is null, event was duplicate
      const isNewEvent = result === 'OK';

      if (!isNewEvent) {
        this.logger.warn('Duplicate event detected and blocked', {
          eventId: event.id,
          eventType: event.type,
          tenantId: event.tenantId,
          deduplicationKey
        });
      } else {
        this.logger.debug('Event marked as processed (atomic)', {
          eventId: event.id,
          eventType: event.type,
          tenantId: event.tenantId,
          deduplicationKey
        });
      }

      return isNewEvent;

    } catch (error) {
      this.logger.error('Failed to check and mark event as processed', {
        eventId: event.id,
        eventType: event.type,
        tenantId: event.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // In case of error, assume not duplicate to avoid blocking legitimate events
      return true;
    }
  }

  /**
   * Get deduplication statistics
   */
  async getDeduplicationStats(): Promise<{
    totalKeys: number;
    memoryUsage: number;
    oldestKey: string | null;
    newestKey: string | null;
  }> {
    try {
      const pattern = this.getDeduplicationKeyPattern();
      const keys = await this.redis.keys(pattern);
      
      let memoryUsage = 0;
      let oldestKey: string | null = null;
      let newestKey: string | null = null;
      let oldestTime = Number.MAX_SAFE_INTEGER;
      let newestTime = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        const keyTime = Date.now() - (ttl * 1000);
        
        const keyMemory = await this.redis.memory('USAGE', key);
        memoryUsage += typeof keyMemory === 'number' ? keyMemory : 0;
        
        if (keyTime < oldestTime) {
          oldestTime = keyTime;
          oldestKey = key;
        }
        
        if (keyTime > newestTime) {
          newestTime = keyTime;
          newestKey = key;
        }
      }

      return {
        totalKeys: keys.length,
        memoryUsage,
        oldestKey,
        newestKey
      };

    } catch (error) {
      this.logger.error('Failed to get deduplication stats', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        totalKeys: 0,
        memoryUsage: 0,
        oldestKey: null,
        newestKey: null
      };
    }
  }

  /**
   * Cleanup expired deduplication keys
   * Implementation Guide: Memory management
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const pattern = this.getDeduplicationKeyPattern();
      const keys = await this.redis.keys(pattern);
      
      let cleanedCount = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.info('Cleaned up expired deduplication keys', {
          tenantId: this.tenantId,
          cleanedCount,
          remainingKeys: keys.length - cleanedCount
        });
      }

      return cleanedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup expired deduplication keys', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Clear all deduplication keys for tenant
   */
  async clearAllKeys(): Promise<number> {
    try {
      const pattern = this.getDeduplicationKeyPattern();
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      this.logger.info('Cleared all deduplication keys', {
        tenantId: this.tenantId,
        clearedCount: keys.length
      });

      return keys.length;

    } catch (error) {
      this.logger.error('Failed to clear deduplication keys', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Generate deduplication key for event
   * Implementation Guide: Event deduplication dengan content-based hashing
   */
  private generateDeduplicationKey(event: EventEnvelope): string {
    // Create a hash based on event content for deduplication
    const contentHash = this.createContentHash(event);
    return `dedup:${this.tenantId}:${event.type}:${contentHash}`;
  }

  /**
   * Create content hash for event
   */
  private createContentHash(event: EventEnvelope): string {
    // Create a deterministic hash based on event content
    const content = {
      entity: event.entity,
      entityId: event.entityId,
      version: event.version,
      payload: event.payload
    };
    
    // Simple hash function (in production, use a proper hash like SHA-256)
    const contentString = JSON.stringify(content);
    let hash = 0;
    
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Get deduplication key pattern
   */
  private getDeduplicationKeyPattern(): string {
    return `dedup:${this.tenantId}:*`;
  }

  /**
   * Get deduplication key for specific event type
   */
  getDeduplicationKeyPatternForEventType(eventType: string): string {
    return `dedup:${this.tenantId}:${eventType}:*`;
  }

  /**
   * Check if deduplication is enabled for event type
   */
  isDeduplicationEnabledForEventType(eventType: string): boolean {
    // Some event types might not need deduplication
    const excludedTypes = [
      'heartbeat',
      'connection.established',
      'connection.closed'
    ];
    
    return !excludedTypes.includes(eventType);
  }

  /**
   * Get deduplication configuration
   */
  getConfiguration(): {
    tenantId: string;
    deduplicationWindow: number;
    maxDeduplicationKeys: number;
  } {
    return {
      tenantId: this.tenantId,
      deduplicationWindow: this.deduplicationWindow,
      maxDeduplicationKeys: this.maxDeduplicationKeys
    };
  }
}
