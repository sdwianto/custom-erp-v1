/**
 * Enterprise Real-time Infrastructure
 * SSE + Redis Streams for high-performance real-time updates
 */

export interface RealtimeConfig {
  redis: {
    url: string;
    streamPrefix: string;
    consumerGroup: string;
    maxLength: number;
  };
  sse: {
    heartbeatInterval: number;
    reconnectDelay: number;
    maxReconnectAttempts: number;
  };
  events: {
    batchSize: number;
    flushInterval: number;
  };
}

export const REALTIME_CONFIG: RealtimeConfig = {
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    streamPrefix: 'erp:events',
    consumerGroup: 'erp-consumers',
    maxLength: 10000,
  },
  sse: {
    heartbeatInterval: 30000, // 30 seconds
    reconnectDelay: 1000, // 1 second
    maxReconnectAttempts: 5,
  },
  events: {
    batchSize: 100,
    flushInterval: 1000, // 1 second
  },
};

/**
 * Event types for different ERP modules
 */
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface EquipmentEvent extends BaseEvent {
  type: 'equipment.created' | 'equipment.updated' | 'equipment.breakdown' | 'equipment.maintenance';
  data: {
    equipmentId: string;
    previousState?: string;
    currentState: string;
    location?: string;
    operator?: string;
  };
}

export interface InventoryEvent extends BaseEvent {
  type: 'inventory.stock.updated' | 'inventory.item.created' | 'inventory.grn.created' | 'inventory.issue.created';
  data: {
    itemId: string;
    storeId: string;
    quantity?: number;
    previousQuantity?: number;
    transactionType?: string;
    reference?: string;
  };
}

export interface FinanceEvent extends BaseEvent {
  type: 'finance.journal.posted' | 'finance.invoice.created' | 'finance.payment.processed' | 'finance.period.closed';
  data: {
    documentId: string;
    amount?: number;
    currency?: string;
    accountCode?: string;
    reference?: string;
  };
}

export interface MaintenanceEvent extends BaseEvent {
  type: 'maintenance.wo.created' | 'maintenance.wo.completed' | 'maintenance.preventive.due' | 'maintenance.parts.consumed';
  data: {
    workOrderId: string;
    equipmentId: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    parts?: Array<{ itemId: string; quantity: number }>;
  };
}

export type ERPEvent = EquipmentEvent | InventoryEvent | FinanceEvent | MaintenanceEvent;

/**
 * Event stream manager
 */
export class EventStreamManager {
  private streams = new Map<string, EventStream>();
  private subscribers = new Map<string, Set<EventSubscriber>>();

  createStream(name: string, config?: Partial<StreamConfig>): EventStream {
    const stream = new EventStream(name, config);
    this.streams.set(name, stream);
    return stream;
  }

  getStream(name: string): EventStream | undefined {
    return this.streams.get(name);
  }

  subscribe(streamName: string, subscriber: EventSubscriber): void {
    if (!this.subscribers.has(streamName)) {
      this.subscribers.set(streamName, new Set());
    }
    this.subscribers.get(streamName)!.add(subscriber);
  }

  unsubscribe(streamName: string, subscriber: EventSubscriber): void {
    this.subscribers.get(streamName)?.delete(subscriber);
  }

  async publish(streamName: string, event: ERPEvent): Promise<void> {
    const stream = this.streams.get(streamName);
    if (stream) {
      await stream.publish(event);
      
      // Notify subscribers
      const subscribers = this.subscribers.get(streamName);
      if (subscribers) {
        for (const subscriber of subscribers) {
          try {
            await subscriber.onEvent(event);
          } catch (error) {
            console.error('Subscriber error:', error);
          }
        }
      }
    }
  }
}

/**
 * Event stream configuration
 */
export interface StreamConfig {
  maxLength: number;
  retentionPeriod: number;
  partitionKey?: string;
}

/**
 * Event stream implementation
 */
export class EventStream {
  private name: string;
  private config: StreamConfig;
  private buffer: ERPEvent[] = [];

  constructor(name: string, config?: Partial<StreamConfig>) {
    this.name = name;
    this.config = {
      maxLength: config?.maxLength ?? 10000,
      retentionPeriod: config?.retentionPeriod ?? 86400000, // 24 hours
      partitionKey: config?.partitionKey,
    };
  }

