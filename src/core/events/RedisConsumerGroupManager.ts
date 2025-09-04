import type { Redis } from 'ioredis';
import type { Logger } from '../services/Logger';
import type { EventEnvelope } from './types';

/**
 * Redis Consumer Group Manager
 * Implementation Guide: Consumer groups untuk load balancing
 */
export class RedisConsumerGroupManager {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly tenantId: string;
  private readonly consumerGroupName: string;
  private readonly consumerName: string;
  private readonly batchSize: number;
  private readonly blockTime: number;

  constructor(
    redis: Redis,
    logger: Logger,
    tenantId: string,
    options: {
      consumerGroupName?: string;
      consumerName?: string;
      batchSize?: number;
      blockTime?: number;
    } = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.tenantId = tenantId;
    this.consumerGroupName = options.consumerGroupName ?? 'event-processors';
    this.consumerName = options.consumerName ?? `consumer-${Date.now()}`;
    this.batchSize = options.batchSize ?? 10;
    this.blockTime = options.blockTime ?? 1000;
  }

  /**
   * Create consumer group for tenant stream
   * Implementation Guide: Consumer groups untuk load balancing
   */
  async createConsumerGroup(streamKey: string, startId = '0'): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', streamKey, this.consumerGroupName, startId, 'MKSTREAM');
      
