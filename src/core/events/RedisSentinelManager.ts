import type { Redis } from 'ioredis';
import type { Logger } from '../services/Logger';

// Extended Redis interface with Sentinel methods
export interface RedisWithSentinel extends Redis {
  sentinel: (command: string, ...args: unknown[]) => Promise<unknown>;
}

/**
 * Redis Sentinel Manager
 * Implementation Guide: Redis Sentinel untuk high availability
 */
export class RedisSentinelManager {
  private readonly redis: RedisWithSentinel;
  private readonly logger: Logger;
  private readonly sentinelNodes: string[];
  private readonly masterName: string;
  private readonly sentinelOptions: {
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableOfflineQueue: boolean;
    lazyConnect: boolean;
  };

  constructor(
    redis: RedisWithSentinel,
    logger: Logger,
    sentinelNodes: string[],
    masterName: string,
    options: {
      enableReadyCheck?: boolean;
      maxRetriesPerRequest?: number;
      retryDelayOnFailover?: number;
      enableOfflineQueue?: boolean;
      lazyConnect?: boolean;
    } = {}
  ) {
    this.redis = redis;
    this.logger = logger;
    this.sentinelNodes = sentinelNodes;
    this.masterName = masterName;
    this.sentinelOptions = {
      enableReadyCheck: options.enableReadyCheck ?? true,
      maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
      retryDelayOnFailover: options.retryDelayOnFailover ?? 100,
      enableOfflineQueue: options.enableOfflineQueue ?? false,
      lazyConnect: options.lazyConnect ?? true
    };
  }