  async publish(event: ERPEvent): Promise<void> {
    this.buffer.push(event);
    
    if (this.buffer.length >= REALTIME_CONFIG.events.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const events = [...this.buffer];
    this.buffer = [];
    
    // In real implementation, this would write to Redis Streams
    console.log(`Flushing ${events.length} events to stream ${this.name}`);
  }

  async replay(_fromId: string, _toId?: string): Promise<ERPEvent[]> {
    // In real implementation, this would read from Redis Streams
    return [];
  }
}

/**
 * Event subscriber interface
 */
export interface EventSubscriber {
  onEvent(event: ERPEvent): Promise<void>;
  onError?(error: Error): Promise<void>;
  onReconnect?(): Promise<void>;
}

/**
 * SSE connection manager
 */
export class SSEConnectionManager {
  private connections = new Map<string, SSEConnection>();
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    this.startHeartbeat();
  }

  addConnection(userId: string, connection: SSEConnection): void {
    this.connections.set(userId, connection);
  }

  removeConnection(userId: string): void {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.close();
      this.connections.delete(userId);
    }
  }

  broadcast(event: ERPEvent, filter?: (userId: string) => boolean): void {
    for (const [userId, connection] of this.connections) {
      if (!filter || filter(userId)) {
        connection.send(event);
      }
    }
  }

  sendToUser(userId: string, event: ERPEvent): void {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.send(event);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeat: BaseEvent = {
        id: `heartbeat-${Date.now()}`,
        type: 'system.heartbeat',
        timestamp: new Date(),
      };
      
      for (const connection of this.connections.values()) {
        connection.send(heartbeat);
      }
    }, REALTIME_CONFIG.sse.heartbeatInterval);
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    for (const connection of this.connections.values()) {
      connection.close();
    }
    this.connections.clear();
  }
}

/**
 * SSE connection wrapper
 */
export class SSEConnection {
  private response: Response | null = null;
  private userId: string;
  private lastEventId?: string;

  constructor(userId: string, lastEventId?: string) {
    this.userId = userId;
    this.lastEventId = lastEventId;
  }

  send(event: ERPEvent | BaseEvent): void {
    if (!this.response) return;
    
    const data = JSON.stringify(event);
    const message = `id: ${event.id}\ndata: ${data}\n\n`;
    
    // In real implementation, this would write to the SSE response stream
    console.log(`Sending to ${this.userId}:`, message);
  }

  close(): void {
    // In real implementation, this would close the SSE connection
    this.response = null;
  }
}

/**
 * Offline event queue for sync when connection restored
 */
export class OfflineEventQueue {
  private queue: ERPEvent[] = [];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  enqueue(event: ERPEvent): void {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift(); // Remove oldest event
    }
    this.queue.push(event);
  }

  dequeue(): ERPEvent | undefined {
    return this.queue.shift();
  }

  peek(): ERPEvent | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  toArray(): ERPEvent[] {
    return [...this.queue];
  }
}

/**
 * Event aggregation for analytics and reporting
 */
export interface EventAggregation {
  timeWindow: number; // milliseconds
  groupBy: string[];
  aggregations: {
    count?: boolean;
    sum?: string[];
    avg?: string[];
    min?: string[];
    max?: string[];
  };
}

export class EventAggregator {
  private aggregations = new Map<string, EventAggregation>();
  private results = new Map<string, Record<string, unknown>>();

  addAggregation(name: string, config: EventAggregation): void {
    this.aggregations.set(name, config);
  }

  process(event: ERPEvent): void {
    for (const [name, config] of this.aggregations) {
      this.processEvent(name, config, event);
    }
  }

  getResults(name: string): Record<string, unknown> | undefined {
    return this.results.get(name);
  }

  private processEvent(name: string, config: EventAggregation, event: ERPEvent): void {
    // Implementation would aggregate events based on configuration
    // This is a simplified version
    const key = `${name}:${event.type}`;
    const current = this.results.get(key) ?? { count: 0 };
    
    if (config.aggregations.count) {
      (current as { count: number }).count++;
    }
    
    this.results.set(key, current);
  }
}
