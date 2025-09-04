import { redis, redisPublisher, getTenantStreamKey, getTenantPubSubKey } from '../cache/redis';

// Event types
export interface DomainEvent {
  id: string;
  tenantId: string;
  type: string;
  entity: string;
  entityId: string;
  version: number;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface EventSubscription {
  id: string;
  tenantId: string;
  eventTypes?: string[];
  callback: (event: DomainEvent) => void | Promise<void>;
}

export interface EventFilter {
  tenantId: string;
  eventTypes?: string[];
  entityTypes?: string[];
  fromTimestamp?: Date;
  toTimestamp?: Date;
}

// Event Bus implementation
export class EventBus {
  private static instance: EventBus;
  private subscriptions = new Map<string, EventSubscription>();
  private isInitialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Initialize event bus
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test Redis connection
      await redis.ping();
      this.isInitialized = true;
      console.log('EventBus initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EventBus:', error);
      throw error;
    }
  }

  // Publish event to Redis Streams and Pub/Sub
  async publish(event: DomainEvent): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('EventBus not initialized');
    }

    try {
      const streamKey = getTenantStreamKey(event.tenantId);
      const pubSubKey = getTenantPubSubKey(event.tenantId);

      // Add to Redis Streams for persistence and replay
      const streamId = await redis.xadd(
        streamKey,
        '*',
        'event',
        JSON.stringify(event),
        'timestamp',
        event.timestamp.toISOString()
      );

      // Publish to Pub/Sub for real-time delivery
      await redisPublisher.publish(pubSubKey, JSON.stringify({
        ...event,
        streamId
      }));

      console.log(`Event published: ${event.type} (${event.entity}:${event.entityId})`);
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw error;
    }
  }

  // Subscribe to events
  async subscribe(subscription: EventSubscription): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('EventBus not initialized');
    }

    try {
      this.subscriptions.set(subscription.id, subscription);

      // Subscribe to Redis Pub/Sub for real-time events
      const pubSubKey = getTenantPubSubKey(subscription.tenantId);
      
      await redis.subscribe(pubSubKey, (err) => {
        if (err) {
          console.error('Redis subscription error:', err);
        }
      });

      // Handle incoming messages
      redis.on('message', (channel, message) => {
        if (channel === pubSubKey) {
          try {
            const event = JSON.parse(message) as DomainEvent;
            void this.handleEvent(subscription, event);
          } catch (parseError) {
            console.error('Failed to parse event message:', parseError);
          }
        }
      });

      console.log(`Subscription added: ${subscription.id} for tenant ${subscription.tenantId}`);
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    }
  }

  // Unsubscribe from events
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      const pubSubKey = getTenantPubSubKey(subscription.tenantId);
      await redis.unsubscribe(pubSubKey);
      this.subscriptions.delete(subscriptionId);
      console.log(`Subscription removed: ${subscriptionId}`);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }

  // Get events from Redis Streams (for backfill)
  async getEvents(filter: EventFilter, limit = 100): Promise<DomainEvent[]> {
    if (!this.isInitialized) {
      throw new Error('EventBus not initialized');
    }

    try {
      const streamKey = getTenantStreamKey(filter.tenantId);
      const events: DomainEvent[] = [];

      // Read from stream with optional filtering
      const streamData = await redis.xread(
        'COUNT',
        limit,
        'STREAMS',
        streamKey,
        '0'
      );

      if (streamData && streamData.length > 0) {
        const streamEntry = streamData[0];
        if (Array.isArray(streamEntry) && streamEntry.length >= 2) {
          const [, messages] = streamEntry;
          
          if (Array.isArray(messages)) {
            for (const message of messages) {
              if (Array.isArray(message) && message.length >= 2) {
                const [, fields] = message;
                const eventData = fields.find((field: unknown) => {
                  if (Array.isArray(field) && field.length >= 2) {
                    return field[0] === 'event';
                  }
                  return false;
                });
                if (eventData && Array.isArray(eventData) && eventData.length >= 2) {
                  const eventString = eventData[1];
                  if (typeof eventString === 'string') {
                    try {
                      const event: DomainEvent = JSON.parse(eventString);
                      
                      // Apply filters
                      if (this.matchesFilter(event, filter)) {
                        events.push(event);
                      }
                    } catch (parseError) {
                      console.error('Failed to parse event data:', parseError);
                    }
                  }
                }
              }
            }
          }
        }
      }

      return events;
    } catch (error) {
      console.error('Failed to get events:', error);
      throw error;
    }
  }

  // Get events from specific cursor (for pagination)
  async getEventsFromCursor(
    filter: EventFilter,
    cursor: string,
    limit = 100
  ): Promise<{ events: DomainEvent[]; nextCursor: string }> {
    if (!this.isInitialized) {
      throw new Error('EventBus not initialized');
    }

    try {
      const streamKey = getTenantStreamKey(filter.tenantId);
      const events: DomainEvent[] = [];

      // Read from stream starting from cursor
      const streamData = await redis.xread(
        'COUNT',
        limit,
        'STREAMS',
        streamKey,
        cursor
      );

      let nextCursor = cursor;

      if (streamData && streamData.length > 0) {
        const streamEntry = streamData[0];
        if (Array.isArray(streamEntry) && streamEntry.length >= 2) {
          const [, messages] = streamEntry;
          
          if (Array.isArray(messages)) {
            for (const message of messages) {
              if (Array.isArray(message) && message.length >= 2) {
                const [id, fields] = message;
                const eventData = fields.find((field: unknown) => {
                  if (Array.isArray(field) && field.length >= 2) {
                    return field[0] === 'event';
                  }
                  return false;
                });
                if (eventData && Array.isArray(eventData) && eventData.length >= 2) {
                  const eventString = eventData[1];
                  if (typeof eventString === 'string') {
                    try {
                      const event: DomainEvent = JSON.parse(eventString);
                      
                      // Apply filters
                      if (this.matchesFilter(event, filter)) {
                        events.push(event);
                      }
                    } catch (parseError) {
                      console.error('Failed to parse event data:', parseError);
                    }
                  }
                }
                nextCursor = id;
              }
            }
          }
        }
      }

      return { events, nextCursor };
    } catch (error) {
      console.error('Failed to get events from cursor:', error);
      throw error;
    }
  }

  // Handle incoming event for subscription
  private async handleEvent(subscription: EventSubscription, event: DomainEvent): Promise<void> {
    try {
      // Check if subscription matches event
      if (subscription.tenantId !== event.tenantId) return;
      
      if (subscription.eventTypes && !subscription.eventTypes.includes(event.type)) return;

      // Execute callback
      void subscription.callback(event);
    } catch (error) {
      console.error('Error handling event in subscription:', subscription.id, error);
    }
  }

  // Check if event matches filter
  private matchesFilter(event: DomainEvent, filter: EventFilter): boolean {
    if (event.tenantId !== filter.tenantId) return false;
    
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) return false;
    
    if (filter.entityTypes && !filter.entityTypes.includes(event.entity)) return false;
    
    if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) return false;
    
    if (filter.toTimestamp && event.timestamp > filter.toTimestamp) return false;
    
    return true;
  }

  // Get subscription count
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // Get active subscriptions
  getActiveSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return this.isInitialized;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();
