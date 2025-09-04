/**
 * Event System Core Types
 * Follows Implementation Guide requirements for Event-Driven Architecture
 */

/**
 * Event Envelope Structure
 * Implementation Guide: Event envelope dengan ULID, tenant scoping, versioning
 */
export interface EventEnvelope {
  id: string;                    // ULID
  tenantId: string;             // Tenant identifier
  type: string;                 // Event type (e.g., 'inventory.item.created')
  entity: string;               // Entity name (e.g., 'Item')
  entityId: string;             // Entity ID
  version: number;              // Entity version
  timestamp: string;            // ISO timestamp
  payload: Record<string, unknown>; // Event data
  correlationId?: string;       // Request correlation
  metadata?: Record<string, unknown>; // Additional metadata
}

/**
 * Event Publisher Interface
 * Implementation Guide: Event publishing dengan tenant scoping
 */
export interface EventPublisher {
  publishTenantEvent(tenantId: string, eventType: string, payload: unknown): Promise<void>;
  publishBatchEvents(events: EventEnvelope[]): Promise<void>;
  publishSystemEvent(eventType: string, payload: unknown): Promise<void>;
}

/**
 * Event Handler Interface
 * Implementation Guide: Async event processing dengan error handling
 */
export interface EventHandler {
  eventType: string;
  handle(event: EventEnvelope): Promise<void>;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Event Handler Registry
 * Implementation Guide: Event handler registry untuk async processing
 */
export interface EventHandlerRegistry {
  register(handler: EventHandler): void;
  unregister(eventType: string): void;
  getHandlers(eventType: string): EventHandler[];
  getAllHandlers(): EventHandler[];
}

/**
 * Event Validation Result
 * Implementation Guide: Event validation dengan schema validation
 */
export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Event Processing Context
 * Implementation Guide: Context untuk event processing pipeline
 */
export interface EventProcessingContext {
  correlationId: string;
  tenantId: string;
  userId?: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * Dead Letter Queue Entry
 * Implementation Guide: Dead letter queue untuk failed events
 */
export interface DeadLetterQueueEntry {
  id: string;
  event: EventEnvelope;
  error: string;
  retryCount: number;
  maxRetries: number;
  timestamp: Date;
  tenantId: string;
}

/**
 * Event Stream Position
 * Implementation Guide: Cursor tracking untuk Redis Streams
 */
export interface EventStreamPosition {
  streamId: string;
  position: string;
  timestamp: Date;
}

/**
 * Event Backfill Request
 * Implementation Guide: Backfill mechanism untuk Redis Streams
 */
export interface EventBackfillRequest {
  tenantId: string;
  fromTimestamp: Date;
  toTimestamp?: Date;
  eventTypes?: string[];
  limit?: number;
}

/**
 * Event Backfill Result
 * Implementation Guide: Backfill result dengan ordered delivery
 */
export interface EventBackfillResult {
  events: EventEnvelope[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount: number;
}

/**
 * Event Metrics
 * Implementation Guide: Performance monitoring untuk event processing
 */
export interface EventMetrics {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  eventsPerSecond: number;
  lastProcessedAt: Date;
}

/**
 * Event Configuration
 * Implementation Guide: Configuration untuk event system
 */
export interface EventConfiguration {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  deadLetterQueueEnabled: boolean;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  maxEventSize: number;
  retentionPeriod: number; // in days
}

