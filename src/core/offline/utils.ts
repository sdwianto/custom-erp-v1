/**
 * Offline/Hybrid System Utilities
 * Implementation Guide: Hybrid Online/Offline Engine
 */

import type { LocalMutation, OfflineConfig } from './types';

/**
 * Generate idempotency key
 */
export function generateIdempotencyKey(): string {
  return `idempotency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate ULID
 */
export function generateULID(): string {
  return `ulid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default offline config
 */
export function createDefaultOfflineConfig(): OfflineConfig {
  return {
    maxQueueSize: 10000,
    retryStrategy: 'exponential-backoff',
    maxRetries: 5,
    retryDelay: 1000,
    batchSize: 100,
    enableCompression: true,
    conflictResolutionStrategy: 'server_wins'
  };
}

/**
 * Validate mutation data
 */
export function validateMutation(mutation: Partial<LocalMutation>): string[] {
  const errors: string[] = [];

  if (!mutation.id) {
    errors.push('Mutation ID is required');
  }

  if (!mutation.kind) {
    errors.push('Mutation kind is required');
  }

  if (!mutation.payload) {
    errors.push('Mutation payload is required');
  }

  if (!mutation.idempotencyKey) {
    errors.push('Idempotency key is required');
  }

  if (!mutation.tenantId) {
    errors.push('Tenant ID is required');
  }

  if (!mutation.userId) {
    errors.push('User ID is required');
  }

  if (mutation.priority && (mutation.priority < 1 || mutation.priority > 10)) {
    errors.push('Priority must be between 1 and 10');
  }

  return errors;
}

/**
 * Create mutation from data
 */
export function createMutation(data: {
  kind: string;
  payload: unknown;
  tenantId: string;
  userId: string;
  baseVersion?: number;
  priority?: number;
}): LocalMutation {
  return {
    id: generateULID(),
    kind: data.kind,
    payload: data.payload,
    idempotencyKey: generateIdempotencyKey(),
    baseVersion: data.baseVersion,
    createdAt: new Date().toISOString(),
    priority: data.priority ?? 5,
    retryCount: 0,
    status: 'pending',
    tenantId: data.tenantId,
    userId: data.userId
  };
}

/**
 * Calculate retry delay
 */
export function calculateRetryDelay(
  retryCount: number,
  strategy: 'exponential-backoff' | 'linear' | 'fixed' = 'exponential-backoff',
  baseDelay = 1000
): number {
  switch (strategy) {
    case 'exponential-backoff':
      return baseDelay * Math.pow(2, retryCount);
    case 'linear':
      return baseDelay * (retryCount + 1);
    case 'fixed':
    default:
      return baseDelay;
  }
}

/**
 * Check if mutation should be retried
 */
export function shouldRetryMutation(
  mutation: LocalMutation,
  maxRetries = 5
): boolean {
  return mutation.retryCount < maxRetries && mutation.status === 'failed';
}

/**
 * Get mutation priority score
 */
export function getMutationPriorityScore(mutation: LocalMutation): number {
  // Higher priority = lower score (1 = highest priority)
  const priorityScore = 11 - mutation.priority;
  
  // Age factor (older mutations get higher priority)
  const ageMs = Date.now() - new Date(mutation.createdAt).getTime();
  const ageScore = Math.min(ageMs / 60000, 10); // Max 10 points for age
  
  return priorityScore + ageScore;
}

/**
 * Sort mutations by priority
 */
export function sortMutationsByPriority(mutations: LocalMutation[]): LocalMutation[] {
  return mutations.sort((a, b) => {
    const scoreA = getMutationPriorityScore(a);
    const scoreB = getMutationPriorityScore(b);
    return scoreB - scoreA; // Higher score first
  });
}

/**
 * Check if data is mergeable
 */
export function isMergeableData(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  
  // Check if object has mergeable fields
  const mergeableFields = ['notes', 'tags', 'comments', 'attachments'];
  return mergeableFields.some(field => field in obj);
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return (obj as unknown[]).map(item => deepClone(item)) as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Compare objects deeply
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  
  if (a === null || b === null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    
    if (aKeys.length !== bKeys.length) return false;
    
    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (!deepEqual(aObj[key], bObj[key])) return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Extract version from data
 */
export function extractVersion(data: unknown): number {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    return typeof obj.version === 'number' ? obj.version : 0;
  }
  return 0;
}

/**
 * Extract timestamp from data
 */
export function extractTimestamp(data: unknown): number {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const timestamp = obj.updatedAt ?? obj.createdAt;
    if (typeof timestamp === 'string') {
      return new Date(timestamp).getTime();
    }
  }
  return 0;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate correlation ID
 */
export function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if browser supports IndexedDB
 */
export function supportsIndexedDB(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Check if browser supports WebCrypto
 */
export function supportsWebCrypto(): boolean {
  return typeof window !== 'undefined' && 'crypto' in window && 'subtle' in window.crypto;
}

/**
 * Check if browser supports Service Worker
 */
export function supportsServiceWorker(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Get browser capabilities
 */
export function getBrowserCapabilities(): {
  indexedDB: boolean;
  webCrypto: boolean;
  serviceWorker: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
} {
  return {
    indexedDB: supportsIndexedDB(),
    webCrypto: supportsWebCrypto(),
    serviceWorker: supportsServiceWorker(),
    localStorage: typeof window !== 'undefined' && 'localStorage' in window,
    sessionStorage: typeof window !== 'undefined' && 'sessionStorage' in window
  };
}

/**
 * Create error with context
 */
export function createErrorWithContext(
  message: string,
  context: Record<string, unknown> = {}
): Error {
  const error = new Error(message);
  (error as Error & { context: Record<string, unknown> }).context = context;
  return error;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = calculateRetryDelay(attempt, 'exponential-backoff', baseDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args) as void, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args) as void;
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
