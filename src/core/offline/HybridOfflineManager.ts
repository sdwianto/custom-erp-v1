/**
 * Hybrid Offline Manager
 * Implementation Guide: Hybrid Online/Offline Engine - Central Orchestrator
 * 
 * This is the main orchestrator that integrates:
 * - OfflineQueueManager
 * - ConflictResolutionEngine
 * - SSEBackfillService
 * - PerformanceMonitor
 */

import { OfflineQueueManager } from './OfflineQueueManager';
import { ConflictResolutionEngine } from './ConflictResolutionEngine';
import { SSEBackfillService } from './SSEBackfillService';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ErrorReporting } from './ErrorReporting';
import type { 
  LocalMutation, 
  OfflineConfig, 
  SyncStatus
} from './types';
import type { PerformanceTargets } from './PerformanceMonitor';
import type { SSEConfig } from './SSEBackfillService';
import { 
  createDefaultOfflineConfig, 
  createMutation,
  validateMutation 
} from './utils';

export interface HybridOfflineConfig {
  offline: OfflineConfig;
  sse: SSEConfig;
  performance: PerformanceTargets;
  enableEncryption: boolean;
  enableCompression: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface HybridOfflineStats {
  queue: {
    totalMutations: number;
    pendingMutations: number;
    processingMutations: number;
    completedMutations: number;
    failedMutations: number;
    conflictMutations: number;
  };
  sync: SyncStatus;
  performance: {
    apiLatency: number;
    databaseLatency: number;
    eventProcessingLatency: number;
    uptime: number;
    errorRate: number;
  };
  conflicts: {
    total: number;
    resolved: number;
    pending: number;
  };
}

export class HybridOfflineManager {
  private readonly config: HybridOfflineConfig;
  private queueManager!: OfflineQueueManager;
  private readonly conflictEngine: ConflictResolutionEngine;
  private readonly sseService: SSEBackfillService;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly errorReporting: ErrorReporting;
  private isInitialized = false;
  private db?: IDBDatabase;

  constructor(config?: Partial<HybridOfflineConfig>) {
    this.config = {
      offline: createDefaultOfflineConfig(),
      sse: {
        heartbeatInterval: 15000,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
        backfillTimeout: 30000,
        enableCompression: true
      },
      performance: {
        apiLatency: 200,
        databaseLatency: 100,
        eventProcessing: 50,
        sseReconnect: 5,
        uptime: 99.5,
        rpo: 15,
        rto: 4
      },
      enableEncryption: false,
      enableCompression: true,
      enablePerformanceMonitoring: true,
      ...config
    };

    // Initialize components
    this.errorReporting = new ErrorReporting();
    this.conflictEngine = new ConflictResolutionEngine(this.config.offline);
    this.sseService = new SSEBackfillService(this.config.sse);
    this.performanceMonitor = new PerformanceMonitor(this.config.performance);
    
    // Queue manager will be initialized after IndexedDB is ready
  }

