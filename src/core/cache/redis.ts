import { Redis } from 'ioredis';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname ?? 'localhost' : 'localhost',
  port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port ?? '6379') : 6379,
  password: process.env.REDIS_PASSWORD ?? undefined,
  db: parseInt(process.env.REDIS_DB ?? '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
};

// Create Redis instances for different purposes
export const redis = new Redis(redisConfig);
export const redisSubscriber = new Redis(redisConfig);
export const redisPublisher = new Redis(redisConfig);

// Redis Streams configuration
export const STREAM_KEY_PREFIX = process.env.REDIS_STREAM_KEY_PREFIX ?? 'tenant';
export const PUBSUB_KEY_PREFIX = process.env.REDIS_PUBSUB_KEY_PREFIX ?? 'tenant';

// Helper functions for tenant-specific keys
export const getTenantStreamKey = (tenantId: string) => `${STREAM_KEY_PREFIX}:${tenantId}:stream`;
export const getTenantPubSubKey = (tenantId: string) => `${PUBSUB_KEY_PREFIX}:${tenantId}:pub`;

// Redis health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnections(): Promise<void> {
  try {
    await redis.quit();
    await redisSubscriber.quit();
    await redisPublisher.quit();
  } catch (error) {
    console.error('Error closing Redis connections:', error);
  }
}

// Event handlers
redis.on('error', (error) => {
  console.error('Redis error:', error);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('ready', () => {
  console.log('Redis ready for operations');
});

// Graceful shutdown on process termination
process.on('SIGINT', () => void closeRedisConnections());
process.on('SIGTERM', () => void closeRedisConnections());
