/**
 * Redis Streams Integration
 * Production-ready Redis Streams implementation for offline sync
 */

import type { Redis } from 'ioredis';
import { ulid } from 'ulid';
import type { EventEnvelope } from '../events/types';

export interface StreamEvent {
  id: string;
  type: string;
  entity: string;
  entityId: string;
  version: number;
  timestamp: string;
  payload: unknown;
  tenantId: string;
  userId?: string;
}

export interface StreamCursor {
  stream: string;
  cursor: string;
  lastEventId: string;
}

export class RedisStreamsIntegration {
  private readonly redis: Redis;
  private readonly tenantId: string;

  constructor(redis: Redis, tenantId: string) {
    this.redis = redis;
    this.tenantId = tenantId;
  }

  /**
   * Get stream name for tenant
   */
  private getStreamName(): string {
    return `tenant:${this.tenantId}:events`;
  }

  /**
   * Get consumer group name
   */
  private getConsumerGroupName(): string {
    return `tenant:${this.tenantId}:sync`;
  }

  /**
   * Publish event to stream
   */
  async publishEvent(event: EventEnvelope): Promise<string> {
    const streamName = this.getStreamName();
    const eventId = ulid();
    
    const streamData = {
      id: eventId,
      type: event.type,
      entity: event.entity,
      entityId: event.entityId,
      version: event.version,
      timestamp: event.timestamp,
      payload: JSON.stringify(event.payload),
      tenantId: this.tenantId,
      userId: event.metadata?.userId ?? ''
    };

    const result = await this.redis.xadd(
      streamName,
      '*',
      'event', JSON.stringify(streamData)
    );

    return result ?? '';
  }

  /**
   * Read events from stream with cursor
   */
  async readEvents(cursor = '0-0', limit = 100): Promise<{
    events: StreamEvent[];
    nextCursor: string;
  }> {
    const streamName = this.getStreamName();
    const consumerGroup = this.getConsumerGroupName();

    try {
      // Ensure consumer group exists
      await this.ensureConsumerGroup(streamName, consumerGroup);
      
      // Read from stream
      const results = await this.redis.xreadgroup(
        'GROUP', consumerGroup, 'sync-client',
        'COUNT', limit,
        'STREAMS', streamName, cursor
      );

      if (!results || results.length === 0) {
        return { events: [], nextCursor: cursor };
      }

      const streamResults = results[0] as unknown[];
      const events: StreamEvent[] = [];
      let nextCursor = cursor;

      for (const [, messages] of streamResults as [string, unknown[]][]) {
        for (const [messageId, fields] of messages as [string, unknown[]][]) {
          try {
            const eventData = JSON.parse((fields[1] as string) ?? '{}') as Record<string, unknown>;
            events.push({
              id: eventData.id as string,
              type: eventData.type as string,
              entity: eventData.entity as string,
              entityId: eventData.entityId as string,
              version: eventData.version as number,
              timestamp: eventData.timestamp as string,
              payload: JSON.parse((eventData.payload as string) ?? '{}'),
              tenantId: eventData.tenantId as string,
              userId: eventData.userId as string
            });
            nextCursor = messageId;
          } catch (error) {
            console.error('Failed to parse stream event:', error);
          }
        }
      }

      return { events, nextCursor };
    } catch (error) {
      console.error('Failed to read from stream:', error);
      return { events: [], nextCursor: cursor };
    }
  }

  /**
   * Acknowledge processed events
   */
  async acknowledgeEvents(messageIds: string[]): Promise<void> {
    const streamName = this.getStreamName();
    const consumerGroup = this.getConsumerGroupName();

    if (messageIds.length === 0) return;

    await this.redis.xack(streamName, consumerGroup, ...messageIds);
  }

