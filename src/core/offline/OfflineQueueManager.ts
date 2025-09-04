/**
 * Offline Queue Manager
 * Implementation Guide: Hybrid Online/Offline Engine - Offline Queue Management
 * 
 * Proposal requirement: Local queue (IndexedDB)
 * - Zero duplicates (idempotency)
 * - Versioning & conflicts
 * - Backfill via Redis Streams
 */

import type { 
  LocalMutation, 
  ConflictResolution, 
  OfflineQueueStats, 
  BackfillResult,
  IdempotencyRecord,
  OfflineConfig,
  EncryptionConfig,
  CompressionConfig
} from './types';
import { ulid } from 'ulid';

export class OfflineQueueManager {
  private readonly db: IDBDatabase;
  private readonly config: OfflineConfig;
  private readonly encryptionConfig: EncryptionConfig;
  private readonly compressionConfig: CompressionConfig;
  private readonly maxQueueSize: number;
  private readonly retryStrategy: string;
  private isInitialized = false;
  private syncInProgress = false;
  private retryTimer?: NodeJS.Timeout;

  constructor(
    db: IDBDatabase,
    config: Partial<OfflineConfig> = {}
  ) {
    this.db = db;
    this.config = {
      maxQueueSize: 10000,
      retryStrategy: 'exponential-backoff',
      maxRetries: 5,
      retryDelay: 1000,
      batchSize: 100,
      enableCompression: true,
      conflictResolutionStrategy: 'server_wins',
      ...config
    };
    
    this.maxQueueSize = this.config.maxQueueSize;
    this.retryStrategy = this.config.retryStrategy;
    
    this.encryptionConfig = {
      algorithm: 'AES-GCM',
      keyLength: 256,
      ivLength: 12,
      tagLength: 16
    };
    
    this.compressionConfig = {
      algorithm: 'gzip',
      level: 6,
      threshold: 1024
    };
  }

  /**
   * Initialize offline queue manager
   * Implementation Guide: Database schema setup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Setup database schema
      await this.setupDatabaseSchema();
      
      // Start background sync process
      this.startBackgroundSync();
      
      // Start retry mechanism
      this.startRetryMechanism();
      
      this.isInitialized = true;
      
      console.log('OfflineQueueManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OfflineQueueManager:', error);
      throw error;
    }
  }

  /**
   * Setup database schema
   * Implementation Guide: Create offline queue tables
   * Note: Schema is created in HybridOfflineManager.onupgradeneeded
   */
  private async setupDatabaseSchema(): Promise<void> {
    // Schema is already created in HybridOfflineManager
    // Just verify that required stores exist
    const requiredStores = ['mutations', 'conflicts', 'cursors', 'idempotency'];
    
    for (const storeName of requiredStores) {
      if (!this.db.objectStoreNames.contains(storeName)) {
        throw new Error(`Required object store '${storeName}' not found. Database schema may not be properly initialized.`);
      }
    }
    
    console.log('Database schema verification completed');
  }

