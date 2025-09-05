/**
 * Offline/Hybrid System Module
 * Implementation Guide: Hybrid Online/Offline Engine
 * 
 * This module provides:
 * - OfflineQueueManager: Local queue management with IndexedDB
 * - ConflictResolutionEngine: Conflict detection and resolution
 * - SSEBackfillService: Server-Sent Events and backfill mechanism
 * - PerformanceMonitor: Performance monitoring and optimization
 */

// Export types
export type {
  LocalMutation,
  ConflictResolution,
  OfflineQueueStats,
  SyncCursor,
  BackfillRequest,
  BackfillResult,
  IdempotencyRecord,
  OfflineConfig,
  QueueOperation,
  DeviceSyncStatus,
  EncryptionConfig,
  CompressionConfig
} from './types';

export type {
  ConflictDetectionResult,
  ResolutionStrategy,
  FieldMergeRule
} from './ConflictResolutionEngine';

export type {
  SSEConnection,
  BackfillOptions,
  SSEConfig
} from './SSEBackfillService';

export type {
  PerformanceTargets,
  PerformanceMetrics,
  PerformanceAlert,
  OptimizationRecommendation
} from './PerformanceMonitor';

export type {
  HybridOfflineConfig,
  HybridOfflineStats
} from './HybridOfflineManager';

// Export classes
export { OfflineQueueManager } from './OfflineQueueManager';
export { ConflictResolutionEngine } from './ConflictResolutionEngine';
export { SSEBackfillService } from './SSEBackfillService';
export { PerformanceMonitor } from './PerformanceMonitor';
export { HybridOfflineManager } from './HybridOfflineManager';
export { ErrorReporting } from './ErrorReporting';
export { RedisStreamsIntegration } from './RedisStreamsIntegration';

// Export utility functions
export {
  generateIdempotencyKey,
  generateULID,
  createDefaultOfflineConfig,
  createMutation,
  validateMutation,
  getMutationPriorityScore,
  calculateRetryDelay,
  shouldRetryMutation,
  deepClone,
  extractTimestamp,
  createErrorWithContext,
  retryWithBackoff,
  debounce,
  throttle
} from './utils';