  /**
   * Get stream info
   */
  async getStreamInfo(): Promise<{
    length: number;
    firstEntry: string | null;
    lastEntry: string | null;
    consumerGroups: number;
  }> {
    const streamName = this.getStreamName();
    
    try {
      const info = await this.redis.xinfo('STREAM', streamName) as unknown[];
      
      return {
        length: info[1] as number,
        firstEntry: info[3] as string | null,
        lastEntry: info[5] as string | null,
        consumerGroups: info[7] as number
      };
    } catch (error) {
      console.error('Failed to get stream info:', error);
      return {
        length: 0,
        firstEntry: null,
        lastEntry: null,
        consumerGroups: 0
      };
    }
  }

  /**
   * Ensure consumer group exists
   */
  private async ensureConsumerGroup(streamName: string, consumerGroup: string): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', streamName, consumerGroup, '0', 'MKSTREAM');
    } catch (error) {
      // Consumer group already exists, ignore error
      if (!(error as Error).message.includes('BUSYGROUP')) {
        console.error('Failed to create consumer group:', error);
      }
    }
  }

  /**
   * Get pending messages for consumer
   */
  async getPendingMessages(consumerName = 'sync-client'): Promise<{
    messageId: string;
    idleTime: number;
    deliveryCount: number;
  }[]> {
    const streamName = this.getStreamName();
    const consumerGroup = this.getConsumerGroupName();

    try {
      const pending = await this.redis.xpending(streamName, consumerGroup, '-', '+', 100, consumerName);
      
      const result: { messageId: string; idleTime: number; deliveryCount: number; }[] = [];
      for (const item of pending) {
        const [messageId, , idleTime, deliveryCount] = item as [string, string, string, string];
        result.push({
          messageId,
          idleTime: parseInt(idleTime),
          deliveryCount: parseInt(deliveryCount)
        });
      }
      return result;
    } catch (error) {
      console.error('Failed to get pending messages:', error);
      return [];
    }
  }

  /**
   * Claim pending messages
   */
  async claimPendingMessages(
    minIdleTime = 60000, // 1 minute
    consumerName = 'sync-client'
  ): Promise<StreamEvent[]> {
    const streamName = this.getStreamName();
    const consumerGroup = this.getConsumerGroupName();

    try {
      const claimed = await this.redis.xclaim(
        streamName, consumerGroup, consumerName,
        minIdleTime, '0-0', 'COUNT', 100
      );

      const events: StreamEvent[] = [];
      
      for (const [, fields] of claimed as [string, unknown[]][]) {
        try {
          const eventData = JSON.parse((fields[1] as string) ?? '{}') as Record<string, unknown>;
          events.push({
            id: eventData.id as string,
            type: eventData.type as string,
            entity: eventData.entity as string,
            entityId: eventData.entityId as string,
            version: eventData.version as number,
            timestamp: eventData.timestamp as string,
            payload: JSON.parse((eventData.payload as string) ?? '{}'),
            tenantId: eventData.tenantId as string,
            userId: eventData.userId as string
          });
        } catch (error) {
          console.error('Failed to parse claimed event:', error);
        }
      }

      return events;
    } catch (error) {
      console.error('Failed to claim pending messages:', error);
      return [];
    }
  }

  /**
   * Clean up old messages
   */
  async cleanupOldMessages(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const streamName = this.getStreamName();
    const cutoffTime = Date.now() - maxAge;
    const cutoffId = `${cutoffTime}-0`;

    try {
      const result = await this.redis.xtrim(streamName, 'MINID', cutoffId);
      return result;
    } catch (error) {
      console.error('Failed to cleanup old messages:', error);
      return 0;
    }
  }

  /**
   * Get consumer group info
   */
  async getConsumerGroupInfo(): Promise<{
    name: string;
    consumers: number;
    pending: number;
    lastDeliveredId: string;
  }[]> {
    const streamName = this.getStreamName();

    try {
      const groups = await this.redis.xinfo('GROUPS', streamName) as unknown[];
      const result = [];

      for (let i = 0; i < groups.length; i += 6) {
        result.push({
          name: groups[i + 1] as string,
          consumers: groups[i + 3] as number,
          pending: groups[i + 5] as number,
          lastDeliveredId: groups[i + 7] as string
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to get consumer group info:', error);
      return [];
    }
  }
}
