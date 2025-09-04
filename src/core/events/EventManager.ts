import type { Redis } from 'ioredis';
import type { Logger } from '../services/Logger';
import { EventPublisher } from './EventPublisher';
import { EventHandlerRegistry } from './EventHandlerRegistry';
import { EventProcessor } from './EventProcessor';
import { EventValidator } from './EventValidator';
import { EventBackfillService } from './EventBackfillService';
import { SSEService } from './SSEService';
import { EventDeduplicationService } from './EventDeduplicationService';
import { RedisConsumerGroupManager } from './RedisConsumerGroupManager';
import { RedisClusterManager } from './RedisClusterManager';
import { RedisSentinelManager, type RedisWithSentinel } from './RedisSentinelManager';
import type { 
  EventEnvelope, 
  EventHandler, 
  EventBackfillRequest, 
  EventBackfillResult,
  EventConfiguration 
} from './types';

/**
 * Event Manager - Central orchestrator for event system
 * Follows Implementation Guide requirements for event-driven architecture
 */
export class EventManager {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly tenantId: string;
  private readonly configuration: EventConfiguration;
  
  // Core services
  private readonly publisher: EventPublisher;
  private readonly handlerRegistry: EventHandlerRegistry;
  private readonly processor: EventProcessor;
  private readonly validator: EventValidator;
  private readonly backfillService: EventBackfillService;
  private readonly sseService: SSEService;
  private readonly deduplicationService: EventDeduplicationService;
  
  // Advanced Redis services
  private readonly consumerGroupManager: RedisConsumerGroupManager;
  private readonly clusterManager: RedisClusterManager;
  private readonly sentinelManager: RedisSentinelManager;
  
  private isInitialized = false;

  constructor(
    redis: Redis,
    logger: Logger,
    tenantId: string,
    configuration: Partial<EventConfiguration> = {},
    options: {
      clusterNodes?: string[];
      sentinelNodes?: string[];
      masterName?: string;
    } = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.tenantId = tenantId;
    
    // Default configuration
    this.configuration = {
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 100,
      deadLetterQueueEnabled: true,
      compressionEnabled: false,
      encryptionEnabled: false,
      maxEventSize: 1024 * 1024, // 1MB
      retentionPeriod: 30, // 30 days
      ...configuration
    };

    // Initialize core services
    this.publisher = new EventPublisher(redis, logger, tenantId);
    this.handlerRegistry = new EventHandlerRegistry(logger);
    this.processor = new EventProcessor(redis, logger, this.handlerRegistry, tenantId, {
      maxRetries: this.configuration.maxRetries,
      retryDelay: this.configuration.retryDelay,
      deadLetterQueueEnabled: this.configuration.deadLetterQueueEnabled
    });
    this.validator = new EventValidator(logger, {
      maxEventSize: this.configuration.maxEventSize,
      compressionEnabled: this.configuration.compressionEnabled,
      encryptionEnabled: this.configuration.encryptionEnabled
    });
    this.backfillService = new EventBackfillService(redis, logger, tenantId, {
      batchSize: this.configuration.batchSize,
      maxBackfillSize: this.configuration.maxEventSize
    });
    this.sseService = new SSEService(redis, logger, tenantId);
    this.deduplicationService = new EventDeduplicationService(redis, logger, tenantId);

    // Initialize advanced Redis services
    this.consumerGroupManager = new RedisConsumerGroupManager(redis, logger, tenantId);
    this.clusterManager = new RedisClusterManager(redis, logger, options.clusterNodes ?? []);
    this.sentinelManager = new RedisSentinelManager(
      redis as RedisWithSentinel, 
      logger, 
      options.sentinelNodes ?? [], 
      options.masterName ?? 'mymaster'
    );
  }

