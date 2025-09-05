/**
 * Offline/Hybrid System Types
 * Implementation Guide: Hybrid Online/Offline Engine
 */

export interface LocalMutation {
  id: string;                    // ULID/UUID
  kind: string;                  // 'ops.logUsage' | 'mnt.closeWO' | 'inv.createPR' | string
  payload: unknown;              // Event data
  idempotencyKey: string;        // UUID v4
  baseVersion?: number;          // Client's last-known record version
  createdAt: string;             // ISO-8601
  priority: number;              // Priority level (1-10, 1 = highest)
  retryCount: number;            // Number of retry attempts
  lastRetryAt?: string;          // Last retry timestamp
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';
  tenantId: string;              // Tenant identifier
  userId: string;                // User identifier
}

export interface ConflictResolution {
  id: string;
  mutationId: string;
  conflictType: 'version_mismatch' | 'data_conflict' | 'server_override';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  serverData: unknown;
  clientData: unknown;
  conflictingFields?: string[];
  resolution: 'server_wins' | 'client_override' | 'field_merge' | 'manual' | 'adjustment';
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface OfflineQueueStats {
  totalMutations: number;
  pendingMutations: number;
  processingMutations: number;
  completedMutations: number;
  failedMutations: number;
  conflictMutations: number;
  oldestPendingAge: number;      // milliseconds
  averageProcessingTime: number; // milliseconds
  retryRate: number;             // percentage
}

export interface SyncCursor {
  tenantId: string;
  lastEventId: string;           // ULID/Redis Stream ID
  lastSyncAt: string;            // ISO-8601
  version: number;               // Cursor version
}

export interface BackfillRequest {
  tenantId: string;
  cursor: string;
  limit: number;
  includeDeleted?: boolean;
}

export interface BackfillResult {
  events: Array<{
    id: string;
    type: string;
    entity: string;
    entityId: string;
    version: number;
    timestamp: string;
    payload: unknown;
    deleted?: boolean;
  }>;
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
}

export interface IdempotencyRecord {
  id: string;
  tenantId: string;
  userId: string;
  key: string;
  hash: string;
  result: unknown;
  committedAt: string;
  ttl: number;                   // TTL in seconds
}

export interface OfflineConfig {
  maxQueueSize: number;          // Default: 10000
  retryStrategy: 'exponential-backoff' | 'linear' | 'fixed';
  maxRetries: number;            // Default: 5
  retryDelay: number;            // Base delay in ms
  batchSize: number;             // Batch size for sync
  encryptionKey?: string;        // Encryption key for sensitive data
  enableCompression: boolean;    // Enable payload compression
  conflictResolutionStrategy: 'server_wins' | 'client_override' | 'manual';
}

export interface QueueOperation {
  type: 'enqueue' | 'dequeue' | 'retry' | 'resolve_conflict';
  mutation?: LocalMutation;
  mutations?: LocalMutation[];
  conflictId?: string;
  resolution?: ConflictResolution;
  timestamp: string;
}

export interface OfflineSyncStatus {
  isOnline: boolean;
  lastSyncAt?: string;
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  conflictCount: number;
  nextRetryAt?: string;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface EncryptionConfig {
  algorithm: string;             // 'AES-GCM'
  keyLength: number;             // 256
  ivLength: number;              // 12
  tagLength: number;             // 16
}

export interface CompressionConfig {
  algorithm: 'gzip' | 'deflate' | 'brotli';
  level: number;                 // Compression level (1-9)
  threshold: number;             // Minimum size to compress (bytes)
}

// Device Management Types
export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
  platform: DevicePlatform;
  version: string;
  lastSeen: Date;
  isOnline: boolean;
  syncStatus: DeviceSyncStatus;
  capabilities: DeviceCapabilities;
  metadata: DeviceMetadata;
}

export interface DeviceCapabilities {
  offlineSupport: boolean;
  backgroundSync: boolean;
  pushNotifications: boolean;
  camera: boolean;
  gps: boolean;
  storage: number; // in MB
}

export interface DeviceMetadata {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  networkType: string;
  batteryLevel?: number;
  storageUsed: number;
  storageTotal: number;
}

export enum DeviceType {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  SERVER = 'server',
  IOT = 'iot'
}

export enum DevicePlatform {
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web'
}

export enum DeviceSyncStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SYNCING = 'syncing',
  ERROR = 'error',
  PENDING = 'pending'
}

export interface DeviceSyncEvent {
  deviceId: string;
  eventType: 'connect' | 'disconnect' | 'sync_start' | 'sync_complete' | 'sync_error';
  timestamp: Date;
  data?: any;
}

export interface DeviceRegistration {
  deviceId: string;
  userId: string;
  tenantId: string;
  deviceInfo: DeviceInfo;
  registeredAt: Date;
  lastActive: Date;
  isActive: boolean;
}
