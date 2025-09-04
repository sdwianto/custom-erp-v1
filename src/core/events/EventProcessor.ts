import type { Redis } from 'ioredis';
import type { Logger } from '../services/Logger';
import type { EventHandlerRegistry } from './EventHandlerRegistry';
import { 
  type EventEnvelope, 
  type EventHandler, 
  type EventProcessingContext, 
  type DeadLetterQueueEntry,
  type EventMetrics 
} from './types';

/**
 * Event Processor Implementation
 * Follows Implementation Guide requirements for async event processing
 */
export class EventProcessor {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly handlerRegistry: EventHandlerRegistry;
  private readonly tenantId: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly deadLetterQueueEnabled: boolean;
  
  private metrics: EventMetrics = {
    totalEvents: 0,
    processedEvents: 0,
    failedEvents: 0,
    averageProcessingTime: 0,
    eventsPerSecond: 0,
    lastProcessedAt: new Date()
  };

  constructor(
    redis: Redis,
    logger: Logger,
    handlerRegistry: EventHandlerRegistry,
    tenantId: string,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      deadLetterQueueEnabled?: boolean;
    } = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.handlerRegistry = handlerRegistry;
    this.tenantId = tenantId;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.deadLetterQueueEnabled = options.deadLetterQueueEnabled ?? true;
  }

  /**
   * Process single event
   * Implementation Guide: Async event processing dengan error handling
   */
  async processEvent(event: EventEnvelope): Promise<void> {
    const startTime = Date.now();
    const context: EventProcessingContext = {
      correlationId: event.correlationId ?? this.generateCorrelationId(),
      tenantId: event.tenantId,
      userId: this.extractUserIdFromEvent(event),
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.maxRetries
    };

    try {
      this.metrics.totalEvents++;
      
      this.logger.info('Processing event', {
        correlationId: context.correlationId,
        tenantId: context.tenantId,
        eventId: event.id,
        eventType: event.type,
        entity: event.entity,
        entityId: event.entityId
      });

      // Get handlers for this event type
      const handlers = this.handlerRegistry.getHandlers(event.type);
      
      if (handlers.length === 0) {
        this.logger.warn('No handlers found for event type', {
          correlationId: context.correlationId,
          eventType: event.type
        });
        return;
      }

      // Process with all handlers
      await this.processWithHandlers(event, handlers, context);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime);
      
      this.metrics.processedEvents++;
      this.metrics.lastProcessedAt = new Date();

      this.logger.info('Event processed successfully', {
        correlationId: context.correlationId,
        eventId: event.id,
        eventType: event.type,
        processingTime,
        handlerCount: handlers.length
      });

    } catch (error) {
      this.metrics.failedEvents++;
      
      this.logger.error('Failed to process event', {
        correlationId: context.correlationId,
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Send to dead letter queue if enabled
      if (this.deadLetterQueueEnabled) {
        await this.sendToDeadLetterQueue(event, error, context);
      }

      throw error;
    }
  }

  /**
   * Process batch events
   * Implementation Guide: Batch processing untuk high-volume operations
   */
  async processBatchEvents(events: EventEnvelope[]): Promise<void> {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId();
    
    this.logger.info('Processing batch events', {
      correlationId,
      tenantId: this.tenantId,
      eventCount: events.length
    });

    const results = await Promise.allSettled(
      events.map(event => this.processEvent(event))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    const processingTime = Date.now() - startTime;
    
    this.logger.info('Batch events processed', {
      correlationId,
      tenantId: this.tenantId,
      totalEvents: events.length,
      successful,
      failed,
      processingTime
    });
  }

  /**
   * Process with handlers
   * Implementation Guide: Event retry mechanism
   */
  private async processWithHandlers(
    event: EventEnvelope,
    handlers: EventHandler[],
    context: EventProcessingContext
  ): Promise<void> {
    for (const handler of handlers) {
      await this.processWithHandler(event, handler, context);
    }
  }

  /**
   * Process with single handler
   * Implementation Guide: Retry mechanism dengan exponential backoff
   */
  private async processWithHandler(
    event: EventEnvelope,
    handler: EventHandler,
    context: EventProcessingContext
  ): Promise<void> {
    let retryCount = 0;
    const maxRetries = handler.maxRetries ?? this.maxRetries;

    while (retryCount <= maxRetries) {
      try {
        await handler.handle(event);
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          this.logger.error('Handler failed after max retries', {
            correlationId: context.correlationId,
            eventId: event.id,
            eventType: event.type,
            handlerEventType: handler.eventType,
            retryCount,
            maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }

        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, retryCount - 1);
        
        this.logger.warn('Handler failed, retrying', {
          correlationId: context.correlationId,
          eventId: event.id,
          eventType: event.type,
          handlerEventType: handler.eventType,
          retryCount,
          maxRetries,
          delay,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await this.sleep(delay);
      }
    }
  }

  /**
   * Send to dead letter queue
   * Implementation Guide: Dead letter queue untuk failed events
   */
  private async sendToDeadLetterQueue(
    event: EventEnvelope,
    error: unknown,
    context: EventProcessingContext
  ): Promise<void> {
    const dlqEntry: DeadLetterQueueEntry = {
      id: this.generateCorrelationId(),
      event,
      error: error instanceof Error ? error.message : 'Unknown error',
      retryCount: context.retryCount,
      maxRetries: context.maxRetries,
      timestamp: new Date(),
      tenantId: context.tenantId
    };

    const dlqKey = `dlq:${context.tenantId}`;
    await this.redis.lpush(dlqKey, JSON.stringify(dlqEntry));

    this.logger.warn('Event sent to dead letter queue', {
      correlationId: context.correlationId,
      eventId: event.id,
      eventType: event.type,
      dlqEntryId: dlqEntry.id,
      error: dlqEntry.error
    });
  }

  /**
   * Update processing metrics
   * Implementation Guide: Performance monitoring
   */
  private updateMetrics(processingTime: number): void {
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.processedEvents - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.processedEvents;
    
    // Calculate events per second (simple moving average)
    const now = Date.now();
    const timeDiff = now - this.metrics.lastProcessedAt.getTime();
    if (timeDiff > 0) {
      this.metrics.eventsPerSecond = 1000 / timeDiff;
    }
  }

  /**
   * Get processing metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      averageProcessingTime: 0,
      eventsPerSecond: 0,
      lastProcessedAt: new Date()
    };
  }

  /**
   * Extract user ID from event
   */
  private extractUserIdFromEvent(event: EventEnvelope): string | undefined {
    return (event.metadata?.userId as string) ?? 
           (event.payload?.userId as string) ?? 
           event.payload?.createdBy as string;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