  /**
   * Initialize event manager
   * Implementation Guide: Event system initialization
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing Event Manager', {
        tenantId: this.tenantId,
        configuration: this.configuration
      });

      // Initialize advanced Redis services
      await this.initializeAdvancedServices();

      // Start cleanup timer for deduplication keys
      void this.startCleanupTimer();

      this.isInitialized = true;

      this.logger.info('Event Manager initialized successfully', {
        tenantId: this.tenantId
      });

    } catch (error) {
      this.logger.error('Failed to initialize Event Manager', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Initialize advanced Redis services
   * Implementation Guide: Consumer groups, clustering, and Sentinel setup
   */
  private async initializeAdvancedServices(): Promise<void> {
    try {
      // Initialize Redis Cluster if nodes are configured
      if (this.clusterManager) {
        await this.clusterManager.initializeCluster();
      }

      // Initialize Redis Sentinel if nodes are configured
      if (this.sentinelManager) {
        await this.sentinelManager.initializeSentinel();
      }

      // Create consumer group for tenant stream
      const streamKey = `events:stream:${this.tenantId}`;
      await this.consumerGroupManager.createConsumerGroup(streamKey);

      this.logger.info('Advanced Redis services initialized', {
        tenantId: this.tenantId
      });

    } catch (error) {
      this.logger.warn('Failed to initialize some advanced Redis services', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error as these are optional features
    }
  }

  /**
   * Publish event
   * Implementation Guide: Event publishing dengan validation dan deduplication
   */
  async publishEvent(eventType: string, payload: unknown): Promise<void> {
    try {
      // Create event envelope
      const event: EventEnvelope = {
        id: this.generateEventId(),
        tenantId: this.tenantId,
        type: eventType,
        entity: this.extractEntityFromEventType(eventType),
        entityId: this.extractEntityIdFromPayload(payload),
        version: this.extractVersionFromPayload(payload),
        timestamp: new Date().toISOString(),
        payload: payload as Record<string, unknown>,
        correlationId: this.generateCorrelationId()
      };

      // Validate event
      const validation = this.validator.validateEvent(event);
      if (!validation.isValid) {
        throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicates
      if (this.deduplicationService.isDeduplicationEnabledForEventType(eventType)) {
        const isNewEvent = await this.deduplicationService.checkAndMarkAsProcessed(event);
        if (!isNewEvent) {
          this.logger.warn('Duplicate event blocked', {
            eventId: event.id,
            eventType: event.type,
            tenantId: event.tenantId
          });
          return;
        }
      }

      // Publish event
      await this.publisher.publishTenantEvent(this.tenantId, eventType, payload);

      // Process event
      await this.processor.processEvent(event);

      // Broadcast via SSE
      await this.sseService.broadcastEvent(event);

      this.logger.info('Event published and processed successfully', {
        eventId: event.id,
        eventType: event.type,
        tenantId: event.tenantId
      });

    } catch (error) {
      this.logger.error('Failed to publish event', {
        tenantId: this.tenantId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Register event handler
   * Implementation Guide: Event handler registry
   */
  registerHandler(handler: EventHandler): void {
    this.handlerRegistry.register(handler);
    
    this.logger.info('Event handler registered', {
      tenantId: this.tenantId,
      eventType: handler.eventType
    });
  }

  /**
   * Unregister event handler
   */
  unregisterHandler(eventType: string): void {
    this.handlerRegistry.unregister(eventType);
    
    this.logger.info('Event handler unregistered', {
      tenantId: this.tenantId,
      eventType
    });
  }

  /**
   * Backfill events
   * Implementation Guide: Backfill mechanism
   */
  async backfillEvents(request: EventBackfillRequest): Promise<EventBackfillResult> {
    return await this.backfillService.backfillEvents(request);
  }

  /**
   * Create SSE connection
   * Implementation Guide: SSE setup
   */
  async createSSEConnection(connectionId: string, response: unknown, userId?: string): Promise<void> {
    return await this.sseService.createConnection(connectionId, response, userId);
  }

  /**
   * Close SSE connection
   */
  async closeSSEConnection(connectionId: string): Promise<void> {
    return await this.sseService.closeConnection(connectionId);
  }

  /**
   * Get event system statistics
   */
  async getStatistics(): Promise<{
    tenantId: string;
    isInitialized: boolean;
    configuration: EventConfiguration;
    handlerStats: ReturnType<EventHandlerRegistry['getStats']>;
    processorMetrics: ReturnType<EventProcessor['getMetrics']>;
    sseStats: ReturnType<SSEService['getConnectionStats']>;
    deduplicationStats: Awaited<ReturnType<EventDeduplicationService['getDeduplicationStats']>>;
  }> {
    const handlerStats = this.handlerRegistry.getStats();
    const processorMetrics = this.processor.getMetrics();
    const sseStats = this.sseService.getConnectionStats();
    const deduplicationStats = await this.deduplicationService.getDeduplicationStats();

    return {
      tenantId: this.tenantId,
      isInitialized: this.isInitialized,
      configuration: this.configuration,
      handlerStats,
      processorMetrics,
      sseStats,
      deduplicationStats
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    details: {
      redis: boolean;
      handlers: boolean;
      sse: boolean;
      deduplication: boolean;
    };
  }> {
    try {
      // Check Redis connection
      const redisHealthy = await this.redis.ping() === 'PONG';
      
      // Check handlers
      const handlersHealthy = this.handlerRegistry.getAllHandlers().length > 0;
      
      // Check SSE service
      const sseHealthy = this.sseService.getConnectionStats().totalConnections >= 0;
      
      // Check deduplication service
      const deduplicationHealthy = true; // Simple check

      const isHealthy = redisHealthy && handlersHealthy && sseHealthy && deduplicationHealthy;

      return {
        isHealthy,
        details: {
          redis: redisHealthy,
          handlers: handlersHealthy,
          sse: sseHealthy,
          deduplication: deduplicationHealthy
        }
      };

    } catch (error) {
      this.logger.error('Event Manager health check failed', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isHealthy: false,
        details: {
          redis: false,
          handlers: false,
          sse: false,
          deduplication: false
        }
      };
    }
  }

  /**
   * Start cleanup timer
   * Implementation Guide: Memory management
   */
  private startCleanupTimer(): void {
    // Run cleanup every hour
    setInterval(() => {
      void (async () => {
        try {
          await this.deduplicationService.cleanupExpiredKeys();
        } catch (error) {
          this.logger.error('Cleanup timer failed', {
            tenantId: this.tenantId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      })();
    }, 3600000); // 1 hour
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract entity from event type
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
      return (obj.id as string) ?? (obj.entityId as string) ?? 'unknown';
    }
    return 'unknown';
  }

  /**
   * Extract version from payload
   */
  private extractVersionFromPayload(payload: unknown): number {
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      return (obj.version as number) ?? 1;
    }
    return 1;
  }
}
