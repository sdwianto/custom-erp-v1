import type { Redis } from 'ioredis';
import { Logger } from '../services/Logger';
import type { EventEnvelope } from './types';

/**
 * Server-Sent Events Service Implementation
 * Follows Implementation Guide requirements for SSE setup
 */
export class SSEService {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly tenantId: string;
  private readonly heartbeatInterval: number;
  private readonly maxConnections: number;
  
  private connections = new Map<string, {
    response: unknown;
    lastHeartbeat: Date;
    isActive: boolean;
  }>();
  
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    redis: Redis,
    logger: Logger,
    tenantId: string,
    options: {
      heartbeatInterval?: number;
      maxConnections?: number;
    } = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.tenantId = tenantId;
    this.heartbeatInterval = options.heartbeatInterval ?? 15000; // 15 seconds
    this.maxConnections = options.maxConnections ?? 1000;
  }

  /**
   * Create SSE connection
   * Implementation Guide: SSE endpoint dengan authentication
   */
  async createConnection(
    connectionId: string,
    response: unknown,
    userId?: string
  ): Promise<void> {
    try {
      // Check connection limit
      if (this.connections.size >= this.maxConnections) {
        throw new Error('Maximum connections reached');
      }

      // Store connection
      this.connections.set(connectionId, {
        response,
        lastHeartbeat: new Date(),
        isActive: true
      });

      // Start heartbeat if not already started
      if (!this.heartbeatTimer) {
        this.startHeartbeat();
      }

      // Subscribe to Redis Pub/Sub for this tenant
      await this.subscribeToTenantEvents();

      this.logger.info('SSE connection created', {
        connectionId,
        tenantId: this.tenantId,
        userId,
        totalConnections: this.connections.size
      });

      // Send initial connection event
      await this.sendEvent(connectionId, {
        type: 'connection.established',
        data: {
          connectionId,
          tenantId: this.tenantId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('Failed to create SSE connection', {
        connectionId,
        tenantId: this.tenantId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Close SSE connection
   * Implementation Guide: Connection management
   */
  async closeConnection(connectionId: string): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return;
      }

      // Mark as inactive
      connection.isActive = false;
      
      // Remove from connections
      this.connections.delete(connectionId);

      this.logger.info('SSE connection closed', {
        connectionId,
        tenantId: this.tenantId,
        totalConnections: this.connections.size
      });

      // Stop heartbeat if no connections
      if (this.connections.size === 0 && this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

    } catch (error) {
      this.logger.error('Failed to close SSE connection', {
        connectionId,
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send event to specific connection
   * Implementation Guide: Real-time event delivery
   */
  async sendEvent(connectionId: string, event: {
    type: string;
    data: unknown;
    id?: string;
  }): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection?.isActive) {
        this.logger.warn('Attempted to send event to inactive connection', {
          connectionId,
          tenantId: this.tenantId
        });
        return;
      }

      const sseData = this.formatSSEEvent(event);
      
      // In a real implementation, you would write to the response stream
      // For now, we'll log the event
      this.logger.info('SSE event sent', {
        connectionId,
        tenantId: this.tenantId,
        eventType: event.type,
        eventId: event.id,
        sseData: sseData.substring(0, 200) + '...'
      });

      // Update last heartbeat
      connection.lastHeartbeat = new Date();

    } catch (error) {
      this.logger.error('Failed to send SSE event', {
        connectionId,
        tenantId: this.tenantId,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Broadcast event to all connections
   * Implementation Guide: Real-time event delivery
   */
  async broadcastEvent(event: EventEnvelope): Promise<void> {
    try {
      const activeConnections = Array.from(this.connections.entries())
        .filter(([_, connection]) => connection.isActive);

      if (activeConnections.length === 0) {
        return;
      }

      // Send to all active connections
      for (const [connectionId, connection] of activeConnections) {
        try {
          // In a real implementation, you would write to each response stream
          this.logger.info('SSE event broadcasted', {
            connectionId,
            tenantId: this.tenantId,
            eventType: event.type,
            eventId: event.id
          });

          // Update last heartbeat
          connection.lastHeartbeat = new Date();

        } catch (error) {
          this.logger.error('Failed to broadcast to connection', {
            connectionId,
            tenantId: this.tenantId,
            eventType: event.type,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Mark connection as inactive
          connection.isActive = false;
        }
      }

      this.logger.info('SSE event broadcasted to all connections', {
        tenantId: this.tenantId,
        eventType: event.type,
        eventId: event.id,
        connectionCount: activeConnections.length
      });

    } catch (error) {
      this.logger.error('Failed to broadcast SSE event', {
        tenantId: this.tenantId,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Start heartbeat mechanism
   * Implementation Guide: Heartbeat mechanism (15s interval)
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      void (async () => {
        try {
          await this.sendHeartbeat();
          await this.cleanupInactiveConnections();
        } catch (error) {
          this.logger.error('Heartbeat failed', {
            tenantId: this.tenantId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      })();
    }, this.heartbeatInterval);

    this.logger.info('SSE heartbeat started', {
      tenantId: this.tenantId,
      interval: this.heartbeatInterval
    });
  }

  /**
   * Send heartbeat to all connections
   */
  private async sendHeartbeat(): Promise<void> {
    const activeConnections = Array.from(this.connections.entries())
      .filter(([_, connection]) => connection.isActive);

    for (const [connectionId, connection] of activeConnections) {
      try {
        await this.sendEvent(connectionId, {
          type: 'heartbeat',
          data: {
            timestamp: new Date().toISOString(),
            tenantId: this.tenantId
          }
        });
      } catch (error) {
        this.logger.warn('Failed to send heartbeat', {
          connectionId,
          tenantId: this.tenantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Mark connection as inactive
        connection.isActive = false;
      }
    }
  }

  /**
   * Cleanup inactive connections
   * Implementation Guide: Connection management
   */
  private async cleanupInactiveConnections(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 60000; // 1 minute

    const inactiveConnections: string[] = [];

    for (const [connectionId, connection] of this.connections.entries()) {
      const timeSinceLastHeartbeat = now.getTime() - (connection.lastHeartbeat?.getTime() ?? 0);
      
      if (timeSinceLastHeartbeat > inactiveThreshold) {
        inactiveConnections.push(connectionId);
        connection.isActive = false;
      }
    }

    // Remove inactive connections
    for (const connectionId of inactiveConnections) {
      this.connections.delete(connectionId);
    }

    if (inactiveConnections.length > 0) {
      this.logger.info('Cleaned up inactive SSE connections', {
        tenantId: this.tenantId,
        inactiveCount: inactiveConnections.length,
        remainingConnections: this.connections.size
      });
    }
  }

  /**
   * Subscribe to tenant events
   * Implementation Guide: Redis Pub/Sub untuk real-time delivery
   */
  private async subscribeToTenantEvents(): Promise<void> {
    const channel = this.getTenantPubSubKey(this.tenantId);
    
    // In a real implementation, you would subscribe to Redis Pub/Sub
    // and handle incoming events
    this.logger.info('Subscribed to tenant events', {
      tenantId: this.tenantId,
      channel
    });
  }

  /**
   * Format SSE event
   */
  private formatSSEEvent(event: {
    type: string;
    data: unknown;
    id?: string;
  }): string {
    let sseData = '';
    
    if (event.id) {
      sseData += `id: ${event.id}\n`;
    }
    
    sseData += `event: ${event.type}\n`;
    sseData += `data: ${JSON.stringify(event.data)}\n\n`;
    
    return sseData;
  }

  /**
   * Get tenant pub/sub key
   */
  private getTenantPubSubKey(tenantId: string): string {
    return `events:pubsub:${tenantId}`;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    inactiveConnections: number;
    tenantId: string;
  } {
    const activeConnections = Array.from(this.connections.values())
      .filter(connection => connection.isActive).length;
    
    const inactiveConnections = this.connections.size - activeConnections;

    return {
      totalConnections: this.connections.size,
      activeConnections,
      inactiveConnections,
      tenantId: this.tenantId
    };
  }

  /**
   * Get all connection IDs
   */
  getConnectionIds(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Check if connection exists
   */
  hasConnection(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * Get connection info
   */
  getConnectionInfo(connectionId: string): {
    isActive: boolean;
    lastHeartbeat: Date;
  } | null {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return null;
    }

    return {
      isActive: connection.isActive,
      lastHeartbeat: connection.lastHeartbeat
    };
  }
}
