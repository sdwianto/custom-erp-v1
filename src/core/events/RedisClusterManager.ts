import type { Redis } from 'ioredis';
import type { Logger } from '../services/Logger';

/**
 * Redis Cluster Manager
 * Implementation Guide: Redis clustering untuk scalability
 */
export class RedisClusterManager {
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly clusterNodes: string[];
  private readonly clusterOptions: {
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableOfflineQueue: boolean;
    lazyConnect: boolean;
  };

  constructor(
    redis: Redis,
    logger: Logger,
    clusterNodes: string[],
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
    this.clusterNodes = clusterNodes;
    this.clusterOptions = {
      enableReadyCheck: options.enableReadyCheck ?? true,
      maxRetriesPerRequest: options.maxRetriesPerRequest ?? 3,
      retryDelayOnFailover: options.retryDelayOnFailover ?? 100,
      enableOfflineQueue: options.enableOfflineQueue ?? false,
      lazyConnect: options.lazyConnect ?? true
    };
  }

  /**
   * Initialize Redis cluster
   * Implementation Guide: Redis clustering untuk scalability
   */
  async initializeCluster(): Promise<void> {
    try {
      this.logger.info('Initializing Redis cluster', {
        clusterNodes: this.clusterNodes,
        clusterOptions: this.clusterOptions
      });

      // Test cluster connectivity
      await this.testClusterConnectivity();

      // Setup cluster monitoring
      await this.setupClusterMonitoring();

      // Configure cluster settings
      await this.configureClusterSettings();

      this.logger.info('Redis cluster initialized successfully', {
        clusterNodes: this.clusterNodes
      });

    } catch (error) {
      this.logger.error('Failed to initialize Redis cluster', {
        clusterNodes: this.clusterNodes,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Test cluster connectivity
   * Implementation Guide: Cluster health monitoring
   */
  async testClusterConnectivity(): Promise<{
    isConnected: boolean;
    clusterInfo: Record<string, unknown>;
    nodeCount: number;
  }> {
    try {
      // Test basic connectivity
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error('Redis cluster ping failed');
      }

      // Get cluster info
      const clusterInfo = await (this.redis as unknown as { cluster: (cmd: string) => Promise<string> }).cluster('info');
      const parsedInfo = this.parseClusterInfo(clusterInfo);

      // Get cluster nodes
      const nodes = await (this.redis as unknown as { cluster: (cmd: string) => Promise<string> }).cluster('nodes');
      const nodeCount = nodes.split('\n').filter(line => line.trim()).length;

      const result = {
        isConnected: true,
        clusterInfo: parsedInfo,
        nodeCount
      };

      this.logger.info('Redis cluster connectivity test passed', result);

      return result;

    } catch (error) {
      this.logger.error('Redis cluster connectivity test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        isConnected: false,
        clusterInfo: {},
        nodeCount: 0
      };
    }
  }

  /**
   * Setup cluster monitoring
   * Implementation Guide: Cluster health monitoring
   */
  private async setupClusterMonitoring(): Promise<void> {
    try {
      // Monitor cluster events
      this.redis.on('+node', (node) => {
        this.logger.info('Redis cluster node added', { node });
      });

      this.redis.on('-node', (node) => {
        this.logger.warn('Redis cluster node removed', { node });
      });

      this.redis.on('node error', (err, node) => {
        this.logger.error('Redis cluster node error', {
          node,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      });

      this.redis.on('+move', (slot, key, node) => {
        this.logger.info('Redis cluster slot moved', { slot, key, node });
      });

      this.redis.on('+ask', (slot, key, node) => {
        this.logger.info('Redis cluster ASK redirect', { slot, key, node });
      });

      this.redis.on('+clusterdown', () => {
        this.logger.error('Redis cluster is down');
      });

      this.redis.on('-clusterdown', () => {
        this.logger.info('Redis cluster is back up');
      });

      this.logger.info('Redis cluster monitoring setup completed');

    } catch (error) {
      this.logger.error('Failed to setup cluster monitoring', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Configure cluster settings
   * Implementation Guide: Cluster optimization
   */
  private async configureClusterSettings(): Promise<void> {
    try {
      // Configure cluster settings for performance
      const settings: Array<[string, string]> = [
        ['cluster-require-full-coverage', 'no'],
        ['cluster-allow-reads-when-down', 'yes'],
        ['cluster-replica-no-failover', 'no']
      ];

      for (const [setting, value] of settings) {
        try {
          await this.redis.config('SET', setting, value);
          this.logger.debug('Redis cluster setting configured', { setting, value });
        } catch (error) {
          this.logger.warn('Failed to configure cluster setting', {
            setting,
            value,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.info('Redis cluster settings configured');

    } catch (error) {
      this.logger.error('Failed to configure cluster settings', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get cluster health status
   * Implementation Guide: Cluster health monitoring
   */
  async getClusterHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    nodeCount: number;
    connectedNodes: number;
    clusterSize: number;
    clusterKnownNodes: number;
    clusterConnectedNodes: number;
    clusterReachableNodes: number;
    clusterFailoverInProgress: boolean;
    clusterSlotsAssigned: number;
    clusterSlotsOk: number;
    clusterSlotsPfail: number;
    clusterSlotsFail: number;
  }> {
    try {
      const clusterInfo = await (this.redis as unknown as { cluster: (cmd: string) => Promise<string> }).cluster('info');
      const parsedInfo = this.parseClusterInfo(clusterInfo);

      const nodeCount = parsedInfo.cluster_known_nodes as number ?? 0;
      const connectedNodes = parsedInfo.cluster_connected_nodes as number ?? 0;
      const clusterSize = parsedInfo.cluster_size as number ?? 0;
      const clusterKnownNodes = parsedInfo.cluster_known_nodes as number ?? 0;
      const clusterConnectedNodes = parsedInfo.cluster_connected_nodes as number ?? 0;
      const clusterReachableNodes = parsedInfo.cluster_reachable_nodes as number ?? 0;
      const clusterFailoverInProgress = parsedInfo.cluster_current_epoch as number > 0;
      const clusterSlotsAssigned = parsedInfo.cluster_slots_assigned as number ?? 0;
      const clusterSlotsOk = parsedInfo.cluster_slots_ok as number ?? 0;
      const clusterSlotsPfail = parsedInfo.cluster_slots_pfail as number ?? 0;
      const clusterSlotsFail = parsedInfo.cluster_slots_fail as number ?? 0;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      
      if (clusterSlotsFail > 0 || clusterConnectedNodes < clusterKnownNodes) {
        status = 'unhealthy';
      } else if (clusterSlotsPfail > 0 || clusterFailoverInProgress) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      const health = {
        status,
        nodeCount,
        connectedNodes,
        clusterSize,
        clusterKnownNodes,
        clusterConnectedNodes,
        clusterReachableNodes,
        clusterFailoverInProgress,
        clusterSlotsAssigned,
        clusterSlotsOk,
        clusterSlotsPfail,
        clusterSlotsFail
      };

      this.logger.info('Redis cluster health status', health);

      return health;

    } catch (error) {
      this.logger.error('Failed to get cluster health', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        status: 'unhealthy',
        nodeCount: 0,
        connectedNodes: 0,
        clusterSize: 0,
        clusterKnownNodes: 0,
        clusterConnectedNodes: 0,
        clusterReachableNodes: 0,
        clusterFailoverInProgress: false,
        clusterSlotsAssigned: 0,
        clusterSlotsOk: 0,
        clusterSlotsPfail: 0,
        clusterSlotsFail: 0
      };
    }
  }

  /**
   * Get cluster nodes information
   * Implementation Guide: Cluster node management
   */
  async getClusterNodes(): Promise<Array<{
    nodeId: string;
    address: string;
    flags: string;
    master: string;
    pingSent: number;
    pongReceived: number;
    configEpoch: number;
    linkState: string;
    slots: string[];
  }>> {
    try {
      const nodes = await (this.redis as unknown as { cluster: (cmd: string) => Promise<string> }).cluster('nodes');
      const nodeLines = nodes.split('\n').filter(line => line.trim());
      
      const nodeInfo = nodeLines.map(line => {
        const parts = line.split(' ');
        const [nodeId, address, flags, master, pingSent, pongReceived, configEpoch, linkState, ...slots] = parts;
        
        return {
          nodeId: nodeId ?? '',
          address: address ?? '',
          flags: flags ?? '',
          master: master ?? '',
          pingSent: parseInt(pingSent ?? '0'),
          pongReceived: parseInt(pongReceived ?? '0'),
          configEpoch: parseInt(configEpoch ?? '0'),
          linkState: linkState ?? '',
          slots: slots.filter(slot => slot.includes('-'))
        };
      });

      this.logger.debug('Retrieved cluster nodes information', {
        nodeCount: nodeInfo.length
      });

      return nodeInfo;

    } catch (error) {
      this.logger.error('Failed to get cluster nodes', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Parse cluster info string
   */
  private parseClusterInfo(clusterInfo: string): Record<string, unknown> {
    const info: Record<string, unknown> = {};
    
    const lines = clusterInfo.split('\n');
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key && value) {
          info[key.trim()] = isNaN(Number(value)) ? value.trim() : Number(value);
        }
      }
    }
    
    return info;
  }

  /**
   * Shutdown cluster connection
   */
  async shutdown(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('Redis cluster connection closed');
    } catch (error) {
      this.logger.error('Failed to shutdown Redis cluster', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