      this.logger.info('Consumer group created', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        startId
      });
    } catch (error) {
      // Consumer group might already exist
      if (error instanceof Error && error.message.includes('BUSYGROUP')) {
        this.logger.info('Consumer group already exists', {
          tenantId: this.tenantId,
          streamKey,
          consumerGroupName: this.consumerGroupName
        });
      } else {
        this.logger.error('Failed to create consumer group', {
          tenantId: this.tenantId,
          streamKey,
          consumerGroupName: this.consumerGroupName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    }
  }

  /**
   * Read events from consumer group
   * Implementation Guide: Load balancing dengan consumer groups
   */
  async readEventsFromGroup(streamKey: string): Promise<EventEnvelope[]> {
    try {
      const messages = await this.redis.xreadgroup(
        'GROUP',
        this.consumerGroupName,
        this.consumerName,
        'COUNT',
        this.batchSize,
        'BLOCK',
        this.blockTime,
        'STREAMS',
        streamKey,
        '>'
      );

      if (!messages || messages.length === 0) {
        return [];
      }

      const events: EventEnvelope[] = [];
      
      for (const [, streamMessages] of messages as unknown[][]) {
        for (const [messageId, fields] of streamMessages as unknown[][]) {
          try {
            const eventData = (fields as unknown[]).find((field: unknown) => 
              Array.isArray(field) && field[0] === 'event'
            ) as [string, string] | undefined;
            const eventDataString = eventData?.[1];

            if (eventDataString) {
              const event = JSON.parse(eventDataString) as EventEnvelope;
              events.push(event);
              
              // Acknowledge message processing
              await this.acknowledgeMessage(streamKey, messageId as string);
            }
          } catch (error) {
            this.logger.warn('Failed to parse event from consumer group', {
              tenantId: this.tenantId,
              streamKey,
              messageId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      this.logger.debug('Read events from consumer group', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        consumerName: this.consumerName,
        eventCount: events.length
      });

      return events;

    } catch (error) {
      this.logger.error('Failed to read events from consumer group', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        consumerName: this.consumerName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Acknowledge message processing
   * Implementation Guide: Message acknowledgment untuk reliability
   */
  async acknowledgeMessage(streamKey: string, messageId: string): Promise<void> {
    try {
      await this.redis.xack(streamKey, this.consumerGroupName, messageId);
      
      this.logger.debug('Message acknowledged', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        messageId
      });
    } catch (error) {
      this.logger.error('Failed to acknowledge message', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get consumer group info
   * Implementation Guide: Monitoring consumer group health
   */
  async getConsumerGroupInfo(streamKey: string): Promise<{
    name: string;
    consumers: number;
    pending: number;
    lastDeliveredId: string;
  }> {
    try {
      const groups = await this.redis.xinfo('GROUPS', streamKey) as unknown[];
      
      const groupInfo = groups.find((group: unknown) => 
        Array.isArray(group) && group[0] === 'name' && group[1] === this.consumerGroupName
      );

      if (!groupInfo) {
        throw new Error(`Consumer group ${this.consumerGroupName} not found`);
      }

      const consumers = (groups.find((group: unknown) => 
        Array.isArray(group) && group[0] === 'consumers'
      ) as [string, number] | undefined)?.[1] ?? 0;

      const pending = (groups.find((group: unknown) => 
        Array.isArray(group) && group[0] === 'pending'
      ) as [string, number] | undefined)?.[1] ?? 0;

      const lastDeliveredId = (groups.find((group: unknown) => 
        Array.isArray(group) && group[0] === 'last-delivered-id'
      ) as [string, string] | undefined)?.[1] ?? '0-0';

      return {
        name: this.consumerGroupName,
        consumers,
        pending,
        lastDeliveredId
      };

    } catch (error) {
      this.logger.error('Failed to get consumer group info', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get pending messages for consumer
   * Implementation Guide: Handle failed message processing
   */
  async getPendingMessages(streamKey: string): Promise<Array<{
    messageId: string;
    consumer: string;
    idleTime: number;
    deliveryCount: number;
  }>> {
    try {
      const pending = await this.redis.xpending(
        streamKey,
        this.consumerGroupName,
        '-',
        '+',
        this.batchSize
      );

      const messages: Array<{
        messageId: string;
        consumer: string;
        idleTime: number;
        deliveryCount: number;
      }> = [];

      for (const [messageId, consumer, idleTime, deliveryCount] of pending as unknown[][]) {
        messages.push({
          messageId: messageId as string,
          consumer: consumer as string,
          idleTime: idleTime as number,
          deliveryCount: deliveryCount as number
        });
      }

      return messages;

    } catch (error) {
      this.logger.error('Failed to get pending messages', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Claim pending messages
   * Implementation Guide: Retry failed message processing
   */
  async claimPendingMessages(
    streamKey: string,
    minIdleTime = 60000
  ): Promise<EventEnvelope[]> {
    try {
      const claimed = await this.redis.xclaim(
        streamKey,
        this.consumerGroupName,
        this.consumerName,
        minIdleTime,
        '0-0',
        'COUNT',
        this.batchSize
      );

      const events: EventEnvelope[] = [];

      for (const [messageId, fields] of claimed as unknown[][]) {
        try {
          const eventData = (fields as unknown[]).find((field: unknown) => 
            Array.isArray(field) && field[0] === 'event'
          ) as [string, string] | undefined;
          const eventDataString = eventData?.[1];

          if (eventDataString) {
            const event = JSON.parse(eventDataString) as EventEnvelope;
            events.push(event);
          }
        } catch (error) {
          this.logger.warn('Failed to parse claimed event', {
            tenantId: this.tenantId,
            streamKey,
            messageId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.info('Claimed pending messages', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        consumerName: this.consumerName,
        claimedCount: events.length
      });

      return events;

    } catch (error) {
      this.logger.error('Failed to claim pending messages', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        consumerName: this.consumerName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete consumer group
   * Implementation Guide: Cleanup consumer groups
   */
  async deleteConsumerGroup(streamKey: string): Promise<void> {
    try {
      await this.redis.xgroup('DESTROY', streamKey, this.consumerGroupName);
      
      this.logger.info('Consumer group deleted', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName
      });
    } catch (error) {
      this.logger.error('Failed to delete consumer group', {
        tenantId: this.tenantId,
        streamKey,
        consumerGroupName: this.consumerGroupName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get tenant stream key
   */
  private getTenantStreamKey(): string {
    return `events:stream:${this.tenantId}`;
  }
}
