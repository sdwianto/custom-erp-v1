/**
 * Enterprise Caching Layer
 * Multi-level caching for high-performance data access
 */

export interface CacheConfig {
  redis: {
    url: string;
    maxRetries: number;
    retryDelay: number;
    maxMemory: string;
    evictionPolicy: string;
  };
  memory: {
    maxSize: number;
    ttl: number;
  };
  strategies: {
    read: 'cache-first' | 'cache-aside' | 'write-through';
    write: 'write-through' | 'write-behind' | 'write-around';
  };
}

export const CACHE_CONFIG: CacheConfig = {
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    maxRetries: 3,
    retryDelay: 100,
    maxMemory: '2gb',
    evictionPolicy: 'allkeys-lru',
  },
  memory: {
    maxSize: 100 * 1024 * 1024, // 100MB
    ttl: 300000, // 5 minutes
  },
  strategies: {
    read: 'cache-first',
    write: 'write-through',
  },
};

/**
 * Cache key patterns for different data types
 */
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  USER_PERMISSIONS: (userId: string) => `user:${userId}:permissions`,
  EQUIPMENT: (id: string) => `equipment:${id}`,
  EQUIPMENT_LIST: (filters: string) => `equipment:list:${filters}`,
  INVENTORY_ITEM: (id: string) => `inventory:${id}`,
  INVENTORY_STOCK: (storeId: string, itemId: string) => `stock:${storeId}:${itemId}`,
  KPI_DASHBOARD: (userId: string) => `kpi:dashboard:${userId}`,
  FINANCIAL_PERIOD: (period: string) => `finance:period:${period}`,
  MAINTENANCE_SCHEDULE: (equipmentId: string) => `maintenance:schedule:${equipmentId}`,
} as const;

/**
 * Cache TTL (Time To Live) configurations
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
  WEEKLY: 604800, // 7 days
} as const;

/**
 * Cache invalidation patterns
 */
export interface CacheInvalidation {
  pattern: string;
  trigger: 'create' | 'update' | 'delete';
  related?: string[];
}

export const INVALIDATION_RULES: CacheInvalidation[] = [
  {
    pattern: 'user:*',
    trigger: 'update',
    related: ['user:*:permissions'],
  },
  {
    pattern: 'equipment:*',
    trigger: 'update',
    related: ['equipment:list:*', 'kpi:dashboard:*'],
  },
  {
    pattern: 'inventory:*',
    trigger: 'update',
    related: ['stock:*', 'inventory:list:*'],
  },
];

/**
 * Multi-level cache interface
 */
export interface CacheLayer {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
}

/**
 * Memory cache implementation
 */
export class MemoryCache implements CacheLayer {
  private cache = new Map<string, { value: unknown; expires: number }>();
  private maxSize: number;
  private defaultTtl: number;

  constructor(config: { maxSize: number; ttl: number }) {
    this.maxSize = config.maxSize;
    this.defaultTtl = config.ttl;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl = this.defaultTtl): Promise<void> {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -1;
    return Math.max(0, entry.expires - Date.now());
  }
}

/**
 * Cache warming strategies
 */
export interface CacheWarmingStrategy {
  keys: string[];
  schedule: string; // cron expression
  priority: number;
}

export const WARMING_STRATEGIES: CacheWarmingStrategy[] = [
  {
    keys: ['kpi:dashboard:*'],
    schedule: '*/5 * * * *', // Every 5 minutes
    priority: 1,
  },
  {
    keys: ['equipment:list:*'],
    schedule: '0 */1 * * *', // Every hour
    priority: 2,
  },
  {
    keys: ['inventory:list:*'],
    schedule: '0 */2 * * *', // Every 2 hours
    priority: 3,
  },
];

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  evictions: number;
}

/**
 * Cache manager for coordinating multiple cache layers
 */
export class CacheManager {
  private layers: CacheLayer[] = [];
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    evictions: 0,
  };

  addLayer(layer: CacheLayer): void {
    this.layers.push(layer);
  }

  async get<T>(key: string): Promise<T | null> {
    const start = Date.now();
    
    for (const layer of this.layers) {
      const value = await layer.get<T>(key);
      if (value !== null) {
        this.metrics.hits++;
        this.updateMetrics(Date.now() - start);
        return value;
      }
    }
    
    this.metrics.misses++;
    this.updateMetrics(Date.now() - start);
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Write to all layers
    await Promise.all(
      this.layers.map(layer => layer.set(key, value, ttl))
    );
  }

  async invalidate(pattern: string): Promise<void> {
    await Promise.all(
      this.layers.map(layer => layer.clear(pattern))
    );
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  private updateMetrics(responseTime: number): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + responseTime) / 2;
  }
}
