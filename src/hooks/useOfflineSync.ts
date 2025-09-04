/**
 * Offline Sync Hook
 * Integration between HybridOfflineManager and React UI
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { HybridOfflineManager } from '@/core/offline';
import type { 
  HybridOfflineStats, 
  LocalMutation, 
  ConflictResolution,
  PerformanceMetrics 
} from '@/core/offline';

export interface OfflineSyncState {
  isOnline: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
  stats: HybridOfflineStats | null;
  performance: PerformanceMetrics | null;
  conflicts: ConflictResolution[];
  pendingMutations: LocalMutation[];
  error: string | null;
}

export interface OfflineSyncActions {
  initialize: () => Promise<void>;
  sync: () => Promise<void>;
  retryMutation: (mutationId: string) => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'server_wins' | 'client_override' | 'field_merge' | 'manual') => Promise<void>;
  clearError: () => void;
  forceSync: () => Promise<void>;
}

export function useOfflineSync(_tenantId: string, _userId: string): OfflineSyncState & OfflineSyncActions {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    isInitialized: false,
    isSyncing: false,
    stats: null,
    performance: null,
    conflicts: [],
    pendingMutations: [],
    error: null
  });

  const managerRef = useRef<HybridOfflineManager | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update stats and state
  const updateStats = useCallback(async () => {
    if (!managerRef.current) return;

    try {
      // Check if manager is initialized before calling getStats
      if (!managerRef.current.initialized) {
        console.log('Manager not yet initialized, skipping stats update');
        return;
      }

      const [stats, performance] = await Promise.all([
        managerRef.current.getStats(),
        managerRef.current.getPerformanceAlerts()
      ]);

      // Get conflicts and pending mutations from stats
      const conflicts = (stats as unknown as Record<string, unknown>).conflicts as ConflictResolution[] ?? [];
      const pendingMutations = (stats as unknown as Record<string, unknown>).pendingMutations as LocalMutation[] ?? [];

      setState(prev => ({
        ...prev,
        stats,
        performance: performance as unknown as PerformanceMetrics,
        conflicts,
        pendingMutations,
        error: null
      }));
    } catch (error) {
      console.error('Failed to update stats:', error);
      // Don't set error state for initialization issues
      if (error instanceof Error && error.message.includes('not initialized')) {
        console.log('Manager not initialized yet, will retry later');
        return;
      }
    }
  }, []);

  // Initialize HybridOfflineManager
  const initialize = useCallback(async () => {
    try {
      if (managerRef.current) {
        return; // Already initialized
      }

      const manager = new HybridOfflineManager({
        offline: {
          maxQueueSize: 1000,
          batchSize: 50,
          retryDelay: 1000,
          enableCompression: true,
          retryStrategy: 'exponential-backoff',
          maxRetries: 3,
          conflictResolutionStrategy: 'server_wins'
        },
        sse: {
          heartbeatInterval: 15000,
          maxReconnectAttempts: 5,
          reconnectDelay: 2000,
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
        enablePerformanceMonitoring: true
      });

      await manager.initialize();
      managerRef.current = manager;

      setState(prev => ({
        ...prev,
        isInitialized: true,
        error: null
      }));

      // Start periodic updates after initialization
      intervalRef.current = setInterval(() => {
        void updateStats();
      }, 5000);

      // Initial stats update
      await updateStats();
    } catch (error) {
      console.error('Failed to initialize offline sync:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize offline sync'
      }));
    }
  }, [updateStats]);

  // Sync mutations
  const sync = useCallback(async () => {
    if (!managerRef.current || state.isSyncing) return;

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));
      // TODO: Implement sync method in HybridOfflineManager
      // await managerRef.current.sync();
      await updateStats();
    } catch (error) {
      console.error('Sync failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sync failed'
      }));
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isSyncing, updateStats]);

  // Force sync
  const forceSync = useCallback(async () => {
    if (!managerRef.current) return;

    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));
      // TODO: Implement forceSync method in HybridOfflineManager
      // await managerRef.current.forceSync();
      await updateStats();
    } catch (error) {
      console.error('Force sync failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Force sync failed'
      }));
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [updateStats]);

  // Retry mutation
  const retryMutation = useCallback(async (_mutationId: string) => {
    if (!managerRef.current) return;

    try {
      // TODO: Implement retryMutation method in HybridOfflineManager
      // await managerRef.current.retryMutation(mutationId);
      await updateStats();
    } catch (error) {
      console.error('Retry mutation failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Retry mutation failed'
      }));
    }
  }, [updateStats]);

  // Resolve conflict
  const resolveConflict = useCallback(async (_conflictId: string, _resolution: 'server_wins' | 'client_override' | 'field_merge' | 'manual') => {
    if (!managerRef.current) return;

    try {
      // TODO: Implement resolveConflict method in HybridOfflineManager
      // await managerRef.current.resolveConflict(conflictId, resolution);
      await updateStats();
    } catch (error) {
      console.error('Resolve conflict failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Resolve conflict failed'
      }));
    }
  }, [updateStats]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (managerRef.current) {
        void managerRef.current.shutdown();
      }
    };
  }, []);

  return {
    ...state,
    initialize,
    sync,
    retryMutation,
    resolveConflict,
    clearError,
    forceSync
  };
}