  /**
   * Initialize hybrid offline manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing Hybrid Offline Manager...');

      // Initialize IndexedDB
      await this.initializeIndexedDB();

      // Initialize queue manager
      this.queueManager = new OfflineQueueManager(this.db!, this.config.offline);
      await this.queueManager.initialize();

      // Initialize SSE service
      await this.sseService.initialize();

      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        await this.performanceMonitor.startMonitoring();
      }

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('Hybrid Offline Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Hybrid Offline Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HybridOfflineDB', 2);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message ?? 'Unknown error'}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        
        // Check if object stores exist, if not, we need to recreate them
        const requiredStores = ['mutations', 'conflicts', 'cursors', 'idempotency'];
        const missingStores = requiredStores.filter(store => !this.db!.objectStoreNames.contains(store));
        
        if (missingStores.length > 0) {
          console.log('Missing object stores detected, closing and reopening with upgrade...');
          this.db.close();
          // Force upgrade by incrementing version
          const upgradeRequest = indexedDB.open('HybridOfflineDB', 3);
          upgradeRequest.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            console.log('Creating missing object stores...');
            
            // Create mutations store
            if (!db.objectStoreNames.contains('mutations')) {
              const mutationsStore = db.createObjectStore('mutations', { keyPath: 'id' });
              mutationsStore.createIndex('status', 'status', { unique: false });
              mutationsStore.createIndex('priority', 'priority', { unique: false });
              mutationsStore.createIndex('createdAt', 'createdAt', { unique: false });
              mutationsStore.createIndex('tenantId', 'tenantId', { unique: false });
              mutationsStore.createIndex('userId', 'userId', { unique: false });
              mutationsStore.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
            }

            // Create conflicts store
            if (!db.objectStoreNames.contains('conflicts')) {
              const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
              conflictsStore.createIndex('mutationId', 'mutationId', { unique: false });
              conflictsStore.createIndex('severity', 'severity', { unique: false });
              conflictsStore.createIndex('resolution', 'resolution', { unique: false });
              conflictsStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Create cursors store
            if (!db.objectStoreNames.contains('cursors')) {
              const cursorsStore = db.createObjectStore('cursors', { keyPath: 'tenantId' });
              cursorsStore.createIndex('lastSyncAt', 'lastSyncAt', { unique: false });
            }

            // Create idempotency store
            if (!db.objectStoreNames.contains('idempotency')) {
              const idempotencyStore = db.createObjectStore('idempotency', { keyPath: 'id' });
              idempotencyStore.createIndex('key', 'key', { unique: true });
              idempotencyStore.createIndex('tenantId', 'tenantId', { unique: false });
              idempotencyStore.createIndex('ttl', 'ttl', { unique: false });
            }
          };
          
          upgradeRequest.onsuccess = () => {
            this.db = upgradeRequest.result;
            console.log('IndexedDB upgraded successfully');
            resolve();
          };
          
          upgradeRequest.onerror = () => {
            console.error('Failed to upgrade IndexedDB:', upgradeRequest.error);
            reject(new Error(`Failed to upgrade IndexedDB: ${upgradeRequest.error?.message ?? 'Unknown error'}`));
          };
        } else {
          resolve();
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB upgrade needed - creating schema');
        
        // Create mutations store
        if (!db.objectStoreNames.contains('mutations')) {
          const mutationsStore = db.createObjectStore('mutations', { keyPath: 'id' });
          mutationsStore.createIndex('status', 'status', { unique: false });
          mutationsStore.createIndex('priority', 'priority', { unique: false });
          mutationsStore.createIndex('createdAt', 'createdAt', { unique: false });
          mutationsStore.createIndex('tenantId', 'tenantId', { unique: false });
          mutationsStore.createIndex('userId', 'userId', { unique: false });
          mutationsStore.createIndex('idempotencyKey', 'idempotencyKey', { unique: true });
        }

        // Create conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictsStore.createIndex('mutationId', 'mutationId', { unique: false });
          conflictsStore.createIndex('severity', 'severity', { unique: false });
          conflictsStore.createIndex('resolution', 'resolution', { unique: false });
          conflictsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create cursors store
        if (!db.objectStoreNames.contains('cursors')) {
          const cursorsStore = db.createObjectStore('cursors', { keyPath: 'tenantId' });
          cursorsStore.createIndex('lastSyncAt', 'lastSyncAt', { unique: false });
        }

        // Create idempotency store
        if (!db.objectStoreNames.contains('idempotency')) {
          const idempotencyStore = db.createObjectStore('idempotency', { keyPath: 'id' });
          idempotencyStore.createIndex('key', 'key', { unique: true });
          idempotencyStore.createIndex('tenantId', 'tenantId', { unique: false });
          idempotencyStore.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      void this.handleNetworkOnline();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
      void this.handleNetworkOffline();
    });

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.handleVisibilityChange();
      }
    });
  }

  /**
   * Handle network online
   */
  private async handleNetworkOnline(): Promise<void> {
    try {
      console.log('Handling network online event');
      
      // Start sync process
      await this.startSync();
      
      // Resume SSE connections
      // This would be handled by SSEBackfillService
      
    } catch (error) {
      console.error('Failed to handle network online:', error);
    }
  }

