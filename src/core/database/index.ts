/**
 * Enterprise Database Layer
 * High-performance database utilities for large data volumes
 */

export interface DatabaseConfig {
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  batchSize: number;
  retryAttempts: number;
}

export const DATABASE_CONFIG: DatabaseConfig = {
  maxConnections: process.env.NODE_ENV === 'production' ? 100 : 10,
  connectionTimeout: 30000,
  queryTimeout: 60000,
  batchSize: 1000,
  retryAttempts: 3,
};

/**
 * Pagination utilities for large datasets
 */
export interface CursorPagination {
  cursor?: string;
  limit: number;
  direction: 'forward' | 'backward';
}

export interface OffsetPagination {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Query performance monitoring
 */
export interface QueryMetrics {
  query: string;
  duration: number;
  rowsAffected: number;
  timestamp: Date;
  userId?: string;
}

/**
 * Database connection pool management
 */
export class ConnectionPool {
  private static instance: ConnectionPool;
  private activeConnections = 0;
  private maxConnections: number;

  private constructor(config: DatabaseConfig) {
    this.maxConnections = config.maxConnections;
  }

  static getInstance(config: DatabaseConfig): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool(config);
    }
    return ConnectionPool.instance;
  }

  async acquire(): Promise<boolean> {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return true;
    }
    return false;
  }

  release(): void {
    if (this.activeConnections > 0) {
      this.activeConnections--;
    }
  }

  getStats() {
    return {
      active: this.activeConnections,
      max: this.maxConnections,
      utilization: (this.activeConnections / this.maxConnections) * 100,
    };
  }
}

/**
 * Batch processing utilities
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize = DATABASE_CONFIG.batchSize
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Database health check
 */
export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  metrics: {
    queriesPerSecond: number;
    averageQueryTime: number;
    errorRate: number;
  };
}

/**
 * Query optimization hints
 */
export interface QueryHints {
  useIndex?: string[];
  skipCache?: boolean;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Audit trail for enterprise compliance
 */
export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}
