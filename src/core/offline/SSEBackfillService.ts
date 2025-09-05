/**
 * SSE & Backfill Service
 * Implementation Guide: Hybrid Online/Offline Engine - SSE & Backfill Implementation
 * 
 * Server-Sent Events setup:
 * - SSE endpoint dengan authentication
 * - Heartbeat mechanism (15s interval)
 * - Connection management
 * - Error handling & reconnection
 * 
 * Backfill mechanism:
 * - Redis Streams integration
 * - Cursor tracking per client
 * - Ordered event delivery
 * - Performance optimization
 */

import type { 
  SyncCursor, 
  BackfillRequest, 
  BackfillResult,
  DeviceSyncStatus 
} from './types';
// import type { EventEnvelope } from '../events/types';

export interface SSEConnection {
  id: string;
  tenantId: string;
  userId: string;
  eventSource: EventSource;
  lastHeartbeat: Date;
  isConnected: boolean;
  cursor: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
}

export interface BackfillOptions {
  batchSize: number;
  timeout: number;
  includeDeleted: boolean;
  compression: boolean;
}

export interface SSEConfig {
  heartbeatInterval: number;      // 15 seconds
  maxReconnectAttempts: number;  // 5
  reconnectDelay: number;        // 1000ms
  backfillTimeout: number;       // 30000ms
  enableCompression: boolean;    // true
}

export class SSEBackfillService {
  private readonly config: SSEConfig;
  private readonly connections: Map<string, SSEConnection>;
  private readonly cursors: Map<string, SyncCursor>;
  private heartbeatTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(config: Partial<SSEConfig> = {}) {
    this.config = {
      heartbeatInterval: 15000,    // 15 seconds
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      backfillTimeout: 30000,
      enableCompression: true,
      ...config
    };
    
    this.connections = new Map();
    this.cursors = new Map();
  }

  /**
   * Initialize SSE & Backfill service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Start heartbeat mechanism
      this.startHeartbeat();
      
      // Load existing cursors
      await this.loadCursors();
      
      this.isInitialized = true;
      
      console.log('SSE & Backfill service initialized');
    } catch (error) {
      console.error('Failed to initialize SSE & Backfill service:', error);
      throw error;
    }
  }

  /**
   * Create SSE connection dengan authentication
   * Implementation Guide: SSE endpoint dengan authentication
   */
  async createSSEConnection(
    tenantId: string,
    userId: string,
    authToken: string,
    cursor?: string
  ): Promise<SSEConnection> {
    const connectionId = `${tenantId}-${userId}-${Date.now()}`;
    
    // Build SSE URL with authentication
    const sseUrl = this.buildSSEUrl(tenantId, authToken, cursor);
    
    // Create EventSource
    const eventSource = new EventSource(sseUrl);
    
    const connection: SSEConnection = {
      id: connectionId,
      tenantId,
      userId,
      eventSource,
      lastHeartbeat: new Date(),
      isConnected: false,
      cursor: cursor ?? '0-0',
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
      reconnectDelay: this.config.reconnectDelay
    };

    // Setup event listeners
    this.setupEventListeners(connection);
    
    // Store connection
    this.connections.set(connectionId, connection);
    
    console.log(`SSE connection created: ${connectionId}`);
    
    return connection;
  }

  /**
   * Build SSE URL with authentication
   */
  private buildSSEUrl(tenantId: string, authToken: string, cursor?: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({
      tenant: tenantId,
      token: authToken,
      ...(cursor && { cursor })
    });
    
    return `${baseUrl}/api/events/stream?${params.toString()}`;
  }

