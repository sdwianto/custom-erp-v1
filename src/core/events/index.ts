/**
 * Event System Index
 * Enterprise-grade event-driven architecture for NextGen ERP
 * Follows Implementation Guide and JDE Knowledge Recommendations
 */

// Core Types
export type {
  EventEnvelope,
  EventPublisher as IEventPublisher,
  EventHandler,
  EventHandlerRegistry as IEventHandlerRegistry,
  EventValidationResult,
  EventProcessingContext,
  DeadLetterQueueEntry,
  EventStreamPosition,
  EventBackfillRequest,
  EventBackfillResult,
  EventMetrics,
  EventConfiguration
} from './types';

// Core Services
export { EventPublisher } from './EventPublisher';
export { EventHandlerRegistry } from './EventHandlerRegistry';
export { EventProcessor } from './EventProcessor';
export { EventValidator } from './EventValidator';
export { EventBackfillService } from './EventBackfillService';
export { SSEService } from './SSEService';
export { EventDeduplicationService } from './EventDeduplicationService';
export { EventManager } from './EventManager';

// Advanced Redis Services
export { RedisConsumerGroupManager } from './RedisConsumerGroupManager';
export { RedisClusterManager } from './RedisClusterManager';
export { RedisSentinelManager } from './RedisSentinelManager';

// Legacy EventBus (for backward compatibility)
export { EventBus } from './EventBus';
export type { DomainEvent, EventSubscription, EventFilter } from './EventBus';