  /**
   * Handle network offline
   */
  private async handleNetworkOffline(): Promise<void> {
    try {
      console.log('Handling network offline event');
      
      // Queue will continue to work offline
      // SSE connections will be handled by SSEBackfillService
      
    } catch (error) {
      console.error('Failed to handle network offline:', error);
    }
  }

  /**
   * Handle visibility change
   */
  private async handleVisibilityChange(): Promise<void> {
    try {
      console.log('Handling visibility change event');
      
      // Check if we need to sync when app becomes visible
      if (navigator.onLine) {
        await this.startSync();
      }
      
    } catch (error) {
      console.error('Failed to handle visibility change:', error);
    }
  }

  /**
   * Enqueue mutation
   */
  async enqueueMutation(mutationData: {
    kind: string;
    payload: unknown;
    tenantId: string;
    userId: string;
    baseVersion?: number;
    priority?: number;
  }): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Hybrid Offline Manager not initialized');
    }

    try {
      // Create mutation
      const mutation = createMutation(mutationData);

      // Validate mutation
      const validationErrors = validateMutation(mutation);
      if (validationErrors.length > 0) {
        throw new Error(`Mutation validation failed: ${validationErrors.join(', ')}`);
      }

      // Enqueue mutation
      const mutationId = await this.queueManager.enqueueMutation(mutation);
      
      console.log(`Mutation enqueued: ${mutationId}`);
      return mutationId;
    } catch (error) {
      console.error('Failed to enqueue mutation:', error);
      throw error;
    }
  }

  /**
   * Start sync process
   */
  async startSync(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Hybrid Offline Manager not initialized');
    }

    try {
      console.log('Starting sync process...');

      // Get pending mutations
      const pendingMutations = await this.queueManager.dequeueMutations();
      
      if (pendingMutations.length === 0) {
        console.log('No pending mutations to sync');
        return;
      }

      console.log(`Syncing ${pendingMutations.length} mutations`);

      // Process mutations in batches
      for (const mutation of pendingMutations) {
        await this.processMutation(mutation);
      }

      console.log('Sync process completed');
    } catch (error) {
      console.error('Failed to start sync process:', error);
      throw error;
    }
  }

  /**
   * Process individual mutation
   */
  private async processMutation(mutation: LocalMutation): Promise<void> {
    try {
      console.log(`Processing mutation: ${mutation.id}`);

      // Send mutation to server
      const response = await this.sendMutationToServer(mutation);

      if (response.success) {
        // Mark mutation as completed
        await this.queueManager.updateMutationStatus(mutation.id, 'completed');
        console.log(`Mutation completed: ${mutation.id}`);
      } else if (response.conflict) {
        // Handle conflict
        await this.handleConflict(mutation, response.serverData, response.clientData);
      } else {
        // Mark mutation as failed
        await this.queueManager.updateMutationStatus(mutation.id, 'failed');
        console.log(`Mutation failed: ${mutation.id}`);
      }
    } catch (error) {
      console.error(`Failed to process mutation ${mutation.id}:`, error);
      await this.queueManager.updateMutationStatus(mutation.id, 'failed');
    }
  }

  /**
   * Send mutation to server
   */
  private async sendMutationToServer(mutation: LocalMutation): Promise<{
    success: boolean;
    conflict?: boolean;
    serverData?: unknown;
    clientData?: unknown;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/sync/mutate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Idempotency-Key': mutation.idempotencyKey
        },
        body: JSON.stringify({
          mutation: mutation,
          baseVersion: mutation.baseVersion
        })
      });

      if (response.ok) {
        const result = await response.json() as { data: unknown };
        return {
          success: true,
          serverData: result.data
        };
      } else if (response.status === 409) {
        // Conflict detected
        const conflictData = await response.json() as { serverData: unknown; clientData: unknown };
        return {
          success: false,
          conflict: true,
          serverData: conflictData.serverData,
          clientData: conflictData.clientData
        };
      } else {
        return {
          success: false,
          error: `Server error: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle conflict
   */
  private async handleConflict(
    mutation: LocalMutation,
    serverData: unknown,
    clientData: unknown
  ): Promise<void> {
    try {
      console.log(`Handling conflict for mutation: ${mutation.id}`);

      // Detect conflicts
      const conflictDetection = await this.conflictEngine.detectConflicts(
        mutation,
        serverData,
        clientData
      );

      if (conflictDetection.hasConflict) {
        // Resolve conflicts
        const resolution = await this.conflictEngine.resolveConflicts(
          conflictDetection,
          mutation
        );

        console.log(`Conflict resolved: ${resolution.id}, strategy: ${resolution.resolution}`);

        // Mark mutation as conflict for manual review if needed
        if (resolution.resolution === 'manual') {
          await this.queueManager.updateMutationStatus(mutation.id, 'conflict');
        } else {
          await this.queueManager.updateMutationStatus(mutation.id, 'completed');
        }
      } else {
        // No conflict, mark as completed
        await this.queueManager.updateMutationStatus(mutation.id, 'completed');
      }
    } catch (error) {
      console.error(`Failed to handle conflict for mutation ${mutation.id}:`, error);
      await this.queueManager.updateMutationStatus(mutation.id, 'failed');
    }
  }

  /**
   * Get comprehensive statistics
   */
  async getStats(): Promise<HybridOfflineStats> {
    if (!this.isInitialized) {
      throw new Error('Hybrid Offline Manager not initialized');
    }

    try {
      const queueStats = await this.queueManager.getQueueStats();
      const syncStatus = await this.sseService.getSyncStatus('default-tenant'); // Would get actual tenant
      const performanceSummary = this.performanceMonitor.getPerformanceSummary();

      return {
        queue: {
          totalMutations: queueStats.totalMutations,
          pendingMutations: queueStats.pendingMutations,
          processingMutations: queueStats.processingMutations,
          completedMutations: queueStats.completedMutations,
          failedMutations: queueStats.failedMutations,
          conflictMutations: queueStats.conflictMutations
        },
        sync: syncStatus,
        performance: {
          apiLatency: performanceSummary.currentMetrics?.apiLatency ?? 0,
          databaseLatency: performanceSummary.currentMetrics?.databaseLatency ?? 0,
          eventProcessingLatency: performanceSummary.currentMetrics?.eventProcessingLatency ?? 0,
          uptime: performanceSummary.currentMetrics?.uptime ?? 0,
          errorRate: performanceSummary.currentMetrics?.errorRate ?? 0
        },
        conflicts: {
          total: 0, // Would be calculated from conflict engine
          resolved: 0,
          pending: 0
        }
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Create SSE connection
   */
  async createSSEConnection(
    tenantId: string,
    userId: string,
    authToken: string
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Hybrid Offline Manager not initialized');
    }

    try {
      await this.sseService.createSSEConnection(tenantId, userId, authToken);
      console.log(`SSE connection created for tenant: ${tenantId}`);
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      throw error;
    }
  }

  /**
   * Close SSE connection
   */
  closeSSEConnection(connectionId: string): void {
    this.sseService.closeSSEConnection(connectionId);
  }

  /**
   * Get performance alerts
   */
  getPerformanceAlerts() {
    return this.performanceMonitor.getAlerts(false); // Get unresolved alerts
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    return this.performanceMonitor.getRecommendations();
  }

  /**
   * Update performance targets
   */
  updatePerformanceTargets(targets: Partial<PerformanceTargets>): void {
    this.performanceMonitor.updateTargets(targets);
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('Shutting down Hybrid Offline Manager...');

      // Shutdown components
      await this.queueManager.shutdown();
      await this.sseService.shutdown();
      this.performanceMonitor.stopMonitoring();

      this.isInitialized = false;
      console.log('Hybrid Offline Manager shutdown completed');
    } catch (error) {
      console.error('Failed to shutdown Hybrid Offline Manager:', error);
      throw error;
    }
  }

  /**
   * Get auth token
   */
  private getAuthToken(): string {
    // This would get the actual auth token from storage or context
    return 'dummy-token';
  }

  /**
   * Check if manager is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get configuration
   */
  get configuration(): HybridOfflineConfig {
    return { ...this.config };
  }
}