  /**
   * Initialize Redis Sentinel
   * Implementation Guide: Redis Sentinel untuk high availability
   */
  async initializeSentinel(): Promise<void> {
    try {
      this.logger.info('Initializing Redis Sentinel', {
        sentinelNodes: this.sentinelNodes,
        masterName: this.masterName,
        sentinelOptions: this.sentinelOptions
      });

      // Test Sentinel connectivity
      await this.testSentinelConnectivity();

      // Setup Sentinel monitoring
      await this.setupSentinelMonitoring();

      // Configure Sentinel settings
      await this.configureSentinelSettings();

      this.logger.info('Redis Sentinel initialized successfully', {
        sentinelNodes: this.sentinelNodes,
        masterName: this.masterName
      });

    } catch (error) {
      this.logger.error('Failed to initialize Redis Sentinel', {
        sentinelNodes: this.sentinelNodes,
        masterName: this.masterName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Test Sentinel connectivity
   * Implementation Guide: Sentinel health monitoring
   */
  async testSentinelConnectivity(): Promise<{
    isConnected: boolean;
    masterInfo: Record<string, unknown>;
    sentinelInfo: Record<string, unknown>;
  }> {
    try {
      // Test basic connectivity
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error('Redis Sentinel ping failed');
      }

      // Get master info
      const masterInfo = await this.getMasterInfo();

      // Get Sentinel info
      const sentinelInfo = await this.getSentinelInfo();

      const result = {
        isConnected: true,
        masterInfo,
        sentinelInfo
      };

      this.logger.info('Redis Sentinel connectivity test passed', result);

      return result;

    } catch (error) {
      this.logger.error('Redis Sentinel connectivity test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        isConnected: false,
        masterInfo: {},
        sentinelInfo: {}
      };
    }
  }

  /**
   * Setup Sentinel monitoring
   * Implementation Guide: Sentinel health monitoring
   */
  private async setupSentinelMonitoring(): Promise<void> {
    try {
      // Monitor Sentinel events
      this.redis.on('+switch-master', (masterName: unknown, oldPort: unknown, newPort: unknown) => {
        this.logger.warn('Redis master switched', {
          masterName,
          oldPort,
          newPort
        });
      });

      this.redis.on('+sentinel', (address: unknown, port: unknown) => {
        this.logger.info('Redis Sentinel added', { address, port });
      });

      this.redis.on('-sentinel', (address: unknown, port: unknown) => {
        this.logger.warn('Redis Sentinel removed', { address, port });
      });

      this.redis.on('+slave', (address: unknown, port: unknown) => {
        this.logger.info('Redis slave added', { address, port });
      });

      this.redis.on('-slave', (address: unknown, port: unknown) => {
        this.logger.warn('Redis slave removed', { address, port });
      });

      this.redis.on('+sdown', (instance: unknown) => {
        this.logger.warn('Redis instance subjectively down', { instance });
      });

      this.redis.on('-sdown', (instance: unknown) => {
        this.logger.info('Redis instance subjectively up', { instance });
      });

      this.redis.on('+odown', (instance: unknown) => {
        this.logger.error('Redis instance objectively down', { instance });
      });

      this.redis.on('-odown', (instance: unknown) => {
        this.logger.info('Redis instance objectively up', { instance });
      });

      this.redis.on('+failover-end', (masterName: unknown) => {
        this.logger.info('Redis failover ended', { masterName });
      });

      this.redis.on('+failover-start', (masterName: unknown) => {
        this.logger.warn('Redis failover started', { masterName });
      });

      this.logger.info('Redis Sentinel monitoring setup completed');

    } catch (error) {
      this.logger.error('Failed to setup Sentinel monitoring', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Configure Sentinel settings
   * Implementation Guide: Sentinel optimization
   */
  private async configureSentinelSettings(): Promise<void> {
    try {
      // Configure Sentinel settings for high availability
      const settings = [
        ['sentinel down-after-milliseconds', this.masterName, '30000'],
        ['sentinel parallel-syncs', this.masterName, '1'],
        ['sentinel failover-timeout', this.masterName, '180000'],
        ['sentinel deny-scripts-reconfig', 'yes']
      ];

      for (const setting of settings) {
        try {
          await this.redis.sentinel('set', ...setting);
          this.logger.debug('Redis Sentinel setting configured', { setting });
        } catch (error) {
          this.logger.warn('Failed to configure Sentinel setting', {
            setting,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.info('Redis Sentinel settings configured');

    } catch (error) {
      this.logger.error('Failed to configure Sentinel settings', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get master information
   * Implementation Guide: Master monitoring
   */
  async getMasterInfo(): Promise<Record<string, unknown>> {
    try {
      const masterInfo = await this.redis.sentinel('masters') as unknown[];
      
      const master = masterInfo.find((m: unknown) => 
        Array.isArray(m) && m[0] === 'name' && m[1] === this.masterName
      );

      if (!master) {
        throw new Error(`Master ${this.masterName} not found`);
      }

      const info: Record<string, unknown> = {};
      
      for (let i = 0; i < (master as unknown[]).length; i += 2) {
        const key = (master as unknown[])[i] as string;
        const value = (master as unknown[])[i + 1];
        info[key] = value;
      }

      this.logger.debug('Retrieved master information', {
        masterName: this.masterName,
        masterInfo: info
      });

      return info;

    } catch (error) {
      this.logger.error('Failed to get master info', {
        masterName: this.masterName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get Sentinel information
   * Implementation Guide: Sentinel monitoring
   */
  async getSentinelInfo(): Promise<Record<string, unknown>> {
    try {
      const sentinelInfo = await this.redis.sentinel('sentinels', this.masterName) as unknown[];
      
      const info: Record<string, unknown> = {
        sentinelCount: sentinelInfo.length,
        sentinels: sentinelInfo.map((sentinel: unknown) => {
          if (Array.isArray(sentinel)) {
            const sentinelData: Record<string, unknown> = {};
            for (let i = 0; i < sentinel.length; i += 2) {
                          const key = sentinel[i] as string;
            const value = sentinel[i + 1] as unknown;
            sentinelData[key] = value;
            }
            return sentinelData;
          }
          return sentinel;
        })
      };

      this.logger.debug('Retrieved Sentinel information', {
        masterName: this.masterName,
        sentinelCount: info.sentinelCount
      });

      return info;

    } catch (error) {
      this.logger.error('Failed to get Sentinel info', {
        masterName: this.masterName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get slaves information
   * Implementation Guide: Slave monitoring
   */
  async getSlavesInfo(): Promise<Array<Record<string, unknown>>> {
    try {
      const slavesInfo = await this.redis.sentinel('slaves', this.masterName) as unknown[];
      
      const slaves = slavesInfo.map((slave: unknown) => {
        if (Array.isArray(slave)) {
          const slaveData: Record<string, unknown> = {};
          for (let i = 0; i < slave.length; i += 2) {
            const key = slave[i] as string;
            const value = slave[i + 1] as unknown;
            slaveData[key] = value;
          }
          return slaveData;
        }
        return slave as Record<string, unknown>;
      });

      this.logger.debug('Retrieved slaves information', {
        masterName: this.masterName,
        slaveCount: slaves.length
      });

      return slaves;

    } catch (error) {
      this.logger.error('Failed to get slaves info', {
        masterName: this.masterName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get Sentinel health status
   * Implementation Guide: Sentinel health monitoring
   */
  async getSentinelHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    masterStatus: string;
    slaveCount: number;
    sentinelCount: number;
    failoverInProgress: boolean;
    lastFailoverTime: string | null;
  }> {
    try {
      const masterInfo = await this.getMasterInfo();
      const slavesInfo = await this.getSlavesInfo();
      const sentinelInfo = await this.getSentinelInfo();

      const masterStatus = masterInfo.status as string ?? 'unknown';
      const slaveCount = slavesInfo.length;
      const sentinelCount = sentinelInfo.sentinelCount as number ?? 0;
      const failoverInProgress = masterInfo['failover-in-progress'] === '1';
      const lastFailoverTime = masterInfo['last-failover-time'] as string ?? null;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      
      if (masterStatus === 's_down' || masterStatus === 'o_down' || sentinelCount < 2) {
        status = 'unhealthy';
      } else if (failoverInProgress || slaveCount === 0) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      const health = {
        status,
        masterStatus,
        slaveCount,
        sentinelCount,
        failoverInProgress,
        lastFailoverTime
      };

      this.logger.info('Redis Sentinel health status', health);

      return health;

    } catch (error) {
      this.logger.error('Failed to get Sentinel health', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        status: 'unhealthy',
        masterStatus: 'unknown',
        slaveCount: 0,
        sentinelCount: 0,
        failoverInProgress: false,
        lastFailoverTime: null
      };
    }
  }

  /**
   * Force failover
   * Implementation Guide: Manual failover control
   */
  async forceFailover(): Promise<void> {
    try {
      await this.redis.sentinel('failover', this.masterName);
      
      this.logger.warn('Redis failover forced', {
        masterName: this.masterName
      });
    } catch (error) {
      this.logger.error('Failed to force failover', {
        masterName: this.masterName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Shutdown Sentinel connection
   */
  async shutdown(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('Redis Sentinel connection closed');
    } catch (error) {
      this.logger.error('Failed to shutdown Redis Sentinel', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
