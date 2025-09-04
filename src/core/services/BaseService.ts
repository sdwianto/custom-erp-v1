import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { Logger } from './Logger';

/**
 * Base Service Class - Enterprise-grade foundation for all business services
 * Follows JDE patterns and Implementation Guide requirements
 */
export abstract class BaseService<T = unknown> {
  protected readonly prisma: PrismaClient;
  protected readonly redis: Redis;
  protected readonly logger: Logger;
  protected readonly tenantId: string;

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    logger: Logger,
    tenantId: string
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
    this.tenantId = tenantId;
  }

  /**
   * Execute optimized database queries with performance tracking
   * Implementation Guide: Performance targets p95 ≤ 100ms
   */
  protected async executeQuery<T>(
    query: string,
    params: unknown[],
    operation: string
  ): Promise<T[]> {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId();
    
    try {
      this.logger.info(`Executing query: ${operation}`, {
        correlationId,
        tenantId: this.tenantId,
        query: query.substring(0, 100) + '...',
        params: params.length
      });

      const result = await this.prisma.$queryRawUnsafe<T[]>(query, ...params);
      
      const executionTime = Date.now() - startTime;
      this.recordQueryLatency(operation, executionTime);
      
      if (executionTime > 100) {
        this.logger.warn(`Slow query detected: ${operation}`, {
          correlationId,
          executionTime,
          threshold: 100
        });
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Query execution failed: ${operation}`, {
        correlationId,
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });
      throw error;
    }
  }

  /**
   * Batch processing for high-volume operations
   * Implementation Guide: Handle 1M+ records per table
   */
  protected async batchProcess<T>(
    items: T[],
    processor: (batch: T[]) => Promise<void>,
    batchSize = 1000
  ): Promise<void> {
    const totalBatches = Math.ceil(items.length / batchSize);
    this.logger.info(`Starting batch processing`, {
      tenantId: this.tenantId,
      totalItems: items.length,
      batchSize,
      totalBatches
    });

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      try {
        await processor(batch);
        this.logger.debug(`Batch ${batchNumber}/${totalBatches} completed`, {
          tenantId: this.tenantId,
          batchSize: batch.length
        });
      } catch (error) {
        this.logger.error(`Batch ${batchNumber}/${totalBatches} failed`, {
          tenantId: this.tenantId,
          batchSize: batch.length,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  }

  /**
   * Caching strategy with Redis
   * Implementation Guide: Cache hit rate > 80%
   */
  protected async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 3600
  ): Promise<T> {
    const cacheKey = `tenant:${this.tenantId}:${key}`;
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for key: ${key}`, {
          tenantId: this.tenantId,
          cacheKey
        });
        return JSON.parse(cached) as T;
      }

      this.logger.debug(`Cache miss for key: ${key}`, {
        tenantId: this.tenantId,
        cacheKey
      });

      const data = await fetcher();
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
      
      return data;
    } catch (error) {
      this.logger.warn(`Cache operation failed for key: ${key}`, {
        tenantId: this.tenantId,
        cacheKey,
        error: error instanceof Error ? error.message : String(error)
      });
      // Fallback to direct fetch on cache failure
      return await fetcher();
    }
  }

  /**
   * Invalidate cache for specific patterns
   */
  protected async invalidateCache(pattern: string): Promise<void> {
    const cachePattern = `tenant:${this.tenantId}:${pattern}`;
    try {
      const keys = await this.redis.keys(cachePattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cache invalidated for pattern: ${pattern}`, {
          tenantId: this.tenantId,
          pattern: cachePattern,
          keysCount: keys.length
        });
      }
    } catch (error) {
      this.logger.warn(`Cache invalidation failed for pattern: ${pattern}`, {
        tenantId: this.tenantId,
        pattern: cachePattern,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Generate correlation ID for request tracing
   * Implementation Guide: Telemetry with correlationId
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record query performance metrics
   * Implementation Guide: Performance monitoring and SLOs
   */
  private recordQueryLatency(operation: string, executionTime: number): void {
    // Record metrics for monitoring (can be extended with actual metrics system)
    this.logger.debug(`Query performance recorded`, {
      tenantId: this.tenantId,
      operation,
      executionTime,
      performance: executionTime <= 100 ? 'good' : executionTime <= 300 ? 'warning' : 'critical'
    });
  }

  /**
   * Validate tenant context
   * Implementation Guide: Multi-tenancy with tenant-scoped operations
   */
  protected validateTenantContext(): void {
    if (!this.tenantId) {
      throw new Error('Tenant context is required for all operations');
    }
  }

  /**
   * Get tenant-scoped cache key
   */
  protected getTenantCacheKey(key: string): string {
    return `tenant:${this.tenantId}:${key}`;
  }
}