  /**
   * Setup event listeners for SSE connection
   */
  private setupEventListeners(connection: SSEConnection): void {
    const { eventSource } = connection;

    // Connection opened
    eventSource.onopen = () => {
      connection.isConnected = true;
      connection.lastHeartbeat = new Date();
      connection.reconnectAttempts = 0;
      
      console.log(`SSE connection opened: ${connection.id}`);
      
      // Trigger backfill if needed
      void this.handleConnectionOpen(connection);
    };

    // Message received
    eventSource.onmessage = (event) => {
      connection.lastHeartbeat = new Date();
      
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;
        this.handleSSEMessage(connection, data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    // Heartbeat received
    eventSource.addEventListener('heartbeat', () => {
      connection.lastHeartbeat = new Date();
    });

    // Error occurred
    eventSource.onerror = (error) => {
      connection.isConnected = false;
      
      console.error(`SSE connection error: ${connection.id}`, error);
      
      // Handle reconnection
      this.handleConnectionError(connection);
    };

    // Custom event types
    eventSource.addEventListener('event', (event) => {
      connection.lastHeartbeat = new Date();
      
      try {
        const eventData = JSON.parse(event.data as string) as Record<string, unknown>;
        this.handleEventMessage(connection, eventData);
      } catch (error) {
        console.error('Failed to parse event message:', error);
      }
    });

    eventSource.addEventListener('cursor', (event) => {
      try {
        const cursorData = JSON.parse(event.data as string) as Record<string, unknown>;
        this.updateCursor(connection, cursorData.cursor as string);
      } catch (error) {
        console.error('Failed to parse cursor message:', error);
      }
    });
  }

  /**
   * Handle connection open
   */
  private async handleConnectionOpen(connection: SSEConnection): Promise<void> {
    try {
      // Check if backfill is needed
      const needsBackfill = await this.checkBackfillNeeded(connection);
      
      if (needsBackfill) {
        console.log(`Starting backfill for connection: ${connection.id}`);
        await this.performBackfill(connection);
      }
    } catch (error) {
      console.error('Failed to handle connection open:', error);
    }
  }

  /**
   * Check if backfill is needed
   */
  private async checkBackfillNeeded(connection: SSEConnection): Promise<boolean> {
    const cursor = this.cursors.get(connection.tenantId);
    
    if (!cursor) {
      return true; // No cursor means first connection
    }
    
    // Check if cursor is too old (more than 1 hour)
    const cursorAge = Date.now() - new Date(cursor.lastSyncAt).getTime();
    const maxAge = 60 * 60 * 1000; // 1 hour
    
    return cursorAge > maxAge;
  }

  /**
   * Perform backfill for connection
   * Implementation Guide: Backfill mechanism
   */
  private async performBackfill(connection: SSEConnection): Promise<void> {
    try {
      const cursor = this.cursors.get(connection.tenantId);
      const startCursor = cursor?.lastEventId ?? '0-0';
      
      const backfillRequest: BackfillRequest = {
        tenantId: connection.tenantId,
        cursor: startCursor,
        limit: 1000,
        includeDeleted: false
      };
      
      const backfillResult = await this.fetchBackfillData(backfillRequest);
      
      // Process backfill events
      await this.processBackfillEvents(connection, backfillResult);
      
      // Update cursor
      if (backfillResult.nextCursor) {
        this.updateCursor(connection, backfillResult.nextCursor);
      }
      
      console.log(`Backfill completed for connection: ${connection.id}, events: ${backfillResult.events.length}`);
    } catch (error) {
      console.error('Failed to perform backfill:', error);
    }
  }

  /**
   * Fetch backfill data from Redis Streams
   * Implementation Guide: Redis Streams integration
   */
  private async fetchBackfillData(request: BackfillRequest): Promise<BackfillResult> {
    try {
      const response = await fetch('/api/events/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error(`Backfill request failed: ${response.statusText}`);
      }
      
      const result = await response.json() as BackfillResult;
      return result;
    } catch (error) {
      console.error('Failed to fetch backfill data:', error);
      return {
        events: [],
        hasMore: false,
        totalCount: 0
      };
    }
  }

  /**
   * Process backfill events
   * Implementation Guide: Ordered event delivery
   */
  private async processBackfillEvents(
    connection: SSEConnection,
    backfillResult: BackfillResult
  ): Promise<void> {
    // Sort events by timestamp to ensure ordered delivery
    const sortedEvents = backfillResult.events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (const event of sortedEvents) {
      try {
        await this.processBackfillEvent(connection, event);
      } catch (error) {
        console.error('Failed to process backfill event:', event.id, error);
      }
    }
  }

  /**
   * Process individual backfill event
   */
  private async processBackfillEvent(
    connection: SSEConnection,
    event: Record<string, unknown>
  ): Promise<void> {
    // Emit event to application
    this.emitEvent('backfill-event', {
      connectionId: connection.id,
      event
    });
    
    // Update local state if needed
    await this.updateLocalState(event);
  }

  /**
   * Handle SSE message
   */
  private handleSSEMessage(connection: SSEConnection, data: Record<string, unknown>): void {
    // Update heartbeat
    connection.lastHeartbeat = new Date();
    
    // Emit message to application
    this.emitEvent('sse-message', {
      connectionId: connection.id,
      data
    });
  }

  /**
   * Handle event message
   */
  private handleEventMessage(connection: SSEConnection, eventData: Record<string, unknown>): void {
    // Update cursor
    if (eventData.id) {
      this.updateCursor(connection, eventData.id as string);
    }
    
    // Emit event to application
    this.emitEvent('sse-event', {
      connectionId: connection.id,
      event: eventData
    });
  }

  /**
   * Handle connection error
   * Implementation Guide: Error handling & reconnection
   */
  private handleConnectionError(connection: SSEConnection): void {
    connection.isConnected = false;
    
    if (connection.reconnectAttempts < connection.maxReconnectAttempts) {
      connection.reconnectAttempts++;
      
      // Exponential backoff
      const delay = connection.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1);
      
      console.log(`Reconnecting SSE connection ${connection.id} in ${delay}ms (attempt ${connection.reconnectAttempts})`);
      
      setTimeout(() => {
        void this.reconnectSSEConnection(connection);
      }, delay);
    } else {
      console.error(`Max reconnection attempts reached for SSE connection: ${connection.id}`);
      this.emitEvent('sse-connection-failed', {
        connectionId: connection.id,
        reason: 'max_reconnect_attempts'
      });
    }
  }

  /**
   * Reconnect SSE connection
   */
  private async reconnectSSEConnection(connection: SSEConnection): Promise<void> {
    try {
      // Close existing connection
      connection.eventSource.close();
      
      // Get auth token
      const authToken = this.getAuthToken();
      
      // Create new connection
      const newConnection = await this.createSSEConnection(
        connection.tenantId,
        connection.userId,
        authToken,
        connection.cursor
      );
      
      // Replace old connection
      this.connections.set(connection.id, newConnection);
      
      console.log(`SSE connection reconnected: ${connection.id}`);
    } catch (error) {
      console.error('Failed to reconnect SSE connection:', error);
      this.handleConnectionError(connection);
    }
  }

  /**
   * Update cursor
   */
  private updateCursor(connection: SSEConnection, newCursor: string): void {
    connection.cursor = newCursor;
    
    const cursor: SyncCursor = {
      tenantId: connection.tenantId,
      lastEventId: newCursor,
      lastSyncAt: new Date().toISOString(),
      version: 1
    };
    
    this.cursors.set(connection.tenantId, cursor);
    
    // Persist cursor
    void this.persistCursor(cursor);
  }

  /**
   * Persist cursor to storage
   */
  private async persistCursor(cursor: SyncCursor): Promise<void> {
    try {
      localStorage.setItem(`sse_cursor_${cursor.tenantId}`, JSON.stringify(cursor));
    } catch (error) {
      console.error('Failed to persist cursor:', error);
    }
  }

  /**
   * Load cursors from storage
   */
  private async loadCursors(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('sse_cursor_'));
      
      for (const key of keys) {
        const cursorData = localStorage.getItem(key);
        if (cursorData) {
          const cursor = JSON.parse(cursorData) as SyncCursor;
          this.cursors.set(cursor.tenantId, cursor);
        }
      }
    } catch (error) {
      console.error('Failed to load cursors:', error);
    }
  }

  /**
   * Start heartbeat mechanism
   * Implementation Guide: Heartbeat mechanism (15s interval)
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, this.config.heartbeatInterval);
  }

  /**
   * Check heartbeats for all connections
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const heartbeatTimeout = this.config.heartbeatInterval * 2; // 2x interval
    
    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastHeartbeat = now - connection.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > heartbeatTimeout) {
        console.warn(`SSE connection heartbeat timeout: ${connectionId}`);
        this.handleConnectionError(connection);
      }
    }
  }

  /**
   * Get sync status for tenant
   */
  async getSyncStatus(tenantId: string): Promise<DeviceSyncStatus> {
    const connection = Array.from(this.connections.values())
      .find(conn => conn.tenantId === tenantId);
    
    const cursor = this.cursors.get(tenantId);
    
    return {
      isOnline: connection?.isConnected ?? false,
      lastSyncAt: cursor?.lastSyncAt,
      pendingCount: 0, // Would be calculated from offline queue
      processingCount: 0,
      failedCount: 0,
      conflictCount: 0,
      connectionQuality: this.getConnectionQuality(connection)
    } as unknown as DeviceSyncStatus;
  }

  /**
   * Get connection quality
   */
  private getConnectionQuality(connection?: SSEConnection): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!connection?.isConnected) {
      return 'offline';
    }
    
    const timeSinceLastHeartbeat = Date.now() - connection.lastHeartbeat.getTime();
    
    if (timeSinceLastHeartbeat < 5000) return 'excellent';
    if (timeSinceLastHeartbeat < 15000) return 'good';
    return 'poor';
  }

  /**
   * Update local state
   */
  private async updateLocalState(event: Record<string, unknown>): Promise<void> {
    // This would update local IndexedDB or other storage
    console.log('Updating local state with event:', event.id as string);
  }

  /**
   * Get auth token
   */
  private getAuthToken(): string {
    // This would get the actual auth token
    return 'dummy-token';
  }

  /**
   * Emit event
   */
  private emitEvent(eventType: string, data: Record<string, unknown>): void {
    // This would emit events to the application
    console.log(`SSE Event: ${eventType}`, data);
  }

  /**
   * Close SSE connection
   */
  closeSSEConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.eventSource.close();
      this.connections.delete(connectionId);
      console.log(`SSE connection closed: ${connectionId}`);
    }
  }

  /**
   * Close all SSE connections
   */
  closeAllConnections(): void {
    for (const [, connection] of this.connections) {
      connection.eventSource.close();
    }
    this.connections.clear();
    console.log('All SSE connections closed');
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    this.closeAllConnections();
    this.isInitialized = false;
    
    console.log('SSE & Backfill service shutdown completed');
  }
}