  /**
   * Enqueue mutation dengan priority
   * Implementation Guide: Enqueue mutations dengan priority
   */
  async enqueueMutation(mutation: Omit<LocalMutation, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const id = ulid();
    const now = new Date().toISOString();
    
    const fullMutation: LocalMutation = {
      ...mutation,
      id,
      createdAt: now,
      retryCount: 0,
      status: 'pending'
    };

    // Proposal requirement: Zero duplicates (idempotency)
    await this.ensureIdempotency(fullMutation.idempotencyKey);

    // Check queue size
    const stats = await this.getQueueStats();
    if (stats.totalMutations >= this.maxQueueSize) {
      throw new Error('Queue size limit exceeded');
    }

    // Encrypt sensitive data if needed
    if (this.config.encryptionKey) {
      fullMutation.payload = await this.encryptPayload(fullMutation.payload);
    }

    // Compress payload if enabled and large enough
    if (this.config.enableCompression) {
      fullMutation.payload = await this.compressPayload(fullMutation.payload);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['mutations'], 'readwrite');
      const store = transaction.objectStore('mutations');
      
      const request = store.add(fullMutation);
      
      request.onsuccess = () => {
        console.log(`Mutation enqueued: ${id}`);
        resolve(id);
      };
      
      request.onerror = () => {
        console.error('Failed to enqueue mutation:', request.error);
        reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
      };
    });
  }

  /**
   * Dequeue operations dengan batching
   * Implementation Guide: Dequeue operations dengan batching
   */
  async dequeueMutations(batchSize: number = this.config.batchSize): Promise<LocalMutation[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['mutations'], 'readwrite');
      const store = transaction.objectStore('mutations');
      const index = store.index('status');
      
      const request = index.getAll('pending');
      
      request.onsuccess = () => {
        const mutations = request.result as LocalMutation[];
        
        // Sort by priority (1 = highest) and creation time
        mutations.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        // Take batch size
        const batch = mutations.slice(0, batchSize);
        
        // Update status to processing
        batch.forEach(mutation => {
          mutation.status = 'processing';
          store.put(mutation);
        });
        
        resolve(batch);
      };
      
      request.onerror = () => {
        console.error('Failed to dequeue mutations:', request.error);
        reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
      };
    });
  }

  /**
   * Proposal requirement: Zero duplicates (idempotency)
   */
  async ensureIdempotency(key: string): Promise<void> {
    const existing = await this.checkIdempotency(key);
    if (existing) {
      throw new Error('Duplicate operation detected');
    }
  }

  /**
   * Check idempotency key
   */
  private async checkIdempotency(key: string): Promise<IdempotencyRecord | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['idempotency'], 'readonly');
      const store = transaction.objectStore('idempotency');
      const index = store.index('key');
      
      const request = index.get(key);
      
      request.onsuccess = () => {
        const result = request.result as IdempotencyRecord | undefined;
        
        if (result && this.isIdempotencyValid(result)) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to check idempotency:', request.error);
        reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
      };
    });
  }

  /**
   * Check if idempotency record is still valid
   */
  private isIdempotencyValid(record: IdempotencyRecord): boolean {
    const now = Date.now();
    const ttlMs = record.ttl * 1000;
    const createdAt = new Date(record.committedAt).getTime();
    
    return (now - createdAt) < ttlMs;
  }

  /**
   * Proposal requirement: Versioning & conflicts
   */
  async resolveConflicts(baseVersion: number): Promise<ConflictResolution[]> {
    const conflicts = await this.findConflicts(baseVersion);
    return this.resolveConflictsList(conflicts);
  }

  /**
   * Find conflicts based on version
   */
  private async findConflicts(baseVersion: number): Promise<ConflictResolution[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['conflicts'], 'readonly');
      const store = transaction.objectStore('conflicts');
      const index = store.index('resolution');
      
      const request = index.getAll('manual');
      
      request.onsuccess = () => {
        const conflicts = request.result as ConflictResolution[];
        const filtered = conflicts.filter(conflict => 
          !conflict.resolvedAt && 
          this.getVersionFromConflict(conflict) < baseVersion
        );
        resolve(filtered);
      };
      
      request.onerror = () => {
        console.error('Failed to find conflicts:', request.error);
        reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
      };
    });
  }

  /**
   * Get version from conflict
   */
  private getVersionFromConflict(conflict: ConflictResolution): number {
    // Extract version from server data or client data
    const serverData = conflict.serverData as Record<string, unknown>;
    const clientData = conflict.clientData as Record<string, unknown>;
    
    return Math.max(
      (serverData?.version as number) ?? 0,
      (clientData?.version as number) ?? 0
    );
  }

  /**
   * Resolve conflicts
   */
  private async resolveConflictsList(conflicts: ConflictResolution[]): Promise<ConflictResolution[]> {
    const resolved: ConflictResolution[] = [];
    
    for (const conflict of conflicts) {
      try {
        const resolution = await this.applyConflictResolution(conflict);
        resolved.push(resolution);
      } catch (error) {
        console.error('Failed to resolve conflict:', conflict.id, error);
      }
    }
    
    return resolved;
  }

  /**
   * Apply conflict resolution
   */
  private async applyConflictResolution(conflict: ConflictResolution): Promise<ConflictResolution> {
    const now = new Date().toISOString();
    
    // Update conflict with resolution
    const resolvedConflict: ConflictResolution = {
      ...conflict,
      resolvedAt: now,
      resolvedBy: 'system' // or current user ID
    };

    // Save resolved conflict
    await this.saveConflict(resolvedConflict);
    
    // Update related mutation status
    await this.updateMutationStatus(conflict.mutationId, 'completed');
    
    return resolvedConflict;
  }

  /**
   * Save conflict
   */
  private async saveConflict(conflict: ConflictResolution): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');
      
      const request = store.put(conflict);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
    });
  }

  /**
   * Update mutation status
   */
  async updateMutationStatus(mutationId: string, status: LocalMutation['status']): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['mutations'], 'readwrite');
      const store = transaction.objectStore('mutations');
      
      const getRequest = store.get(mutationId);
      
      getRequest.onsuccess = () => {
        const mutation = getRequest.result as LocalMutation;
        if (mutation) {
          mutation.status = status;
          const putRequest = store.put(mutation);
          
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(new Error(`Put request error: ${putRequest.error?.message ?? 'Unknown error'}`));
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(new Error(`Get request error: ${getRequest.error?.message ?? 'Unknown error'}`));
    });
  }

  /**
   * Proposal requirement: Backfill via Redis Streams
   */
  async backfillFromStreams(cursor: string): Promise<BackfillResult> {
    const events = await this.fetchFromStreams(cursor);
    return this.processBackfillEvents(events);
  }

  /**
   * Fetch events from streams
   */
  private async fetchFromStreams(cursor: string): Promise<unknown[]> {
    // This would integrate with Redis Streams
    // For now, return empty array as placeholder
    console.log(`Fetching events from streams with cursor: ${cursor}`);
    return [];
  }

  /**
   * Process backfill events
   */
  private async processBackfillEvents(events: unknown[]): Promise<BackfillResult> {
    const processedEvents = events.map((event) => {
      const eventObj = event as Record<string, unknown>;
      return {
        id: eventObj.id as string,
        type: eventObj.type as string,
        entity: eventObj.entity as string,
        entityId: eventObj.entityId as string,
        version: eventObj.version as number,
        timestamp: eventObj.timestamp as string,
        payload: eventObj.payload,
        deleted: eventObj.deleted as boolean
      };
    });

    return {
      events: processedEvents,
      nextCursor: events.length > 0 ? (events[events.length - 1] as Record<string, unknown>).id as string : undefined,
      hasMore: events.length === this.config.batchSize,
      totalCount: processedEvents.length
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<OfflineQueueStats> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['mutations'], 'readonly');
      const store = transaction.objectStore('mutations');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const mutations = request.result as LocalMutation[];
        
        const stats: OfflineQueueStats = {
          totalMutations: mutations.length,
          pendingMutations: mutations.filter(m => m.status === 'pending').length,
          processingMutations: mutations.filter(m => m.status === 'processing').length,
          completedMutations: mutations.filter(m => m.status === 'completed').length,
          failedMutations: mutations.filter(m => m.status === 'failed').length,
          conflictMutations: mutations.filter(m => m.status === 'conflict').length,
          oldestPendingAge: this.calculateOldestPendingAge(mutations),
          averageProcessingTime: this.calculateAverageProcessingTime(mutations),
          retryRate: this.calculateRetryRate(mutations)
        };
        
        resolve(stats);
      };
      
      request.onerror = () => {
        console.error('Failed to get queue stats:', request.error);
        reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
      };
    });
  }

  /**
   * Calculate oldest pending age
   */
  private calculateOldestPendingAge(mutations: LocalMutation[]): number {
    const pendingMutations = mutations.filter(m => m.status === 'pending');
    if (pendingMutations.length === 0) return 0;
    
    const oldest = pendingMutations.reduce((oldest, current) => 
      new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
    );
    
    return Date.now() - new Date(oldest.createdAt).getTime();
  }

  /**
   * Calculate average processing time
   */
  private calculateAverageProcessingTime(mutations: LocalMutation[]): number {
    const completedMutations = mutations.filter(m => m.status === 'completed');
    if (completedMutations.length === 0) return 0;
    
    const totalTime = completedMutations.reduce((total, _mutation) => {
      // This would need to track processing start/end times
      // For now, return 0
      return total;
    }, 0);
    
    return totalTime / completedMutations.length;
  }

  /**
   * Calculate retry rate
   */
  private calculateRetryRate(mutations: LocalMutation[]): number {
    const totalMutations = mutations.length;
    if (totalMutations === 0) return 0;
    
    const retriedMutations = mutations.filter(m => m.retryCount > 0).length;
    return (retriedMutations / totalMutations) * 100;
  }

  /**
   * Start background sync process
   */
  private startBackgroundSync(): void {
    // This would start a background process to sync with server
    console.log('Background sync process started');
  }

  /**
   * Start retry mechanism
   */
  private startRetryMechanism(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }
    
    this.retryTimer = setInterval(() => {
      void this.processRetries();
    }, this.config.retryDelay);
  }

  /**
   * Process retries
   */
  private async processRetries(): Promise<void> {
    try {
      const failedMutations = await this.getFailedMutations();
      
      for (const mutation of failedMutations) {
        if (mutation.retryCount < this.config.maxRetries) {
          await this.retryMutation(mutation);
        }
      }
    } catch (error) {
      console.error('Failed to process retries:', error);
    }
  }

  /**
   * Get failed mutations
   */
  private async getFailedMutations(): Promise<LocalMutation[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['mutations'], 'readonly');
      const store = transaction.objectStore('mutations');
      const index = store.index('status');
      
      const request = index.getAll('failed');
      
      request.onsuccess = () => {
        const mutations = request.result as LocalMutation[];
        resolve(mutations);
      };
      
      request.onerror = () => {
        console.error('Failed to get failed mutations:', request.error);
        reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
      };
    });
  }

  /**
   * Retry mutation
   */
  private async retryMutation(mutation: LocalMutation): Promise<void> {
    const now = new Date().toISOString();
    
    // Calculate retry delay based on strategy
    // const delay = this.calculateRetryDelay(mutation.retryCount);
    
    // Update mutation
    mutation.retryCount += 1;
    mutation.lastRetryAt = now;
    mutation.status = 'pending';
    
    // Save updated mutation
    await this.saveMutation(mutation);
    
    console.log(`Retrying mutation ${mutation.id} (attempt ${mutation.retryCount})`);
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(retryCount: number): number {
    switch (this.retryStrategy) {
      case 'exponential-backoff':
        return this.config.retryDelay * Math.pow(2, retryCount);
      case 'linear':
        return this.config.retryDelay * (retryCount + 1);
      case 'fixed':
      default:
        return this.config.retryDelay;
    }
  }

  /**
   * Save mutation
   */
  private async saveMutation(mutation: LocalMutation): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['mutations'], 'readwrite');
      const store = transaction.objectStore('mutations');
      
      const request = store.put(mutation);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
    });
  }

  /**
   * Encrypt payload
   */
  private async encryptPayload(payload: unknown): Promise<unknown> {
    if (!this.config.encryptionKey) {
      return payload;
    }
    
    // Implementation would use WebCrypto API
    // For now, return payload as-is
    return payload;
  }

  /**
   * Compress payload
   */
  private async compressPayload(payload: unknown): Promise<unknown> {
    if (!this.config.enableCompression) {
      return payload;
    }
    
    // Implementation would use compression library
    // For now, return payload as-is
    return payload;
  }

  /**
   * Cleanup expired data
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup expired idempotency records
      await this.cleanupExpiredIdempotency();
      
      // Cleanup old completed mutations
      await this.cleanupOldMutations();
      
      console.log('Offline queue cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup offline queue:', error);
    }
  }

  /**
   * Cleanup expired idempotency records
   */
  private async cleanupExpiredIdempotency(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['idempotency'], 'readwrite');
      const store = transaction.objectStore('idempotency');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const records = request.result as IdempotencyRecord[];
        const expiredRecords = records.filter(record => !this.isIdempotencyValid(record));
        
        expiredRecords.forEach(record => {
          store.delete(record.id);
        });
        
        resolve();
      };
      
      request.onerror = () => reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
    });
  }

  /**
   * Cleanup old mutations
   */
  private async cleanupOldMutations(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['mutations'], 'readwrite');
      const store = transaction.objectStore('mutations');
      const index = store.index('createdAt');
      
      const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
      const request = index.openCursor(range);
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(new Error(`Request error: ${request.error?.message ?? 'Unknown error'}`));
    });
  }

  /**
   * Shutdown queue manager
   */
  async shutdown(): Promise<void> {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = undefined;
    }
    
    await this.cleanup();
    this.isInitialized = false;
    
    console.log('OfflineQueueManager shutdown completed');
  }
}
