import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { Logger } from './Logger';
import { BaseService } from './BaseService';

/**
 * Cache Service - Enterprise-grade Redis operations and caching strategies
 * Follows Implementation Guide requirements for caching and performance optimization
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
  compression?: boolean; // Enable compression for large values
}

export interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
  hitRate: number;
  missRate: number;
  evictedKeys: number;
}

export interface CacheKey {
  pattern: string;
  keys: string[];
  count: number;
}

/**
 * Cache Service Class
 * Implementation Guide: Cache hit rate > 80%
 */
export class CacheService extends BaseService {
  private readonly defaultTTL: number = 3600; // 1 hour
  private readonly defaultPrefix: string = 'erp';

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    logger: Logger,
    tenantId: string
  ) {
    super(prisma, redis, logger, tenantId);
  }

  /**
   * Set cache value with options
   */
  async set(
    key: string,
    value: unknown,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      this.validateTenantContext();

      const cacheKey = this.buildCacheKey(key, options.prefix);
      const ttl = options.ttl ?? this.defaultTTL;
      
      let serializedValue: string;
      
      if (options.compression && JSON.stringify(value).length > 1024) {
        // TODO: Implement compression for large values
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = JSON.stringify(value);
      }

      await this.redis.setex(cacheKey, ttl, serializedValue);

      this.logger.debug('Cache value set', {
        tenantId: this.tenantId,
        key: cacheKey,
        ttl,
        valueSize: serializedValue.length
      });

    } catch (error) {
      this.logger.error('Failed to set cache value', {
        tenantId: this.tenantId,
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    try {
      this.validateTenantContext();

      const cacheKey = this.buildCacheKey(key, prefix);
      
      const value = await this.redis.get(cacheKey);
      
      if (value === null) {
        this.logger.debug('Cache miss', {
          tenantId: this.tenantId,
          key: cacheKey
        });
        return null;
      }

      this.logger.debug('Cache hit', {
        tenantId: this.tenantId,
        key: cacheKey,
        valueSize: value.length
      });

      return JSON.parse(value) as T;

    } catch (error) {
      this.logger.error('Failed to get cache value', {
        tenantId: this.tenantId,
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return null; // Return null on error to allow fallback
    }
  }

  /**
   * Get or set cache value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      this.validateTenantContext();

      const cacheKey = this.buildCacheKey(key, options.prefix);
      
      // Try to get from cache first
      const cached = await this.get<T>(key, options.prefix);
      if (cached !== null) {
        return cached;
      }

      // Fetch from source if not in cache
      const value = await fetcher();
      
      // Store in cache
      await this.set(key, value, options);
      
      return value;

    } catch (error) {
      this.logger.error('Failed to get or set cache value', {
        tenantId: this.tenantId,
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback to direct fetch on cache failure
      return await fetcher();
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string, prefix?: string): Promise<void> {
    try {
      this.validateTenantContext();

      const cacheKey = this.buildCacheKey(key, prefix);
      await this.redis.del(cacheKey);

      this.logger.debug('Cache key deleted', {
        tenantId: this.tenantId,
        key: cacheKey
      });

    } catch (error) {
      this.logger.error('Failed to delete cache key', {
        tenantId: this.tenantId,
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete multiple cache keys by pattern
   */
  async deleteByPattern(pattern: string, prefix?: string): Promise<number> {
    try {
      this.validateTenantContext();

      const cachePattern = this.buildCacheKey(pattern, prefix);
      const keys = await this.redis.keys(cachePattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      this.logger.debug('Cache keys deleted by pattern', {
        tenantId: this.tenantId,
        pattern: cachePattern,
        deletedCount: keys.length
      });

      return keys.length;

    } catch (error) {
      this.logger.error('Failed to delete cache keys by pattern', {
        tenantId: this.tenantId,
        pattern,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      this.validateTenantContext();

      const cacheKey = this.buildCacheKey(key, prefix);
      const result = await this.redis.exists(cacheKey);
      
      return result === 1;

    } catch (error) {
      this.logger.error('Failed to check cache key existence', {
        tenantId: this.tenantId,
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Set multiple cache values
   */
  async mset(
    keyValuePairs: Record<string, unknown>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      this.validateTenantContext();

      const ttl = options.ttl ?? this.defaultTTL;
      const pipeline = this.redis.pipeline();

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const cacheKey = this.buildCacheKey(key, options.prefix);
        const serializedValue = JSON.stringify(value);
        
        pipeline.setex(cacheKey, ttl, serializedValue);
      }

      await pipeline.exec();

      this.logger.debug('Multiple cache values set', {
        tenantId: this.tenantId,
        count: Object.keys(keyValuePairs).length,
        ttl
      });

    } catch (error) {
      this.logger.error('Failed to set multiple cache values', {
        tenantId: this.tenantId,
        count: Object.keys(keyValuePairs).length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get multiple cache values
   */
  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    try {
      this.validateTenantContext();

      const cacheKeys = keys.map(key => this.buildCacheKey(key, prefix));
      const values = await this.redis.mget(...cacheKeys);

      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });

    } catch (error) {
      this.logger.error('Failed to get multiple cache values', {
        tenantId: this.tenantId,
        keyCount: keys.length,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return null values on error
      return keys.map(() => null);
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, amount = 1, prefix?: string): Promise<number> {
    try {
      this.validateTenantContext();

      const cacheKey = this.buildCacheKey(key, prefix);
      const result = await this.redis.incrby(cacheKey, amount);

      this.logger.debug('Cache counter incremented', {
        tenantId: this.tenantId,
        key: cacheKey,
        amount,
        result
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to increment cache counter', {
        tenantId: this.tenantId,
        key,
        amount,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttl: number, prefix?: string): Promise<boolean> {
    try {
      this.validateTenantContext();

      const cacheKey = this.buildCacheKey(key, prefix);
      const result = await this.redis.expire(cacheKey, ttl);

      this.logger.debug('Cache key expiration set', {
        tenantId: this.tenantId,
        key: cacheKey,
        ttl,
        result
      });

      return result === 1;

    } catch (error) {
      this.logger.error('Failed to set cache key expiration', {
        tenantId: this.tenantId,
        key,
        ttl,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      this.validateTenantContext();

      const info = await this.redis.info('stats');
      const memory = await this.redis.info('memory');
      
      // Parse Redis info output
      const stats: Record<string, any> = {};
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      const memoryStats: Record<string, any> = {};
      memory.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          memoryStats[key] = value;
        }
      });

      const totalKeys = parseInt((stats.keyspace_hits as string) ?? '0') + parseInt((stats.keyspace_misses as string) ?? '0');
      const hitRate = totalKeys > 0 ? parseInt((stats.keyspace_hits as string) ?? '0') / totalKeys : 0;
      const missRate = 1 - hitRate;

      return {
        totalKeys: parseInt((stats.db0 as string) ?? '0'),
        memoryUsage: (memoryStats.used_memory_human as string) ?? '0B',
        hitRate: Math.round(hitRate * 100) / 100,
        missRate: Math.round(missRate * 100) / 100,
        evictedKeys: parseInt((stats.evicted_keys as string) ?? '0')
      };

    } catch (error) {
      this.logger.error('Failed to get cache statistics', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalKeys: 0,
        memoryUsage: '0B',
        hitRate: 0,
        missRate: 0,
        evictedKeys: 0
      };
    }
  }

  /**
   * Clear all cache for current tenant
   */
  async clearAll(): Promise<number> {
    try {
      this.validateTenantContext();

      const pattern = this.getTenantCacheKey('*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      this.logger.info('All cache cleared for tenant', {
        tenantId: this.tenantId,
        clearedCount: keys.length
      });

      return keys.length;

    } catch (error) {
      this.logger.error('Failed to clear all cache', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Build cache key with tenant and prefix
   */
  private buildCacheKey(key: string, prefix?: string): string {
    const keyPrefix = prefix ?? this.defaultPrefix;
    return `${keyPrefix}:${this.tenantId}:${key}`;
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
      const startTime = Date.now();
      
      // Test Redis connection
      await this.redis.ping();
      
      const responseTime = Date.now() - startTime;
      
      const health = {
        healthy: true,
        responseTime,
        timestamp: new Date().toISOString(),
        cache: 'redis',
        status: 'connected'
      };

      this.logger.info('Cache health check passed', {
        tenantId: this.tenantId,
        responseTime,
        status: 'healthy'
      });

      return {
        ...health,
        details: {
          cache: health.cache,
          status: health.status,
          responseTime: health.responseTime
        }
      };

    } catch (error) {
      this.logger.error('Cache health check failed', {
        tenantId: this.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          cache: 'redis',
          status: 'disconnected'
        }
      };
    }
  }
}
