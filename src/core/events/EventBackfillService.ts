import type { Redis } from 'ioredis';
import type { Logger } from '../services/Logger';
import type { 
  EventEnvelope, 
  EventBackfillRequest, 
  EventBackfillResult, 
  EventStreamPosition 
} from './types';

/**
 * Event Backfill Service Implementation
 * Follows Implementation Guide requirements for backfill mechanism
 */
export class EventBackfillService {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly tenantId: string;
  private readonly batchSize: number;
  private readonly maxBackfillSize: number;

  constructor(
    redis: Redis,
    logger: Logger,
    tenantId: string,
    options: {
      batchSize?: number;
      maxBackfillSize?: number;
    } = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.tenantId = tenantId;
    this.batchSize = options.batchSize ?? 100;
    this.maxBackfillSize = options.maxBackfillSize ?? 10000;
  }

  /**
   * Backfill events from Redis Streams
   * Implementation Guide: Backfill via Redis Streams dengan ordered delivery
   */
  async backfillEvents(request: EventBackfillRequest): Promise<EventBackfillResult> {
    const correlationId = this.generateCorrelationId();
    
    try {
      this.logger.info('Starting event backfill', {
        correlationId,
        tenantId: request.tenantId,
        fromTimestamp: request.fromTimestamp,
        toTimestamp: request.toTimestamp,
        eventTypes: request.eventTypes,
        limit: request.limit
      });

      // Validate request
      this.validateBackfillRequest(request);

      // Get stream key for tenant
      const streamKey = this.getTenantStreamKey(request.tenantId);
      
      // Check if stream exists
      const streamExists = await this.redis.exists(streamKey);
      if (!streamExists) {
        this.logger.warn('Stream does not exist for tenant', {
          correlationId,
          tenantId: request.tenantId,
          streamKey
        });
        
        return {
          events: [],
          hasMore: false,
          totalCount: 0
        };
      }

      // Get stream length
      const streamLength = await this.redis.xlen(streamKey);
      
      // Calculate range for backfill
      const range = this.calculateBackfillRange(request, streamLength);
      
      // Read events from stream
      const events = await this.readEventsFromStream(streamKey, range);
      
      // Filter events by criteria
      const filteredEvents = this.filterEvents(events, request);
      
      // Apply limit
      const limitedEvents = this.applyLimit(filteredEvents, request.limit);
      
      // Determine if there are more events
      const hasMore = this.determineHasMore(filteredEvents, limitedEvents, request.limit);
      
      // Generate next cursor if needed
      const nextCursor = hasMore ? this.generateNextCursor(limitedEvents) : undefined;

      const result: EventBackfillResult = {
        events: limitedEvents,
        hasMore,
        nextCursor,
        totalCount: filteredEvents.length
      };

      this.logger.info('Event backfill completed', {
        correlationId,
        tenantId: request.tenantId,
        eventsReturned: result.events.length,
        hasMore: result.hasMore,
        totalCount: result.totalCount
      });

      return result;

    } catch (error) {
      this.logger.error('Event backfill failed', {
        correlationId,
        tenantId: request.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get stream position for tenant
   * Implementation Guide: Cursor tracking per client
   */
  async getStreamPosition(tenantId: string): Promise<EventStreamPosition | null> {
    try {
      const streamKey = this.getTenantStreamKey(tenantId);
      const streamInfo = await this.redis.xinfo('STREAM', streamKey) as unknown[];
      
      if (!streamInfo || streamInfo.length === 0) {
        return null;
      }

      // Get last entry ID
      const lastEntryId = (streamInfo.find((info: unknown) => 
        Array.isArray(info) && info[0] === 'last-entry'
      ) as [string, string] | undefined)?.[1];

      return {
        streamId: streamKey,
        position: lastEntryId ?? '0-0',
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to get stream position', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Set stream position for tenant
   * Implementation Guide: Cursor tracking per client
   */
  async setStreamPosition(tenantId: string, position: string): Promise<void> {
    try {
      const positionKey = this.getStreamPositionKey(tenantId);
      await this.redis.set(positionKey, position);
      
      this.logger.info('Stream position set', {
        tenantId,
        position
      });

    } catch (error) {
      this.logger.error('Failed to set stream position', {
        tenantId,
        position,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get stream statistics
   */
  async getStreamStats(tenantId: string): Promise<{
    streamLength: number;
    firstEntryId: string | null;
    lastEntryId: string | null;
    consumerGroups: number;
  }> {
    try {
      const streamKey = this.getTenantStreamKey(tenantId);
      const streamInfo = await this.redis.xinfo('STREAM', streamKey) as unknown[];
      
      if (!streamInfo || streamInfo.length === 0) {
        return {
          streamLength: 0,
          firstEntryId: null,
          lastEntryId: null,
          consumerGroups: 0
        };
      }

      const streamLength = (streamInfo.find((info: unknown) => 
        Array.isArray(info) && info[0] === 'length'
      ) as [string, number] | undefined)?.[1] ?? 0;

      const firstEntryId = (streamInfo.find((info: unknown) => 
        Array.isArray(info) && info[0] === 'first-entry'
      ) as [string, string] | undefined)?.[1] ?? null;

      const lastEntryId = (streamInfo.find((info: unknown) => 
        Array.isArray(info) && info[0] === 'last-entry'
      ) as [string, string] | undefined)?.[1] ?? null;

      const consumerGroups = (streamInfo.find((info: unknown) => 
        Array.isArray(info) && info[0] === 'groups'
      ) as [string, number] | undefined)?.[1] ?? 0;

      return {
        streamLength,
        firstEntryId,
        lastEntryId,
        consumerGroups
      };

    } catch (error) {
      this.logger.error('Failed to get stream stats', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate backfill request
   */
  private validateBackfillRequest(request: EventBackfillRequest): void {
    if (!request.tenantId) {
      throw new Error('Tenant ID is required for backfill request');
    }

    if (!request.fromTimestamp) {
      throw new Error('From timestamp is required for backfill request');
    }

    if (request.toTimestamp && request.toTimestamp <= request.fromTimestamp) {
      throw new Error('To timestamp must be after from timestamp');
    }

    if (request.limit && request.limit > this.maxBackfillSize) {
      throw new Error(`Limit cannot exceed maximum backfill size of ${this.maxBackfillSize}`);
    }
  }

  /**
   * Calculate backfill range
   */
  private calculateBackfillRange(request: EventBackfillRequest, _streamLength: number): {
    start: string;
    end: string;
  } {
    // For simplicity, we'll use timestamp-based range
    // In production, you might want to use entry IDs for more precise control
    const start = this.timestampToStreamId(request.fromTimestamp);
    const end = request.toTimestamp ? 
      this.timestampToStreamId(request.toTimestamp) : 
      '+';

    return { start, end };
  }

  /**
   * Read events from stream
   */
  private async readEventsFromStream(
    streamKey: string, 
    range: { start: string; end: string }
  ): Promise<EventEnvelope[]> {
    const entries = await this.redis.xrange(streamKey, range.start, range.end, 'COUNT', this.batchSize);
    
    const events: EventEnvelope[] = [];
    
    for (const [entryId, fields] of entries) {
      try {
        const eventData = fields.find((field: unknown) => 
          Array.isArray(field) && field[0] === 'event'
        )?.[1];

        if (eventData) {
          const event = JSON.parse(eventData) as EventEnvelope;
          events.push(event);
        }
      } catch (error) {
        this.logger.warn('Failed to parse event from stream', {
          streamKey,
          entryId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return events;
  }

  /**
   * Filter events by criteria
   */
  private filterEvents(events: EventEnvelope[], request: EventBackfillRequest): EventEnvelope[] {
    return events.filter(event => {
      // Filter by event types
      if (request.eventTypes && request.eventTypes.length > 0) {
        if (!request.eventTypes.includes(event.type)) {
          return false;
        }
      }

      // Filter by timestamp range
      const eventTimestamp = new Date(event.timestamp);
      if (eventTimestamp < request.fromTimestamp) {
        return false;
      }

      if (request.toTimestamp && eventTimestamp > request.toTimestamp) {
        return false;
      }

      return true;
    });
  }

  /**
   * Apply limit to events
   */
  private applyLimit(events: EventEnvelope[], limit?: number): EventEnvelope[] {
    if (!limit) {
      return events;
    }

    return events.slice(0, limit);
  }

  /**
   * Determine if there are more events
   */
  private determineHasMore(
    filteredEvents: EventEnvelope[], 
    limitedEvents: EventEnvelope[], 
    limit?: number
  ): boolean {
    if (!limit) {
      return false;
    }

    return filteredEvents.length > limitedEvents.length;
  }

  /**
   * Generate next cursor
   */
  private generateNextCursor(events: EventEnvelope[]): string {
    if (events.length === 0) {
      return '0-0';
    }

    const lastEvent = events[events.length - 1]!;
    return this.timestampToStreamId(new Date(lastEvent.timestamp));
  }

  /**
   * Convert timestamp to stream ID
   */
  private timestampToStreamId(timestamp: Date): string {
    return `${timestamp.getTime()}-0`;
  }

  /**
   * Get tenant stream key
   */
  private getTenantStreamKey(tenantId: string): string {
    return `events:stream:${tenantId}`;
  }

  /**
   * Get stream position key
   */
  private getStreamPositionKey(tenantId: string): string {
    return `events:position:${tenantId}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `backfill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
